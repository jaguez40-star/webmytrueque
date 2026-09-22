"""Escritura de los archivos en custodia: por bloques, con hash y control de disco.

🔴 Todo lo de aquí evita cargar el archivo en memoria. El servidor de producción es un
t3.micro con 1 GB de RAM y el tope por orden es 1 GB: leer un archivo entero para hashearlo
o para escribirlo mata el proceso.
"""

import hashlib
import shutil
import uuid
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
