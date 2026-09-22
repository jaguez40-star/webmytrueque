"""Tests del login con Google. Google se simula: no se hacen llamadas de red reales."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import create_oauth_state
from src.features.auth.google import GoogleProfile
from src.features.auth.models import User

EMAIL = "ana@correo.com"
PASSWORD = "supersegura123"


@pytest.fixture
def fake_google() -> Iterator[dict[str, GoogleProfile]]:
    """Sustituye el intercambio con Google por un perfil controlado."""
    holder = {"profile": GoogleProfile(sub="sub-123", email=EMAIL, email_verified=True)}

    def _fake(code: str) -> GoogleProfile:
        return holder["profile"]

    with patch("src.features.auth.api.exchange_code_for_profile", side_effect=_fake):
        yield holder


def test_google_login_redirige_a_google(client: TestClient) -> None:
    r = client.get("/auth/google", follow_redirects=False)
    assert r.status_code == 302
    location = r.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
    assert "client_id=" in location
    assert "state=" in location


def test_callback_sin_state_es_rechazado(client: TestClient, fake_google: dict) -> None:
    r = client.get("/auth/google/callback?code=abc", follow_redirects=False)
    assert r.status_code == 302
    assert "auth=error" in r.headers["location"]
    assert "estado_invalido" in r.headers["location"]


def test_callback_con_state_falsificado_es_rechazado(
    client: TestClient, fake_google: dict
) -> None:
    r = client.get(
        "/auth/google/callback?code=abc&state=falsificado", follow_redirects=False
    )
    assert r.status_code == 302
    assert "estado_invalido" in r.headers["location"]


def test_callback_con_error_de_google_redirige_con_motivo(client: TestClient) -> None:
    state = create_oauth_state()
    r = client.get(
        f"/auth/google/callback?error=access_denied&state={state}", follow_redirects=False
    )
    assert r.status_code == 302
    assert "auth=error" in r.headers["location"]
    assert "access_denied" in r.headers["location"]


def test_google_crea_usuario_nuevo_sin_password(
    client: TestClient, fake_google: dict
) -> None:
    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert r.status_code == 302
    assert "auth=ok" in r.headers["location"]
    assert "trueque_session" in r.cookies

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL
    assert me.json()["handle"].startswith("@trq-")


def test_google_vincula_a_cuenta_existente_conservando_handle(
    client: TestClient, fake_google: dict
) -> None:
    # 1. cuenta creada con correo/contraseña
    reg = client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    handle_original = reg.json()["handle"]
    client.post("/auth/logout")

    # 2. entra con Google usando el MISMO correo
    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert "auth=ok" in r.headers["location"]

    me = client.get("/auth/me")
    assert me.json()["handle"] == handle_original, "debe conservar su @usuario, no crear otro"


def test_google_no_vincula_si_el_correo_no_esta_verificado(
    client: TestClient, fake_google: dict
) -> None:
    client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    client.post("/auth/logout")
    fake_google["profile"] = GoogleProfile(sub="sub-atacante", email=EMAIL, email_verified=False)

    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert "correo_no_verificado" in r.headers["location"]
    assert "trueque_session" not in r.cookies, "no debe dar sesión"


def test_segundo_login_con_google_reutiliza_la_misma_cuenta(
    client: TestClient, fake_google: dict, db_users: Session
) -> None:
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    client.post("/auth/logout")
    state2 = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state2}", follow_redirects=False)

    total = db_users.query(User).count()
    assert total == 1, "no debe crear una cuenta por cada login"


def test_el_correo_de_google_se_normaliza_a_minusculas(
    client: TestClient, fake_google: dict
) -> None:
    fake_google["profile"] = GoogleProfile(
        sub="sub-may", email="Ana@Correo.COM", email_verified=True
    )
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    me = client.get("/auth/me")
    assert me.json()["email"] == "ana@correo.com"


def test_usuario_solo_google_no_puede_entrar_con_password(
    client: TestClient, fake_google: dict
) -> None:
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    client.post("/auth/logout")

    r = client.post("/auth/login", json={"email": EMAIL, "password": "loquesea123"})
    assert r.status_code == 401, "sin contraseña definida, el login por contraseña debe fallar"
