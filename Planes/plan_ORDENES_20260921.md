# Plan ORDENES — Backend de órdenes: crear una custodia real y verla en el panel

> Plan de ejecución para agente EXECUTOR externo. **Autocontenido**: no requiere contexto
> previo, conversaciones anteriores ni historial de Git. Ejecutar AL PIE DE LA LETRA, en
> orden. Si un paso falla, DETENERSE y reportar.
>
> **Versión 2 (2026-09-21).** Reformulada tras auditar la v1 **ejecutándola de verdad**:
> copia completa de backend y frontend, `ruff` + `mypy --strict` + `pytest` + `alembic
> up/down` reales, `typecheck` + `lint` + `test` + `build`, y el flujo completo en Chromium
> con dos cuentas y archivos de verdad. **13 hallazgos** — dos de ellos graves. Están en
> §1.9 y el código de la §5 ya viene corregido y verificado.

---

## 1. Contexto del proyecto

### 1.1 Qué se construye y por qué

**MyTrueque.shop** es un marketplace P2P de archivos con custodia. Hoy el producto tiene
**login real** y **todo lo demás es maqueta**: las pantallas del panel funcionan, pero
dibujan datos de ejemplo. En concreto:

- `backend/src/features/` contiene **solo** `auth/`. No existe `orders/`.
- Los únicos endpoints registrados son `/auth/*` y `/health`.
- El botón **"Poner en custodia"** es `<button type="button">` **sin `onClick`**. No hace nada.
- `useOrders()` devuelve un array de fixtures o vacío. Nunca llama al backend.

Este plan construye la primera mitad del backend de órdenes: **crear una orden subiendo
archivos de verdad, y verla en el panel**. Al terminar, ese botón deja de ser maqueta.

**Fuera de esta tanda** (ver §9): descargar el archivo, cifrado en reposo, purga automática
y las transiciones de estado. Una orden nace `EN_CUSTODIA` y ahí se queda.

### 1.2 🔴 La restricción que manda sobre el diseño: el disco

El servidor de producción es un **EC2 t3.micro con 6,7 GB de disco y ~3 GB libres**.

| Consecuencia | Decisión que impone |
|---|---|
| 1 GB por orden × 3 GB libres | **3 órdenes abiertas como máximo** a la vez |
| Los archivos son efímeros pero **coexisten** mientras sus órdenes vivan (hasta 30 días) | No basta con purgar: hay que **rechazar** cuando no quepa |
| Llenar el disco de un EC2 no "rechaza subidas": **tumba el servicio entero** (SQLite no puede escribir, los logs no rotan) | El backend comprueba el espacio libre **antes** de aceptar y responde `507` |

Por eso este plan incluye un chequeo de disco que a primera vista parece defensivo de más.
**No lo es, y no se puede quitar.**

### 1.3 Root del proyecto

- **Root absoluto**: `C:\APLICACIONES\Trueque.com`
- Este plan toca **`backend/` Y `frontend/`**.
- El root **SÍ es un repositorio git** con remoto (`github.com/jaguez40-star/webmytrueque`).
  **No comitear ni pushear**: el usuario decide cuándo.

```
C:\APLICACIONES\Trueque.com\
├── backend\
│   ├── data\                  ← la BD vive aquí; se añade data\custodia\
│   ├── alembic\versions\      ← se añade 1 migración
│   └── src\
│       ├── core\              ← se añade storage.py; se modifica config.py
│       └── features\
│           ├── auth\          ← NO SE TOCA
│           └── orders\        ← TODO NUEVO
└── frontend\
    └── src\features\orders\   ← se conecta al backend
```

### 1.4 Stack exacto (ya instalado — NO instalar nada)

**Backend** (`backend/pyproject.toml`), Python ≥3.12, gestor `uv`:

| Paquete | Versión |
|---|---|
| fastapi | >=0.141.1 |
| sqlalchemy | >=2.0.54 |
| alembic | >=1.20.0 |
| pydantic[email] | >=2.13.5 |
| pydantic-settings | >=2.15.0 |
| itsdangerous | >=2.2.0 |
| bcrypt | >=5.0.0 |
| **python-multipart** | **>=0.0.32 — ya está, es lo que permite `UploadFile`** |
| ruff / mypy / pytest | >=0.16.8 / >=2.3.1 / >=9.1.1 |

**Frontend** (`frontend/package.json`), gestor `pnpm`:

| Paquete | Versión |
|---|---|
| react / react-dom | ^19.2.8 |
| react-router-dom | ^7.18.3 |
| @tanstack/react-query | ^5.102.8 |
| zustand | ^5.0.15 |
| lucide-react | ^1.39.0 (v1) |
| openapi-fetch / openapi-typescript | ^0.17.0 / ^7.13.0 |
| oxlint | ^1.79.0 (**no ESLint**) |
| typescript | ~6.0.2 |
| vitest + @testing-library/react | ^4.1.11 / ^16.3.3 |

> 🔴 **REGLA DURA: no ejecutar `uv add` ni `pnpm add`.** Todo lo necesario ya está.
> Si algo parece faltar, DETENERSE y preguntar.

### 1.5 Convenciones del backend — seguirlas exactamente

Todo el feature `orders/` copia la forma de `auth/`. Estos son los patrones reales:

**Modelos** — SQLAlchemy 2.0 con `Mapped` / `mapped_column`, heredando de `src.core.db.Base`:

```python
# backend/src/features/auth/models.py — PATRÓN A SEGUIR
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    handle: Mapped[str] = mapped_column(String(32), unique=True, index=True)
```

**Sesión de BD y `Base`** (`backend/src/core/db.py`, NO SE TOCA):

```python
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
```

**Dependencias** (`backend/src/features/auth/dependencies.py`) — se **reutilizan tal cual**:

```python
DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User:
    ...
```

**Capas**: `api.py` (endpoints, HTTPException) → `service.py` (lógica, excepciones propias)
→ `models.py`. Los servicios **nunca** lanzan `HTTPException`: definen sus excepciones y el
`api.py` las traduce. Ejemplo real de `auth/api.py`:

```python
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, response: Response, db: DbDep) -> User:
    try:
        user = register_user(db, payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese correo ya está registrado.") from exc
    _set_session_cookie(response, user.id)
    return user
```

**Schemas Pydantic** (`auth/schemas.py`): `model_config = {"from_attributes": True}` en los
`...Out`.

**Calidad**: `ruff` (line-length 100, select `E,F,I,UP,B`, **excluye `alembic/`**) y
**`mypy --strict`** con el plugin de pydantic. En strict, un `# type: ignore` innecesario
es un **error** (`unused-ignore`).

**Tests** (`backend/tests/conftest.py`) — fixtures existentes que hay que reutilizar:

```python
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
def db_users(_engine) -> Generator[Session, None, None]:
    """Sesión directa a la misma BD del test, para verificar estado."""
```

> 🔴 `conftest.py` importa cada modelo para registrarlo en `Base.metadata`. **Hay que
> añadir el import de los modelos de `orders`** o las tablas no se crean en los tests.

**Alembic** (`backend/alembic/env.py`): importa los modelos explícitamente.

```python
from src.core.db import Base
from src.features.auth.models import User  # noqa: F401 — registra el modelo en Base.metadata

target_metadata = Base.metadata
```

> ⚠️ `env.py` **no** configura `render_as_batch`. Para **crear** tablas nuevas no hace
> falta (solo lo necesitan los `ALTER` sobre SQLite), así que no se toca.

### 1.6 El frontend: cómo habla con el backend

**Cliente HTTP** (`frontend/src/lib/api/client.ts`, NO SE TOCA):

```ts
import createClient from 'openapi-fetch'
import type { paths } from './schema'

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.PROD ? '' : 'http://localhost:8000',
  credentials: 'include', // manda/recibe la cookie de sesión httpOnly
})
```

`frontend/src/lib/api/schema.d.ts` está **autogenerado** por `openapi-typescript` a partir
del OpenAPI del backend. Hay que **regenerarlo** tras añadir endpoints (Paso 8).

**El hook que aísla al resto de la app** (`frontend/src/features/orders/hooks/useOrders.ts`):

```ts
export function useOrders(): UseOrdersResult {
  // Sin backend todavía: nunca hay carga real.
  return {
    orders: MODO_DEMO ? ORDENES_DE_EJEMPLO : [],
    isLoading: false,
  }
}
```

Su docstring ya anticipa este plan: *"Cuando exista el backend se reemplaza el cuerpo por un
`useQuery` contra `GET /orders` y **ningún componente cambia**"*. Se respeta esa promesa:
el modo demo **se conserva** (§1.8, decisión 7).

**El tipo del dominio** (`frontend/src/features/orders/types.ts`) — hoy la orden tiene **UN**
archivo:

```ts
export interface Order {
  id: string
  estado: OrderState
  rol: OrderRole
  contraparte: OrderCounterparty
  archivo: OrderFile          // ← SINGULAR
  montoCop: number
  creadaEn: string
  liberaAutomaticaEn: string | null
  purgaEn: string | null
  comprobante: OrderReceipt | null
  cuentaDeCobro?: string
}
```

Y **tres componentes** leen `orden.archivo`:
`OrderCard.tsx` (2 usos), `GrillaArchivos.tsx` (3 usos), `DetalleOrdenPage.tsx` (7 usos).

El formulario ya permite **elegir varios archivos** (`multiple`), así que el tipo miente.
La §1.8 decisión 5 resuelve el choque sin reescribir esas tres pantallas.

### 1.7 El formulario, tal como está HOY

`frontend/src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.tsx` ya
tiene la **selección de archivos funcionando**: `multiple`, arrastrar y soltar, quitar,
deduplicado y tope de 1 GB. Su estado vive dentro del componente:

```tsx
const LIMITE_BYTES = 1024 ** 3
const [archivos, setArchivos] = useState<File[]>([])
const [error, setError] = useState<string | null>(null)
const [arrastrando, setArrastrando] = useState(false)
```

Los otros dos campos (`#comprador` y `#monto`) son `defaultValue` sin estado.

🔴 **El problema a resolver**: el botón "Poner en custodia" **no vive dentro del
formulario**. Está en el pie del modal (`ModalNuevaOrden.tsx`) y en la `BarraAccion`
(`NuevaOrdenPage.tsx`). El botón no puede leer un estado que vive en otro componente.
La §1.8 decisión 6 lo resuelve.

### 1.9 Hallazgos de la auditoria de la v1 (ya aplicados)

La v1 se ejecuto entera sobre una copia del proyecto —backend y frontend— y se probo en
Chromium con dos cuentas reales. **Trece cosas no cuadraron.** Todas estan corregidas en
este documento; se listan para que el executor entienda **por que** el codigo dice lo que
dice y no lo "simplifique".

#### Los dos graves

