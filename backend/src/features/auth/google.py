"""Cliente del flujo OAuth 2.0 (authorization code) de Google.

Sin librería de OAuth: son dos llamadas HTTP. Usar authlib/google-auth aquí añadiría
peso y ocultaría el flujo, que es corto y conviene tener a la vista.
"""

import urllib.parse
from dataclasses import dataclass

import httpx2 as httpx

from src.core.config import get_settings

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
# Verificado en https://accounts.google.com/.well-known/openid-configuration
USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"

SCOPES = "openid email profile"
HTTP_TIMEOUT_SECONDS = 15


class GoogleAuthError(Exception):
    """Falló el diálogo con Google (red, credenciales o código inválido)."""


@dataclass(frozen=True)
class GoogleProfile:
    """Los únicos datos de Google que nos interesan."""

    sub: str
    email: str
    email_verified: bool


def build_authorization_url(state: str) -> str:
    """URL de la pantalla de consentimiento a la que mandamos al usuario."""
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "online",
        # select_account: si el usuario tiene varias cuentas, que elija en vez de entrar
        # con la última usada sin preguntar.
        "prompt": "select_account",
    }
    return f"{AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"


def exchange_code_for_profile(code: str) -> GoogleProfile:
    """Cambia el código de un solo uso por el perfil del usuario.

    Dos llamadas: token endpoint (autenticando con el client secret) y userinfo.
    No se valida la firma del id_token: el token viene directo de Google por HTTPS,
    no a través del navegador, así que el canal ya es de confianza.
    """
    settings = get_settings()
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            token_response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_response.status_code != 200:
                raise GoogleAuthError(
                    f"el token endpoint respondió {token_response.status_code}: "
                    f"{token_response.text[:200]}"
                )
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise GoogleAuthError("la respuesta de Google no traía access_token")

            userinfo_response = client.get(
                USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_response.status_code != 200:
                raise GoogleAuthError(
                    f"userinfo respondió {userinfo_response.status_code}"
                )
            info = userinfo_response.json()
    except httpx.HTTPError as exc:
        raise GoogleAuthError(f"no se pudo contactar a Google: {exc}") from exc

    sub = info.get("sub")
    email = info.get("email")
    if not sub or not email:
        raise GoogleAuthError("el perfil de Google no traía 'sub' o 'email'")

    return GoogleProfile(
        sub=str(sub),
        email=str(email),
        email_verified=bool(info.get("email_verified", False)),
    )
