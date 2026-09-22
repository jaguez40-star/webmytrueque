"""Tests de los 4 endpoints de auth."""

import re

from fastapi.testclient import TestClient

HANDLE_RE = re.compile(r"^@trq-[a-z0-9]{4}$")

EMAIL = "ana@correo.com"
PASSWORD = "supersegura123"
CREDENTIALS = {"email": EMAIL, "password": PASSWORD}


def test_register_devuelve_handle_unico(client: TestClient) -> None:
    r = client.post("/auth/register", json=CREDENTIALS)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == EMAIL
    assert HANDLE_RE.match(body["handle"])
    assert "trueque_session" in r.cookies


def test_register_correo_duplicado_da_409(client: TestClient) -> None:
    client.post("/auth/register", json=CREDENTIALS)
    r = client.post("/auth/register", json={"email": EMAIL, "password": "otra12345678"})
    assert r.status_code == 409


def test_register_password_corta_da_422(client: TestClient) -> None:
    r = client.post("/auth/register", json={"email": "x@x.com", "password": "corta"})
    assert r.status_code == 422


def test_register_email_invalido_da_422(client: TestClient) -> None:
    r = client.post("/auth/register", json={"email": "no-es-correo", "password": PASSWORD})
    assert r.status_code == 422


def test_login_password_incorrecta_da_401(client: TestClient) -> None:
    client.post("/auth/register", json=CREDENTIALS)
    r = client.post("/auth/login", json={"email": EMAIL, "password": "mala-password"})
    assert r.status_code == 401


def test_login_correo_inexistente_da_401(client: TestClient) -> None:
    r = client.post("/auth/login", json={"email": "nadie@correo.com", "password": PASSWORD})
    assert r.status_code == 401


def test_login_correcto_setea_cookie(client: TestClient) -> None:
    client.post("/auth/register", json=CREDENTIALS)
    r = client.post("/auth/login", json=CREDENTIALS)
    assert r.status_code == 200
    assert "trueque_session" in r.cookies


def test_email_se_normaliza_a_minusculas(client: TestClient) -> None:
    """Registrarse con mayúsculas y entrar con minúsculas debe funcionar (y viceversa)."""
    client.post("/auth/register", json={"email": "Ana@Correo.com", "password": PASSWORD})
    r = client.post("/auth/login", json=CREDENTIALS)
    assert r.status_code == 200


def test_me_sin_cookie_da_401(client: TestClient) -> None:
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_con_cookie_devuelve_el_usuario(client: TestClient) -> None:
    client.post("/auth/register", json=CREDENTIALS)
    r = client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == EMAIL


def test_me_no_expone_el_hash_de_password(client: TestClient) -> None:
    """Regla no negociable 7: password_hash nunca sale en una respuesta."""
    client.post("/auth/register", json=CREDENTIALS)
    r = client.get("/auth/me")
    # Conjunto EXACTO, no "no contiene password_hash": así cualquier campo nuevo obliga a
    # pasar por aquí y decidir a conciencia que puede salir.
    assert set(r.json().keys()) == {"email", "handle", "esAdmin"}
    # Y una cuenta corriente no es administradora.
    assert r.json()["esAdmin"] is False


def test_logout_borra_la_cookie(client: TestClient) -> None:
    client.post("/auth/register", json=CREDENTIALS)
    r = client.post("/auth/logout")
    assert r.status_code == 204
    r_me = client.get("/auth/me")
    assert r_me.status_code == 401
