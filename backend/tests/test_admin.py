"""Tests del panel de almacenamiento.

Lo que se prueba aquí no es una pantalla: es la única puerta de la app capaz de leer y
borrar archivos de CUALQUIER usuario. Si la comprobación de quién entra falla, falla todo
lo demás que el producto promete sobre la custodia.
"""

import io
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings

ADMIN = "jefe@correo.com"


@pytest.fixture(autouse=True)
def _entorno_temporal(tmp_path: Path):  # type: ignore[no-untyped-def]
    """Carpeta de custodia temporal y un administrador conocido, solo durante el test."""
    ajustes = get_settings()
    custodia, admin = ajustes.custodia_dir, ajustes.admin_email
    ajustes.custodia_dir = str(tmp_path / "custodia")
    ajustes.admin_email = ADMIN
    yield
    ajustes.custodia_dir, ajustes.admin_email = custodia, admin
    get_settings.cache_clear()


def _registrar(client: TestClient, email: str) -> str:
    respuesta = client.post("/auth/register", json={"email": email, "password": "contrasena12"})
    assert respuesta.status_code == 201
    return str(respuesta.json()["handle"])


def _archivo(nombre: str, contenido: bytes) -> tuple[str, tuple[str, io.BytesIO, str]]:
    return ("archivos", (nombre, io.BytesIO(contenido), "application/octet-stream"))


def _orden_de_terceros(client: TestClient, sufijo: str) -> str:
    """Una orden entre DOS usuarios que no son el administrador."""
    handle = _registrar(client, f"comprador{sufijo}@correo.com")
    client.post("/auth/logout")
    _registrar(client, f"vendedor{sufijo}@correo.com")
    respuesta = client.post(
        "/orders",
        data={"comprador": handle, "monto": "10000"},
        files=[_archivo("uno.txt", b"contenido uno"), _archivo("dos.txt", b"contenido dos")],
    )
    assert respuesta.status_code == 201
    client.post("/auth/logout")
    return str(respuesta.json()["id"])


def test_para_quien_no_es_admin_el_panel_no_existe(client: TestClient) -> None:
    """404 y no 403: un 403 confirmaría que el panel está ahí y solo falta ser alguien."""
    _registrar(client, "curioso@correo.com")

    for metodo, url in [
        ("get", "/admin/almacenamiento"),
        ("get", "/admin/ordenes/1/zip"),
        ("get", "/admin/ordenes/1/archivos/1"),
        ("delete", "/admin/ordenes/1"),
        ("delete", "/admin/ordenes/1/archivos/1"),
        ("delete", "/admin/huerfanos/1"),
    ]:
        respuesta = getattr(client, metodo)(url)
        assert respuesta.status_code == 404, f"{metodo} {url} devolvió {respuesta.status_code}"


def test_sin_sesion_el_panel_pide_entrar(client: TestClient) -> None:
    assert client.get("/admin/almacenamiento").status_code == 401


def test_sin_admin_configurado_nadie_entra(client: TestClient) -> None:
    """Un .env sin ADMIN_EMAIL no puede convertir a cualquiera en administrador."""
    get_settings().admin_email = ""
    _registrar(client, ADMIN)
    assert client.get("/admin/almacenamiento").status_code == 404


def test_el_admin_ve_las_ordenes_de_otros_y_el_estado_del_disco(client: TestClient) -> None:
    _orden_de_terceros(client, "1")
    _registrar(client, ADMIN)

    datos = client.get("/admin/almacenamiento").json()
    assert datos["discoTotalBytes"] > 0
    assert datos["discoLibreBytes"] > 0
    assert datos["custodiaBytes"] == len(b"contenido uno") + len(b"contenido dos")

    orden = datos["ordenes"][0]
    assert [a["nombre"] for a in orden["archivos"]] == ["uno.txt", "dos.txt"]
    assert all(a["enDisco"] for a in orden["archivos"])
    assert orden["vendedor"].startswith("@")
    assert orden["comprador"].startswith("@")


def test_el_admin_baja_una_orden_entera_como_zip(client: TestClient) -> None:
    orden_id = _orden_de_terceros(client, "2")
    _registrar(client, ADMIN)

    respuesta = client.get(f"/admin/ordenes/{orden_id}/zip")
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/zip"

    zf = zipfile.ZipFile(io.BytesIO(respuesta.content))
    assert zf.testzip() is None
    # Nombres ORIGINALES dentro del zip, no los UUID del disco.
    assert sorted(zf.namelist()) == ["dos.txt", "uno.txt"]
    assert zf.read("uno.txt") == b"contenido uno"


