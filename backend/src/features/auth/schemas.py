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

    model_config = {"from_attributes": True}