| # | Hallazgo | Correccion |
|---|---|---|
| **H1** | 🔴🔴 **El tope de 1 GB no protegia el disco.** Starlette parsea el multipart **entero** a un archivo temporal *antes* de invocar el endpoint, asi que cuando el servicio mira `UploadFile.size` los bytes **ya estan escritos**. Medido: con el tope en 1 KB, un cuerpo de 20 MB tardaba **3,11 s** en ser rechazado — el servidor lo habia leido entero. Alguien puede mandar 50 GB y llenar el disco del EC2 igual que si se hubiera aceptado, que es justo lo que el chequeo pretendia evitar. El comentario de la v1 ("un cliente hostil declara 1 KB y manda 10 GB") era **falso**. | Middleware que rechaza por `Content-Length` **antes** de leer el cuerpo. Medido tras el arreglo: **0,01 s**. Cubierto por un test. |
| **H2** | 🔴🔴 **Bug de zona horaria: dos relojes en la misma fila.** `created_at` usaba `server_default=func.now()` (UTC en SQLite) y `purge_at` usaba `datetime.now()` (hora local). Medido: `creadaEn 2026-09-22T04:20:49` vs `purgaEn 2026-10-21T23:20:49` -> **29,79 dias en vez de 30**. Y ninguna llevaba zona horaria, asi que el navegador las leia como locales: una orden recien creada parecia estar **5 h en el futuro**, y `haceCuanto()` —que ya existe y devuelve `'recien'` cuando `pasadoMs < 0`— habria dicho "recien" para **todo durante 5 horas**. | Helper `ahora_utc()` como unico reloj + `field_serializer` que anade la `Z`. Medido tras el arreglo: **30,000 dias exactos**. |

#### Los que rompian el propio plan

| # | Hallazgo | Correccion |
|---|---|---|
| **H3** | `ruff` **fallaba**: `service.py` importaba `SinEspacioEnDiscoError` sin usarlo (la lanza `verificar_espacio`, la captura `api.py`). El Paso 5 del propio plan se caia. | Import eliminado. |
| **H4** | `pnpm lint` daba **warning** `react(only-export-components)` en el contexto, y el criterio F2 exige *"sin warnings"*. | El contexto se parte en dos archivos: `contextoNuevaOrden.ts` (sin JSX) y `ProveedorNuevaOrden.tsx`. |
| **H5** | 🔴 **`OrderCard.test.tsx` no estaba en el inventario** y construye una orden con el campo singular: rompia el `typecheck` en cuanto `archivo` paso a `archivos`. | Nueva seccion 5.24b. |
| **H6** | El `typecheck` del frontend **no puede pasar** hasta regenerar `schema.d.ts`, que exige el backend corriendo. La v1 lo tenia en el orden correcto pero sin avisar de la dependencia. | Aviso explicito en el Paso 8. |

#### Imprecisiones que habrian costado tiempo

| # | Hallazgo | Correccion |
|---|---|---|
| **H7** | Los imports de ejemplo de 5.22 y 5.23 estaban **inventados** (`ETIQUETA_ESTADO, esMiTurno`) y no coincidian con el repo real (`esMiTurno, type Order`). Viola la regla 4 del Planner. | Sustituidos por las lineas literales verificadas. |
| **H8** | La 5.24 estaba en **prosa ambigua**: *"la linea del hash y su cierre"*, cuando `HashField` ocupa **ocho** lineas. Un executor literal partia el componente. | Reescrita como 10 sustituciones literales. |
| **H9** | Mapear `archivosDentro` a `primerArchivo` dejaba el metadato **"ARCHIVOS" en `—` para siempre** (ese campo solo lo traen los fixtures). | `orden.archivos.length`. |
| **H10** | Constantes HTTP **deprecadas** en la version instalada de Starlette (`HTTP_422_UNPROCESSABLE_ENTITY`, `HTTP_413_REQUEST_ENTITY_TOO_LARGE`): 4 warnings en cada `pytest`. | `HTTP_422_UNPROCESSABLE_CONTENT` y `HTTP_413_CONTENT_TOO_LARGE`. De 5 warnings a 1 (y ese es de Starlette). |
| **H11** | **N+1 medido**: listar 20 ordenes disparaba **43 consultas SQL** (una por contraparte + una por conteo de operaciones). Y `_contar_operaciones` hacia `len(list(...))`, trayendo todas las filas a memoria para contarlas. Con 100 ordenes serian 203 consultas en un t3.micro. | `serializar_lote()` precarga contrapartes y cuenta con `func.count()` agrupado. Medido: **43 -> 6 consultas**, y ya no crece con el numero de ordenes. |
| **H12** | `main.py` capturaba `settings` a nivel de modulo, pero el fixture del plan llama a `get_settings.cache_clear()`: el middleware y el servicio acababan mirando **instancias distintas** de Settings. Un test pasaba aislado y fallaba en la suite. | El middleware llama a `get_settings()` dentro de la funcion. |
| **H13** | Conteos mal: el plan decia 44 tests de frontend (son **45**) y 33 de backend (son **34** con el test del middleware). Y el criterio C1 era **infalsificable**: el navegador registra como "error" cualquier 4xx, incluidos el 401 normal de `/auth/me` y el 404 que el propio plan provoca en E9. | Conteos corregidos y C1 reformulado. |

**Medidas de la auditoria** (con el plan aplicado y corregido):

| Que | Resultado |
|---|---|
| `ruff` / `mypy --strict` / `pytest` | verde / verde / **34 passed**, 1 warning (de Starlette) |
| `alembic upgrade` -> `downgrade` -> `upgrade` | sin error |
| `typecheck` / `lint` / `test` / `build` | verde / **sin warnings** / **45 passed** / verde |
| Flujo completo en Chromium, 2 cuentas | **19/20** (el que falta es el criterio C1 mal formulado, ver H13) |
| Consultas SQL al listar 20 ordenes | 43 -> **6** |
| Rechazo de un cuerpo de 20 MB con tope de 1 KB | 3,11 s -> **0,01 s** |
| Coherencia de fechas | 29,79 -> **30,000 dias** |
| Archivos escritos en disco | UUID `.bin`, pesos exactos, nombre real solo en BD |
| Orden rechazada | **no** deja carpeta ni filas |

---

### 1.8 Decisiones cerradas (NO reabrir)

1. **Los archivos van al disco local**, en `backend/data/custodia/<id-de-orden>/`. Decisión
   del usuario. Encaja con el modelo: el archivo vive solo mientras la orden esté abierta.
   **Ya está en `.gitignore`** (`backend/.gitignore` línea `data/custodia/`) — verificarlo,
   no volver a añadirlo.
2. **El nombre en disco NO es el nombre original.** Cada archivo se guarda como
   `<uuid4>.bin` y el nombre real vive en la BD. Un nombre de usuario puede traer `../`,
   caracteres nulos o 300 caracteres; construir rutas con él es la vía directa a escribir
   fuera de la carpeta.
3. **El hash SHA-256 se calcula en el SERVIDOR, por bloques de 1 MB**, mientras se escribe
   el archivo. Ni en el cliente (mentiría) ni cargando el archivo entero en RAM (1 GB en un
   t3.micro de 1 GB de RAM = OOM).
4. **El tope de 1 GB se valida en el SERVIDOR**, contando el total de la orden. El límite
   del navegador es comodidad, no seguridad: se salta con un `curl`.
5. **`Order.archivos` pasa a ser una lista**, y se añade `resumenDeArchivos(orden)` que
   devuelve un `OrderFile` sintético para las vistas compactas. Así `OrderCard` y
   `GrillaArchivos` cambian **una línea cada uno** en vez de rediseñarse, y
   `DetalleOrdenPage` —donde sí tiene sentido— lista todos.
6. **El envío se coordina con un contexto de React** (`ContextoNuevaOrden`), no subiendo el
   estado a cada página. El botón está en el pie del modal y en la barra fija de la página:
   un contexto los conecta a los dos con el mismo código.
7. **El modo demo (`?demo=1`) se conserva.** Sirve para revisar las pantallas sin crear
   órdenes reales, y las capturas del diseño dependen de él.
8. **Una orden nace `EN_CUSTODIA` y no cambia de estado.** Las transiciones son otra tanda.
9. **Sin cifrado en reposo todavía.** El copy de la UI ya promete custodia cifrada; esa
   promesa se cumple en la siguiente tanda. **No inventar un cifrado a medias aquí.**
10. **La subida usa `XMLHttpRequest`, no `fetch`.** Es la única API del navegador que
    reporta progreso de subida (`upload.onprogress`). Sin progreso, 1 GB es una pantalla
    congelada. Por eso `POST /orders` **no** pasa por `openapi-fetch`.
11. **El `@usuario` del comprador debe existir**, y no puede ser uno mismo. Si no existe,
    `404` con mensaje claro.
12. **Todo o nada**: si falla la escritura de un archivo, se borra la carpeta entera de la
    orden y no queda fila en la BD.

---

## 2. Objetivo de la tarea

Al terminar:

1. En `/panel`, elegir archivos + `@usuario` + monto y pulsar **"Poner en custodia"**
   **crea una orden de verdad**: los archivos quedan en `backend/data/custodia/<id>/` y la
   fila en la BD.
2. Durante la subida se ve una **barra de progreso** y el botón queda deshabilitado.
3. Al terminar, el modal se cierra y **la orden aparece en la bandeja**, con su peso y hash
   reales.
4. El **comprador** ve esa misma orden en su panel, con rol `comprador`.
5. Los errores se explican en la propia pantalla: `@usuario` inexistente, más de 1 GB,
   sin espacio en el servidor.
6. `?demo=1` sigue mostrando los fixtures.
7. Backend: `ruff`, `mypy --strict` y `pytest` en verde. Frontend: `typecheck`, `lint`,
   `test` y `build` en verde.

---

## 3. Prerequisitos

Desde `C:\APLICACIONES\Trueque.com`. Si alguno falla, DETENERSE.

| # | Requisito | Comando | Esperado |
|---|---|---|---|
| 1 | Root correcto | `dir CLAUDE.md` | existe |
| 2 | Backend en verde | `cd backend && uv run pytest -q` | **22 passed** |
| 3 | Lint+tipos backend | `cd backend && uv run ruff check . && uv run mypy src` | exit 0 ambos |
| 4 | Frontend en verde | `cd frontend && pnpm test` | **43 passed** |
| 5 | Frontend compila | `cd frontend && pnpm build` | exit 0 |
| 6 | `python-multipart` presente | `cd backend && uv pip list \| findstr multipart` | aparece |
| 7 | 🔴 **custodia ignorada** | `git check-ignore -v backend/data/custodia/x.bin` | imprime la regla |
| 8 | No existe ya `orders/` | `dir backend\src\features` | solo `auth` y `__init__.py` |

> ⚠️ **Si el check 7 no imprime nada, DETENERSE.** Sin esa regla, los archivos privados de
> los usuarios acabarían en un repositorio público de GitHub.

> Para el Paso 11 hacen falta los dos procesos:
> `cd backend && uv run uvicorn src.main:app --reload --port 8000` (⚠️ **siempre** desde
> `backend/`: `DATABASE_URL` es una ruta relativa) y `cd frontend && pnpm dev`.

---

## 4. Inventario de archivos

### 4.1 Backend — nuevos (7)

| # | Ruta (desde `C:\APLICACIONES\Trueque.com\backend\`) | Qué es |
|---|---|---|
| 1 | `src/core/storage.py` | Escritura por bloques, hash, espacio en disco |
| 2 | `src/features/orders/__init__.py` | vacío |
| 3 | `src/features/orders/models.py` | `Order` + `OrderFile` |
| 4 | `src/features/orders/schemas.py` | Schemas Pydantic de salida |
| 5 | `src/features/orders/service.py` | Lógica y excepciones propias |
| 6 | `src/features/orders/api.py` | `POST /orders`, `GET /orders` |
| 7 | `alembic/versions/a1b2c3d4e5f6_create_orders.py` | Migración |

