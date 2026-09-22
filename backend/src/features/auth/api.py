"""Endpoints de auth: registro, login, logout, sesión actual y Google."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse

from src.core.config import get_settings
from src.core.security import (
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
    create_oauth_state,
    create_session_token,
    verify_oauth_state,
)
from src.features.auth.dependencies import DbDep, get_current_user
from src.features.auth.google import (
    GoogleAuthError,
    build_authorization_url,
    exchange_code_for_profile,
)
from src.features.auth.models import User
from src.features.auth.schemas import LoginIn, RegisterIn, UserOut
from src.features.auth.service import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    authenticate_user,
    login_or_link_google_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=create_session_token(user_id),
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=False,  # TODO: True cuando el backend sirva por HTTPS (fuera de alcance)
    )


def _salida(user: User) -> UserOut:
    """Traduce el usuario al contrato público, resolviendo si es el administrador.

    El modelo no guarda roles: el admin es un correo del `.env`, así que la respuesta se
    arma aquí en vez de leerse de la fila.
    """
    return UserOut(
        email=user.email,
        handle=user.handle,
        esAdmin=get_settings().es_admin(user.email),
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, response: Response, db: DbDep) -> UserOut:
    try:
        user = register_user(db, payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese correo ya está registrado.") from exc
    _set_session_cookie(response, user.id)
    return _salida(user)


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: DbDep) -> UserOut:
    try:
        user = authenticate_user(db, payload.email, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos."
        ) from exc
    _set_session_cookie(response, user.id)
    return _salida(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME)


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _salida(user)


@router.get("/google")
def google_login() -> RedirectResponse:
    """Manda al usuario a la pantalla de consentimiento de Google."""
    state = create_oauth_state()
    return RedirectResponse(build_authorization_url(state), status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
def google_callback(
    db: DbDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Vuelta desde Google. Siempre redirige al frontend — nunca devuelve JSON:
    a esta URL llega el NAVEGADOR por una redirección, no un fetch.
    """
    settings = get_settings()

    # El usuario canceló, o no está en la lista de usuarios de prueba.
    if error:
        return _redirect_to_frontend(settings.frontend_url, "error", error)

    # `state` ausente o falsificado: posible CSRF, no seguimos.
    if not state or not verify_oauth_state(state):
        return _redirect_to_frontend(settings.frontend_url, "error", "estado_invalido")

    if not code:
        return _redirect_to_frontend(settings.frontend_url, "error", "sin_codigo")

    try:
        profile = exchange_code_for_profile(code)
        user = login_or_link_google_user(db, profile)
    except EmailNotVerifiedError:
        return _redirect_to_frontend(settings.frontend_url, "error", "correo_no_verificado")
    except GoogleAuthError:
        return _redirect_to_frontend(settings.frontend_url, "error", "google_fallo")

    response = _redirect_to_frontend(settings.frontend_url, "ok", None)
    _set_session_cookie(response, user.id)
    return response


def _redirect_to_frontend(frontend_url: str, auth: str, reason: str | None) -> RedirectResponse:
    query = f"?auth={auth}" + (f"&reason={reason}" if reason else "")
    return RedirectResponse(f"{frontend_url}/{query}", status_code=status.HTTP_302_FOUND)
