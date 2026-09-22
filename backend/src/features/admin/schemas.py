"""Lo que el panel de almacenamiento devuelve. Solo lectura: no hay entrada que validar."""

from datetime import datetime

from pydantic import BaseModel, field_serializer


class ArchivoAdminOut(BaseModel):
    id: str
    nombre: str
    bytes: int
    # False = la fila está en la base pero el archivo no está en el disco. Pasa si alguien
    # borró a mano por SSH, y es justo lo que este panel tiene que dejar ver.
    enDisco: bool  # noqa: N815 — camelCase a propósito: lo consume el frontend


class OrdenAdminOut(BaseModel):
    id: str
    estado: str
    vendedor: str
    comprador: str
    creadaEn: datetime  # noqa: N815
    purgaEn: datetime | None  # noqa: N815
    bytesEnDisco: int  # noqa: N815
    archivos: list[ArchivoAdminOut]

    @field_serializer("creadaEn", "purgaEn")
    def _fechas(self, valor: datetime | None) -> str | None:
        return None if valor is None else valor.isoformat() + "Z"


class HuerfanoOut(BaseModel):
    """Una carpeta que está en el disco y no le corresponde ninguna orden.

    Puede quedar si un rollback falla a mitad de una subida. Nadie la ve desde la app y
    nadie la borra: ocupa disco para siempre hasta que alguien mire.
    """

    nombre: str
    bytes: int
    archivos: int


class AlmacenamientoOut(BaseModel):
    discoTotalBytes: int  # noqa: N815
    discoLibreBytes: int  # noqa: N815
    custodiaBytes: int  # noqa: N815
    ordenes: list[OrdenAdminOut]
    huerfanos: list[HuerfanoOut]
