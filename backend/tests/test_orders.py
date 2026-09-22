"""Tests del feature orders: crear una custodia y listarla."""

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings


@pytest.fixture(autouse=True)
def _custodia_temporal(tmp_path: Path):  # type: ignore[no-untyped-def]
    """Manda los archivos de los tests a una carpeta temporal, no a data/custodia.

    `get_settings` está cacheada con lru_cache, así que se muta la instancia y se limpia
    la caché al salir: escribir en la carpeta real dejaría basura entre ejecuciones.
    """
    ajustes = get_settings()
    original = ajustes.custodia_dir
    ajustes.custodia_dir = str(tmp_path / "custodia")
    yield
    ajustes.custodia_dir = original
    get_settings.cache_clear()


def _registrar(client: TestClient, email: str) -> str:
    """Crea una cuenta y devuelve su @usuario. Deja la cookie de sesión en el cliente."""
    respuesta = client.post("/auth/register", json={"email": email, "password": "contrasena12"})
    assert respuesta.status_code == 201
    return str(respuesta.json()["handle"])


def _archivo(nombre: str, contenido: bytes) -> tuple[str, tuple[str, io.BytesIO, str]]:
    return ("archivos", (nombre, io.BytesIO(contenido), "application/octet-stream"))


def test_crear_orden_guarda_archivos_y_devuelve_hash(client: TestClient) -> None:
    handle_comprador = _registrar(client, "compra@correo.com")
    client.post("/auth/logout")
    _registrar(client, "vende@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "450.000"},
        files=[_archivo("contrato.pdf", b"hola mundo")],
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "EN_CUSTODIA"
    assert cuerpo["rol"] == "vendedor"
    assert cuerpo["montoCop"] == 450000
    assert cuerpo["contraparte"]["handle"] == handle_comprador
    assert len(cuerpo["archivos"]) == 1
    archivo = cuerpo["archivos"][0]
    assert archivo["nombre"] == "contrato.pdf"
    assert archivo["extension"] == ".pdf"
    assert archivo["bytes"] == 10
    # sha256 de b"hola mundo"
    assert archivo["hash"] == "0b894166d3336435c800bea36ff21b29eaa801a52f584c006c49289a0dcf6e2f"


def test_crear_orden_acepta_varios_archivos(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c2@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v2@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("uno.txt", b"aaa"), _archivo("dos.zip", b"bbbb")],
    )

    assert respuesta.status_code == 201
    archivos = respuesta.json()["archivos"]
    assert [a["nombre"] for a in archivos] == ["uno.txt", "dos.zip"]
    assert [a["bytes"] for a in archivos] == [3, 4]


def test_los_archivos_se_escriben_en_disco(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c3@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v3@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("secreto.bin", b"contenido real")],
    )
    orden_id = respuesta.json()["id"]

    carpeta = get_settings().custodia_path / orden_id
    escritos = list(carpeta.iterdir())
    assert len(escritos) == 1
    # 🔴 El nombre en disco NO es el original: es un UUID. Ver storage.guardar_archivo.
    assert escritos[0].name != "secreto.bin"
    assert escritos[0].suffix == ".bin"
    assert escritos[0].read_bytes() == b"contenido real"


def test_el_nombre_del_archivo_no_permite_salir_de_la_carpeta(client: TestClient) -> None:
    """Un nombre con '../' no debe escribir fuera de la carpeta de la orden."""
    handle_comprador = _registrar(client, "c4@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v4@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("../../escapado.txt", b"x")],
    )

    assert respuesta.status_code == 201
    raiz = get_settings().custodia_path
    carpeta = raiz / respuesta.json()["id"]
    assert not (raiz.parent / "escapado.txt").exists()
    assert len(list(carpeta.iterdir())) == 1