### 4.2 Backend — tests nuevos (1)

| # | Ruta | Tests |
|---|---|---|
| 8 | `tests/test_orders.py` | 12 |

### 4.3 Backend — modificados (4)

| # | Ruta | Cambio |
|---|---|---|
| 9 | `src/core/config.py` | +2 ajustes (`custodia_dir`, `max_order_bytes`) |
| 10 | `src/main.py` | registrar el router |
| 11 | `alembic/env.py` | importar los modelos nuevos |
| 12 | `tests/conftest.py` | importar los modelos nuevos |

### 4.4 Frontend — nuevos (3)

| # | Ruta (desde `C:\APLICACIONES\Trueque.com\frontend\`) | Qué es |
|---|---|---|
| 13 | `src/features/orders/context/ContextoNuevaOrden.tsx` | Estado compartido del formulario |
| 14 | `src/features/orders/services/ordersService.ts` | `crearOrden` (XHR con progreso) + `obtenerOrdenes` |
| 15 | `src/features/orders/hooks/useCrearOrden.ts` | Mutación + invalidación de caché |

### 4.5 Frontend — modificados (9)

| # | Ruta | Cambio |
|---|---|---|
| 16 | `src/features/orders/types.ts` | `archivo` → `archivos` + `resumenDeArchivos()` |
| 17 | `src/features/orders/hooks/useOrders.ts` | `useQuery` real, conservando el modo demo |
| 18 | `src/features/orders/data/ordersFixtures.ts` | `archivo:` → `archivos: [...]` |
| 19 | `src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.tsx` | usa el contexto |
| 20 | `src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.module.scss` | +barra de progreso |
| 21 | `src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.tsx` | botón conectado |
| 22 | `src/features/orders/pages/NuevaOrdenPage.tsx` | botón conectado |
| 23 | `src/features/orders/components/OrderCard/OrderCard.tsx` | 1 línea: usa el resumen |
| 24 | `src/features/orders/components/GrillaArchivos/GrillaArchivos.tsx` | 1 línea: usa el resumen |
| 25 | `src/features/orders/pages/DetalleOrdenPage.tsx` | lista todos los archivos |
| 26 | `src/lib/api/schema.d.ts` | **regenerado**, no editado a mano |

> **Ningún otro archivo se toca.** En particular: **todo `backend/src/features/auth/`**,
> `backend/src/core/db.py`, `backend/src/core/security.py`, `frontend/src/App.tsx`,
> `frontend/src/lib/api/client.ts`, `PanelShell`, `PanelHeader`, `PanelFooter`, `Modal`,
> `pyproject.toml` y `package.json`.

---

## 5. Especificación por archivo

> Código **literal**: copiar tal cual.

### 5.1 `backend/src/core/storage.py` — crear

```python
"""Escritura de los archivos en custodia: por bloques, con hash y control de disco.

🔴 Todo lo de aquí evita cargar el archivo en memoria. El servidor de producción es un
t3.micro con 1 GB de RAM y el tope por orden es 1 GB: leer un archivo entero para hashearlo
o para escribirlo mata el proceso.
"""

import hashlib
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

# 1 MiB: suficientemente grande para que el disco no sufra por llamada, suficientemente
# pequeño para que la memoria del proceso no dependa del tamaño del archivo.
CHUNK_BYTES = 1024 * 1024

# Margen que se deja SIEMPRE libre en el disco. El sistema operativo, los logs y la propia
# SQLite necesitan sitio: aceptar una subida que deje el disco a cero no rechaza la
# siguiente petición, tumba el servicio entero.
MARGEN_DISCO_BYTES = 512 * 1024 * 1024


class SinEspacioEnDiscoError(Exception):
    """No cabe la orden dejando el margen de seguridad libre."""


def espacio_libre_bytes(directorio: Path) -> int:
    return shutil.disk_usage(directorio).free


def verificar_espacio(directorio: Path, bytes_necesarios: int) -> None:
    """Lanza SinEspacioEnDiscoError si aceptar `bytes_necesarios` dejaría el disco al límite."""
    directorio.mkdir(parents=True, exist_ok=True)
    libre = espacio_libre_bytes(directorio)
    if libre - bytes_necesarios < MARGEN_DISCO_BYTES:
        raise SinEspacioEnDiscoError


def extension_de(nombre: str) -> str:
    """'entrega final.tar.gz' -> '.gz'. Cadena vacía si no tiene."""
    sufijo = Path(nombre).suffix
    return sufijo.lower()[:16]


def guardar_archivo(subida: UploadFile, destino_dir: Path) -> tuple[str, int, str]:
    """Escribe `subida` en `destino_dir` y devuelve (nombre_en_disco, bytes, hash_sha256).

    🔴 El nombre en disco es un UUID, NUNCA el nombre que mandó el usuario: un nombre puede
    traer '../', bytes nulos o 300 caracteres, y construir rutas con él permite escribir
    fuera de la carpeta de la orden. El nombre real se guarda en la BD, que no interpreta
    rutas.
    """
    destino_dir.mkdir(parents=True, exist_ok=True)
    nombre_en_disco = f"{uuid.uuid4().hex}.bin"
    ruta = destino_dir / nombre_en_disco

    digest = hashlib.sha256()
    total = 0
    with ruta.open("wb") as salida:
        while True:
            bloque = subida.file.read(CHUNK_BYTES)
            if not bloque:
                break
            digest.update(bloque)
            total += len(bloque)
            salida.write(bloque)

    return nombre_en_disco, total, digest.hexdigest()


def borrar_carpeta(directorio: Path) -> None:
    """Borra la carpeta de una orden. No falla si no existe."""
    shutil.rmtree(directorio, ignore_errors=True)
```

### 5.2 `backend/src/core/config.py` — reemplazar el contenido completo

```python
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
```

### 5.3 `backend/src/features/orders/__init__.py` — crear

Archivo **vacío** (0 bytes).

### 5.4 `backend/src/features/orders/models.py` — crear

```python
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
```


### 5.5 `backend/src/features/orders/schemas.py` — crear

```python
"""Schemas de salida del feature orders.

La entrada NO tiene schema: `POST /orders` es multipart (archivos + campos sueltos), y eso
se declara con `Form(...)` y `File(...)` en el endpoint, no con un BaseModel.
"""

from datetime import datetime

from pydantic import BaseModel, field_serializer


def _a_iso_utc(valor: datetime | None) -> str | None:
    """'2026-09-22T04:20:49' -> '2026-09-22T04:20:49Z'.

    🔴 Sin la Z, `new Date(iso)` del navegador interpreta la fecha como hora LOCAL. En
    Colombia (UTC-5) eso hace que una orden recién creada parezca estar 5 h en el futuro,
    y `haceCuanto()` devuelve 'recién' para todo durante 5 horas.
    """
    if valor is None:
        return None
    return valor.isoformat() + "Z"


class OrderFileOut(BaseModel):
    nombre: str
    extension: str
    bytes: int
    hash: str
    subidoEn: datetime  # noqa: N815 — camelCase a propósito: lo consume el frontend

    model_config = {"from_attributes": True}

    @field_serializer("subidoEn")
    def _serializar_subido(self, valor: datetime) -> str | None:
        return _a_iso_utc(valor)


class CounterpartyOut(BaseModel):
    nombre: str
    handle: str
    operaciones: int


class OrderOut(BaseModel):
    id: str
    estado: str
    # 'vendedor' o 'comprador', SEGÚN QUIÉN PREGUNTA. La misma orden se serializa distinto
    # para cada una de las dos partes.
    rol: str
    contraparte: CounterpartyOut
    archivos: list[OrderFileOut]
    montoCop: int  # noqa: N815
    creadaEn: datetime  # noqa: N815
    liberaAutomaticaEn: datetime | None  # noqa: N815
    purgaEn: datetime | None  # noqa: N815
    comprobante: None = None

    @field_serializer("creadaEn", "liberaAutomaticaEn", "purgaEn")
    def _serializar_fechas(self, valor: datetime | None) -> str | None:
        return _a_iso_utc(valor)
```


### 5.6 `backend/src/features/orders/service.py` — crear

```python
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
```


### 5.7 `backend/src/features/orders/api.py` — crear

```python
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
```


### 5.8 `backend/src/main.py` — reemplazar el contenido completo

```python
"""Punto de entrada de la API."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config import get_settings
from src.features.auth.api import router as auth_router
from src.features.orders.api import router as orders_router

settings = get_settings()

app = FastAPI(title="MyTrueque.com API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Holgura para las cabeceras del multipart (nombre de archivo, boundary, tipo MIME por
# cada parte). 1 MiB cubre de sobra una orden con muchos archivos.
_HOLGURA_MULTIPART = 1024 * 1024


@app.middleware("http")
async def limitar_tamano_de_subida(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Rechaza por `Content-Length` ANTES de leer el cuerpo.

    🔴 No es redundante con el tope que valida el servicio: Starlette parsea el multipart
    ENTERO a un archivo temporal antes de invocar el endpoint, así que para cuando el
    servicio puede mirar `UploadFile.size` los bytes YA están escritos en disco. Medido:
    con el tope en 1 KB, un cuerpo de 20 MB tardaba 3,1 s en ser rechazado — el servidor
    lo había leído entero. En un EC2 con ~3 GB libres eso llena el disco igual que si se
    hubiera aceptado.

    En producción conviene además `client_max_body_size` en nginx, que corta aún antes.
    """
    if request.method == "POST" and request.url.path.rstrip("/") == "/orders":
        declarado = request.headers.get("content-length")
        if declarado is not None and declarado.isdigit():
            # `get_settings()` aquí dentro y NO la variable de módulo: si alguien invalida
            # la caché de ajustes (los tests lo hacen), la de módulo se queda con valores
            # viejos y el middleware deja pasar lo que el servicio sí rechaza.
            maximo = get_settings().max_order_bytes
            if int(declarado) > maximo + _HOLGURA_MULTIPART:
                return JSONResponse(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={"detail": "La orden pesa más de 1 GB. Quita algún archivo."},
                )
    return await call_next(request)


app.include_router(auth_router)
app.include_router(orders_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```


### 5.9 `backend/alembic/env.py` — UNA edición puntual

🔴 **NO reemplazar el archivo.** Localizar la línea:

```python
from src.features.auth.models import User  # noqa: F401 — registra el modelo en Base.metadata
```

y reemplazarla por:

```python
from src.features.auth.models import User  # noqa: F401 — registra el modelo en Base.metadata
from src.features.orders.models import Order, OrderFile  # noqa: F401 — ídem
```

### 5.10 `backend/tests/conftest.py` — UNA edición puntual

🔴 **NO reemplazar el archivo.** Localizar:

```python
from src.features.auth.models import User  # noqa: F401
```

y reemplazarla por:

```python
from src.features.auth.models import User  # noqa: F401
from src.features.orders.models import Order, OrderFile  # noqa: F401
```

> Sin esto, `Base.metadata.create_all` no crea `orders` ni `order_files` y **todos** los
> tests nuevos fallan con `no such table`.

### 5.11 `backend/alembic/versions/a1b2c3d4e5f6_create_orders.py` — crear

