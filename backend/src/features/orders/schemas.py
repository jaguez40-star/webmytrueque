"""Schemas de salida del feature orders.

La entrada NO tiene schema: `POST /orders` es multipart (archivos + campos sueltos), y eso
se declara con `Form(...)` y `File(...)` en el endpoint, no con un BaseModel.
"""

from datetime import datetime

from pydantic import BaseModel, field_serializer


def _a_iso_utc(valor: datetime | None) -> str | None:
    """'2026-09-22T04:20:49' -> '2026-09-22T04:20:49Z'.

    🔴 Sin la Z, `new Date(iso)` del navegador interpreta la fecha como hora LOCAL. En
    Colombia (UTC-5) eso hace que una orden recién creada parezca estar 5 h en el futuro,
    y `haceCuanto()` devuelve 'recién' para todo durante 5 horas.
    """
    if valor is None:
        return None
    return valor.isoformat() + "Z"


class OrderFileOut(BaseModel):
    nombre: str
    extension: str
    bytes: int
    hash: str
    subidoEn: datetime  # noqa: N815 — camelCase a propósito: lo consume el frontend

    model_config = {"from_attributes": True}

    @field_serializer("subidoEn")
    def _serializar_subido(self, valor: datetime) -> str | None:
        return _a_iso_utc(valor)


class CounterpartyOut(BaseModel):
    nombre: str
    handle: str
    operaciones: int


class OrderOut(BaseModel):
    id: str
    estado: str
    # 'vendedor' o 'comprador', SEGÚN QUIÉN PREGUNTA. La misma orden se serializa distinto
    # para cada una de las dos partes.
    rol: str
    contraparte: CounterpartyOut
    archivos: list[OrderFileOut]
    montoCop: int  # noqa: N815
    creadaEn: datetime  # noqa: N815
    liberaAutomaticaEn: datetime | None  # noqa: N815
    purgaEn: datetime | None  # noqa: N815
    comprobante: None = None

    @field_serializer("creadaEn", "liberaAutomaticaEn", "purgaEn")
    def _serializar_fechas(self, valor: datetime | None) -> str | None:
        return _a_iso_utc(valor)
