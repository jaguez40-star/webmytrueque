"""Schemas Pydantic de entrada/salida del feature auth."""

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    email: str
    handle: str
    # Si esta cuenta ve el panel de almacenamiento. Lo usa el frontend SOLO para decidir si
    # enseña el enlace: el permiso de verdad lo comprueba el backend en cada petición.
    esAdmin: bool = False  # noqa: N815 — camelCase a propósito: lo consume el frontend

    model_config = {"from_attributes": True}