```python
"""create orders

Revision ID: a1b2c3d4e5f6
Revises: 3b60a7877631
Create Date: 2026-09-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3b60a7877631"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seller_id", sa.Integer(), nullable=False),
        sa.Column("buyer_id", sa.Integer(), nullable=False),
        sa.Column("amount_cop", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("purge_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_orders_seller_id"), "orders", ["seller_id"])
    op.create_index(op.f("ix_orders_buyer_id"), "orders", ["buyer_id"])
    op.create_index(op.f("ix_orders_state"), "orders", ["state"])

    op.create_table(
        "order_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("stored_name", sa.String(length=64), nullable=False),
        sa.Column("extension", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_order_files_order_id"), "order_files", ["order_id"])


def downgrade() -> None:
    # El orden importa: order_files referencia orders.
    op.drop_index(op.f("ix_order_files_order_id"), table_name="order_files")
    op.drop_table("order_files")
    op.drop_index(op.f("ix_orders_state"), table_name="orders")
    op.drop_index(op.f("ix_orders_buyer_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_seller_id"), table_name="orders")
    op.drop_table("orders")
```


### 5.12 `backend/tests/test_orders.py` — crear

```python
"""Tests del feature orders: crear una custodia y listarla."""

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings


@pytest.fixture(autouse=True)
def _custodia_temporal(tmp_path: Path):  # type: ignore[no-untyped-def]
    """Manda los archivos de los tests a una carpeta temporal, no a data/custodia.

    `get_settings` está cacheada con lru_cache, así que se muta la instancia y se limpia
    la caché al salir: escribir en la carpeta real dejaría basura entre ejecuciones.
    """
    ajustes = get_settings()
    original = ajustes.custodia_dir
    ajustes.custodia_dir = str(tmp_path / "custodia")
    yield
    ajustes.custodia_dir = original
    get_settings.cache_clear()


def _registrar(client: TestClient, email: str) -> str:
    """Crea una cuenta y devuelve su @usuario. Deja la cookie de sesión en el cliente."""
    respuesta = client.post("/auth/register", json={"email": email, "password": "contrasena12"})
    assert respuesta.status_code == 201
    return str(respuesta.json()["handle"])


def _archivo(nombre: str, contenido: bytes) -> tuple[str, tuple[str, io.BytesIO, str]]:
    return ("archivos", (nombre, io.BytesIO(contenido), "application/octet-stream"))


def test_crear_orden_guarda_archivos_y_devuelve_hash(client: TestClient) -> None:
    handle_comprador = _registrar(client, "compra@correo.com")
    client.post("/auth/logout")
    _registrar(client, "vende@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "450.000"},
        files=[_archivo("contrato.pdf", b"hola mundo")],
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "EN_CUSTODIA"
    assert cuerpo["rol"] == "vendedor"
    assert cuerpo["montoCop"] == 450000
    assert cuerpo["contraparte"]["handle"] == handle_comprador
    assert len(cuerpo["archivos"]) == 1
    archivo = cuerpo["archivos"][0]
    assert archivo["nombre"] == "contrato.pdf"
    assert archivo["extension"] == ".pdf"
    assert archivo["bytes"] == 10
    # sha256 de b"hola mundo"
    assert archivo["hash"] == "0b894166d3336435c800bea36ff21b29eaa801a52f584c006c49289a0dcf6e2f"


def test_crear_orden_acepta_varios_archivos(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c2@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v2@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("uno.txt", b"aaa"), _archivo("dos.zip", b"bbbb")],
    )

    assert respuesta.status_code == 201
    archivos = respuesta.json()["archivos"]
    assert [a["nombre"] for a in archivos] == ["uno.txt", "dos.zip"]
    assert [a["bytes"] for a in archivos] == [3, 4]


def test_los_archivos_se_escriben_en_disco(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c3@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v3@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("secreto.bin", b"contenido real")],
    )
    orden_id = respuesta.json()["id"]

    carpeta = get_settings().custodia_path / orden_id
    escritos = list(carpeta.iterdir())
    assert len(escritos) == 1
    # 🔴 El nombre en disco NO es el original: es un UUID. Ver storage.guardar_archivo.
    assert escritos[0].name != "secreto.bin"
    assert escritos[0].suffix == ".bin"
    assert escritos[0].read_bytes() == b"contenido real"


def test_el_nombre_del_archivo_no_permite_salir_de_la_carpeta(client: TestClient) -> None:
    """Un nombre con '../' no debe escribir fuera de la carpeta de la orden."""
    handle_comprador = _registrar(client, "c4@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v4@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "1000"},
        files=[_archivo("../../escapado.txt", b"x")],
    )

    assert respuesta.status_code == 201
    raiz = get_settings().custodia_path
    carpeta = raiz / respuesta.json()["id"]
    assert not (raiz.parent / "escapado.txt").exists()
    assert len(list(carpeta.iterdir())) == 1


def test_comprador_inexistente_da_404(client: TestClient) -> None:
    _registrar(client, "v5@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": "@trq-zzzz", "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 404
    assert "no existe" in respuesta.json()["detail"]


def test_no_puedes_venderte_a_ti_mismo(client: TestClient) -> None:
    handle = _registrar(client, "v6@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle, "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 422


def test_monto_invalido_da_422(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c7@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v7@correo.com")

    respuesta = client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "cero pesos"},
        files=[_archivo("a.txt", b"x")],
    )

    assert respuesta.status_code == 422


def test_pasarse_del_tope_da_413_y_no_deja_basura(client: TestClient) -> None:
    """El tope se valida en el SERVIDOR: el del navegador se salta con curl."""
    handle_comprador = _registrar(client, "c8@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v8@correo.com")

    ajustes = get_settings()
    original = ajustes.max_order_bytes
    ajustes.max_order_bytes = 10  # 10 bytes, para no mover un giga en un test
    try:
        respuesta = client.post(
            "/orders",
            data={"comprador": handle_comprador, "monto": "1000"},
            files=[_archivo("grande.bin", b"x" * 50)],
        )
    finally:
        ajustes.max_order_bytes = original

    assert respuesta.status_code == 413
    # Todo o nada: ni carpeta ni filas.
    raiz = ajustes.custodia_path
    assert not raiz.exists() or not any(raiz.iterdir())
    assert client.get("/orders").json() == []


def test_sin_sesion_no_se_puede_crear_ni_listar(client: TestClient) -> None:
    assert client.get("/orders").status_code == 401
    respuesta = client.post(
        "/orders",
        data={"comprador": "@trq-aaaa", "monto": "1000"},
        files=[_archivo("a.txt", b"x")],
    )
    assert respuesta.status_code == 401


def test_la_orden_aparece_para_las_dos_partes_con_rol_distinto(client: TestClient) -> None:
    """La MISMA fila se ve como 'vendedor' para uno y 'comprador' para el otro."""
    handle_comprador = _registrar(client, "c9@correo.com")
    client.post("/auth/logout")
    handle_vendedor = _registrar(client, "v9@correo.com")

    client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "2000"},
        files=[_archivo("a.txt", b"x")],
    )

    como_vendedor = client.get("/orders").json()
    assert len(como_vendedor) == 1
    assert como_vendedor[0]["rol"] == "vendedor"
    assert como_vendedor[0]["contraparte"]["handle"] == handle_comprador

    client.post("/auth/logout")
    client.post("/auth/login", json={"email": "c9@correo.com", "password": "contrasena12"})
    como_comprador = client.get("/orders").json()
    assert len(como_comprador) == 1
    assert como_comprador[0]["rol"] == "comprador"
    assert como_comprador[0]["contraparte"]["handle"] == handle_vendedor


def test_cada_usuario_solo_ve_sus_ordenes(client: TestClient) -> None:
    handle_comprador = _registrar(client, "c10@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v10@correo.com")
    client.post(
        "/orders",
        data={"comprador": handle_comprador, "monto": "3000"},
        files=[_archivo("a.txt", b"x")],
    )
    client.post("/auth/logout")

    _registrar(client, "ajeno@correo.com")
    assert client.get("/orders").json() == []


def test_el_middleware_corta_por_content_length_antes_de_leer(client: TestClient) -> None:
    """🔴 El tope del servicio llega TARDE: Starlette ya parseó el multipart a disco.

    Medido durante la auditoría: con el tope en 1 KB, un cuerpo de 20 MB tardaba 3,1 s en
    ser rechazado porque el servidor lo había leído entero. El middleware mira
    `Content-Length` y corta en 0,01 s, sin escribir nada.
    """
    handle_comprador = _registrar(client, "c11@correo.com")
    client.post("/auth/logout")
    _registrar(client, "v11@correo.com")

    ajustes = get_settings()
    original = ajustes.max_order_bytes
    ajustes.max_order_bytes = 1024
    try:
        respuesta = client.post(
            "/orders",
            data={"comprador": handle_comprador, "monto": "1000"},
            files=[_archivo("enorme.bin", b"x" * (3 * 1024 * 1024))],
        )
    finally:
        ajustes.max_order_bytes = original

    assert respuesta.status_code == 413
    assert "1 GB" in respuesta.json()["detail"]
    # Nada escrito: el cuerpo ni se parseó.
    raiz = ajustes.custodia_path
    assert not raiz.exists() or not any(raiz.iterdir())
```


### 5.13 `frontend/src/features/orders/types.ts` — DOS ediciones puntuales

🔴 **NO reemplazar el archivo.**

**(a)** Localizar:

```ts
export interface Order {
  id: string
  estado: OrderState
  rol: OrderRole
  contraparte: OrderCounterparty
  archivo: OrderFile
```

y reemplazar por:

```ts
export interface Order {
  id: string
  estado: OrderState
  rol: OrderRole
  contraparte: OrderCounterparty
  /**
   * Una orden puede llevar VARIOS archivos: el formulario permite elegir más de uno.
   * Las vistas compactas (tarjeta, grilla) no los listan todos — usan
   * `resumenDeArchivos()`, que devuelve un OrderFile sintético que los representa.
   */
  archivos: OrderFile[]
```

**(b)** Al **final del archivo**, añadir:

```ts
/**
 * Un OrderFile que representa al conjunto, para las vistas donde no cabe una lista.
 *
 * Con un solo archivo devuelve ese mismo. Con varios, inventa un nombre ("3 archivos"),
 * suma los pesos y deja el hash vacío: el hash de un conjunto no significa nada, y
 * mostrar el del primero sería mentir sobre lo que el comprador va a verificar.
 */
export function resumenDeArchivos(orden: Order): OrderFile {
  const archivos = orden.archivos
  if (archivos.length === 1) return archivos[0]

  const primero = archivos[0]
  return {
    nombre: `${archivos.length} archivos`,
    extension: primero?.extension ?? '',
    bytes: archivos.reduce((total, archivo) => total + archivo.bytes, 0),
    hash: '',
    subidoEn: primero?.subidoEn ?? new Date().toISOString(),
    archivosDentro: archivos.length,
  }
}
```

### 5.14 `frontend/src/features/orders/services/ordersService.ts` — crear

