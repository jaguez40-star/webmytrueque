"""Escritura de los archivos en custodia: por bloques, con hash y control de disco.

🔴 Todo lo de aquí evita cargar el archivo en memoria. El servidor de producción es un
t3.micro con 1 GB de RAM y el tope por orden es 1 GB: leer un archivo entero para hashearlo
o para escribirlo mata el proceso.
"""

import hashlib
import shutil
import uuid
import zipfile
from collections.abc import Iterator
from pathlib import Path

from fastapi import UploadFile

# 1 MiB: suficientemente grande para que el disco no sufra por llamada, suficientemente
# pequeño para que la memoria del proceso no dependa del tamaño del archivo.
CHUNK_BYTES = 1024 * 1024

# Margen que se deja SIEMPRE libre en el disco. El sistema operativo, los logs y la propia
# SQLite necesitan sitio: aceptar una subida que deje el disco a cero no rechaza la
# siguiente petición, tumba el servicio entero.
MARGEN_DISCO_BYTES = 512 * 1024 * 1024


class SinEspacioEnDiscoError(Exception):
    """No cabe la orden dejando el margen de seguridad libre."""


def espacio_libre_bytes(directorio: Path) -> int:
    return shutil.disk_usage(directorio).free


def verificar_espacio(directorio: Path, bytes_necesarios: int) -> None:
    """Lanza SinEspacioEnDiscoError si aceptar `bytes_necesarios` dejaría el disco al límite."""
    directorio.mkdir(parents=True, exist_ok=True)
    libre = espacio_libre_bytes(directorio)
    if libre - bytes_necesarios < MARGEN_DISCO_BYTES:
        raise SinEspacioEnDiscoError


def extension_de(nombre: str) -> str:
    """'entrega final.tar.gz' -> '.gz'. Cadena vacía si no tiene."""
    sufijo = Path(nombre).suffix
    return sufijo.lower()[:16]


def guardar_archivo(subida: UploadFile, destino_dir: Path) -> tuple[str, int, str]:
    """Escribe `subida` en `destino_dir` y devuelve (nombre_en_disco, bytes, hash_sha256).

    🔴 El nombre en disco es un UUID, NUNCA el nombre que mandó el usuario: un nombre puede
    traer '../', bytes nulos o 300 caracteres, y construir rutas con él permite escribir
    fuera de la carpeta de la orden. El nombre real se guarda en la BD, que no interpreta
    rutas.
    """
    destino_dir.mkdir(parents=True, exist_ok=True)
    nombre_en_disco = f"{uuid.uuid4().hex}.bin"
    ruta = destino_dir / nombre_en_disco

    digest = hashlib.sha256()
    total = 0
    with ruta.open("wb") as salida:
        while True:
            bloque = subida.file.read(CHUNK_BYTES)
            if not bloque:
                break
            digest.update(bloque)
            total += len(bloque)
            salida.write(bloque)

    return nombre_en_disco, total, digest.hexdigest()


def borrar_carpeta(directorio: Path) -> None:
    """Borra la carpeta de una orden. No falla si no existe."""
    shutil.rmtree(directorio, ignore_errors=True)


def borrar_archivo(ruta: Path) -> None:
    """Borra un archivo suelto de una orden. No falla si ya no está."""
    ruta.unlink(missing_ok=True)


def disco_total_bytes(directorio: Path) -> int:
    return shutil.disk_usage(directorio).total


def peso_de_carpeta(directorio: Path) -> int:
    """Bytes que ocupa una carpeta, sumando sus archivos. 0 si no existe."""
    if not directorio.is_dir():
        return 0
    return sum(f.stat().st_size for f in directorio.iterdir() if f.is_file())


class _BufferZip:
    """Destino de escritura para `zipfile` que va entregando lo escrito, sin fichero.

    🔴 NO es seekable a propósito: así `zipfile` genera el ZIP en modo flujo (descriptores
    de datos al vuelo) y nunca necesita volver atrás a reescribir cabeceras. Un ZIP normal
    exigiría un archivo temporal, y con 2,9 GB libres en el servidor un backup de 1,5 GB
    dejaría el disco al borde — precisamente lo que `MARGEN_DISCO_BYTES` intenta evitar.
    """

    def __init__(self) -> None:
        self._pendiente = bytearray()
        self._escrito = 0

    def write(self, datos: bytes, /) -> int:
        self._pendiente.extend(datos)
        self._escrito += len(datos)
        return len(datos)

    def flush(self) -> None:
        pass

    def close(self) -> None:
        # No hay nada que cerrar: lo pide el protocolo de `zipfile`, que espera un fichero.
        pass

    def tell(self) -> int:
        return self._escrito

    def seekable(self) -> bool:
        return False

    def tomar(self) -> bytes:
        datos = bytes(self._pendiente)
        self._pendiente.clear()
        return datos


def zip_en_streaming(archivos: list[tuple[Path, str]]) -> Iterator[bytes]:
    """Genera un ZIP como flujo de bloques. `archivos` son pares (ruta en disco, nombre dentro).

    Sin compresión (`ZIP_STORED`): lo que se guarda son PNG, ZIP y MP4, que ya vienen
    comprimidos — gastar la CPU de un t3.micro para no ahorrar nada sería un mal negocio.
    """
    buffer = _BufferZip()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as zf:
        for ruta, nombre in archivos:
            if not ruta.is_file():
                continue
            with zf.open(nombre, "w") as destino, ruta.open("rb") as origen:
                while bloque := origen.read(CHUNK_BYTES):
                    destino.write(bloque)
                    yield buffer.tomar()
            yield buffer.tomar()
    yield buffer.tomar()
