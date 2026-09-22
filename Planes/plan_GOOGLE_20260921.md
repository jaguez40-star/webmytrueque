# Plan GOOGLE — Login con Google (OAuth 2.0) + botón de cerrar sesión

> Plan de ejecución para agente EXECUTOR externo. **Autocontenido**: no requiere contexto
> previo, conversaciones anteriores ni historial de Git. Ejecutar AL PIE DE LA LETRA, en orden.
> Si un paso falla, DETENERSE y reportar.
>
> **Versión 2 (2026-09-21)** — reformulado tras una segunda auditoría que **ejecutó el plan
> entero** sobre una copia del proyecto: backend y frontend levantados, los 22 tests
> corridos, y el flujo completo ejercitado en Chromium real. La v1 tenía **un bug que
> devolvía HTTP 500**, una instrucción de migración **equivocada** y un warning de lint.
> Los 6 hallazgos están en la **Sección 10**.
>
> Todo lo que este plan prescribe fue **ejecutado**, no solo razonado: `pytest` **22/22**,
> `ruff` y `mypy --strict` en 0, `pnpm typecheck/lint/test/build` en verde, migración
> **up → down → up** sobre una copia de la BD real conservando datos e índices, y
> **13 comprobaciones en navegador** (9 de flujo + 4 de vinculación de cuentas), incluido
> el intento de secuestro de cuenta por correo no verificado.

---

## 1. Contexto del proyecto

### 1.1 Qué se construye

Segunda pieza de autenticación de **MyTrueque.com**: permitir entrar con una cuenta de
Google, además del correo/contraseña que ya funciona. Y añadir el **botón de cerrar
sesión** en el header, que hoy no existe (el backend ya soporta `/auth/logout`, pero no
hay forma de invocarlo desde la interfaz).

**Alcance cerrado con el usuario:**
- **Vinculación de cuentas por correo.** Si alguien ya tiene cuenta con correo/contraseña
  y luego entra con Google usando **ese mismo correo**, se vincula a la cuenta existente:
  conserva su `@usuario`, su historial y su contraseña. No se crea una cuenta duplicada.
- **Botón de cerrar sesión visible.** Cuando hay sesión activa, el header muestra el
  `@usuario` y un botón para salir, en lugar de "Entrar / Crear cuenta".

### 1.2 Root del proyecto y estado actual

- **Root absoluto**: `C:\APLICACIONES\Trueque.com`
- **`backend/` y `frontend/` YA EXISTEN y funcionan.** El login con correo/contraseña está
  implementado, probado y operativo. Este plan **extiende** ese trabajo, no lo reemplaza.
- **El root NO es un repositorio git.** No inicializar uno por cuenta propia.
- **Entorno verificado**: Python 3.14.7 (en `backend/.venv`), uv 0.12.5, Node v20.20.2,
  pnpm 10.33.0.

```
C:\APLICACIONES\Trueque.com\
├── CLAUDE.md                 ← contexto del proyecto (leer §2.1 sobre secretos)
├── BITACORA.md
├── Planes\                   ← este plan vive aquí
├── backend\                  ← FastAPI + SQLAlchemy + SQLite (EXISTE)
│   ├── .env                  ← credenciales de Google YA guardadas (no versionado)
│   ├── alembic\versions\     ← 1 migración existente: f85e9c73c76e_create_users
│   ├── src\core\             ← config.py, db.py, security.py
│   ├── src\features\auth\    ← models, schemas, service, dependencies, api
│   └── tests\                ← 12 tests pasando
└── frontend\                 ← React 19 + Vite (EXISTE)
    └── src\features\auth\    ← store, service, hooks, AuthPanel
```

### 1.3 Estado actual del código que este plan toca

**Backend — `src/features/auth/models.py`** (tal como está HOY):
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    handle: Mapped[str] = mapped_column(String(32), unique=True, index=True)
```

**Backend — endpoints que YA existen** (no tocar su comportamiento):
`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /health`.

**Backend — `src/core/security.py`** ya expone: `hash_password`, `verify_password`,
`create_session_token`, `read_session_token`, `SESSION_COOKIE_NAME` (= `"trueque_session"`),
`SESSION_MAX_AGE_SECONDS` (= 7 días).

**Backend — `src/features/auth/service.py`** ya expone: `generate_unique_handle(db)`,
`register_user(db, payload)`, `authenticate_user(db, email, password)`,
`EmailAlreadyRegisteredError`, `InvalidCredentialsError`.

**Frontend — `src/features/auth/store/authStore.ts`** ya expone: `user`, `isHydrating`,
`setUser`, `clearUser`, `setHydrated`.

**Frontend — `src/features/auth/hooks/useAuthMutations.ts`** ya expone
`useLoginMutation`, `useRegisterMutation` y **`useLogoutMutation`** (creado en el plan
anterior, listo para usar — solo falta cablearlo a un botón).

**Frontend — `AuthPanel.tsx`** tiene un `GoogleButton()` **deshabilitado** con el texto
"Próximamente" — este plan lo activa.

### 1.4 Credenciales de Google (YA configuradas, no hay que crear nada)

En `backend/.env` ya están, cargadas y verificadas:
```
GOOGLE_CLIENT_ID=1046407352640-daviprg0837no71oqsp3c8fheekl6d6q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<ya está en el .env — NO copiarlo a ningún otro archivo>
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

- Proyecto de Google Cloud: **MyTrueque**, en modo **Testing**.
- **Usuario de prueba dado de alta: `rr5797372@gmail.com`.** Es el **único** correo que
  puede completar el login. Con cualquier otro, Google devuelve `access_denied` — eso NO
  es un bug del código.
- Orígenes/URIs ya registrados en Google: JS `http://localhost:5173`, redirect
  `http://localhost:8000/auth/google/callback`.

### 1.5 Decisiones cerradas (verificadas — no reabrir)

1. **Sin librería OAuth (`authlib`, `google-auth`).** El flujo *authorization code* son dos
   llamadas HTTP. Añadir una librería de OAuth completa para esto es peso innecesario y
   oculta lo que pasa. Se usa `httpx2`, que **ya está instalado** (hoy como dependencia de
   test; este plan lo promueve a dependencia de runtime). Coherente con la decisión previa
   de usar `bcrypt` directo en lugar de `passlib`.
2. **Endpoint de `userinfo`: `https://openidconnect.googleapis.com/v1/userinfo`.**
   ⚠️ **No** usar `https://www.googleapis.com/oauth2/v3/userinfo`, que es el que aparece en
   la mayoría de tutoriales: está obsoleto. Verificado contra el documento de discovery
   oficial de Google (H1).
