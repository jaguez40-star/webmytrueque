# CLAUDE.md — Contexto del Proyecto

> Este archivo es leído automáticamente por Claude al inicio de cada sesión.
> Mantenerlo actualizado evita exploración innecesaria del codebase.
> Ver `BITACORA.md` (misma carpeta) para el historial de sesiones.

---

## 0. Idioma de Comunicacion

**Toda la comunicacion en este proyecto debe ser en español.** Claude debe responder, explicar, diagnosticar, proponer y confirmar exclusivamente en español. Esto incluye mensajes en el chat, comentarios en codigo, nombres de commits y cualquier otra interaccion. No usar ingles salvo en nombres tecnicos (variables, funciones, comandos, etc.) que por convencion se escriben en ingles.

---

## 0.1 Estilo de respuesta — IMPORTANTE

- Sé breve y conciso. Ve directo al grano.
- No expliques lo que vas a hacer antes de hacerlo.
- No resumas lo que hiciste después de hacerlo, salvo que el resultado lo amerite.
- Sin preámbulos tipo "Claro", "Por supuesto", "Con gusto".
- Si la respuesta es código, entrega el código. Sin contexto innecesario.
- Si necesitas explicar, máximo 2-3 líneas.
- Responde siempre en español, usando tuteo informal.

---

## 0.2 Directiva de Ejecucion — Modo Planner para ejecución externa (ALTA PRIORIDAD)

Cuando el usuario escriba `plan:` al inicio de su mensaje, Claude Code actúa
exclusivamente como **Planner**. NO ejecuta código. Solo genera un archivo `.md`
en `Planes/` con la especificación completa para que un **agente externo sin
acceso al repositorio ni contexto previo** pueda ejecutarlo al pie de la letra.

### Reglas del Planner

1. **Solo genera el plan, nunca ejecuta.** Cero archivos creados fuera de `Planes/`.
   Cero comandos bash. Cero ediciones a código. Solo el `.md`.

2. **El plan debe ser 100% autocontenido.** El agente executor NO tiene acceso a:
   - Conversaciones previas
   - Historial de Git
   - Memoria de decisiones anteriores
   - Ningún archivo del repo que no se le muestre explícitamente

3. **Rutas absolutas siempre.** Nunca "el archivo del layout" o "el config".
   Siempre rutas absolutas relativas al root del proyecto.

4. **Código de referencia obligatorio.** Si el plan pide crear un archivo, incluir
   el código completo o un ejemplo patrón que el executor copie y adapte. Nunca
   "crea un componente similar al que ya existe" — el executor no sabe cuál es.

5. **Contexto del proyecto inline.** El plan incluye al inicio un bloque breve con:
   - Stack (lenguajes, frameworks, versiones)
   - Estructura de carpetas relevante (solo las carpetas que toca la tarea)
   - Convenciones de naming activas
   - Variables de entorno o config necesarias

6. **Dependencias explícitas.** Si la tarea necesita que otra tarea esté completada,
   decir cuál y qué archivos/tablas/endpoints debieron haberse creado. Incluir
   un check de verificación que el executor pueda correr antes de empezar
   (ej: `ls ruta/al/archivo` o `pnpm list paquete`).

7. **Criterios de aceptación verificables.** Cada plan termina con una tabla de
   checks que el executor debe correr y reportar. Formato:

   | # | Check | Comando | Resultado esperado |
   |---|---|---|---|
   | 1 | Lint pasa | `pnpm lint` | exit 0 |
   | 2 | Tests pasan | `pnpm test` | X+ tests passing |

8. **Decisiones cerradas.** El plan NO deja decisiones abiertas al executor.
   Si hay una decisión de diseño (ej: ¿usar forwardRef o no?), el Planner
   la toma y la documenta. El executor no decide nada — solo implementa.

9. **Secciones obligatorias del plan:**

   ```
   1. Contexto del proyecto (stack, estructura, convenciones)
   2. Objetivo de la tarea (qué se logra al final)
   3. Prerequisitos (qué debe existir antes de empezar + checks)
   4. Inventario de archivos a crear/modificar (tabla con rutas)
   5. Especificación por archivo (código completo o patrón)
   6. Orden de ejecución (pasos secuenciales numerados)
   7. Reglas no negociables (lo que el executor NO puede cambiar)
   8. Validaciones post-ejecución (tabla de checks con comandos)
   9. Fuera de alcance (lo que esta tarea NO incluye)
   ```