```ts
import { apiClient } from '@/lib/api/client'
import type { Order } from '../types'

const BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

export interface DatosNuevaOrden {
  archivos: File[]
  comprador: string
  monto: string
}

/**
 * Crea la orden subiendo los archivos.
 *
 * 🔴 Usa XMLHttpRequest y NO `fetch` ni `openapi-fetch` a propósito: es la única API del
 * navegador que reporta progreso de subida (`upload.onprogress`). Con un tope de 1 GB,
 * un `fetch` deja la pantalla congelada varios minutos sin señal de vida.
 */
export function crearOrden(
  datos: DatosNuevaOrden,
  alProgresar: (porcentaje: number) => void,
): Promise<Order> {
  return new Promise((resolver, rechazar) => {
    const cuerpo = new FormData()
    cuerpo.append('comprador', datos.comprador)
    cuerpo.append('monto', datos.monto)
    for (const archivo of datos.archivos) cuerpo.append('archivos', archivo)

    const peticion = new XMLHttpRequest()
    peticion.open('POST', `${BASE}/orders`)
    peticion.withCredentials = true // manda la cookie de sesión httpOnly

    peticion.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        alProgresar(Math.round((evento.loaded / evento.total) * 100))
      }
    }

    peticion.onload = () => {
      if (peticion.status === 201) {
        resolver(JSON.parse(peticion.responseText) as Order)
        return
      }
      rechazar(new Error(mensajeDeError(peticion)))
    }

    peticion.onerror = () =>
      rechazar(new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend?'))
    peticion.onabort = () => rechazar(new Error('Subida cancelada.'))

    peticion.send(cuerpo)
  })
}

/** FastAPI manda el motivo en `detail`; si no se puede leer, se cae a un genérico. */
function mensajeDeError(peticion: XMLHttpRequest): string {
  try {
    const cuerpo = JSON.parse(peticion.responseText) as { detail?: unknown }
    if (typeof cuerpo.detail === 'string') return cuerpo.detail
  } catch {
    // respuesta no-JSON (502 de un proxy, por ejemplo)
  }
  if (peticion.status === 401) return 'Tu sesión expiró. Vuelve a entrar.'
  return 'No se pudo crear la orden. Inténtalo de nuevo.'
}

/** Las órdenes del usuario en sesión. Esta sí va por el cliente tipado. */
export async function obtenerOrdenes(): Promise<Order[]> {
  const { data, error } = await apiClient.GET('/orders')
  if (error || !data) return []
  return data as unknown as Order[]
}
```

### 5.15 `frontend/src/features/orders/hooks/useOrders.ts` — reemplazar el contenido completo

```ts
/**
 * Punto único desde el que las pantallas obtienen órdenes.
 *
 * El modo demo (`?demo=1`) se conserva: sirve para revisar las pantallas sin crear órdenes
 * reales. Cuando está activo NO se llama al backend.
 */
import { useQuery } from '@tanstack/react-query'
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import { obtenerOrdenes } from '../services/ordersService'
import type { Order } from '../types'

const CLAVE_DEMO = 'trueque_demo_ordenes'

/** Clave de caché de TanStack Query. Se exporta para poder invalidarla al crear una orden. */
export const CLAVE_ORDENES = ['orders'] as const

/**
 * Lee "?demo=1" UNA sola vez, al cargar el módulo, y lo recuerda en sessionStorage para
 * que sobreviva a la navegación entre rutas.
 *
 * Fuera de todo componente a propósito: es una decisión de arranque, no de montaje.
 * Resolverlo en un useEffect + setState dispara un render en cascada que oxlint marca
 * con `react/set-state-in-effect`.
 */
function resolverModoDemo(): boolean {
  if (typeof window === 'undefined') return false

  const pedido = new URLSearchParams(window.location.search).get('demo')
  try {
    if (pedido === '1') sessionStorage.setItem(CLAVE_DEMO, '1')
    if (pedido === '0') sessionStorage.removeItem(CLAVE_DEMO)
    return sessionStorage.getItem(CLAVE_DEMO) === '1'
  } catch {
    // Modo incógnito o storage bloqueado: el query param solo vale para esta carga.
    return pedido === '1'
  }
}

const MODO_DEMO = resolverModoDemo()

export interface UseOrdersResult {
  orders: Order[]
  isLoading: boolean
}

export function useOrders(): UseOrdersResult {
  const consulta = useQuery({
    queryKey: CLAVE_ORDENES,
    queryFn: obtenerOrdenes,
    // `enabled: false` en modo demo: la consulta no se dispara y devuelve los fixtures.
    enabled: !MODO_DEMO,
    staleTime: 30_000,
  })

  if (MODO_DEMO) return { orders: ORDENES_DE_EJEMPLO, isLoading: false }
  return { orders: consulta.data ?? [], isLoading: consulta.isLoading }
}

/** Busca una orden por id. Devuelve undefined si no existe. */
export function useOrder(id: string | undefined): Order | undefined {
  const { orders } = useOrders()
  if (!id) return undefined
  return orders.find((orden) => orden.id === id)
}
```

### 5.16 `frontend/src/features/orders/context/` — crear **DOS** archivos

> 🔴 Van separados a propósito. Con el componente y el hook en el mismo archivo, oxlint
> avisa `react(only-export-components)` y el criterio F2 exige **cero warnings**.

**`frontend/src/features/orders/context/contextoNuevaOrden.ts`** (sin JSX)

```ts
import { createContext, useContext } from 'react'

/** Tope por orden, en bytes. Lo fija el disco del servidor (~3 GB libres), no el diseño. */
export const LIMITE_BYTES = 1024 ** 3

interface EstadoNuevaOrden {
  archivos: File[]
  comprador: string
  monto: string
  error: string | null
  enviando: boolean
  progreso: number
  agregarArchivos: (nuevos: File[]) => void
  quitarArchivo: (indice: number) => void
  setComprador: (valor: string) => void
  setMonto: (valor: string) => void
  setError: (valor: string | null) => void
  setEnviando: (valor: boolean) => void
  setProgreso: (valor: number) => void
  limpiar: () => void
}

export const Contexto = createContext<EstadoNuevaOrden | null>(null)

export function useNuevaOrden(): EstadoNuevaOrden {
  const valor = useContext(Contexto)
  if (valor === null) {
    throw new Error('useNuevaOrden debe usarse dentro de <ProveedorNuevaOrden>')
  }
  return valor
}
```

**`frontend/src/features/orders/context/ProveedorNuevaOrden.tsx`**

```tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Contexto, LIMITE_BYTES } from './contextoNuevaOrden'

function mismoArchivo(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size
}

function sumarBytes(archivos: File[]): number {
  return archivos.reduce((total, archivo) => total + archivo.size, 0)
}

function formatearPesoLocal(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  const decimales = i <= 1 ? 0 : 1
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })} ${unidades[i]}`
}

/**
 * Estado del formulario de nueva orden, compartido.
 *
 * 🔴 Existe porque el botón de envío NO vive dentro del formulario: está en el pie del
 * modal (ModalNuevaOrden) y en la barra fija de la página (NuevaOrdenPage). Sin un
 * contexto, el botón no puede leer los archivos que el usuario eligió, y cada una de las
 * dos pantallas necesitaría su propia copia de la misma lógica.
 */