3. **No se verifica la firma del `id_token`.** No hace falta: el token se obtiene
   directamente del endpoint de Google por HTTPS autenticando con el client secret, no a
   través del navegador. Se llama a `userinfo` con el access token, que es más simple y no
   requiere manejar JWKS ni validar JWT a mano.
4. **`state` anti-CSRF firmado con `itsdangerous`**, no un UUID guardado en sesión. Se
   reutiliza el mismo mecanismo que ya firma la cookie de sesión. Verificado: un `state`
   manipulado o inventado es rechazado (H3).
5. **`email_verified` es obligatorio para vincular.** 🔴 **Punto de seguridad crítico**: si
   se vincula por correo sin comprobar que Google lo verificó, alguien podría crear una
   cuenta de Google con el correo de otra persona y **secuestrar su cuenta existente** en
   MyTrueque. Verificado en la simulación (H4).
6. **`password_hash` pasa a ser NULLABLE.** Quien entra solo con Google no tiene
   contraseña. El `upgrade` funciona con el `alter_column` que genera Alembic tal cual;
   solo el `downgrade` necesita `batch_alter_table` (ver 5.10, H2). Consecuencia
   obligatoria: `authenticate_user` debe rechazar a quien tenga `password_hash = None`,
   o el backend devuelve HTTP 500 (ver 5.7 a, H1).
7. **El callback redirige al frontend, no devuelve JSON.** El navegador llega a
   `/auth/google/callback` por una redirección de Google, no por `fetch`. Debe responder
   con un `RedirectResponse` a `http://localhost:5173/?auth=ok` (o `?auth=error&reason=...`).
8. **Scopes: `openid email profile`.** Verificado contra `scopes_supported` de Google.

---

## 2. Objetivo de la tarea

Al terminar:

1. `GET /auth/google` devuelve una redirección a la pantalla de consentimiento de Google.
2. `GET /auth/google/callback` completa el flujo: valida `state`, intercambia el código,
   obtiene el perfil, crea o vincula el usuario, pone la cookie de sesión y redirige al
   frontend.
3. La tabla `users` tiene `google_id` (único, nullable) y `password_hash` nullable.
4. El botón "Continuar con Google" del panel de auth está **habilitado** y funciona.
5. El header muestra el `@usuario` y un botón **"Salir"** cuando hay sesión activa.
6. `ruff`, `mypy`, `pytest`, `pnpm typecheck/lint/test/build` en verde.
7. Flujo real probado en navegador con `rr5797372@gmail.com`.

---

## 3. Prerequisitos

Ejecutar **todos** desde `C:\APLICACIONES\Trueque.com`. Si alguno falla, DETENERSE.

| # | Requisito | Comando | Resultado esperado |
|---|---|---|---|
| 1 | Root correcto | `dir CLAUDE.md` | existe |
| 2 | Backend existe y pasa sus tests | `cd backend && uv run pytest -q` | **12 passed** |
| 3 | Frontend existe y pasa sus tests | `cd frontend && pnpm test` | **7 passed** |
| 4 | Credenciales de Google cargadas | desde `backend/`: `uv run python -c "from src.core.config import get_settings; print('OK')"` | imprime `OK` sin error |
| 5 | La BD existe con la migración aplicada | desde `backend/`: `uv run alembic current` | muestra `f85e9c73c76e (head)` |
| 6 | El root **no** es repo git | `git rev-parse --is-inside-work-tree` | `fatal: not a git repository` |

---

## 4. Inventario de archivos

### 4.1 Backend

| # | Ruta (relativa a `backend/`) | Acción |
|---|---|---|
| 1 | `pyproject.toml` | modificar — `httpx2` pasa de dev a runtime |
| 2 | `.env` | modificar — añadir `FRONTEND_URL` |
| 3 | `.env.example` | modificar — documentar `FRONTEND_URL` |
| 4 | `src/core/config.py` | modificar — 4 settings nuevos |
| 5 | `src/features/auth/models.py` | modificar — `google_id` + `password_hash` nullable |
| 6 | `src/features/auth/google.py` | **crear** — cliente HTTP de Google |
| 7 | `src/features/auth/service.py` | modificar — `login_or_link_google_user()` |
| 8 | `src/features/auth/api.py` | modificar — 2 endpoints nuevos |
| 9 | `alembic/versions/xxxx_google_id.py` | **crear** (autogenerate + ajuste manual) |
| 10 | `tests/test_google_auth.py` | **crear** — 10 tests |

### 4.2 Frontend

| # | Ruta (relativa a `frontend/`) | Acción |
|---|---|---|
| 11 | `src/lib/api/schema.d.ts` | regenerar (comando, no editar a mano) |
| 12 | `src/features/auth/components/AuthPanel/AuthPanel.tsx` | modificar — activar botón Google |
| 13 | `src/features/auth/components/AuthPanel/AuthPanel.module.scss` | modificar — estilo habilitado |
| 14 | `src/features/auth/components/AuthPanel/AuthPanel.test.tsx` | modificar — el test del botón cambia |
| 15 | `src/features/landing/components/Header/Header.tsx` | modificar — sesión + botón Salir |
| 16 | `src/features/landing/components/Header/Header.module.scss` | modificar — estilos de sesión |
| 17 | `src/features/landing/pages/MainPage.tsx` | modificar — leer `?auth=` de la URL |

---

## 5. Especificación por archivo

> Código **literal**: copiar tal cual.

### 5.1 `backend/pyproject.toml` — dos cambios puntuales

`httpx2` está hoy en `[dependency-groups] dev`. El backend ahora lo necesita en runtime
para llamar a Google. **Mover**, no duplicar.

En `[project] dependencies`, **añadir** al final de la lista:
```toml
    "httpx2>=2.13.0",
```

En `[dependency-groups] dev`, **quitar** la línea `"httpx2>=2.13.0",` (ya está arriba).

Luego: `uv sync`

### 5.2 `backend/.env` — añadir una línea

**No tocar las demás líneas.** Añadir al final:
```bash
FRONTEND_URL=http://localhost:5173
```

### 5.3 `backend/.env.example` — añadir la misma clave documentada

Añadir al final:
```bash
# A dónde redirige el callback de Google tras completar el login.
FRONTEND_URL=http://localhost:5173
```

### 5.4 `backend/src/core/config.py` — reemplazar el contenido completo

