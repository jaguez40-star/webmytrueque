"""Configuración de la app, leída de variables de entorno (.env)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    secret_key: str
    database_url: str = "sqlite:///./data/trueque.db"
    cors_origins: str = "http://localhost:5173"

    # --- OAuth de Google ---
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"
    frontend_url: str = "http://localhost:5173"

    # --- Custodia de archivos ---
    # Relativa como `database_url`: el backend SIEMPRE se levanta desde backend/.
    custodia_dir: str = "./data/custodia"
    # 1 GiB sumando TODOS los archivos de una orden. El tope real lo fija el disco del
    # servidor (6,7 GB con ~3 GB libres), no el diseño: ver §1.2 del plan.
    max_order_bytes: int = 1024**3

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def custodia_path(self) -> Path:
        return Path(self.custodia_dir)


@lru_cache
def get_settings() -> Settings:
    # Sin `# type: ignore[call-arg]`: el plugin de mypy de pydantic entiende que los
    # campos vienen del .env, y con `strict = true` un ignore innecesario es un ERROR
    # (`unused-ignore`).
    return Settings()