10. **Naming del archivo:** `Planes/plan_[ID_TAREA]_[fecha].md`
    Ejemplo: `Planes/plan_W1.17_20260504.md`

11. **Resumen ejecutivo al final del plan.** Máximo 20 palabras que sinteticen
    qué se hace y el resultado esperado. Sirve como guía rápida para el executor.

12. **Modo A:** Después de generar el plan, Claude muestra la ruta,
    el resumen ejecutivo, y se detiene. Pregunta: "¿Aprobado para
    entregar al executor?" No ejecuta nada hasta confirmación.

### Prompt que el usuario entrega al executor

Junto con el plan, el usuario copia este prompt al agente externo:

```
Eres un agente EXECUTOR. Lee completo el plan indicado y ejecútalo
AL PIE DE LA LETRA.

Reglas:
1. CERO modificaciones — no agregues, no saltes, no reinterpretes.
2. Orden secuencial estricto. Si un paso falla, DETENTE.
3. Si algo no está especificado, pregunta antes de decidir.
4. Reporta cada paso: ✅ Paso N — OK  o  ❌ Paso N — FALLO: razón.
5. Al final: resumen de archivos tocados + "¿Hago commit?"
```

### Ejemplo de uso

```
Usuario: plan: Crear los componentes primitivos del Design System

Claude:
  1. Lee el repo, identifica estructura actual
  2. Genera Planes/plan_[ID]_[fecha].md con las 9 secciones
  3. Muestra resumen + "¿Aprobado?"

Usuario: aprobado

Claude:
  "Plan listo en Planes/plan_[ID]_[fecha].md.
   Entrégalo al executor con el prompt estándar."
```

---

## 1. Stack Tecnológico

### Backend

| Componente | Versión | Uso |
|------------|---------|-----|
| Python | 3.12+ | Lenguaje |
| FastAPI | latest | Framework + OpenAPI auto |
| SQLAlchemy | 2.0+ | ORM |
| Alembic | latest | Migraciones BD |
| Pydantic | 2.x | Validación |
| structlog | latest | Logs JSON UTC |
| itsdangerous | 2.x | Cookie firmada de sesión |
| uv | latest | Package manager |
| Ruff + Black + mypy | latest | Lint + format + type check |

### Frontend

| Componente | Versión | Uso |
|------------|---------|-----|
| React | 19 | UI |
| TypeScript | 5.x | Tipado estricto |
| Vite | latest | Bundler / dev server |
| TanStack Query | v5 | Estado de servidor |
| Zustand | 5 | Estado global cliente |
| react-hook-form | 7.74 | Formularios |
| zod | 4.3 | Validación schemas |
| react-router-dom | latest | Routing SPA |
| Sass | latest | Estilos |
| Lucide React | latest | Iconografía tree-shakeable |
| openapi-typescript + openapi-fetch | latest | Tipos auto + cliente HTTP tipado |
| Vitest + RTL | latest | Tests unitarios |
| Playwright | latest | Tests E2E |
| pnpm | latest | Package manager + workspaces |

---

## 2. Estructura del Proyecto

Repositorio único con **backend y frontend como carpetas hermanas** en la raíz
(no anidadas una dentro de la otra):

```
Trueque.com/
├── CLAUDE.md         ← este archivo — contexto, stack, reglas de trabajo
├── BITACORA.md        ← historial de sesiones (ver Sección 3)
├── Planes/             ← planes generados por la directiva `plan:` (Sección 0.2)
├── backend/            ← FastAPI + SQLAlchemy (ver Stack, Sección 1)
└── frontend/           ← React + TypeScript + Vite (ver Stack, Sección 1)
```

- `backend/` y `frontend/` se desarrollan y corren de forma independiente
  (procesos separados, cada uno con su propio entorno/dependencias).