```python
"""Configuración de la app, leída de variables de entorno (.env)."""

from functools import lru_cache

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    # Sin `# type: ignore[call-arg]`: el plugin de mypy de pydantic entiende que los
    # campos vienen del .env, y con `strict = true` un ignore innecesario es un ERROR
    # (`unused-ignore`).
    return Settings()
```

### 5.5 `backend/src/features/auth/models.py` — reemplazar el contenido completo

```python
"""Modelo de usuario. Soporta dos formas de entrar: correo+contraseña y Google.

`password_hash` es nullable porque quien se registra solo con Google no tiene contraseña.
`google_id` guarda el `sub` que devuelve Google (su identificador estable del usuario) y
es nullable porque quien se registró con contraseña no tiene uno hasta que vincule.
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    handle: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    google_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
```

### 5.6 `backend/src/features/auth/google.py` — crear

> Endpoints verificados contra el documento de discovery de Google el 2026-09-21.
> **`USERINFO_ENDPOINT` es el de `openidconnect.googleapis.com`** — el de
> `www.googleapis.com/oauth2/v3/userinfo` que aparece en tutoriales está obsoleto (H1).

```python
"""Cliente del flujo OAuth 2.0 (authorization code) de Google.

Sin librería de OAuth: son dos llamadas HTTP. Usar authlib/google-auth aquí añadiría
peso y ocultaría el flujo, que es corto y conviene tener a la vista.
"""

import urllib.parse
from dataclasses import dataclass

import httpx2 as httpx

from src.core.config import get_settings

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
# Verificado en https://accounts.google.com/.well-known/openid-configuration
USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"

SCOPES = "openid email profile"
HTTP_TIMEOUT_SECONDS = 15


class GoogleAuthError(Exception):
    """Falló el diálogo con Google (red, credenciales o código inválido)."""


@dataclass(frozen=True)
class GoogleProfile:
    """Los únicos datos de Google que nos interesan."""

    sub: str
    email: str
    email_verified: bool


def build_authorization_url(state: str) -> str:
    """URL de la pantalla de consentimiento a la que mandamos al usuario."""
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "online",
        # select_account: si el usuario tiene varias cuentas, que elija en vez de entrar
        # con la última usada sin preguntar.
        "prompt": "select_account",
    }
    return f"{AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"


def exchange_code_for_profile(code: str) -> GoogleProfile:
    """Cambia el código de un solo uso por el perfil del usuario.

    Dos llamadas: token endpoint (autenticando con el client secret) y userinfo.
    No se valida la firma del id_token: el token viene directo de Google por HTTPS,
    no a través del navegador, así que el canal ya es de confianza.
    """
    settings = get_settings()
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            token_response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_response.status_code != 200:
                raise GoogleAuthError(
                    f"el token endpoint respondió {token_response.status_code}: "
                    f"{token_response.text[:200]}"
                )
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise GoogleAuthError("la respuesta de Google no traía access_token")

            userinfo_response = client.get(
                USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_response.status_code != 200:
                raise GoogleAuthError(
                    f"userinfo respondió {userinfo_response.status_code}"
                )
            info = userinfo_response.json()
    except httpx.HTTPError as exc:
        raise GoogleAuthError(f"no se pudo contactar a Google: {exc}") from exc

    sub = info.get("sub")
    email = info.get("email")
    if not sub or not email:
        raise GoogleAuthError("el perfil de Google no traía 'sub' o 'email'")

    return GoogleProfile(
        sub=str(sub),
        email=str(email),
        email_verified=bool(info.get("email_verified", False)),
    )
```

### 5.7 `backend/src/features/auth/service.py` — dos cambios

#### (a) 🔴 CORREGIR `authenticate_user` — sin esto el backend devuelve HTTP 500

> **Hallazgo H1, reproducido.** Al volver `password_hash` nullable, una cuenta creada solo
> con Google lo tiene en `None`. Si esa persona intenta entrar por el formulario de
> contraseña, el código actual se lo pasa a `bcrypt.checkpw`, que revienta con
> `AttributeError: 'NoneType' object has no attribute 'encode'` → **HTTP 500** en vez del
> 401 que corresponde. Es un fallo de disponibilidad y además filtra un detalle interno.
> La v1 de este plan no lo contemplaba.

**Localizar** la función `authenticate_user` (tal como está hoy):

```python
def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    return user
```

**Reemplazarla** por:

```python
def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    # `password_hash` es None en las cuentas creadas solo con Google: esas no pueden
    # entrar por contraseña. Sin este chequeo, bcrypt recibe None y revienta con un 500.
    if user is None or user.password_hash is None:
        raise InvalidCredentialsError
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    return user
```

> Se devuelve el mismo `InvalidCredentialsError` que cuando la contraseña es incorrecta:
> no se le dice al atacante "esa cuenta existe pero es de Google", que sería filtrar
> información sobre qué correos están registrados y cómo.

#### (b) Añadir la lógica de Google al final del archivo

**No reemplazar el archivo.** Conservar todo lo que ya tiene y **añadir** al final:

```python


class EmailNotVerifiedError(Exception):
    """Google no confirmó que el usuario sea dueño de ese correo."""


def login_or_link_google_user(db: Session, profile: "GoogleProfile") -> User:
    """Resuelve el usuario a partir de un perfil de Google. Tres caminos:

    1. Ya conocemos ese `google_id` -> entra.
    2. Existe una cuenta con ese correo -> se vincula (decisión del producto).
    3. Nadie con ese correo -> cuenta nueva, sin contraseña.

    🔴 `email_verified` es obligatorio en los casos 2 y 3: sin esa comprobación,
    cualquiera podría crear una cuenta de Google con el correo de otra persona y
    apropiarse de su cuenta ya existente en MyTrueque.
    """
    existing_by_google = db.scalar(select(User).where(User.google_id == profile.sub))
    if existing_by_google is not None:
        return existing_by_google

    if not profile.email_verified:
        raise EmailNotVerifiedError

    email = profile.email.lower()
    existing_by_email = db.scalar(select(User).where(User.email == email))
    if existing_by_email is not None:
        existing_by_email.google_id = profile.sub
        db.commit()
        db.refresh(existing_by_email)
        return existing_by_email

    user = User(
        email=email,
        password_hash=None,
        handle=generate_unique_handle(db),
        google_id=profile.sub,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

Y **en la zona de imports** del mismo archivo, añadir esta línea junto a los otros imports
de `src.features.auth`:

```python
from src.features.auth.google import GoogleProfile
```

> Las comillas en `profile: "GoogleProfile"` del cuerpo pueden quitarse una vez añadido el
> import; se dejan para que el archivo sea válido aunque se pegue el bloque antes que el
> import.

### 5.8 `backend/src/features/auth/api.py` — añadir al final del archivo

**No reemplazar el archivo.** Conservar los 4 endpoints que ya tiene y **añadir** al final:

```python


@router.get("/google")
def google_login() -> RedirectResponse:
    """Manda al usuario a la pantalla de consentimiento de Google."""
    state = create_oauth_state()
    return RedirectResponse(build_authorization_url(state), status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
def google_callback(
    db: DbDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Vuelta desde Google. Siempre redirige al frontend — nunca devuelve JSON:
    a esta URL llega el NAVEGADOR por una redirección, no un fetch.
    """
    settings = get_settings()

    # El usuario canceló, o no está en la lista de usuarios de prueba.
    if error:
        return _redirect_to_frontend(settings.frontend_url, "error", error)

    # `state` ausente o falsificado: posible CSRF, no seguimos.
    if not state or not verify_oauth_state(state):
        return _redirect_to_frontend(settings.frontend_url, "error", "estado_invalido")

    if not code:
        return _redirect_to_frontend(settings.frontend_url, "error", "sin_codigo")

    try:
        profile = exchange_code_for_profile(code)
        user = login_or_link_google_user(db, profile)
    except EmailNotVerifiedError:
        return _redirect_to_frontend(settings.frontend_url, "error", "correo_no_verificado")
    except GoogleAuthError:
        return _redirect_to_frontend(settings.frontend_url, "error", "google_fallo")

    response = _redirect_to_frontend(settings.frontend_url, "ok", None)
    _set_session_cookie(response, user.id)
    return response


