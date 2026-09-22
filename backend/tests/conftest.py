"""Fixtures compartidos: BD SQLite en memoria + cliente de test."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.db import Base, get_db
from src.features.auth.models import User  # noqa: F401
from src.features.orders.models import Order, OrderFile  # noqa: F401
from src.main import app


@pytest.fixture
def _engine():  # type: ignore[no-untyped-def]
    # StaticPool + una sola conexión: sin esto, cada conexión a ":memory:" abre una BD
    # vacía distinta y la app no ve la tabla que creó el fixture (H1).
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(_engine) -> Generator[TestClient, None, None]:  # type: ignore[no-untyped-def]
    TestingSessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def db_users(_engine) -> Generator[Session, None, None]:  # type: ignore[no-untyped-def]
    """Sesión directa a la misma BD del test, para verificar estado."""
    TestingSessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
