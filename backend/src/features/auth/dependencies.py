"""Dependencia de FastAPI para resolver el usuario autenticado desde la cookie."""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.db import get_db
from src.core.security import SESSION_COOKIE_NAME, read_session_token
from src.features.auth.models import User

DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User:
    if session_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No hay sesión activa.")
    user_id = read_session_token(session_token)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "El usuario ya no existe.")
    return user