def _redirect_to_frontend(frontend_url: str, auth: str, reason: str | None) -> RedirectResponse:
    query = f"?auth={auth}" + (f"&reason={reason}" if reason else "")
    return RedirectResponse(f"{frontend_url}/{query}", status_code=status.HTTP_302_FOUND)
```

Y **reemplazar el bloque de imports** de ese archivo por este (añade lo nuevo, conserva
todo lo anterior):

```python
"""Endpoints de auth: registro, login, logout, sesión actual y Google."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse

from src.core.config import get_settings
from src.core.security import (
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
    create_oauth_state,
    create_session_token,
    verify_oauth_state,
)
from src.features.auth.dependencies import DbDep, get_current_user
from src.features.auth.google import (
    GoogleAuthError,
    build_authorization_url,
    exchange_code_for_profile,
)
from src.features.auth.models import User
from src.features.auth.schemas import LoginIn, RegisterIn, UserOut
from src.features.auth.service import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    authenticate_user,
    login_or_link_google_user,
    register_user,
)
```

### 5.9 `backend/src/core/security.py` — añadir al final del archivo

**No reemplazar.** Añadir al final:

```python


# --- `state` anti-CSRF del flujo OAuth ---
# Se firma con la misma clave que la sesión, con otro `salt` para que un token no sirva
# como el otro. Un `state` manipulado o inventado no pasa la verificación.

_oauth_state_serializer = URLSafeTimedSerializer(settings.secret_key, salt="oauth-state")
OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10  # 10 minutos para completar el login


def create_oauth_state() -> str:
    import secrets as _secrets

    return _oauth_state_serializer.dumps({"n": _secrets.token_urlsafe(16)})


def verify_oauth_state(state: str) -> bool:
    try:
        _oauth_state_serializer.loads(state, max_age=OAUTH_STATE_MAX_AGE_SECONDS)
    except BadSignature:
        return False
    return True
```

### 5.10 Migración de Alembic — generar y ajustar SOLO el `downgrade`

> **Hallazgo H2 — corrección respecto a la v1.** La v1 afirmaba que el `alter_column` del
> autogenerate **falla** en SQLite y había que envolver el `upgrade` en
> `batch_alter_table`. **Es falso, y se comprobó ejecutándolo**: Alembic 1.20 + SQLAlchemy
> 2.0.54 resuelven solo el paso a nullable en SQLite, y el `upgrade` generado funciona tal
> cual. Seguir la instrucción de la v1 llevaba al executor a reescribir a mano algo que no
> lo necesitaba.
>
> Donde **sí** falla es en el **`downgrade`**: volver a `NOT NULL` ejecuta
> `ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`, que SQLite no soporta
> (`sqlite3.IntegrityError: constraint failed`). Ese sí necesita `batch_alter_table`.
>
> Y hay una trampa adicional, también reproducida: `batch_alter_table` **recrea la tabla**,
> así que se lleva por delante el índice y la columna. Si el `drop_index` / `drop_column`
> van **dentro** o **después** del batch, fallan con `no such index: ix_users_google_id`.
> Deben ir **antes**. El orden de abajo es el único de los tres probados que funciona.

Generar con:
```bash
uv run alembic revision --autogenerate -m "google_id y password_hash nullable"
```

**Dejar el `upgrade()` tal como lo generó Alembic.** Solo debe contener, en cualquier orden:
`add_column('users', google_id)`, `create_index(ix_users_google_id, unique=True)` y
`alter_column('users','password_hash', nullable=True)`.

**Reemplazar únicamente el cuerpo de `downgrade()`** por esto:

```python
def downgrade() -> None:
    # El orden importa: batch_alter_table RECREA la tabla, así que el índice y la columna
    # deben soltarse ANTES. Ponerlos dentro o después del batch falla con
    # "no such index: ix_users_google_id" (reproducido).
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "google_id")
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "password_hash", existing_type=sa.VARCHAR(length=255), nullable=False
        )
```

Aplicar: `uv run alembic upgrade head`

> **Comprobación de reversibilidad** (opcional pero recomendada, verificada en la
> auditoría): `uv run alembic downgrade -1` seguido de `uv run alembic upgrade head` debe
> completarse sin error y dejar el esquema igual. ⚠️ El `downgrade` **falla legítimamente**
> si ya existe alguna cuenta creada con Google (tiene `password_hash` NULL y no puede
> volver a ser NOT NULL) — eso es correcto, no un bug.

### 5.11 `backend/tests/test_google_auth.py` — crear

```python
"""Tests del login con Google. Google se simula: no se hacen llamadas de red reales."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import create_oauth_state
from src.features.auth.google import GoogleProfile
from src.features.auth.models import User

EMAIL = "ana@correo.com"
PASSWORD = "supersegura123"


