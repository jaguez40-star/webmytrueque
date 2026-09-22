"""Motor de base de datos y sesión de SQLAlchemy (SQLite)."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.core.config import get_settings

settings = get_settings()

# check_same_thread=False: SQLite + un solo archivo, requerido por FastAPI (workers de
# hilo distintos por request). No es un riesgo aquí: no hay escrituras concurrentes reales
# en un backend de desarrollo con un solo proceso uvicorn.
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