- Los planes (`plan:`) se guardan en `Planes/` en la raíz — si el proyecto
  crece y conviene separarlos por área, se replantea entonces.

### Cómo levantar cada parte

```bash
# Backend — SIEMPRE desde backend/ (DATABASE_URL es una ruta relativa)
cd backend
uv run uvicorn src.main:app --reload --port 8000

# Frontend
cd frontend
pnpm dev        # http://localhost:5173
```

---

## 2.1 Secretos y credenciales — NUNCA en este archivo

**Regla dura: ninguna credencial, token, contraseña o secreto se escribe en
`CLAUDE.md`, en `BITACORA.md`, en los planes de `Planes/` ni en ningún archivo
versionado.** `CLAUDE.md` es documentación: va al repositorio y se comparte.

Todos los secretos viven en **`backend/.env`**, que está en `.gitignore`. La
plantilla `backend/.env.example` (esa sí versionada) lista las claves con
valores de ejemplo, para que cualquiera sepa qué necesita sin exponer nada.

| Variable | Qué es | Dónde se obtiene |
|---|---|---|
| `SECRET_KEY` | Firma la cookie de sesión | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | Ruta de la SQLite | fija: `sqlite:///./data/trueque.db` |
| `CORS_ORIGINS` | Orígenes permitidos | dev: `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | OAuth de Google | Google Cloud Console (ver abajo) |
| `GOOGLE_CLIENT_SECRET` | OAuth de Google | ídem — **solo se muestra una vez** |
| `GOOGLE_REDIRECT_URI` | Callback de OAuth | dev: `http://localhost:8000/auth/google/callback` |

### Proyecto de Google Cloud (login con Google)

- **Proyecto**: `MyTrueque` — Google Auth Platform, organización "Sin organización".
- **Cuenta dueña**: cuenta de Google dedicada al proyecto (no la personal).
- **Cliente OAuth**: "Aplicación web", creado el 2026-09-21.
  - Orígenes JS autorizados: `http://localhost:5173` y `https://mytrueque.shop`
  - URIs de redireccionamiento: `http://localhost:8000/auth/google/callback` y
    `https://mytrueque.shop/auth/google/callback`
- **Estado: En producción** (publicado el 2026-09-22). Cualquier cuenta de
  Google puede completar el login — ya no hace falta estar en una lista de
  usuarios de prueba. No requirió verificación de Google porque usa un solo
  dominio, sin logo cargado en la pantalla de consentimiento y solo permisos
  básicos (nombre, correo, foto). Si en algún momento se sube un logo,
  Google va a pedir verificar la propiedad del dominio en Search Console
  antes de dejar publicar de nuevo.
- **Páginas de privacidad y términos** (obligatorias para publicar):
  `https://mytrueque.shop/privacidad` y `https://mytrueque.shop/terminos` —
  código en `frontend/src/features/legal/`.
- **Si se pierde el Client Secret**: no se puede recuperar, se genera uno nuevo
  desde Google Auth Platform → Clientes → (el cliente) → Agregar secreto.
- **Costo**: cero. Sign in with Google no se factura y no pide tarjeta.

---

## 3. Bitácora de sesiones — cómo diligenciarla

Registro cronológico del avance real del proyecto: qué se hizo, por qué, y qué
archivos tocó. Sirve para retomar contexto sin releer todo el historial de git
ni la conversación completa. **Vive en `BITACORA.md`**, en la raíz del proyecto
(no en este archivo) — así `CLAUDE.md` se mantiene enfocado en reglas y
contexto estable, y la bitácora crece sin inflarlo.

### Reglas de diligenciamiento

1. **Una fila por sesión o tarea cerrada.** No por cada mensaje — al terminar
   un bloque de trabajo coherente (una feature, un fix, una migración).
2. **Solo se agrega, nunca se edita ni se borra una fila pasada.** Si algo
   quedó mal hecho o se revierte, se documenta como una fila nueva que lo
   explica — igual que un log contable.
3. **Orden cronológico ascendente**, la fila más reciente va al final de la
   tabla.