@pytest.fixture
def fake_google() -> Iterator[dict[str, GoogleProfile]]:
    """Sustituye el intercambio con Google por un perfil controlado."""
    holder = {"profile": GoogleProfile(sub="sub-123", email=EMAIL, email_verified=True)}

    def _fake(code: str) -> GoogleProfile:
        return holder["profile"]

    with patch("src.features.auth.api.exchange_code_for_profile", side_effect=_fake):
        yield holder


def test_google_login_redirige_a_google(client: TestClient) -> None:
    r = client.get("/auth/google", follow_redirects=False)
    assert r.status_code == 302
    location = r.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
    assert "client_id=" in location
    assert "state=" in location


def test_callback_sin_state_es_rechazado(client: TestClient, fake_google: dict) -> None:
    r = client.get("/auth/google/callback?code=abc", follow_redirects=False)
    assert r.status_code == 302
    assert "auth=error" in r.headers["location"]
    assert "estado_invalido" in r.headers["location"]


def test_callback_con_state_falsificado_es_rechazado(
    client: TestClient, fake_google: dict
) -> None:
    r = client.get(
        "/auth/google/callback?code=abc&state=falsificado", follow_redirects=False
    )
    assert r.status_code == 302
    assert "estado_invalido" in r.headers["location"]


def test_callback_con_error_de_google_redirige_con_motivo(client: TestClient) -> None:
    state = create_oauth_state()
    r = client.get(
        f"/auth/google/callback?error=access_denied&state={state}", follow_redirects=False
    )
    assert r.status_code == 302
    assert "auth=error" in r.headers["location"]
    assert "access_denied" in r.headers["location"]


def test_google_crea_usuario_nuevo_sin_password(
    client: TestClient, fake_google: dict
) -> None:
    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert r.status_code == 302
    assert "auth=ok" in r.headers["location"]
    assert "trueque_session" in r.cookies

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL
    assert me.json()["handle"].startswith("@trq-")


def test_google_vincula_a_cuenta_existente_conservando_handle(
    client: TestClient, fake_google: dict
) -> None:
    # 1. cuenta creada con correo/contraseña
    reg = client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    handle_original = reg.json()["handle"]
    client.post("/auth/logout")

    # 2. entra con Google usando el MISMO correo
    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert "auth=ok" in r.headers["location"]

    me = client.get("/auth/me")
    assert me.json()["handle"] == handle_original, "debe conservar su @usuario, no crear otro"


def test_google_no_vincula_si_el_correo_no_esta_verificado(
    client: TestClient, fake_google: dict
) -> None:
    client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    client.post("/auth/logout")
    fake_google["profile"] = GoogleProfile(sub="sub-atacante", email=EMAIL, email_verified=False)

    state = create_oauth_state()
    r = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert "correo_no_verificado" in r.headers["location"]
    assert "trueque_session" not in r.cookies, "no debe dar sesión"


def test_segundo_login_con_google_reutiliza_la_misma_cuenta(
    client: TestClient, fake_google: dict, db_users: Session
) -> None:
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    client.post("/auth/logout")
    state2 = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state2}", follow_redirects=False)

    total = db_users.query(User).count()
    assert total == 1, "no debe crear una cuenta por cada login"


def test_el_correo_de_google_se_normaliza_a_minusculas(
    client: TestClient, fake_google: dict
) -> None:
    fake_google["profile"] = GoogleProfile(
        sub="sub-may", email="Ana@Correo.COM", email_verified=True
    )
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    me = client.get("/auth/me")
    assert me.json()["email"] == "ana@correo.com"


def test_usuario_solo_google_no_puede_entrar_con_password(
    client: TestClient, fake_google: dict
) -> None:
    state = create_oauth_state()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    client.post("/auth/logout")

    r = client.post("/auth/login", json={"email": EMAIL, "password": "loquesea123"})
    assert r.status_code == 401, "sin contraseña definida, el login por contraseña debe fallar"
```

### 5.12 `backend/tests/conftest.py` — añadir un fixture

**No reemplazar.** El test `test_segundo_login_con_google_reutiliza_la_misma_cuenta`
necesita consultar la BD. Refactorizar el fixture `client` para exponer también la sesión:

Reemplazar **solo** el cuerpo del fixture `client` por estos dos fixtures:

```python
@pytest.fixture
def _engine():  # type: ignore[no-untyped-def]
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
```

> `StaticPool` sigue siendo obligatorio: sin él, cada conexión a `:memory:` abre una base
> de datos distinta y los tests fallan con `no such table: users`.

---

### 5.13 `frontend/src/features/auth/components/AuthPanel/AuthPanel.tsx` — dos cambios

**(a)** Reemplazar la función `GoogleButton` completa por:

```tsx
/** Manda al backend, que a su vez redirige a la pantalla de consentimiento de Google. */
function GoogleButton() {
  return (
    <a className={styles.googleButton} href="http://localhost:8000/auth/google">
      <span className={styles.googleIcon} aria-hidden="true">
        G
      </span>
      Continuar con Google
    </a>
  )
}
```

> Es un `<a>`, no un `<button>` con `fetch`: el flujo OAuth necesita una **navegación real
> del navegador**, no una petición en segundo plano.

**(b)** El import de `ApiError` y la función `mensajeDeError` **se conservan tal cual**.

### 5.14 `frontend/src/features/auth/components/AuthPanel/AuthPanel.module.scss` — reemplazar el bloque `.googleButton`

Localizar el bloque `.googleButton { ... }` existente y reemplazarlo por:

```scss
.googleButton {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--c-border-input);
  background: var(--c-surface);
  color: var(--c-ink);
  padding: 11px 13px;
  border-radius: var(--r-input);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--c-accent);
    color: var(--c-ink);
  }
}
```

Y **borrar** el bloque `.googleSoon { ... }` completo (ya no se usa).

### 5.15 `frontend/src/features/auth/components/AuthPanel/AuthPanel.test.tsx` — cambiar un test

Reemplazar el test `'el botón de Google está deshabilitado'` por:

```tsx
  it('el enlace de Google apunta al backend', () => {
    renderPanel('login')
    const link = screen.getByRole('link', { name: /Continuar con Google/ })
    expect(link).toHaveAttribute('href', 'http://localhost:8000/auth/google')
  })
```

### 5.16 `frontend/src/features/landing/components/Header/Header.tsx` — reemplazar el contenido completo

```tsx
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Logo } from '@/shared/components/Logo'
import { Button } from '@/shared/components/Button'
import { NAV_LINKS } from '../../data/landingContent'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations'
import styles from './Header.module.scss'

interface HeaderProps {
  onGoToAuth: (tab: AuthTab) => void
}