export function ProveedorNuevaOrden({ children }: { children: ReactNode }) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [comprador, setComprador] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const agregarArchivos = useCallback((nuevos: File[]) => {
    if (nuevos.length === 0) return
    setError(null)
    setArchivos((previos) => {
      // Se ignoran los que ya estaban en vez de rechazar la tanda entera: volver a elegir
      // un archivo ya puesto es lo normal cuando se añaden de dos en dos.
      const sinRepetir = nuevos.filter(
        (nuevo) => !previos.some((previo) => mismoArchivo(previo, nuevo)),
      )
      if (sinRepetir.length === 0) return previos

      const combinados = [...previos, ...sinRepetir]
      if (sumarBytes(combinados) > LIMITE_BYTES) {
        setError(
          `No caben: serían ${formatearPesoLocal(sumarBytes(combinados))} y el máximo es ${formatearPesoLocal(LIMITE_BYTES)}.`,
        )
        return previos
      }
      return combinados
    })
  }, [])

  const quitarArchivo = useCallback((indice: number) => {
    setError(null)
    setArchivos((previos) => previos.filter((_, i) => i !== indice))
  }, [])

  const limpiar = useCallback(() => {
    setArchivos([])
    setComprador('')
    setMonto('')
    setError(null)
    setEnviando(false)
    setProgreso(0)
  }, [])

  const valor = useMemo(
    () => ({
      archivos,
      comprador,
      monto,
      error,
      enviando,
      progreso,
      agregarArchivos,
      quitarArchivo,
      setComprador,
      setMonto,
      setError,
      setEnviando,
      setProgreso,
      limpiar,
    }),
    [archivos, comprador, monto, error, enviando, progreso, agregarArchivos, quitarArchivo, limpiar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
```


### 5.17 `frontend/src/features/orders/hooks/useCrearOrden.ts` — crear

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crearOrden, type DatosNuevaOrden } from '../services/ordersService'
import { CLAVE_ORDENES } from './useOrders'

/**
 * Crea la orden y refresca la bandeja.
 *
 * `alProgresar` se pasa hasta el XHR: es lo que mueve la barra durante la subida.
 */
export function useCrearOrden(alProgresar: (porcentaje: number) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (datos: DatosNuevaOrden) => crearOrden(datos, alProgresar),
    onSuccess: () => {
      // La bandeja tiene que mostrar la orden recién creada al volver al panel.
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    },
  })
}
```

### 5.18 `frontend/src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.tsx` — reemplazar el contenido completo

```tsx
import { useRef } from 'react'
import { Banknote, Check, FileText, Info, Upload, X } from 'lucide-react'
import { formatearPeso } from '../../utils/format'
import { LIMITE_BYTES, useNuevaOrden } from '../../context/contextoNuevaOrden'
import styles from './FormularioNuevaOrden.module.scss'

/**
 * Los tres pasos de crear una orden, sin armazón alrededor.
 *
 * Vive aparte de la página porque el mismo marcado se usa en dos sitios: a pantalla
 * completa en teléfono y dentro de un modal en escritorio.
 *
 * El estado NO vive aquí, vive en ContextoNuevaOrden: el botón de envío está fuera de este
 * componente (en el pie del modal y en la barra fija de la página) y necesita leerlo.
 */
export function FormularioNuevaOrden() {
  const entradaRef = useRef<HTMLInputElement>(null)
  const {
    archivos,
    comprador,
    monto,
    error,
    enviando,
    progreso,
    agregarArchivos,
    quitarArchivo,
    setComprador,
    setMonto,
  } = useNuevaOrden()

  const total = archivos.reduce((suma, archivo) => suma + archivo.size, 0)

  return (
    <>
      {/* ── Paso 1 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>1</span>
          <h3 className={styles.pasoTitulo}>Selección</h3>
        </div>

        {/* El input real queda oculto: lo dispara el botón, que sí es enfocable con
            teclado, y así la zona puede tener el aspecto que pide el diseño. */}
        <input
          ref={entradaRef}
          type="file"
          multiple
          className={styles.entradaOculta}
          onChange={(evento) => {
            agregarArchivos(Array.from(evento.target.files ?? []))
            // Se limpia para que volver a elegir el MISMO archivo dispare `change` otra vez.
            evento.target.value = ''
          }}
        />

        <div
          className={styles.zonaSubida}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={(evento) => {
            evento.preventDefault()
            agregarArchivos(Array.from(evento.dataTransfer.files))
          }}
        >
          <span className={styles.zonaIcono}>
            <Upload size={21} aria-hidden="true" />
          </span>
          <p className={styles.zonaTitulo}>Elige el archivo(s) a vender</p>
          <p className={styles.zonaTexto}>
            {archivos.length === 0
              ? `Hasta ${formatearPeso(LIMITE_BYTES)} en total. Se cifra al subirlo.`
              : `${archivos.length} ${archivos.length === 1 ? 'archivo' : 'archivos'} · ${formatearPeso(total)} de ${formatearPeso(LIMITE_BYTES)}`}
          </p>
          <button
            type="button"
            className={styles.zonaBoton}
            onClick={() => entradaRef.current?.click()}
            disabled={enviando}
          >
            {archivos.length === 0 ? 'Buscar archivo' : 'Añadir más'}
          </button>
        </div>

        {error && (
          <p className={styles.errorSubida} role="alert">
            {error}
          </p>
        )}

        {enviando && (
          <div className={styles.progreso}>
            <div className={styles.progresoBarra}>
              <div className={styles.progresoRelleno} style={{ width: `${progreso}%` }} />
            </div>
            <span className={styles.progresoTexto}>Subiendo… {progreso}%</span>
          </div>
        )}

        {archivos.length > 0 && (
          <ul className={styles.lista}>
            {archivos.map((archivo, indice) => (
              <li className={styles.item} key={`${archivo.name}-${archivo.size}`}>
                <FileText size={17} className={styles.itemIcono} aria-hidden="true" />
                <span className={styles.itemNombre}>{archivo.name}</span>
                <span className={styles.itemPeso}>{formatearPeso(archivo.size)}</span>
                <button
                  type="button"
                  className={styles.itemQuitar}
                  onClick={() => quitarArchivo(indice)}
                  aria-label={`Quitar ${archivo.name}`}
                  disabled={enviando}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.nota}>
          <Info size={15} aria-hidden="true" />
          <span>
            Calculamos su <strong>peso, extensión y hash</strong>. Es lo único que el
            comprador ve antes de pagar: nunca el archivo en sí.
          </span>
        </p>
      </section>

      {/* ── Paso 2 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>2</span>
          <h3 className={styles.pasoTitulo}>A quién se la vendes</h3>
        </div>

        <label className={styles.etiqueta} htmlFor="comprador">
          @usuario del comprador
        </label>
        <input
          id="comprador"
          name="comprador"
          type="text"
          className={`${styles.campo} ${styles.campoMono}`}
          placeholder="@trq-0000"
          value={comprador}
          onChange={(evento) => setComprador(evento.target.value)}
          disabled={enviando}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className={styles.confirmacion}>
          <Check size={15} aria-hidden="true" />
          Te lo pasa el comprador desde su panel.
        </p>
      </section>

      {/* ── Paso 3 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>3</span>
          <h3 className={styles.pasoTitulo}>Cuánto acordaron</h3>
        </div>

        <label className={styles.etiqueta} htmlFor="monto">
          Monto en COP
        </label>
        <input
          id="monto"
          name="monto"
          type="text"
          inputMode="numeric"
          className={`${styles.campo} ${styles.campoMonto}`}
          placeholder="0"
          value={monto}
          onChange={(evento) => setMonto(evento.target.value)}
          disabled={enviando}
        />

        <p className={styles.avisoDinero}>
          <Banknote size={17} aria-hidden="true" />
          <span>
            Te transfiere <strong>directo a tu cuenta</strong>. MyTrueque no cobra, no
            retiene y no puede devolver ese dinero.
          </span>
        </p>
      </section>
    </>
  )
}
```


> ⚠️ **Dos cambios de copy deliberados**, porque los textos viejos ya no eran ciertos:
> la confirmación *"Ana R. — 17 operaciones completadas"* era un dato inventado sobre un
> comprador que ahora se escribe a mano; y *"directo a esa cuenta"* apuntaba a un campo
> que se eliminó.

### 5.19 `frontend/src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.module.scss` — UNA edición puntual

🔴 **NO reemplazar el archivo.** Localizar:

```scss
/* ── Archivos elegidos ── */
```

y reemplazar por:

```scss
/* ── Progreso de subida ── */

.progreso {
  margin-top: 12px;
}

.progresoBarra {
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--c-border);
  overflow: hidden;
}

.progresoRelleno {
  height: 100%;
  background: var(--c-accent);
  border-radius: var(--r-pill);
  transition: width 0.2s ease;
}

.progresoTexto {
  display: block;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--c-text-secondary);
}

/* ── Archivos elegidos ── */
```

### 5.20 `frontend/src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.tsx` — reemplazar el contenido completo

```tsx
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Modal } from '@/shared/components/Modal'
import { FormularioNuevaOrden } from '../FormularioNuevaOrden'
import { useNuevaOrden } from '../../context/contextoNuevaOrden'
import { ProveedorNuevaOrden } from '../../context/ProveedorNuevaOrden'
import { useCrearOrden } from '../../hooks/useCrearOrden'
import styles from './ModalNuevaOrden.module.scss'

/**
 * El formulario de nueva orden dentro de un modal, para pantallas anchas.
 *
 * Al cerrar hace `navigate(-1)` en vez de ocultar un estado local: la ruta /panel/nueva
 * está realmente activa (por eso el botón atrás del navegador también lo cierra), así que
 * cerrar es exactamente volver atrás. Si se ocultara sin navegar, la URL quedaría mintiendo.
 */
export function ModalNuevaOrden() {
  return (
    <ProveedorNuevaOrden>
      <ContenidoModal />
    </ProveedorNuevaOrden>
  )
}

function ContenidoModal() {
  const navigate = useNavigate()
  const { archivos, comprador, monto, enviando, setEnviando, setProgreso, setError } =
    useNuevaOrden()
  const mutacion = useCrearOrden(setProgreso)

  const puedeEnviar = archivos.length > 0 && comprador.trim() !== '' && monto.trim() !== ''

  function enviar() {
    setError(null)
    setEnviando(true)
    setProgreso(0)
    mutacion.mutate(
      { archivos, comprador, monto },
      {
        onSuccess: () => {
          setEnviando(false)
          navigate('/panel')
        },
        onError: (fallo: Error) => {
          setEnviando(false)
          setError(fallo.message)
        },
      },
    )
  }

  return (
    <Modal
      titulo="Vender file(s)"
      subtitulo="Tres datos y queda en custodia. El comprador lo verá en su panel."
      // Mientras sube no se cierra: cerrar desmonta el componente y aborta la petición
      // a medias, dejando archivos a medio escribir en el servidor.
      onCerrar={() => {
        if (!enviando) navigate(-1)
      }}
      pie={
        <div className={styles.pie}>
          <p className={styles.nota}>
            Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
            los 30 días si no cierra
          </p>
          <button
            type="button"
            className={styles.botonCrear}
            onClick={enviar}
            disabled={!puedeEnviar || enviando}
          >
            <Lock size={18} aria-hidden="true" />
            {enviando ? 'Subiendo…' : 'Poner en custodia'}
          </button>
        </div>
      }
    >
      <FormularioNuevaOrden />
    </Modal>
  )
}
```


### 5.21 `frontend/src/features/orders/pages/NuevaOrdenPage.tsx` — reemplazar el contenido completo

```tsx
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { FormularioNuevaOrden } from '../components/FormularioNuevaOrden'
import { useNuevaOrden } from '../context/contextoNuevaOrden'
import { ProveedorNuevaOrden } from '../context/ProveedorNuevaOrden'
import { useCrearOrden } from '../hooks/useCrearOrden'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Nueva orden a pantalla completa.
 *
 * Es lo que se ve en teléfono siempre, y en cualquier ancho al entrar directo por URL
 * (recarga o enlace pegado). En escritorio, navegando desde el panel, se usa ModalNuevaOrden.
 */
export function NuevaOrdenPage() {
  return (
    <ProveedorNuevaOrden>
      <ContenidoPagina />
    </ProveedorNuevaOrden>
  )
}

function ContenidoPagina() {
  const navigate = useNavigate()
  const { archivos, comprador, monto, enviando, setEnviando, setProgreso, setError } =
    useNuevaOrden()
  const mutacion = useCrearOrden(setProgreso)

  const puedeEnviar = archivos.length > 0 && comprador.trim() !== '' && monto.trim() !== ''

  function enviar() {
    setError(null)
    setEnviando(true)
    setProgreso(0)
    mutacion.mutate(
      { archivos, comprador, monto },
      {
        onSuccess: () => {
          setEnviando(false)
          navigate('/panel')
        },
        onError: (fallo: Error) => {
          setEnviando(false)
          setError(fallo.message)
        },
      },
    )
  }

  return (
    <PanelShell
      volverA="/panel"
      barra={
        <BarraAccion
          nota={
            <>
              Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
              los 30 días si no cierra
            </>
          }
        >
          <button
            type="button"
            className={styles.botonCrear}
            onClick={enviar}
            disabled={!puedeEnviar || enviando}
          >
            <Lock size={18} aria-hidden="true" />
            {enviando ? 'Subiendo…' : 'Poner en custodia'}
          </button>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Vender file(s)</h1>
      <p className={styles.subtitulo}>
        Tres datos y queda en custodia. El comprador lo verá en su panel.
      </p>

      <div className={styles.formulario}>
        <FormularioNuevaOrden />
      </div>
    </PanelShell>
  )
}
```


### 5.22 `frontend/src/features/orders/components/OrderCard/OrderCard.tsx` — DOS ediciones puntuales

🔴 **NO reemplazar el archivo.**

**(a)** Localizar esta línea — es **literal**, verificada contra el repo real:

```tsx
import { esMiTurno, type Order } from '../../types'
```

y reemplazarla por:

```tsx
import { esMiTurno, resumenDeArchivos, type Order } from '../../types'
```

**(b)** Localizar:

```tsx
          <span className={styles.archivoNombre}>{orden.archivo.nombre}</span>
          <span className={styles.archivoMeta}>{formatearPeso(orden.archivo.bytes)}</span>
```

y reemplazar por:

```tsx
          <span className={styles.archivoNombre}>{resumenDeArchivos(orden).nombre}</span>
          <span className={styles.archivoMeta}>
            {formatearPeso(resumenDeArchivos(orden).bytes)}
          </span>
```

### 5.23 `frontend/src/features/orders/components/GrillaArchivos/GrillaArchivos.tsx` — DOS ediciones puntuales

🔴 **NO reemplazar el archivo.**

**(a)** Localizar esta línea — literal, verificada:

```tsx
import { estaCerrada, type Order } from '../../types'
```

y reemplazarla por:

```tsx
import { estaCerrada, resumenDeArchivos, type Order } from '../../types'
```

**(b)** Localizar:

```tsx
                    {orden.archivo.extension.replace('.', '').toUpperCase()}
```

y reemplazar por:

```tsx
                    {resumenDeArchivos(orden).extension.replace('.', '').toUpperCase()}
```

Luego localizar:

```tsx
                <span className={styles.nombre}>{orden.archivo.nombre}</span>
```

y reemplazar por:

```tsx
                <span className={styles.nombre}>{resumenDeArchivos(orden).nombre}</span>
```

Y por último localizar:

```tsx
                  {formatearPeso(orden.archivo.bytes)} · para {orden.contraparte.handle}
```

y reemplazar por:

```tsx
                  {formatearPeso(resumenDeArchivos(orden).bytes)} · para{' '}
                  {orden.contraparte.handle}
```

### 5.24 `frontend/src/features/orders/pages/DetalleOrdenPage.tsx` — SIETE sustituciones literales

🔴 **NO reemplazar el archivo.** La v1 describía esto en prosa ("la línea del hash y su
cierre") y era ambiguo: `HashField` ocupa **ocho** líneas, no dos, y un executor literal
partía el componente por la mitad. Aquí van las sustituciones exactas, verificadas.

**(1)** Localizar:

```tsx
  const falta = orden.liberaAutomaticaEn ? tiempoRestante(orden.liberaAutomaticaEn) : null

  return (
```

y reemplazar por:

```tsx
  const falta = orden.liberaAutomaticaEn ? tiempoRestante(orden.liberaAutomaticaEn) : null
  // La orden puede traer varios archivos. La ficha técnica describe el primero; debajo se
  // listan todos, que es lo que el comprador necesita ver antes de pagar.
  const primerArchivo = orden.archivos[0]
  if (!primerArchivo) return <Navigate to="/panel" replace />

  return (
```

**(2)** `<span className={styles.archivoNombre}>{orden.archivo.nombre}</span>`
→ `<span className={styles.archivoNombre}>{primerArchivo.nombre}</span>`

**(3)** `Subido el {fechaLegible(orden.archivo.subidoEn)}`
→ `Subido el {fechaLegible(primerArchivo.subidoEn)}`

**(4)** `<dd>{orden.archivo.extension}</dd>`
→ `<dd>{primerArchivo.extension}</dd>`

**(5)** `<dd>{formatearPeso(orden.archivo.bytes)}</dd>`
→ `<dd>{formatearPeso(resumenDeArchivos(orden).bytes)}</dd>`

> El PESO es el del conjunto, no el del primero: si no, una orden de 3 archivos mostraría
> el peso de uno solo.

**(6)** 🔴 `<dd>{orden.archivo.archivosDentro ?? '—'}</dd>`
→ `<dd>{orden.archivos.length}</dd>`

> **NO** mapearlo a `primerArchivo.archivosDentro`: ese campo solo lo traen los fixtures
> (era "archivos dentro del zip"). En una orden real vale `undefined` y el metadato
> "ARCHIVOS" mostraría **`—` para siempre**. Lo que hay que contar es cuántos trae la orden.

**(7)** `          hash={orden.archivo.hash}`
→ `          hash={primerArchivo.hash}`

**(8)** El listado va **después del cierre completo de `HashField`** (el `/>`), no tras la
línea del `hash=`. Localizar:

```tsx
              : 'Compara este hash con el del archivo descargado. Si no coincide, no es el mismo archivo.'
          }
        />
```

y reemplazar por:

```tsx
              : 'Compara este hash con el del archivo descargado. Si no coincide, no es el mismo archivo.'
          }
        />

        {orden.archivos.length > 1 && (
          <ul className={styles.listaArchivos}>
            {orden.archivos.map((archivo) => (
              <li key={archivo.hash} className={styles.listaArchivosItem}>
                <span>{archivo.nombre}</span>
                <span>{formatearPeso(archivo.bytes)}</span>
              </li>
            ))}
          </ul>
        )}
```

**(9)** Añadir `resumenDeArchivos` al import que ya existe de `'../types'` (conservando los
símbolos que haya).

**(10)** Añadir al final de `DetalleOrdenPage.module.scss`:

```scss
.listaArchivos {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.listaArchivosItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 11px;
  background: var(--c-bg);
  font-size: 13.5px;
  color: var(--c-ink);

  span:last-child {
    flex: none;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--c-text-secondary);
  }
}
```

> Verificación: `grep -n "orden.archivo\." DetalleOrdenPage.tsx` no debe devolver nada.

### 5.24b 🔴 `frontend/src/features/orders/components/OrderCard/OrderCard.test.tsx` — edición olvidada en la v1

Este test **construye una orden a mano** con el campo singular, así que rompe el
`typecheck` en cuanto `Order.archivo` pasa a `Order.archivos`. La v1 no lo mencionaba y el
executor se lo habría encontrado de golpe en el Paso 11.

Localizar:

```tsx
    archivo: {
```

reemplazar por:

```tsx
    archivos: [{
```

y su llave de cierre (la línea `    },` justo antes de `    montoCop:`) por:

```tsx
    }],
```

### 5.25 `frontend/src/features/orders/data/ordersFixtures.ts` — edición mecánica

🔴 **NO reemplazar el archivo.** Los fixtures declaran `archivo: { ... }`. Hay que
convertir cada uno en una lista de un elemento.

Para **cada** aparición de:

```ts
    archivo: {
```

reemplazar por:

```ts
    archivos: [{
```

y su llave de cierre correspondiente (la línea `    },` que cierra ese objeto, justo antes
de `montoCop:`) por:

```ts
    }],
```

> Verificación: tras el cambio, `grep -c "archivos: \[{" ordersFixtures.ts` debe dar el
> mismo número que `grep -c "montoCop" ordersFixtures.ts`.

### 5.26 `frontend/src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.test.tsx` — reemplazar el contenido completo

> Los tests actuales renderizan `<FormularioNuevaOrden />` suelto; ahora necesita el
> proveedor de contexto alrededor.

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioNuevaOrden } from './FormularioNuevaOrden'
import { ProveedorNuevaOrden } from '../../context/ProveedorNuevaOrden'

/**
 * Un File del tamaño que se pida sin reservar esa memoria: `File` toma el tamaño de su
 * contenido, así que para probar el tope de 1 GB se redefine `size`. Crear un archivo de
 * ese tamaño de verdad reventaría el runner.
 */
function archivoDe(nombre: string, bytes: number): File {
  const archivo = new File(['x'], nombre, { type: 'application/octet-stream' })
  Object.defineProperty(archivo, 'size', { value: bytes })
  return archivo
}

const GB = 1024 ** 3

function montar() {
  render(
    <ProveedorNuevaOrden>
      <FormularioNuevaOrden />
    </ProveedorNuevaOrden>,
  )
}

function entradaDeArchivos(): HTMLInputElement {
  const entrada = document.querySelector('input[type="file"]')
  if (!entrada) throw new Error('no hay input de archivos')
  return entrada as HTMLInputElement
}

describe('FormularioNuevaOrden — selección de archivos', () => {
  it('parte sin archivos y anuncia el tope', () => {
    montar()
    expect(screen.getByText(/Hasta 1 GB en total/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar archivo' })).toBeInTheDocument()
  })

  it('acepta varios archivos y muestra el total', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [
      archivoDe('contrato.pdf', 240 * 1024 ** 2),
      archivoDe('planos.zip', 300 * 1024 ** 2),
    ])

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument()
    expect(screen.getByText('planos.zip')).toBeInTheDocument()
    expect(screen.getByText(/2 archivos · 540 MB de 1 GB/)).toBeInTheDocument()
  })

  it('rechaza la tanda si el TOTAL pasa de 1 GB, no cada archivo por separado', async () => {
    const user = userEvent.setup()
    montar()

    // Ninguno de los dos llega al tope por su cuenta; juntos sí lo pasan.
    await user.upload(entradaDeArchivos(), [archivoDe('a.mov', 0.6 * GB)])
    expect(screen.getByText(/1 archivo · 614,4 MB de 1 GB/)).toBeInTheDocument()

    await user.upload(entradaDeArchivos(), [archivoDe('b.mov', 0.6 * GB)])
    expect(screen.getByRole('alert')).toHaveTextContent(/máximo es 1 GB/)
    // El que ya estaba se conserva: rechazar lo nuevo no puede borrar lo anterior.
    expect(screen.getByText('a.mov')).toBeInTheDocument()
    expect(screen.queryByText('b.mov')).not.toBeInTheDocument()
  })

  it('ignora el mismo archivo elegido dos veces', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [archivoDe('foto.png', 1024)])
    await user.upload(entradaDeArchivos(), [archivoDe('foto.png', 1024)])

    expect(screen.getAllByText('foto.png')).toHaveLength(1)
    expect(screen.getByText(/1 archivo · 1 KB/)).toBeInTheDocument()
  })

  it('permite quitar un archivo de la lista', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [
      archivoDe('uno.txt', 2048),
      archivoDe('dos.txt', 1024),
    ])
    await user.click(screen.getByRole('button', { name: 'Quitar uno.txt' }))

    expect(screen.queryByText('uno.txt')).not.toBeInTheDocument()
    expect(screen.getByText('dos.txt')).toBeInTheDocument()
    expect(screen.getByText(/1 archivo · 1 KB/)).toBeInTheDocument()
  })

  it('los campos de comprador y monto son editables', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('@usuario del comprador'), '@trq-abcd')
    await user.type(screen.getByLabelText('Monto en COP'), '450000')

    expect(screen.getByLabelText('@usuario del comprador')).toHaveValue('@trq-abcd')
    expect(screen.getByLabelText('Monto en COP')).toHaveValue('450000')
  })
})
```


### 5.27 `frontend/src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.test.tsx` — reemplazar el contenido completo

```tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import { ModalNuevaOrden } from './ModalNuevaOrden'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function abrir(this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function cerrar(this: HTMLDialogElement) {
      this.open = false
    }
  }
})