4. **`ID` es un código corto y estable** para la tarea/feature (ej. `F1`,
   `W1.3`, `FIX-login`). Si la tarea tiene un plan en `Planes/`, usar el mismo
   ID para poder cruzarlos.
5. **`Descripción` es técnica y densa, no un resumen de marketing.** Debe
   responder: qué se construyó o cambió, qué decisión de diseño se tomó y por
   qué (si hubo alguna no obvia), y cualquier hallazgo o pendiente que quede
   abierto. Si algo quedó pendiente de validar, decirlo explícitamente (ej.
   "⏳ pendiente validación en navegador").
6. **`Archivos principales`** lista solo las rutas relevantes para entender el
   cambio — no todo lo que tocó el diff (ej. no listar `package-lock.json`).
7. **`Commits`** lleva el hash corto si ya se comiteó, o `pendiente` /
   `sin commit` si no.
8. Al cerrar una tarea, agregar la fila en `BITACORA.md` **antes** de
   reportarle al usuario que terminaste — es parte de "terminar", no un paso
   aparte.

---

## 4. Diseño — Handoffs de UI

Los diseños de referencia (prototipos hi-fi) viven en
`Diseño MyTrueque.com P2P/` en la raíz del proyecto, cada landing/flujo en su
propia carpeta `design_handoff_<nombre>/` con un `README.md` que es la
**especificación completa** (tokens, copy, comportamiento, responsive, gaps
abiertos). Los `.dc.html` son **prototipos de diseño, no código para copiar**:
usan estilos inline por la herramienta que los genera; la UI real se
construye en React + Sass con los patrones del `frontend/`.

### `design_handoff_mytrueque_main/` — Landing pública (Main / Auth)

- **Fuente de verdad**: `MyTrueque Main v5.dc.html` + su `README.md`. Los
  demás `.dc.html` (`v4`, `Logo`, `Rutas`) son exploraciones previas, ya
  decididas — no partir de ellos.
- **Fidelidad**: alta (hifi). Colores, tipografía, espaciado, estados e
  interacciones son definitivos, no hay margen de reinterpretación salvo lo
  listado como gap abierto abajo.
- **Modelo de negocio que fija el copy y los estados** (imprescindible antes
  de tocar esta pantalla):
  - Relación 1 a 1 vendedor↔comprador, identificados por `@usuario` asignado
    al registrarse (ej. `@trq-9k2f`). Sin enlaces públicos.
  - El **archivo** pasa por custodia cifrada solo mientras vive la orden; se
    purga al confirmarse la descarga (o a los 30 días si la orden no cierra).
  - El **dinero nunca** pasa por la plataforma — transferencia directa
    comprador → vendedor, fuera de la app.
  - Liberación automática: con comprobante cargado, si el vendedor no libera
    en 24 h la plataforma habilita la descarga.
  - Máquina de estados de la orden: `EN CUSTODIA → EN INSPECCIÓN →
    PAGO ENVIADO → LIBERADO → DESCARGADO → PURGADO`.
- **Tokens de marca** (ya cerrados, no rediseñar): acento violeta
  `oklch(0.50 0.16 300)` ≈ `#6D3BC4`; señal lima `oklch(0.85 0.16 120)` ≈
  `#C2E34F` reservada **solo para éxito** (chip DESCARGADO, sello
  VERIFICABLE, CTA del bloque oscuro); tinta `#161020`. Tipografía:
  **Instrument Sans** (titulares/UI) + **IBM Plex Mono** (datos/estados,
  mayúsculas). Detalle completo de escala, radios, sombras y breakpoints en
  el `README.md` de la carpeta — no se replica aquí para no desincronizarse.
- **Stack objetivo coincide exacto con la Sección 1** de este archivo — no
  hay que reconciliar versiones.
- **Gaps que el diseño deja abiertos** (a decidir en implementación, no
  están en el prototipo): estados de error de formulario, estados de
  carga/spinner, y las pantallas intermedias de la máquina de estados de la
  orden (el handoff solo cubre la landing pública, no el dashboard de
  órdenes).
- `image-slot.js` y `support.js` son utilidades de la herramienta de diseño
  — **no se implementan**, son placeholders de fotos de la demo.