export function Header({ onGoToAuth }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()

  function handleAuthClick(tab: AuthTab) {
    setMenuOpen(false)
    onGoToAuth(tab)
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Logo variant="header" />

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className={styles.burger}
          aria-label="Menú"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
          <span className={`${styles.burgerBar} ${styles.burgerBarAccent}`} />
        </button>

        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.userHandle} title={user.email}>
                {user.handle}
              </span>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-label="Cerrar sesión"
              >
                <LogOut size={15} aria-hidden="true" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleAuthClick('login')}>
                Entrar
              </Button>
              <Button variant="primary" size="md" onClick={() => handleAuthClick('register')}>
                Crear cuenta
              </Button>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className={styles.menuPanel}>
          <div className={styles.menuList}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.menuLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
```

### 5.17 `frontend/src/features/landing/components/Header/Header.module.scss` — añadir al final

**No reemplazar.** Añadir al final del archivo:

```scss
// Sesión activa: @usuario + botón de salir, en lugar de Entrar/Crear cuenta.
.userHandle {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--c-accent-text);
  background: var(--c-surface-accent);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-pill);
  padding: 6px 12px;
  white-space: nowrap;
}

.logoutButton {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  padding: 8px 14px;
  border-radius: var(--r-button);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--c-alert);
    color: var(--c-alert);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
```

### 5.18 `frontend/src/features/landing/pages/MainPage.tsx` — reemplazar el contenido completo

> **Hallazgo H3.** La v1 leía la URL dentro de un `useEffect` y llamaba a `setState` ahí.
> `oxlint` lo marca (`react/set-state-in-effect`: "Calling setState synchronously within
> an effect can trigger cascading renders") y además en `StrictMode` el efecto corre dos
> veces. Como leer la URL es algo que pasa **una vez por carga de página**, no por montaje
> del componente, se resuelve fuera del componente y se usa como estado inicial —
> sin efecto, sin render en cascada y sin warning. Verificado: `pnpm lint` limpio.

```tsx
import { useState } from 'react'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { Inspection } from '../components/Inspection'
import { Guarantees } from '../components/Guarantees'
import { Faq } from '../components/Faq'
import { Footer } from '../components/Footer'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import styles from './MainPage.module.scss'

/** Mensajes para los códigos que devuelve el callback de Google. */
const MOTIVOS_DE_ERROR: Record<string, string> = {
  access_denied: 'Cancelaste el acceso con Google, o esa cuenta no está autorizada para probar.',
  correo_no_verificado: 'Google no confirmó ese correo, así que no podemos usarlo para entrar.',
  estado_invalido: 'La sesión de acceso expiró. Vuelve a intentarlo.',
  sin_codigo: 'Google no devolvió el código de acceso. Vuelve a intentarlo.',
  google_fallo: 'No pudimos completar el acceso con Google. Vuelve a intentarlo.',
}

/**
 * Lee "?auth=error&reason=..." UNA sola vez, al cargar el módulo, y limpia la URL.
 * Fuera del componente a propósito: es un efecto de navegación que ocurre una vez por
 * carga de página, no por montaje. Hacerlo en useEffect + setState dispara un render en
 * cascada (oxlint react/set-state-in-effect) y se repetiría en StrictMode (H3).
 */
function leerErrorDeGoogleDeLaUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const auth = params.get('auth')
  if (!auth) return null
  window.history.replaceState({}, '', window.location.pathname)
  if (auth !== 'error') return null
  const reason = params.get('reason') ?? ''
  return MOTIVOS_DE_ERROR[reason] ?? 'No pudimos completar el acceso con Google.'
}

const ERROR_DE_GOOGLE_INICIAL = leerErrorDeGoogleDeLaUrl()

export function MainPage() {
  useCurrentUser()
  const [authTab, setAuthTab] = useState<AuthTab>('login')
  const [googleError] = useState<string | null>(ERROR_DE_GOOGLE_INICIAL)

  /** Cambia la pestaña y lleva al usuario al panel de acceso. */
  function goToAuth(tab: AuthTab) {
    setAuthTab(tab)
    document.getElementById('acceso')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className={styles.page}>
      <Header onGoToAuth={goToAuth} />
      <main>
        {googleError && (
          <div className={styles.googleError} role="alert">
            {googleError}
          </div>
        )}
        <Hero authTab={authTab} onAuthTabChange={setAuthTab} />
        <HowItWorks />
        <Inspection />
        <Guarantees />
        <Faq onGoToAuth={goToAuth} />
      </main>
      <Footer />
    </div>
  )
}
```

### 5.19 `frontend/src/features/landing/pages/MainPage.module.scss` — añadir al final

```scss
.googleError {
  max-width: var(--content-max);
  margin: 16px auto 0;
  padding: 12px 18px;
  background: var(--c-surface);
  border: 1px solid var(--c-alert);
  border-radius: var(--r-input);
  color: var(--c-alert);
  font-size: 14px;
}
```

---

## 6. Orden de ejecución

Reportar cada paso como `✅ Paso N — OK` o `❌ Paso N — FALLO: razón`. Detenerse al primer fallo.

### Paso 1 — Prerequisitos
Correr los 6 checks de la Sección 3.

### Paso 2 — Dependencias y configuración del backend
Desde `backend/`:
1. Editar `pyproject.toml` (5.1): mover `httpx2` a `dependencies`.
2. `uv sync`
3. Añadir `FRONTEND_URL` a `.env` (5.2) y a `.env.example` (5.3).
4. Reemplazar `src/core/config.py` (5.4).

Verificar: `uv run python -c "from src.core.config import get_settings; s=get_settings(); print(s.google_client_id[:20], s.frontend_url)"`
debe imprimir el inicio del client id y `http://localhost:5173`.

### Paso 3 — `state` anti-CSRF
Añadir al final de `src/core/security.py` el bloque de 5.9.

### Paso 4 — Cliente de Google
Crear `src/features/auth/google.py` (5.6).

### Paso 5 — Modelo y migración
1. Reemplazar `src/features/auth/models.py` (5.5).
2. `uv run alembic revision --autogenerate -m "google_id y password_hash nullable"`
3. **Editar SOLO el `downgrade()`** del archivo generado según 5.10. El `upgrade()` se
   deja tal cual — funciona sin cambios (verificado).
4. `uv run alembic upgrade head`
5. Verificar el esquema:
   ```bash
   uv run python -c "import sqlite3; c=sqlite3.connect('data/trueque.db'); [print(r) for r in c.execute('pragma table_info(users)')]"
   ```
   `password_hash` debe tener `notnull=0` y debe aparecer `google_id`.