def test_comprador_inexistente_da_404(client: TestClient) -> None:
    _registrar(client, "v5@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": "@trq-zzzz", "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 404
    assert "no existe" in respuesta.json()["detail"]


def test_no_puedes_venderte_a_ti_mismo(client: TestClient) -> None:
    handle = _registrar(client, "v6@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle, "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 422


def test_monto_invalido_da_422(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c7@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v7@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "cero pesos"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 422


def test_pasarse_del_tope_da_413_y_no_deja_basura(client: TestClient) -> None:
    """El tope se valida en el SERVIDOR: el del navegador se salta con curl."""
    handle_comprador = _registrar(client, "c8@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v8@correo.com")

    ajustes = get_settings()
    original = ajustes.max_order_bytes
    ajustes.max_order_bytes = 10  # 10 bytes, para no mover un giga en un test
    try:
        respuesta = client.post(
            "/orders",
            data={"comprador": handle_comprador, "monto": "1000"},
            files=[_archivo("grande.bin", b"x" * 50)],
        )
    finally:
        ajustes.max_order_bytes = original

    assert respuesta.status_code == 413
    # Todo o nada: ni carpeta ni filas.
    raiz = ajustes.custodia_path
    assert not raiz.exists() or not any(raiz.iterdir())
    assert client.get("/orders").json() == []


def test_sin_sesion_no_se_puede_crear_ni_listar(client: TestClient) -> None:
    assert client.get("/orders").status_code == 401
    respuesta = client.post(
        "/orders",
        data={"comprador": "@trq-aaaa", "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )
    assert respuesta.status_code == 401


def test_la_orden_aparece_para_las_dos_partes_con_rol_distinto(client: TestClient) -> None:
    """La MISMA fila se ve como 'vendedor' para uno y 'comprador' para el otro."""
    handle_comprador = _registrar(client, "c9@correo.com")
    client.post("/auth/logout")
    handle_vendedor = _registrar(client, "v9@correo.com")

    client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "2000"},
        files=[_archivo("a.txt", b"x")],
    )

    como_vendedor = client.get("/orders").json()
    assert len(como_vendedor) == 1
    assert como_vendedor[0]["rol"] == "vendedor"
    assert como_vendedor[0]["contraparte"]["handle"] == handle_comprador

    client.post("/auth/logout")
    client.post("/auth/login", json={"email": "c9@correo.com", "password": "contrasena12"})
    como_comprador = client.get("/orders").json()
    assert len(como_comprador) == 1
    assert como_comprador[0]["rol"] == "comprador"
    assert como_comprador[0]["contraparte"]["handle"] == handle_vendedor


def test_cada_usuario_solo_ve_sus_ordenes(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c10@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v10@correo.com")
    client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "3000"},
        files=[_archivo("a.txt", b"x")],
    )
    client.post("/auth/logout")

    _registrar(client, "ajeno@correo.com")
    assert client.get("/orders").json() == []


def test_el_middleware_corta_por_content_length_antes_de_leer(client: TestClient) -> None:
    """🔴 El tope del servicio llega TARDE: Starlette ya parseó el multipart a disco.

    Medido durante la auditoría: con el tope en 1 KB, un cuerpo de 20 MB tardaba 3,1 s en
    ser rechazado porque el servidor lo había leído entero. El middleware mira
    `Content-Length` y corta en 0,01 s, sin escribir nada.
    """
    handle_comprador = _registrar(client, "c11@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v11@correo.com")

    ajustes = get_settings()
    original = ajustes.max_order_bytes
    ajustes.max_order_bytes = 1024
    try:
        respuesta = client.post(
            "/orders",
            data={"comprador": handle_comprador, "monto": "1000"},
            files=[_archivo("enorme.bin", b"x" * (3 * 1024 * 1024))],
        )
    finally:
        ajustes.max_order_bytes = original

    assert respuesta.status_code == 413
    assert "1 GB" in respuesta.json()["detail"]
    # Nada escrito: el cuerpo ni se parseó.
    raiz = ajustes.custodia_path
    assert not raiz.exists() or not any(raiz.iterdir())
