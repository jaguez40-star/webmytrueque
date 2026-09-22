"""Modelos de la custodia: una orden y sus archivos.

Una orden tiene N archivos (el formulario permite elegir varios), así que son dos tablas
y no columnas sueltas en `orders`.
"""

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.db import Base


def ahora_utc() -> datetime:
    """UTC naive: un ÚNICO reloj para todas las fechas del dominio.

    🔴 No usar `server_default=func.now()` mezclado con `datetime.now()`: SQLite resuelve
    `func.now()` en UTC y `datetime.now()` da hora local, así que las dos columnas de la
    misma fila quedaban en husos distintos y la purga caía 5 h antes de los 30 días.
    Se guarda naive porque SQLite ignora `timezone=True` y devolvería naive igualmente; el
    sufijo Z lo pone el schema al serializar.
    """
    return datetime.now(UTC).replace(tzinfo=None)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Quién vende y quién compra. Se indexan los dos porque la bandeja consulta por ambos:
    # una orden aparece en el panel de las dos partes.
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount_cop: Mapped[int] = mapped_column(Integer)
    # Uno de los 6 estados del modelo. Se guarda como texto y no como Enum: SQLite no tiene
    # tipo enum nativo y un CHECK constraint obligaría a una migración por cada estado nuevo.
    state: Mapped[str] = mapped_column(String(16), default="EN_CUSTODIA", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc)
    # Cuándo se purgan los archivos si la orden no cierra (30 días). Lo calcula el servicio.
    purge_at: Mapped[datetime] = mapped_column(DateTime)

    files: Mapped[list["OrderFile"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderFile.id",
    )


class OrderFile(Base):
    __tablename__ = "order_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    # El nombre que puso el usuario. Solo se muestra: NUNCA se usa para construir rutas.
    original_name: Mapped[str] = mapped_column(String(255))
    # El nombre real en disco, un UUID. Ver storage.guardar_archivo.
    stored_name: Mapped[str] = mapped_column(String(64))
    extension: Mapped[str] = mapped_column(String(16))
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc)

    order: Mapped[Order] = relationship(back_populates="files")