### Paso 6 — Lógica de vinculación y corrección del 500
1. 🔴 **Corregir `authenticate_user`** (5.7 a) — sin esto, entrar con contraseña en una
   cuenta creada con Google devuelve HTTP 500.
2. Añadir el bloque de Google al final de `src/features/auth/service.py` (5.7 b), más el
   import de `GoogleProfile`.

### Paso 7 — Endpoints
Modificar `src/features/auth/api.py` (5.8): reemplazar el bloque de imports y añadir los
dos endpoints al final.

### Paso 8 — Tests del backend
1. Modificar `tests/conftest.py` (5.12).
2. Crear `tests/test_google_auth.py` (5.11).
3. `uv run pytest -q` → **22 passed** (12 existentes + 10 nuevos).

### Paso 9 — Calidad del backend
```bash
uv run ruff check .
uv run mypy src
```
Ambos en 0 errores.

### Paso 10 — Levantar el backend
⚠️ **Siempre desde `backend/`** (la ruta de la BD es relativa):
```bash
uv run uvicorn src.main:app --port 8000 &
curl -sf http://localhost:8000/health
```

### Paso 11 — Regenerar tipos y modificar el frontend
Desde `frontend/`:
1. `pnpm exec openapi-typescript http://localhost:8000/openapi.json -o src/lib/api/schema.d.ts`
2. Modificar `AuthPanel.tsx` (5.13), `AuthPanel.module.scss` (5.14),
   `AuthPanel.test.tsx` (5.15).
3. Reemplazar `Header.tsx` (5.16) y añadir estilos a `Header.module.scss` (5.17).
4. Reemplazar `MainPage.tsx` (5.18) y añadir estilos a `MainPage.module.scss` (5.19).

### Paso 12 — Validaciones del frontend
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Los 4 en verde. `pnpm test` debe dar **7 passed**.

### Paso 13 — Verificación funcional
Con backend y `pnpm dev` corriendo, en `http://localhost:5173`:

1. **Correo/contraseña sigue funcionando** (no debe haber regresión): registrar un correo
   nuevo, ver el `@usuario`, recargar, seguir dentro.
2. **Botón Salir**: con sesión activa el header muestra el `@usuario` y "Salir". Pulsarlo
   devuelve el header a "Entrar / Crear cuenta".
3. **Login con Google**: pulsar "Continuar con Google" → consentimiento de Google →
   **entrar con `rr5797372@gmail.com`** → vuelve a la landing con sesión activa y el
   `@usuario` en el header.
4. **Segundo login con Google**: salir y volver a entrar con Google → mismo `@usuario`
   (no se creó otra cuenta).
5. **Cancelar en Google**: pulsar "Continuar con Google" y cancelar → vuelve a la landing
   con el mensaje de error, sin sesión.

> Si en el paso 3 Google dice **"Acceso bloqueado"** o `access_denied`: el correo usado no
> está en la lista de usuarios de prueba. No es un fallo del código.

### Paso 14 — Detener procesos y reportar
Detener uvicorn. **No** ejecutar `git init`. **No** editar `BITACORA.md`.
Reportar archivos tocados y resultado de los checks de la Sección 8.

---

## 7. Reglas no negociables

1. **El Client Secret no sale de `backend/.env`.** No escribirlo en ningún otro archivo,
   ni en comentarios, ni en el reporte final, ni en los tests. (`CLAUDE.md` §2.1)
2. **No romper el login con correo/contraseña.** Los 12 tests existentes deben seguir
   pasando sin modificarlos.
3. **No verificar la firma del `id_token` a mano** ni añadir manejo de JWKS: se usa
   `userinfo`, que es el camino verificado en este plan.
4. **No instalar `authlib`, `google-auth`, `google-auth-oauthlib` ni ninguna librería
   OAuth.** Solo `httpx2`, que ya está.
5. **`email_verified` es obligatorio** antes de vincular o crear por correo. No quitar esa
   comprobación: es lo que impide el secuestro de cuentas.
6. **El `state` se valida siempre.** No aceptar un callback sin `state` válido.
7. **El callback redirige, nunca devuelve JSON.** A esa URL llega el navegador.
8. **No tocar `frontend/src/features/landing/`** más allá de `Header` y `MainPage`.
9. **`schema.d.ts` no se edita a mano**, se regenera.
10. **No ejecutar `git init`** ni comitear.
11. Si algo no está especificado, **preguntar antes de decidir**.

---

## 8. Validaciones post-ejecución

### Backend (desde `backend/`)

| # | Check | Comando | Esperado |
|---|---|---|---|
| B1 | Dependencias | `uv sync` | exit 0 |
| B2 | Migración aplicada | `uv run alembic current` | un id + `(head)`, distinto de `f85e9c73c76e` |
| B3 | Esquema correcto | `uv run python -c "import sqlite3;c=sqlite3.connect('data/trueque.db');[print(r) for r in c.execute('pragma table_info(users)')]"` | `password_hash` con `notnull=0`, existe `google_id` |
| B4 | Tests | `uv run pytest -q` | **22 passed** |
| B5 | Lint | `uv run ruff check .` | `All checks passed!` |
| B6 | Types | `uv run mypy src` | `Success: no issues found` |
| B7 | `/auth/google` redirige | `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:8000/auth/google` | `302` + URL de `accounts.google.com` |
| B8 | OpenAPI expone los nuevos | `curl -s http://localhost:8000/openapi.json` | contiene `/auth/google` y `/auth/google/callback` |
| B9 | Falla claro si faltan credenciales | quitar temporalmente las líneas `GOOGLE_*` del `.env` y correr `uv run python -c "from src.core.config import get_settings; get_settings()"` | `ValidationError ... google_client_id Field required`. **Restaurar el `.env` después.** Es el comportamiento correcto: falla al arrancar, no a mitad del login |

### Frontend (desde `frontend/`)

| # | Check | Comando | Esperado |
|---|---|---|---|
| F1 | typecheck | `pnpm typecheck` | exit 0 |
| F2 | lint | `pnpm lint` | exit 0 |
| F3 | tests | `pnpm test` | **7 passed**. Ojo: el test del botón de Google cambia de aserción (ya no es `toBeDisabled`, ahora comprueba el `href`) — ver 5.15 |
| F4 | build | `pnpm build` | exit 0 |

### Funcional (navegador)