describe('ModalNuevaOrden', () => {
  it('lleva dentro los tres pasos del formulario', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })

    expect(screen.getByRole('heading', { name: 'Vender file(s)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Selección' })).toBeInTheDocument()
    expect(screen.getByLabelText('@usuario del comprador')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto en COP')).toBeInTheDocument()
  })

  it('los inputs van a 16px, para que iOS no haga zoom al enfocarlos', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })
    expect(screen.getByLabelText('@usuario del comprador').className).toContain('campo')
    expect(screen.getByLabelText('Monto en COP').className).toContain('campo')
  })

  it('el botón de envío arranca deshabilitado: sin archivos no hay orden', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })
    expect(screen.getByRole('button', { name: /Poner en custodia/ })).toBeDisabled()
  })
})
```

---

## 6. Orden de ejecución

Reportar cada paso como `✅ Paso N — OK` o `❌ Paso N — FALLO: razón`. Detenerse al primer fallo.

### Paso 1 — Prerequisitos
Correr los 8 checks de la §3. **El check 7 es bloqueante.**

### Paso 2 — Almacenamiento y configuración
1. Crear `backend/src/core/storage.py` (5.1).
2. Reemplazar `backend/src/core/config.py` (5.2).

### Paso 3 — Modelos y migración
1. Crear `backend/src/features/orders/__init__.py` **vacío** (5.3).
2. Crear `backend/src/features/orders/models.py` (5.4).
3. Editar `backend/alembic/env.py` (5.9).
4. Editar `backend/tests/conftest.py` (5.10).
5. Crear la migración `alembic/versions/a1b2c3d4e5f6_create_orders.py` (5.11).
6. Aplicarla: desde `backend/`, `uv run alembic upgrade head`.
7. Verificar el ciclo completo:
   ```bash
   uv run alembic downgrade -1
   uv run alembic upgrade head
   ```
   Los dos sin error. **Si el downgrade falla, DETENERSE.**

### Paso 4 — Servicio y endpoints
1. Crear `backend/src/features/orders/schemas.py` (5.5).
2. Crear `backend/src/features/orders/service.py` (5.6).
3. Crear `backend/src/features/orders/api.py` (5.7).
4. Reemplazar `backend/src/main.py` (5.8).

### Paso 5 — Calidad del backend
Desde `backend/`:
```bash
uv run ruff check .
uv run mypy src
```
Los dos exit 0. **Si mypy falla, DETENERSE** (el proyecto está en `strict`).

### Paso 6 — Tests del backend
1. Crear `backend/tests/test_orders.py` (5.12).
3. `uv run pytest -q` → **34 passed** (22 existentes + 12 nuevos).

### Paso 7 — Arrancar el backend y comprobar el OpenAPI
```bash
cd backend
uv run uvicorn src.main:app --reload --port 8000
```
Abrir `http://localhost:8000/docs` y confirmar que aparecen **`POST /orders`** y
**`GET /orders`**. Dejarlo corriendo.

