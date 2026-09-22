"""Panel de almacenamiento. UNA sola cuenta entra aquí; para el resto no existe.

Lo que esta pantalla puede hacer —leer y borrar cualquier archivo de cualquier usuario—
ya lo podía hacer quien tuviera la clave SSH del servidor. Lo que cambia es la puerta: de
necesitar el `.pem` a necesitar una sesión. Por eso todo lo de aquí responde 404 a quien
no sea el administrador, en vez de 403.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse

from src.core.config import get_settings
from src.core.storage import borrar_carpeta, zip_en_streaming
from src.features.admin.schemas import AlmacenamientoOut
from src.features.admin.service import CarpetaNoValidaError, carpeta_huerfana, resumen
from src.features.auth.dependencies import DbDep, get_admin_user
from src.features.auth.models import User
from src.features.orders.models import Order, OrderFile
from src.features.orders.service import (
    ArchivoNoEncontradoError,
    purgar_archivo_sin_permisos,
    purgar_orden_sin_permisos,
)

router = APIRouter(prefix="/admin", tags=["admin"])

AdminDep = Annotated[User, Depends(get_admin_user)]

_NO_EXISTE = "No encontrado."


def _orden(db: DbDep, orden_id: int) -> Order:
    orden = db.get(Order, orden_id)
    if orden is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NO_EXISTE)
    return orden


@router.get("/almacenamiento", response_model=AlmacenamientoOut)
def almacenamiento(db: DbDep, admin: AdminDep) -> AlmacenamientoOut:
    """Disco, órdenes y lo que sobra. Es la única vista que cruza la base con el disco."""
    return resumen(db)


@router.get("/ordenes/{orden_id}/zip")
def descargar_orden(orden_id: int, db: DbDep, admin: AdminDep) -> StreamingResponse:
    """Backup de una orden como ZIP, generado al vuelo.

    🔴 En flujo y no en un fichero temporal: el servidor tiene ~2,9 GB libres y el tope por
    orden es 1 GB — escribir el ZIP antes de mandarlo dejaría el disco al borde.
    """
    orden = _orden(db, orden_id)
    carpeta = get_settings().custodia_path / str(orden.id)
    archivos = [(carpeta / a.stored_name, a.original_name) for a in orden.files]
    if not any(ruta.is_file() for ruta, _ in archivos):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa orden no tiene archivos en disco.")

    return StreamingResponse(
        zip_en_streaming(archivos),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="orden-{orden.id}.zip"'},
    )


@router.get("/ordenes/{orden_id}/archivos/{archivo_id}")
def descargar_archivo(orden_id: int, archivo_id: int, db: DbDep, admin: AdminDep) -> FileResponse:
    orden = _orden(db, orden_id)
    archivo = db.get(OrderFile, archivo_id)
    if archivo is None or archivo.order_id != orden.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NO_EXISTE)

    ruta = get_settings().custodia_path / str(orden.id) / archivo.stored_name
    if not ruta.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo ya no está en el disco.")
    return FileResponse(ruta, filename=archivo.original_name)


@router.delete("/ordenes/{orden_id}", response_model=AlmacenamientoOut)
def purgar_orden_admin(orden_id: int, db: DbDep, admin: AdminDep) -> AlmacenamientoOut:
    """Borra los archivos de una orden. Devuelve el resumen ya actualizado."""
    purgar_orden_sin_permisos(db, _orden(db, orden_id))
    return resumen(db)


@router.delete("/ordenes/{orden_id}/archivos/{archivo_id}", response_model=AlmacenamientoOut)
def purgar_archivo_admin(
    orden_id: int, archivo_id: int, db: DbDep, admin: AdminDep
) -> AlmacenamientoOut:
    try:
        purgar_archivo_sin_permisos(db, _orden(db, orden_id), archivo_id)
    except ArchivoNoEncontradoError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NO_EXISTE) from exc
    return resumen(db)


@router.delete("/huerfanos/{nombre}", response_model=AlmacenamientoOut)
def purgar_huerfano(nombre: str, db: DbDep, admin: AdminDep) -> AlmacenamientoOut:
    """Borra una carpeta del disco que no corresponde a ninguna orden."""
    try:
        carpeta = carpeta_huerfana(nombre)
    except CarpetaNoValidaError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NO_EXISTE) from exc

    # Cinturón y tirantes: si por lo que sea SÍ es una orden viva, no se toca por aquí.
    if db.get(Order, int(nombre)) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Esa carpeta sí tiene orden: bórrala como orden.",
        )

    borrar_carpeta(carpeta)
    return resumen(db)