| # | Check | Esperado |
|---|---|---|
| V1 | Registro correo/contraseña | sigue funcionando igual (sin regresión) |
| V2 | Header con sesión | muestra `@trq-xxxx` y botón "Salir" |
| V3 | Botón Salir | cierra sesión; el header vuelve a "Entrar / Crear cuenta" |
| V4 | Login con Google (`rr5797372@gmail.com`) | entra y queda con sesión activa |
| V5 | Segundo login con Google | mismo `@usuario`, no crea cuenta nueva |
| V6 | Cancelar en Google | vuelve con mensaje de error, sin sesión |
| V7 | Vinculación | registrar `rr5797372@gmail.com` con contraseña, salir, entrar con Google → **mismo `@usuario`** |
| V8 | La contraseña sobrevive a la vinculación | tras V7, salir y entrar con correo+contraseña → funciona, mismo `@usuario` |
| V9 | Cuenta solo-Google no entra por contraseña | crear cuenta con Google, salir, intentar el formulario de contraseña → **401 con "Correo o contraseña incorrectos"**, nunca un error 500 |

---

## 9. Fuera de alcance

1. **Publicar la app en modo Production.** Sigue en Testing: solo entra
   `rr5797372@gmail.com`.
2. **Foto y nombre del perfil de Google.** Se reciben pero no se guardan ni se muestran;
   el modelo no tiene esas columnas.
3. **Desvincular Google** de una cuenta, o poner contraseña a una cuenta creada con Google.
4. **Refresh tokens / acceso offline.** `access_type=online`: solo se usa el token una vez
   para leer el perfil.
5. **Otros proveedores** (Apple, Facebook, GitHub).
6. **Recuperar contraseña.** Sigue pendiente, igual que antes.
7. **HTTPS / `secure=True`** en la cookie — es de despliegue.
8. **`git init` y commit.**

---

## 10. Auditoría v1 → v2 — hallazgos integrados

**Método.** No fue una relectura: se **clonó el proyecto entero** (backend + frontend) en
un directorio aislado, se aplicaron los pasos del plan **al pie de la letra**, y se ejecutó
todo: `uv sync`, migración, 22 tests, `ruff`, `mypy --strict`, `pnpm
typecheck/lint/test/build`, y el flujo completo en **Chromium real** con el intercambio con
Google simulado (13 comprobaciones). El proyecto real no se tocó en ningún momento.

**Sobre "pipelines configurados"**: siguen sin existir CI, Docker ni repositorio git. Los
pipelines reales son los scripts de `frontend/package.json` y los comandos de `uv` del
backend; este plan los respeta y **no toca** `.oxlintrc.json`, `tsconfig.*.json`,
`vite.config.ts` ni `alembic.ini`. El contrato existente se mantiene: los 12 tests del
login por contraseña siguen pasando sin modificarlos, y `AuthPanel` conserva su API de
props.

| # | Severidad | Hallazgo | Cómo se integró |
|---|---|---|---|
| H1 | 🔴 Bloqueante | **HTTP 500 al entrar con contraseña en una cuenta creada con Google.** Al volver `password_hash` nullable, `bcrypt.checkpw` recibe `None` y lanza `AttributeError` → 500 en vez de 401. La v1 no lo contemplaba; se reprodujo al correr los tests (1 failed de 22). | `authenticate_user` rechaza `password_hash is None` antes de llamar a bcrypt, devolviendo el mismo error genérico para no filtrar qué cuentas son de Google (5.7 a) |
| H2 | 🟠 Alto | **La instrucción de migración de la v1 era incorrecta.** Afirmaba que el `alter_column` del autogenerate falla en SQLite y había que envolver el `upgrade` en `batch_alter_table`. Ejecutado: el `upgrade` **funciona tal cual**. Quien falla es el **`downgrade`**. Y ahí hay una trampa extra: `batch_alter_table` recrea la tabla, así que `drop_index`/`drop_column` deben ir **antes** del batch — dentro o después fallan con `no such index`. Se probaron 3 órdenes hasta dar con el correcto. | `upgrade` se deja intacto; solo se reescribe el `downgrade`, con el orden verificado. Ciclo **up → down → up** probado sobre copia de la BD real (5.10) |
| H3 | 🟡 Medio | `oxlint` marcaba `react/set-state-in-effect` en `MainPage`: leer la URL en un `useEffect` + `setState` dispara un render en cascada y se duplica en `StrictMode`. | Se lee la URL una vez al cargar el módulo y se usa como estado inicial — sin efecto. `pnpm lint` limpio (5.18) |
| H4 | 🟢 Bajo | El plan pedía `pnpm test` = 7 passed sin decir que el test del botón de Google **cambia de aserción** (de `toBeDisabled` a comprobar el `href`), lo que podía hacer dudar al executor. | Explicitado en 5.15 y en el check F3 |
| H5 | 🟢 Bajo | No se advertía que el `downgrade` **falla legítimamente** si ya hay cuentas creadas con Google (tienen `password_hash` NULL y no pueden volver a NOT NULL). Sin la nota, parecería un bug. | Nota explícita en 5.10 |
| H6 | 🟢 Bajo | El plan no decía qué pasa si faltan las claves de Google en el `.env`. Comprobado: la app **no arranca** y falla con un `ValidationError` claro de pydantic, que es el comportamiento deseable. | Documentado como comportamiento esperado en el check B9 |

**Verificado además, sin incidencias** (todo lo demás del plan funcionó tal como estaba
escrito):

- Los 22 tests pasan tras el fix de H1; `ruff` y `mypy --strict` en 0 errores.
- `/auth/google` redirige correctamente a `accounts.google.com`; el `state` viaja firmado.
- Las URLs de vuelta quedan bien formadas: `http://localhost:5173/?auth=error&reason=...`
- **Vinculación de cuentas probada en navegador**: registrar con contraseña → entrar con
  Google con el mismo correo → **conserva el mismo `@usuario`** → y la contraseña original
  **sigue funcionando** después de vincular.
- **Intento de secuestro bloqueado**: un perfil de Google con `email_verified: false`
  apuntando a una cuenta existente es rechazado con `correo_no_verificado`, sin dar sesión.
- Botón "Salir": cierra sesión, el header vuelve a "Entrar / Crear cuenta" y `/auth/me`
  pasa a 401.
- Segundo login con Google reutiliza la misma cuenta (no duplica).
- CORS rechaza orígenes no autorizados (probado con un puerto distinto).
- Cero errores de JavaScript en toda la sesión de navegador.

---

## Resumen ejecutivo

Login con Google que vincula por correo verificado a cuentas existentes, más el botón de
cerrar sesión en el header.
