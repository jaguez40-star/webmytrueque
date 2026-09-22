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


def test_sin_monto_la_orden_se_crea_igual(client: TestClient) -> None:
    """El formulario dejó de pedirlo: su ausencia no puede impedir una custodia."""
    handle_comprador = _registrar(client, "sinmonto@correo.com")
    client.post("/auth/logout")
    _registrar(client, "sinmonto-v@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador},
        files=[_archivo("entrega.bin", b"datos")],
    )
    assert respuesta.status_code == 201
    assert respuesta.json()["montoCop"] == 0


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


def _crear_orden_entre(client: TestClient, correo_comprador: str, correo_vendedor: str) -> str:
    """Deja la sesión abierta como VENDEDOR y devuelve el id de la orden creada."""
    handle_comprador = _registrar(client, correo_comprador)
    client.post("/auth/logout")
    _registrar(client, correo_vendedor)
    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "10000"},
        files=[_archivo("entrega.bin", b"contenido descargable")],
    )
    assert respuesta.status_code == 201
    return str(respuesta.json()["id"])


def _entrar(client: TestClient, correo: str) -> None:
    client.post("/auth/logout")
    respuesta = client.post("/auth/login", json={"email": correo, "password": "contrasena12"})
    assert respuesta.status_code == 200


def test_el_vendedor_autoriza_y_revoca_la_descarga(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c20@correo.com", "v20@correo.com")

    autorizada = client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    assert autorizada.status_code == 200
    assert autorizada.json()["estado"] == "LIBERADO"

    # Mientras nadie descargue, puede echarse atrás.
    revocada = client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": False})
    assert revocada.status_code == 200
    assert revocada.json()["estado"] == "EN_CUSTODIA"


def test_el_comprador_no_puede_autorizar_su_propia_compra(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c21@correo.com", "v21@correo.com")
    _entrar(client, "c21@correo.com")

    respuesta = client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    # 404 y no 403: a quien no es el vendedor ni se le confirma que la orden existe.
    assert respuesta.status_code == 404


def test_sin_autorizacion_la_descarga_se_rechaza(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c22@correo.com", "v22@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    _entrar(client, "c22@correo.com")

    respuesta = client.get(f"/orders/{orden_id}/archivos/{archivo_id}")
    assert respuesta.status_code == 403
    assert "todavía no autorizó" in respuesta.json()["detail"]


def test_autorizada_el_comprador_descarga_el_contenido_real(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c23@correo.com", "v23@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    _entrar(client, "c23@correo.com")

    respuesta = client.get(f"/orders/{orden_id}/archivos/{archivo_id}")
    assert respuesta.status_code == 200
    assert respuesta.content == b"contenido descargable"
    # El nombre que llega es el ORIGINAL, no el UUID con el que se guardó.
    assert "entrega.bin" in respuesta.headers["content-disposition"]


def test_tras_descargar_el_vendedor_ya_no_puede_revocar(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c24@correo.com", "v24@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})

    _entrar(client, "c24@correo.com")
    assert client.get(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 200
    # La descarga queda registrada y es visible para las dos partes.
    assert client.get("/orders").json()[0]["descargadoEn"] is not None

    _entrar(client, "v24@correo.com")
    revocar = client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": False})
    assert revocar.status_code == 409
    assert "ya descargó" in revocar.json()["detail"]


def test_un_tercero_no_puede_descargar_archivos_ajenos(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c25@correo.com", "v25@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})

    client.post("/auth/logout")
    _registrar(client, "ajeno25@correo.com")
    assert client.get(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 404


def test_no_descargar_no_borra_el_archivo_del_disco(client: TestClient) -> None:
    """Se decidió NO purgar al descargar: una descarga cortada se puede reintentar."""
    orden_id = _crear_orden_entre(client, "c26@correo.com", "v26@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    _entrar(client, "c26@correo.com")

    assert client.get(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 200
    carpeta = get_settings().custodia_path / orden_id
    assert len(list(carpeta.iterdir())) == 1
    # Y se puede volver a bajar.
    assert client.get(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 200


def test_el_vendedor_purga_sus_archivos_y_desaparecen_del_disco(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c27@correo.com", "v27@correo.com")
    carpeta = get_settings().custodia_path / orden_id
    assert carpeta.is_dir()

    respuesta = client.delete(f"/orders/{orden_id}")
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "PURGADO"
    # Los bytes no están en ningún lado.
    assert not carpeta.exists()


def test_el_comprador_no_puede_purgar_lo_que_compro(client: TestClient) -> None:
    """Lo que tiene en custodia no es suyo: lo tiene disponible, no lo administra."""
    orden_id = _crear_orden_entre(client, "c28@correo.com", "v28@correo.com")
    _entrar(client, "c28@correo.com")

    # 404 y no 403: un 403 le confirmaría que la orden existe y solo le falta permiso.
    assert client.delete(f"/orders/{orden_id}").status_code == 404
    # Y los archivos siguen ahí.
    assert (get_settings().custodia_path / orden_id).is_dir()


def test_un_tercero_no_puede_purgar_ordenes_ajenas(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c29@correo.com", "v29@correo.com")
    client.post("/auth/logout")
    _registrar(client, "ajeno29@correo.com")

    assert client.delete(f"/orders/{orden_id}").status_code == 404
    assert (get_settings().custodia_path / orden_id).is_dir()


def test_tras_purgar_el_comprador_ya_no_puede_descargar(client: TestClient) -> None:
    """La disponibilidad del comprador dura mientras el vendedor no purgue."""
    orden_id = _crear_orden_entre(client, "c30@correo.com", "v30@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    client.delete(f"/orders/{orden_id}")

    _entrar(client, "c30@correo.com")
    assert client.get(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 403


def test_purgar_dos_veces_no_es_un_error(client: TestClient) -> None:
    orden_id = _crear_orden_entre(client, "c31@correo.com", "v31@correo.com")

    assert client.delete(f"/orders/{orden_id}").status_code == 200
    segunda = client.delete(f"/orders/{orden_id}")
    assert segunda.status_code == 200
    assert segunda.json()["estado"] == "PURGADO"


def test_purgar_conserva_el_rastro_de_que_hubo(client: TestClient) -> None:
    """Se borran los bytes, no la historia: nombre y hash siguen en la orden."""
    orden_id = _crear_orden_entre(client, "c32@correo.com", "v32@correo.com")

    purgada = client.delete(f"/orders/{orden_id}").json()
    assert purgada["archivos"][0]["nombre"] == "entrega.bin"
    assert len(purgada["archivos"][0]["hash"]) == 64


def _crear_orden_de_tres(client: TestClient, comprador: str, vendedor: str) -> str:
    """Una orden con tres archivos distintos. Deja la sesión abierta como VENDEDOR."""
    handle = _registrar(client, comprador)
    client.post("/auth/logout")
    _registrar(client, vendedor)
    respuesta = client.post(
        "/orders",
        data={"comprador": handle, "monto": "10000"},
        files=[
            _archivo("uno.png", b"aaa"),
            _archivo("dos.png", b"bbbb"),
            _archivo("tres.png", b"ccccc"),
        ],
    )
    assert respuesta.status_code == 201
    return str(respuesta.json()["id"])


def test_el_vendedor_borra_un_solo_archivo_y_los_demas_siguen(client: TestClient) -> None:
    orden_id = _crear_orden_de_tres(client, "c33@correo.com", "v33@correo.com")
    archivos = client.get("/orders").json()[0]["archivos"]
    carpeta = get_settings().custodia_path / orden_id

    respuesta = client.delete(f"/orders/{orden_id}/archivos/{archivos[1]['id']}")
    assert respuesta.status_code == 200

    quedan = respuesta.json()["archivos"]
    assert [a["nombre"] for a in quedan] == ["uno.png", "tres.png"]
    # En disco queda exactamente uno menos, y la orden sigue viva.
    assert len(list(carpeta.iterdir())) == 2
    assert respuesta.json()["estado"] == "EN_CUSTODIA"


def test_borrar_el_ultimo_archivo_purga_la_orden(client: TestClient) -> None:
    """Sin archivos no hay nada que custodiar: la orden no se queda a medias."""
    orden_id = _crear_orden_entre(client, "c34@correo.com", "v34@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]

    respuesta = client.delete(f"/orders/{orden_id}/archivos/{archivo_id}")
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "PURGADO"
    assert not (get_settings().custodia_path / orden_id).exists()


def test_el_comprador_no_puede_borrar_un_archivo_suelto(client: TestClient) -> None:
    orden_id = _crear_orden_de_tres(client, "c35@correo.com", "v35@correo.com")
    archivo_id = client.get("/orders").json()[0]["archivos"][0]["id"]
    _entrar(client, "c35@correo.com")

    assert client.delete(f"/orders/{orden_id}/archivos/{archivo_id}").status_code == 404
    assert len(list((get_settings().custodia_path / orden_id).iterdir())) == 3


def test_no_se_puede_borrar_un_archivo_de_otra_orden(client: TestClient) -> None:
    """El id del archivo no basta: tiene que pertenecer a la orden de la URL."""
    ajena = _crear_orden_de_tres(client, "c36@correo.com", "v36@correo.com")
    archivo_ajeno = client.get("/orders").json()[0]["archivos"][0]["id"]
    client.post("/auth/logout")
    propia = _crear_orden_de_tres(client, "c37@correo.com", "v37@correo.com")

    assert client.delete(f"/orders/{propia}/archivos/{archivo_ajeno}").status_code == 404
    assert len(list((get_settings().custodia_path / ajena).iterdir())) == 3


def test_tras_borrar_un_archivo_el_comprador_no_puede_descargarlo(client: TestClient) -> None:
    orden_id = _crear_orden_de_tres(client, "c38@correo.com", "v38@correo.com")
    archivos = client.get("/orders").json()[0]["archivos"]
    client.put(f"/orders/{orden_id}/autorizacion", json={"autorizado": True})
    client.delete(f"/orders/{orden_id}/archivos/{archivos[0]['id']}")

    _entrar(client, "c38@correo.com")
    assert client.get(f"/orders/{orden_id}/archivos/{archivos[0]['id']}").status_code == 404
    # Y los que quedan se siguen pudiendo bajar.
    assert client.get(f"/orders/{orden_id}/archivos/{archivos[1]['id']}").status_code == 200
