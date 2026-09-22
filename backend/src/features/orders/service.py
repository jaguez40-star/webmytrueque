"""Lógica de negocio de las órdenes: crearlas y listarlas.

Las excepciones son propias, no HTTPException: traducirlas a HTTP es tarea de `api.py`.
Es el mismo reparto que ya usa el feature `auth`.
"""

from datetime import timedelta
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.core.config import get_settings
from src.core.storage import (
    borrar_carpeta,
    extension_de,
    guardar_archivo,
    verificar_espacio,
)
from src.features.auth.models import User
from src.features.orders.models import Order, OrderFile, ahora_utc
from src.features.orders.schemas import CounterpartyOut, OrderFileOut, OrderOut

DIAS_HASTA_PURGA = 30


class CompradorNoEncontradoError(Exception):
    pass


class CompradorEsElVendedorError(Exception):
    pass


class SinArchivosError(Exception):
    pass


class DemasiadoGrandeError(Exception):
    def __init__(self, total: int, maximo: int) -> None:
        self.total = total
        self.maximo = maximo
        super().__init__()


class MontoInvalidoError(Exception):
    pass


def _parsear_monto(monto_bruto: str) -> int:
    """'450.000' o '450000' -> 450000. El frontend manda el texto tal cual se escribió."""
    limpio = monto_bruto.replace(".", "").replace(",", "").replace(" ", "").strip()
    if not limpio.isdigit():
        raise MontoInvalidoError
    monto = int(limpio)
    if monto <= 0:
        raise MontoInvalidoError
    return monto


def crear_orden(
    db: Session,
    vendedor: User,
    handle_comprador: str,
    monto_bruto: str,
    subidas: list[UploadFile],
) -> Order:
    if not subidas:
        raise SinArchivosError

    monto = _parsear_monto(monto_bruto)

    handle = handle_comprador.strip().lower()
    if not handle.startswith("@"):
        handle = f"@{handle}"
    comprador = db.scalar(select(User).where(User.handle == handle))
    if comprador is None:
        raise CompradorNoEncontradoError
    if comprador.id == vendedor.id:
        raise CompradorEsElVendedorError

    ajustes = get_settings()

    # El navegador ya avisa del tope, pero ese aviso es comodidad: un `curl` se lo salta.
    # `UploadFile.size` lo rellena Starlette al parsear el multipart.
    total_declarado = sum(subida.size or 0 for subida in subidas)
    if total_declarado > ajustes.max_order_bytes:
        raise DemasiadoGrandeError(total_declarado, ajustes.max_order_bytes)

    # Antes de escribir un solo byte: si no cabe dejando margen, se rechaza. Llenar el
    # disco no degrada el servicio, lo tumba (ver §1.2 del plan).
    verificar_espacio(ajustes.custodia_path, total_declarado)

    orden = Order(
        seller_id=vendedor.id,
        buyer_id=comprador.id,
        amount_cop=monto,
        state="EN_CUSTODIA",
        purge_at=ahora_utc() + timedelta(days=DIAS_HASTA_PURGA),
    )
    db.add(orden)
    db.flush()  # asigna orden.id sin cerrar la transacción: hace falta para el nombre de la carpeta

    carpeta = ajustes.custodia_path / str(orden.id)
    escritos = 0
    try:
        for subida in subidas:
            nombre_original = Path(subida.filename or "archivo").name
            nombre_en_disco, tamano, sha = guardar_archivo(subida, carpeta)
            escritos += tamano
            # Se vuelve a comprobar con el tamaño REAL escrito: `size` viene del multipart
            # y no obliga a nada. Sin esto, un cliente hostil declara 1 KB y manda 10 GB.
            if escritos > ajustes.max_order_bytes:
                raise DemasiadoGrandeError(escritos, ajustes.max_order_bytes)
            db.add(
                OrderFile(
                    order_id=orden.id,
                    original_name=nombre_original[:255],
                    stored_name=nombre_en_disco,
                    extension=extension_de(nombre_original),
                    size_bytes=tamano,
                    sha256=sha,
                )
            )
        db.commit()
    except Exception:
        # Todo o nada: ni filas huérfanas en la BD ni bytes huérfanos en el disco.
        db.rollback()
        borrar_carpeta(carpeta)
        raise

    db.refresh(orden)
    return orden