def test_el_admin_baja_un_archivo_suelto(client: TestClient) -> None:
    orden_id = _orden_de_terceros(client, "3")
    _registrar(client, ADMIN)

    archivo_id = client.get("/admin/almacenamiento").json()["ordenes"][0]["archivos"][0]["id"]
    respuesta = client.get(f"/admin/ordenes/{orden_id}/archivos/{archivo_id}")
    assert respuesta.status_code == 200
    assert respuesta.content == b"contenido uno"


def test_el_admin_borra_un_archivo_y_luego_la_orden(client: TestClient) -> None:
    orden_id = _orden_de_terceros(client, "4")
    carpeta = get_settings().custodia_path / orden_id
    _registrar(client, ADMIN)

    archivo_id = client.get("/admin/almacenamiento").json()["ordenes"][0]["archivos"][0]["id"]
    tras_archivo = client.delete(f"/admin/ordenes/{orden_id}/archivos/{archivo_id}")
    assert tras_archivo.status_code == 200
    assert len(tras_archivo.json()["ordenes"][0]["archivos"]) == 1
    assert len(list(carpeta.iterdir())) == 1

    tras_orden = client.delete(f"/admin/ordenes/{orden_id}")
    assert tras_orden.status_code == 200
    assert tras_orden.json()["ordenes"][0]["estado"] == "PURGADO"
    assert not carpeta.exists()


def test_el_panel_delata_los_archivos_que_ya_no_estan_en_disco(client: TestClient) -> None:
    """Una fila en la base sin bytes detrás: pasa si alguien borró a mano por SSH."""
    orden_id = _orden_de_terceros(client, "5")
    carpeta = get_settings().custodia_path / orden_id
    next(f for f in carpeta.iterdir() if f.is_file()).unlink()
    _registrar(client, ADMIN)

    archivos = client.get("/admin/almacenamiento").json()["ordenes"][0]["archivos"]
    assert [a["enDisco"] for a in archivos].count(False) == 1


def test_el_panel_encuentra_y_borra_carpetas_huerfanas(client: TestClient) -> None:
    """Basura de un rollback fallido: ocupa disco y nadie la ve desde la app."""
    raiz = get_settings().custodia_path
    (raiz / "9999").mkdir(parents=True)
    (raiz / "9999" / "olvidado.bin").write_bytes(b"x" * 500)
    _registrar(client, ADMIN)

    datos = client.get("/admin/almacenamiento").json()
    assert datos["huerfanos"] == [{"nombre": "9999", "bytes": 500, "archivos": 1}]

    tras = client.delete("/admin/huerfanos/9999")
    assert tras.status_code == 200
    assert tras.json()["huerfanos"] == []
    assert not (raiz / "9999").exists()


def test_no_se_puede_salir_de_la_carpeta_de_custodia(client: TestClient) -> None:
    """🔴 Sin esta defensa, el borrado de huérfanos borra cualquier cosa del servidor."""
    raiz = get_settings().custodia_path
    raiz.mkdir(parents=True, exist_ok=True)
    victima = raiz.parent / "trueque.db"
    victima.write_bytes(b"la base de datos")
    _registrar(client, ADMIN)

    for intento in ["..", "../..", "%2e%2e", "9999/../..", "no-numerico"]:
        assert client.delete(f"/admin/huerfanos/{intento}").status_code in (404, 307, 405)

    assert victima.read_bytes() == b"la base de datos"


def test_una_carpeta_con_orden_viva_no_se_borra_como_huerfana(client: TestClient) -> None:
    orden_id = _orden_de_terceros(client, "6")
    _registrar(client, ADMIN)

    respuesta = client.delete(f"/admin/huerfanos/{orden_id}")
    assert respuesta.status_code == 409
    assert (get_settings().custodia_path / orden_id).is_dir()


def test_me_dice_que_la_cuenta_del_admin_es_admin(client: TestClient) -> None:
    _registrar(client, ADMIN)
    assert client.get("/auth/me").json()["esAdmin"] is True
