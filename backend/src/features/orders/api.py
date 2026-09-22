"""Endpoints de órdenes: crear una custodia y listar las propias."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.core.storage import SinEspacioEnDiscoError
from src.features.auth.dependencies import DbDep, get_current_user
from src.features.auth.models import User
from src.features.orders.schemas import OrderOut
from src.features.orders.service import (
    ArchivoNoEncontradoError,
    CompradorEsElVendedorError,
    CompradorNoEncontradoError,
    DemasiadoGrandeError,
    MontoInvalidoError,
    NoAutorizadaError,
    NoEresElCompradorError,
    NoEresElVendedorError,
    OrdenNoEncontradaError,
    SinArchivosError,
    YaDescargadaError,
    archivo_para_descarga,
    cambiar_autorizacion,
    crear_orden,
    listar_ordenes,
    purgar_archivo,
    purgar_orden,
    serializar_lote,
    serializar_orden,
)

router = APIRouter(prefix="/orders", tags=["orders"])

UsuarioDep = Annotated[User, Depends(get_current_user)]


def _mb(bytes_: int) -> str:
    return f"{bytes_ / 1024**3:.2f} GB"


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def crear(
    db: DbDep,
    usuario: UsuarioDep,
    comprador: Annotated[str, Form()],
    archivos: Annotated[list[UploadFile], File()],
    # Opcional, y va al final porque un parámetro con valor por defecto no puede preceder
    # a uno sin él. El formulario dejó de pedir el monto: el dinero nunca pasa por aquí,
    # así que la cifra no gobernaba ninguna decisión. Se sigue aceptando si alguien lo
    # manda, porque la columna existe y hay órdenes viejas que lo tienen.
    monto: Annotated[str, Form()] = "",
) -> OrderOut:
    try:
        orden = crear_orden(db, usuario, comprador, monto, archivos)
    except SinArchivosError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Elige al menos un archivo."
        ) from exc
    except MontoInvalidoError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "El monto debe ser un número mayor que cero."
        ) from exc
    except CompradorNoEncontradoError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Ese @usuario no existe. Revísalo con el comprador."
        ) from exc
    except CompradorEsElVendedorError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "No puedes venderte un archivo a ti mismo."
        ) from exc
    except DemasiadoGrandeError as exc:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Son {_mb(exc.total)} y el máximo por orden es {_mb(exc.maximo)}.",
        ) from exc
    except SinEspacioEnDiscoError as exc:
        # 507 y no 500: no es un fallo del servidor, es que ahora mismo no cabe. El mensaje
        # tiene que decir qué hacer, porque el usuario no puede arreglar el disco.
        raise HTTPException(
            status.HTTP_507_INSUFFICIENT_STORAGE,
            "No hay espacio en custodia ahora mismo. Inténtalo cuando se cierre alguna orden.",
        ) from exc

    return serializar_orden(db, orden, usuario)


@router.get("", response_model=list[OrderOut])
def listar(db: DbDep, usuario: UsuarioDep) -> list[OrderOut]:
    return serializar_lote(db, listar_ordenes(db, usuario), usuario)


class AutorizacionIn(BaseModel):
    autorizado: bool


@router.put("/{orden_id}/autorizacion", response_model=OrderOut)
def autorizar(
    orden_id: int, payload: AutorizacionIn, db: DbDep, usuario: UsuarioDep
) -> OrderOut:
    """El interruptor "Autorizo descarga" del vendedor. Idempotente: manda el estado que quiere."""
    try:
        orden = cambiar_autorizacion(db, orden_id, usuario, payload.autorizado)
    except OrdenNoEncontradaError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa orden no existe.") from exc
    except NoEresElVendedorError as exc:
        # 404 y no 403: quien no vende esta orden no tiene por qué saber que existe.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa orden no existe.") from exc
    except YaDescargadaError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "El comprador ya descargó los archivos: la autorización no se puede revocar.",
        ) from exc

    return serializar_orden(db, orden, usuario)


@router.delete("/{orden_id}", response_model=OrderOut)
def purgar(orden_id: int, db: DbDep, usuario: UsuarioDep) -> OrderOut:
    """El vendedor borra los archivos de su orden. El comprador no puede: no son suyos."""
    try:
        orden = purgar_orden(db, orden_id, usuario)
    except (OrdenNoEncontradaError, NoEresElVendedorError) as exc:
        # 404 también para el comprador: quien no vende esta orden no la puede tocar, y un
        # 403 confirmaría que existe.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa orden no existe.") from exc

    return serializar_orden(db, orden, usuario)


@router.delete("/{orden_id}/archivos/{archivo_id}", response_model=OrderOut)
def purgar_uno(orden_id: int, archivo_id: int, db: DbDep, usuario: UsuarioDep) -> OrderOut:
    """El vendedor borra UN archivo de su orden. Los demás siguen en custodia."""
    try:
        orden = purgar_archivo(db, orden_id, archivo_id, usuario)
    except (
        OrdenNoEncontradaError,
        NoEresElVendedorError,
        ArchivoNoEncontradoError,
    ) as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no existe.") from exc

    return serializar_orden(db, orden, usuario)


@router.get("/{orden_id}/archivos/{archivo_id}")
def descargar(orden_id: int, archivo_id: int, db: DbDep, usuario: UsuarioDep) -> FileResponse:
    """Descarga un archivo de la orden. Solo el comprador, y solo si el vendedor autorizó."""
    try:
        archivo, ruta = archivo_para_descarga(db, orden_id, archivo_id, usuario)
    except (OrdenNoEncontradaError, NoEresElCompradorError, ArchivoNoEncontradoError) as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no existe.") from exc
    except NoAutorizadaError as exc:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "El vendedor todavía no autorizó la descarga.",
        ) from exc

    # `filename` devuelve el nombre ORIGINAL, no el UUID con el que se guardó en disco.
    return FileResponse(ruta, filename=archivo.original_name)