def listar_ordenes(db: Session, usuario: User) -> list[Order]:
    """Las órdenes donde el usuario es vendedor O comprador, las más recientes primero.

    `selectinload` evita el problema N+1: sin él, serializar 20 órdenes lanza 21 consultas.
    """
    consulta = (
        select(Order)
        .where((Order.seller_id == usuario.id) | (Order.buyer_id == usuario.id))
        .options(selectinload(Order.files))
        .order_by(Order.id.desc())
    )
    return list(db.scalars(consulta).all())


def _operaciones_por_usuario(db: Session, usuario_ids: set[int]) -> dict[int, int]:
    """Órdenes cerradas de CADA usuario, en UNA consulta.

    🔴 Ni un SELECT por orden ni `len(list(...))`: lo primero es un N+1 (listar 20 órdenes
    disparaba 43 consultas) y lo segundo trae todas las filas a memoria para contarlas.
    Aquí se cuenta en la base de datos y se resuelve el lote entero de una vez.
    """
    if not usuario_ids:
        return {}
    cerradas = Order.state.in_(("DESCARGADO", "PURGADO"))
    conteo: dict[int, int] = dict.fromkeys(usuario_ids, 0)
    for columna in (Order.seller_id, Order.buyer_id):
        filas = db.execute(
            select(columna, func.count())
            .where(columna.in_(usuario_ids) & cerradas)
            .group_by(columna)
        ).all()
        for usuario_id, total in filas:
            conteo[usuario_id] = conteo.get(usuario_id, 0) + total
    return conteo


def serializar_lote(db: Session, ordenes: list[Order], usuario: User) -> list[OrderOut]:
    """Serializa varias órdenes resolviendo las contrapartes de una sola vez."""
    otros_ids = {
        (orden.buyer_id if orden.seller_id == usuario.id else orden.seller_id)
        for orden in ordenes
    }
    contrapartes = {
        fila.id: fila
        for fila in db.scalars(select(User).where(User.id.in_(otros_ids))).all()
    } if otros_ids else {}
    operaciones = _operaciones_por_usuario(db, otros_ids)
    return [
        _serializar(orden, usuario, contrapartes, operaciones) for orden in ordenes
    ]


def serializar_orden(db: Session, orden: Order, usuario: User) -> OrderOut:
    """Una sola orden. Se apoya en el lote para no duplicar la lógica."""
    return serializar_lote(db, [orden], usuario)[0]


def _serializar(
    orden: Order,
    usuario: User,
    contrapartes: dict[int, User],
    operaciones: dict[int, int],
) -> OrderOut:
    """Convierte una orden al contrato que espera el frontend.

    🔴 `rol` y `contraparte` dependen de QUIÉN pregunta: la misma fila se ve como
    'vendedor' para uno y 'comprador' para el otro.
    """
    soy_vendedor = orden.seller_id == usuario.id
    otro_id = orden.buyer_id if soy_vendedor else orden.seller_id
    otro = contrapartes.get(otro_id)
    handle_otro = otro.handle if otro is not None else "@desconocido"

    return OrderOut(
        id=str(orden.id),
        estado=orden.state,
        rol="vendedor" if soy_vendedor else "comprador",
        contraparte=CounterpartyOut(
            # No hay nombre real en el modelo de usuario: el handle ES la identidad.
            nombre=handle_otro,
            handle=handle_otro,
            operaciones=operaciones.get(otro_id, 0),
        ),
        archivos=[
            OrderFileOut(
                nombre=archivo.original_name,
                extension=archivo.extension,
                bytes=archivo.size_bytes,
                hash=archivo.sha256,
                subidoEn=archivo.uploaded_at,
            )
            for archivo in orden.files
        ],
        montoCop=orden.amount_cop,
        creadaEn=orden.created_at,
        # Solo tiene valor en PAGO_ENVIADO, y una orden recién creada nunca está ahí.
        liberaAutomaticaEn=None,
        purgaEn=orden.purge_at,
    )
