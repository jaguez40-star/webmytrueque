"""Modelo de usuario. Soporta dos formas de entrar: correo+contraseña y Google.

`password_hash` es nullable porque quien se registra solo con Google no tiene contraseña.
`google_id` guarda el `sub` que devuelve Google (su identificador estable del usuario) y
es nullable porque quien se registró con contraseña no tiene uno hasta que vincule.
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    handle: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    google_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
