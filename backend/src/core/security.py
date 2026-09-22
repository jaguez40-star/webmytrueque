"""Hash de contraseña (bcrypt directo) y cookie de sesión firmada (itsdangerous).

Decisión cerrada: bcrypt directo, no passlib — passlib tiene un bug sin resolver con
bcrypt>=4.1 (AttributeError sobre `__about__`), reproducido en la verificación de este
plan. bcrypt.hashpw/checkpw son las dos únicas funciones que hacen falta.
"""

import bcrypt
from itsdangerous import BadSignature, URLSafeTimedSerializer

from src.core.config import get_settings

SESSION_COOKIE_NAME = "trueque_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 días

settings = get_settings()
_serializer = URLSafeTimedSerializer(settings.secret_key, salt="session")


def hash_password(raw_password: str) -> str:
    return bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(raw_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_session_token(user_id: int) -> str:
    return _serializer.dumps({"uid": user_id})


def read_session_token(token: str) -> int | None:
    """Devuelve el user_id si el token es válido y no expiró; None si no."""
    try:
        data = _serializer.loads(token, max_age=SESSION_MAX_AGE_SECONDS)
    except BadSignature:
        return None
    uid = data.get("uid")
    return uid if isinstance(uid, int) else None


# --- `state` anti-CSRF del flujo OAuth ---
# Se firma con la misma clave que la sesión, con otro `salt` para que un token no sirva
# como el otro. Un `state` manipulado o inventado no pasa la verificación.

_oauth_state_serializer = URLSafeTimedSerializer(settings.secret_key, salt="oauth-state")
OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10  # 10 minutos para completar el login


def create_oauth_state() -> str:
    import secrets as _secrets

    return _oauth_state_serializer.dumps({"n": _secrets.token_urlsafe(16)})


def verify_oauth_state(state: str) -> bool:
    try:
        _oauth_state_serializer.loads(state, max_age=OAUTH_STATE_MAX_AGE_SECONDS)
    except BadSignature:
        return False
    return True
