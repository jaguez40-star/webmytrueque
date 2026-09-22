"""Lo que el panel de administración sabe del disco.

Su trabajo es cruzar DOS fuentes que pueden no coincidir: las filas de la base de datos y
lo que hay de verdad en `data/custodia/`. Toda la app trabaja con la primera; este módulo
es el único sitio donde se mira la segunda y se señalan las diferencias.
"""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.config import get_settings
from src.core.storage import (
    disco_total_bytes,
    espacio_libre_bytes,
    peso_de_carpeta,
)
from src.features.admin.schemas import (
    AlmacenamientoOut,
    ArchivoAdminOut,
    HuerfanoOut,
    OrdenAdminOut,
)
from src.features.auth.models import User
from src.features.orders.models import Order


class CarpetaNoValidaError(Exception):
    """El nombre de carpeta no es un id de orden. Ver `carpeta_huerfana()`."""


def _handles(db: Session, ordenes: list[Order]) -> dict[int, str]:
    ids = {o.seller_id for o in ordenes} | {o.buyer_id for o in ordenes}
    if not ids:
        return {}
    return {u.id: u.handle for u in db.scalars(select(User).where(User.id.in_(ids))).all()}


def resumen(db: Session) -> AlmacenamientoOut:
    raiz = get_settings().custodia_path
    raiz.mkdir(parents=True, exist_ok=True)

    ordenes = list(
        db.scalars(select(Order).options(selectinload(Order.files)).order_by(Order.id.desc())).all()
    )
    handles = _handles(db, ordenes)

    filas: list[OrdenAdminOut] = []
    for orden in ordenes:
        carpeta = raiz / str(orden.id)
        filas.append(
            OrdenAdminOut(
                id=str(orden.id),
                estado=orden.state,
                vendedor=handles.get(orden.seller_id, "?"),
                comprador=handles.get(orden.buyer_id, "?"),
                creadaEn=orden.created_at,
                purgaEn=orden.purge_at,
                bytesEnDisco=peso_de_carpeta(carpeta),
                archivos=[
                    ArchivoAdminOut(
                        id=str(a.id),
                        nombre=a.original_name,
                        bytes=a.size_bytes,
                        enDisco=(carpeta / a.stored_name).is_file(),
                    )
                    for a in orden.files
                ],
            )
        )

    conocidas = {str(o.id) for o in ordenes}
    huerfanos = [
        HuerfanoOut(
            nombre=carpeta.name,
            bytes=peso_de_carpeta(carpeta),
            archivos=len([f for f in carpeta.iterdir() if f.is_file()]),
        )
        for carpeta in sorted(raiz.iterdir())
        if carpeta.is_dir() and carpeta.name not in conocidas
    ]

    return AlmacenamientoOut(
        discoTotalBytes=disco_total_bytes(raiz),
        discoLibreBytes=espacio_libre_bytes(raiz),
        custodiaBytes=sum(peso_de_carpeta(c) for c in raiz.iterdir() if c.is_dir()),
        ordenes=filas,
        huerfanos=huerfanos,
    )


def carpeta_huerfana(nombre: str) -> Path:
    """Resuelve el nombre de una carpeta huérfana a una ruta, o falla.

    🔴 Dos cerrojos contra `../`: el nombre tiene que ser SOLO dígitos (los ids de orden lo
    son) y además la ruta resuelta tiene que caer dentro de la carpeta de custodia. Sin
    esto, un `nombre` con barras convierte este endpoint en un borrador de cualquier
    fichero del servidor.
    """
    if not nombre.isdigit():
        raise CarpetaNoValidaError

    raiz = get_settings().custodia_path.resolve()
    destino = (raiz / nombre).resolve()
    if not destino.is_relative_to(raiz) or not destino.is_dir():
        raise CarpetaNoValidaError
    return destino
