"""Endpoints de órdenes: crear una custodia y listar las propias."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from src.core.storage import SinEspacioEnDiscoError
from src.features.auth.dependencies import DbDep, get_current_user
from src.features.auth.models import User
from src.features.orders.schemas import OrderOut
from src.features.orders.service import (
    CompradorEsElVendedorError,
    CompradorNoEncontradoError,
    DemasiadoGrandeError,
    MontoInvalidoError,
    SinArchivosError,
    crear_orden,
    listar_ordenes,
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
    monto: Annotated[str, Form()],
    archivos: Annotated[list[UploadFile], File()],
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
