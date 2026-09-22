"""Lógica de negocio de auth: generar handle único, registrar, autenticar."""

import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import hash_password, verify_password
from src.features.auth.google import GoogleProfile
from src.features.auth.models import User
from src.features.auth.schemas import RegisterIn

_HANDLE_ALPHABET = string.ascii_lowercase + string.digits
_HANDLE_MAX_ATTEMPTS = 20


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def generate_unique_handle(db: Session) -> str:
    """Genera un @usuario con el formato @trq-XXXX (4 chars alfanuméricos), único."""
    for _ in range(_HANDLE_MAX_ATTEMPTS):
        suffix = "".join(secrets.choice(_HANDLE_ALPHABET) for _ in range(4))
        handle = f"@trq-{suffix}"
        exists = db.scalar(select(User.id).where(User.handle == handle))
        if exists is None:
            return handle
    raise RuntimeError("no se pudo generar un @usuario único tras varios intentos")


def register_user(db: Session, payload: RegisterIn) -> User:
    email = payload.email.lower()
    already_exists = db.scalar(select(User.id).where(User.email == email))
    if already_exists is not None:
        raise EmailAlreadyRegisteredError

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        handle=generate_unique_handle(db),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    # `password_hash` es None en las cuentas creadas solo con Google: esas no pueden
    # entrar por contraseña. Sin este chequeo, bcrypt recibe None y revienta con un 500.
    if user is None or user.password_hash is None:
        raise InvalidCredentialsError
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    return user


class EmailNotVerifiedError(Exception):
    """Google no confirmó que el usuario sea dueño de ese correo."""


def login_or_link_google_user(db: Session, profile: GoogleProfile) -> User:
    """Resuelve el usuario a partir de un perfil de Google. Tres caminos:

    1. Ya conocemos ese `google_id` -> entra.
    2. Existe una cuenta con ese correo -> se vincula (decisión del producto).
    3. Nadie con ese correo -> cuenta nueva, sin contraseña.

    🔴 `email_verified` es obligatorio en los casos 2 y 3: sin esa comprobación,
    cualquiera podría crear una cuenta de Google con el correo de otra persona y
    apropiarse de su cuenta ya existente en MyTrueque.
    """
    existing_by_google = db.scalar(select(User).where(User.google_id == profile.sub))
    if existing_by_google is not None:
        return existing_by_google

    if not profile.email_verified:
        raise EmailNotVerifiedError

    email = profile.email.lower()
    existing_by_email = db.scalar(select(User).where(User.email == email))
    if existing_by_email is not None:
        existing_by_email.google_id = profile.sub
        db.commit()
        db.refresh(existing_by_email)
        return existing_by_email

    user = User(
        email=email,
        password_hash=None,
        handle=generate_unique_handle(db),
        google_id=profile.sub,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