### Paso 8 — 🔴 Regenerar los tipos del frontend
Con el backend corriendo, desde `frontend/`:
```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api/schema.d.ts
```
Verificar que `src/lib/api/schema.d.ts` ahora contiene `"/orders"`.

> ⚠️ **Nunca editar `schema.d.ts` a mano**: dice "auto-generated" en su cabecera y el
> siguiente que lo regenere perdería el cambio.
>
> 🔴 **Este paso bloquea todo el frontend.** Hasta que `schema.d.ts` conozca `/orders`,
> `pnpm typecheck` falla con `Argument of type '"/orders"' is not assignable to parameter
> of type 'PathsWithMethod<paths, "get">'`. Si el backend no arranca (por ejemplo, porque
> `.env` no tiene las claves de Google, que son **obligatorias** en `Settings`), no se puede
> continuar: DETENERSE y reportar.

### Paso 9 — Tipos y datos del frontend
1. Editar `src/features/orders/types.ts` (5.13).
2. Editar `src/features/orders/data/ordersFixtures.ts` (5.25).
3. Crear `src/features/orders/services/ordersService.ts` (5.14).
4. Reemplazar `src/features/orders/hooks/useOrders.ts` (5.15).
5. Crear `src/features/orders/context/ContextoNuevaOrden.tsx` (5.16).
6. Crear `src/features/orders/hooks/useCrearOrden.ts` (5.17).

### Paso 10 — Pantallas
1. Reemplazar `FormularioNuevaOrden.tsx` (5.18) y editar su `.module.scss` (5.19).
2. Reemplazar `ModalNuevaOrden.tsx` (5.20).
3. Reemplazar `NuevaOrdenPage.tsx` (5.21).
4. Editar `OrderCard.tsx` (5.22), `GrillaArchivos.tsx` (5.23), `DetalleOrdenPage.tsx` +
   su `.module.scss` (5.24).

### Paso 11 — Calidad del frontend
1. Reemplazar los dos tests (5.26 y 5.27).
2. Desde `frontend/`:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```
   Los 4 en verde, lint **sin warnings**. Tests: **45 passed**.

### Paso 12 — Verificación en navegador
Con backend (`:8000`) y frontend (`:5173`) corriendo, ejecutar la tabla de la §8.

> Hacen falta **DOS cuentas**: una vende y la otra compra. Créalas desde la propia UI.
> Probar **a 390px y a 1280px**.

### Paso 13 — Reportar
Detener los procesos. **No comitear ni pushear.** Reportar archivos tocados y los checks.

---

## 7. Reglas no negociables

1. **No instalar dependencias.** Ni `uv add`, ni `pnpm add`, ni tocar `pyproject.toml` o
   `package.json`.
2. **No tocar `backend/src/features/auth/`**, `backend/src/core/db.py` ni
   `backend/src/core/security.py`. El login funciona; no es parte de esta tarea.
3. **No comitear ni pushear.** El repositorio tiene remoto; el usuario decide cuándo subir.
4. 🔴 **Verificar que `backend/data/custodia/` está en `.gitignore` ANTES de crear nada.**
   Si no lo está, DETENERSE. Son archivos privados de usuarios y el remoto es público.
5. 🔴 **El nombre del archivo en disco es un UUID, NUNCA el que mandó el usuario.** Un
   `../` en el nombre permite escribir fuera de la carpeta de la orden.
6. 🔴 **El hash y la escritura van por bloques de 1 MB.** Cargar el archivo entero en
   memoria mata un t3.micro con un archivo de 1 GB.
7. 🔴 **El tope de 1 GB y el chequeo de disco se validan en el SERVIDOR.** El límite del
   navegador es comodidad; `curl` se lo salta.
8. **Sin espacio ⇒ `507`, no `500`.** Y el mensaje dice qué hacer.
9. **`POST /orders` usa XMLHttpRequest, no `fetch`.** Es lo único que da progreso de subida.
10. **El modo demo (`?demo=1`) sigue funcionando** y no llama al backend.
11. **Todo o nada**: si algo falla a mitad de la subida, se borra la carpeta y no queda fila.
12. **`schema.d.ts` se regenera con el comando del Paso 8**, nunca se edita a mano.
13. **Mobile-first en el SCSS nuevo**: base sin media query, escritorio en `@include desde-md`.
    **Prohibido `bp-lg`/`bp-md`/`bp-sm`** (son de la landing).
14. **Ningún objetivo táctil por debajo de 44px**; los inputs a **16px** como mínimo (por
    debajo, iOS hace zoom al enfocar).
15. **Cero colores hex sueltos** en el SCSS nuevo, salvo `#ffffff` sobre acento u oscuro.
16. **No inventar cifrado ni purga.** Están fuera de alcance (§9); hacerlos a medias es peor
    que no hacerlos.
17. Si algo no está especificado, **preguntar antes de decidir**.

---

## 8. Validaciones post-ejecución

### Automáticas

| # | Check | Comando (desde) | Esperado |
|---|---|---|---|
| B1 | Lint backend | `uv run ruff check .` (backend) | exit 0 |
| B2 | Tipos backend | `uv run mypy src` (backend) | exit 0, strict |
| B3 | Tests backend | `uv run pytest -q` (backend) | **34 passed**, 1 warning (de Starlette, no del codigo) |
| B4 | Migración ida y vuelta | `uv run alembic downgrade -1 && uv run alembic upgrade head` | sin error |
| B5 | OpenAPI | `curl -s localhost:8000/openapi.json \| findstr orders` | aparece |
| F1 | Typecheck | `pnpm typecheck` (frontend) | exit 0 |
| F2 | Lint | `pnpm lint` (frontend) | exit 0, sin warnings |
| F3 | Tests | `pnpm test` (frontend) | **45 passed** |
| F4 | Build | `pnpm build` (frontend) | exit 0 |
| F5 | Sin dependencias nuevas | comparar con §1.4 | `pyproject.toml` y `package.json` idénticos |
| G1 | 🔴 Custodia fuera de git | `git status --short` tras crear una orden | **no aparece** ningún archivo de `data/custodia/` |

### 🖥️ Escritorio — 1280px, con dos cuentas

| # | Check | Cómo | Esperado |
|---|---|---|---|
| E1 | Botón deshabilitado al abrir | Abrir el modal sin elegir nada | "Poner en custodia" **gris/deshabilitado** |
| E2 | Se habilita al completar | Elegir un archivo + `@usuario` + monto | El botón se activa |
| E3 | **Crea la orden** | Pulsar "Poner en custodia" | Barra de progreso, el modal se cierra y vuelve a `/panel` |
| E4 | Aparece en la bandeja | Mirar `/panel` | La orden está, con el peso real y chip `EN CUSTODIA` |
| E5 | **Los bytes llegaron al disco** | Mirar `backend/data/custodia/<id>/` | Están los archivos, con nombre UUID `.bin` |
| E6 | Hash real | Abrir el detalle de la orden | El hash tiene 64 caracteres hex y **no** es el del fixture |
| E7 | Varios archivos | Crear una orden con 3 archivos | El detalle los lista los 3; la tarjeta dice "3 archivos" |
| E8 | **El comprador la ve** | Salir, entrar con la otra cuenta | La misma orden, con rol **comprador** y la contraparte correcta |
| E9 | `@usuario` inexistente | Poner `@trq-zzzz` y enviar | Error en pantalla: "Ese @usuario no existe…" |
| E10 | Venderse a uno mismo | Poner el propio `@usuario` | Error claro, no un 500 |
| E11 | No se cierra subiendo | Con la subida en curso, pulsar Escape y ✕ | **No se cierra** hasta que termine |
| E12 | Modo demo intacto | Ir a `/panel?demo=1` | Se ven los fixtures, **no** las órdenes reales |
| E13 | Aislamiento | Entrar con una tercera cuenta | **No** ve órdenes ajenas |

### 📱 Móvil — 390px

| # | Check | Cómo | Esperado |
|---|---|---|---|
| M1 | Sigue a pantalla completa | Desde `/panel`, "Subir archivo para vender" | Navega a `/panel/nueva`, **sin modal** |
| M2 | Crear funciona igual | Completar y pulsar el botón de la barra fija | Crea la orden y vuelve a `/panel` |
| M3 | Progreso visible | Durante la subida | La barra se ve **sin** tener que hacer scroll |
| M4 | Sin desborde | En `/panel/nueva` y en `/panel` con órdenes reales | Cero scroll horizontal |
| M5 | Inputs a 16px | Enfocar "Monto en COP" | La pantalla **no** hace zoom |
| M6 | Táctiles | Medir botones y el de quitar archivo | Ninguno por debajo de 44px |

### Consola y logs

| # | Check | Esperado |
|---|---|---|
| C1 | Consola del navegador | **Cero errores de JavaScript** (excepciones, avisos de React). ⚠️ Los mensajes `Failed to load resource … 401/404` **NO cuentan**: el 401 es el `/auth/me` normal antes de entrar, y el 404 lo provoca el propio check E9. Un criterio de "cero mensajes" es infalsificable |
| C2 | Log del backend | Ningún `500`. Los rechazos son `404`/`413`/`422`/`507` |

---

## 9. Fuera de alcance

1. **Descargar el archivo.** El comprador ve la ficha, todavía no puede bajarlo.
2. **Cifrado en reposo.** El copy lo promete; se implementa en la siguiente tanda. **No
   hacerlo a medias aquí.**
3. **Purga automática a los 30 días.** La columna `purge_at` se rellena, pero **nada la
   ejecuta todavía**. Hace falta una tarea programada.
4. **Las transiciones de estado** (`EN_INSPECCIÓN`, `PAGO_ENVIADO`, `LIBERADO`,
   `DESCARGADO`): los botones de esas pantallas siguen siendo maqueta.
5. **Subir el comprobante de pago.** `comprobante` se serializa siempre `null`.
6. **La liberación automática a las 24 h.**
7. **Subida reanudable o por partes.** Si se corta la conexión a mitad de 1 GB, se empieza
   de cero.
8. **Ampliar el disco del EC2 ni desplegar.** Este plan solo toca el código.
9. **`git commit` y `git push`.**

---

## Resumen ejecutivo

Crear una orden sube archivos reales a disco con hash y límite de 1 GB; ambas partes la ven
en su panel.
