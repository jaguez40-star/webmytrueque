# Plan PANEL — Panel post-login **mobile-first** (bandeja, detalle, creación y cuenta)

> Plan de ejecución para agente EXECUTOR externo. **Autocontenido**: no requiere contexto
> previo, conversaciones anteriores ni historial de Git. Ejecutar AL PIE DE LA LETRA, en
> orden. Si un paso falla, DETENERSE y reportar.
>
> **Versión 4 (2026-09-21) — auditada.** La v3 se ejecutó entera sobre un clon del
> proyecto (45 archivos extraídos del propio `.md` + 3 parches aplicados a mano,
> `pnpm install` limpio, 23 tests, y las 5 pantallas ejercitadas en **Chromium real a 360px
> y a 390px** contra el backend de verdad). Pasó typecheck, lint, tests y build **a la
> primera**, pero **2 de las 25 comprobaciones de navegador fallaron**: dos objetivos
> táctiles por debajo del mínimo, uno de ellos contradiciendo una regla del propio plan.
> Corregidos en 5.8 y 5.13; el detalle está en la **Sección 12**.
>
> **Versión 3 (2026-09-21) — REESCRITO PARA MÓVIL.** Las versiones 1 y 2 partían de
> artboards de 1280px y trataban el móvil como una adaptación defensiva. Se midió la app
> real en 360/390/412/430px y el resultado obligó a rehacer el diseño: **el 90% del tráfico
> previsto llega desde teléfonos de 6–7 pulgadas**. Este plan implementa el diseño
> mobile-first ya aprobado por el usuario.
>
> Lo que cambió respecto a la v2 **no es CSS**, es arquitectura: la acción principal vive en
> una **barra fija inferior**, aparece una **pantalla de cuenta** nueva, la bandeja se filtra
> con un **segmented control** en vez de dos secciones largas, y el header se vacía. Los
> hallazgos de la auditoría de la v2 que siguen vigentes están incorporados y marcados
> (**H1, H2, H3, H6, H7**); el detalle está en la **Sección 11**.

---

## 1. Contexto del proyecto

### 1.1 Qué se construye

**MyTrueque.shop** es un marketplace P2P de archivos con custodia. Hoy el usuario puede
registrarse y entrar (correo/contraseña o Google), pero **al loguearse se queda en la
landing**: no existe ninguna pantalla propia de usuario. Este plan construye esa zona.

| Pantalla | Ruta | Qué muestra |
|---|---|---|
| Bandeja | `/panel` | Órdenes filtradas por turno: "Te toca" / "Esperando" |
| Primer ingreso | `/panel` (sin órdenes) | Estado vacío con el @usuario grande y los caminos |
| Detalle de orden | `/panel/orden/:id` | Ficha técnica, hash, comprobante, línea de tiempo |
| Crear orden | `/panel/nueva` | Formulario de 3 pasos |
| **Tu cuenta** | `/panel/cuenta` | @usuario, correo y **cerrar sesión** |

### 1.2 🔴 Restricción que gobierna TODO el diseño

**El 90% de los usuarios entra desde un teléfono de 6–7 pulgadas.** En CSS eso son
**360–430px de ancho**. El plan se implementa **mobile-first**: los estilos base son los del
teléfono, sin media query, y el escritorio es lo que se añade después con `min-width`.

Reglas medidas, no opinadas (se verificó la landing actual y fallaba en las tres):

| Regla | Valor | Por qué |
|---|---|---|
| Objetivo táctil mínimo | **48px** de alto (52 en primarios) | Los botones actuales miden 38px y se fallan con el dedo |
| Texto de lectura | **14–15px** mínimo | Hoy hay 60+ textos por debajo de 14px, y 5 a 9,5px |
| Inputs | **16px** de `font-size` obligatorio | Por debajo de 16px **iOS hace zoom automático** al enfocar y descuadra la pantalla |
| Acción principal | Barra **fija abajo** | En la zona del pulgar; nunca al final del scroll |
| Ancho de prueba | **360px** además de 390 | Es el más estrecho del parque (Galaxy S23) |

### 1.3 Modelo de negocio — imprescindible para el copy y los estados

**No inventar copy que contradiga esto:**

- **Relación 1 a 1.** No hay catálogo, ni perfiles públicos, ni enlaces compartibles. Cada
  persona tiene un **`@usuario`** asignado al registrarse (ej. `@trq-9k2f`) y es **lo único
  que comparte**.
- **El dinero NUNCA pasa por la plataforma.** Transferencia directa, cuenta a cuenta, fuera
  de la app. MyTrueque no cobra, no retiene y **no puede devolver** un pago.
- **El archivo vive en custodia cifrada solo mientras dure la orden.** Se purga al
  confirmarse la descarga, o a los 30 días si la orden no cierra.
- **Liberación automática a las 24 h.** Si el comprador cargó comprobante y el vendedor no
  libera en 24 h, la plataforma habilita la descarga. Protege a quien ya pagó.
- **Máquina de estados**, en este orden exacto:
  `EN CUSTODIA → EN INSPECCIÓN → PAGO ENVIADO → LIBERADO → DESCARGADO → PURGADO`

**De quién es el turno** (gobierna toda la bandeja):

| Estado | Le toca a | Qué hace |
|---|---|---|
| `EN_CUSTODIA` | comprador | Inspeccionar la ficha |
| `EN_INSPECCION` | comprador | Pagar por fuera y cargar comprobante |
| `PAGO_ENVIADO` | **vendedor** | Verificar en su banco y liberar (o se libera solo en 24 h) |
| `LIBERADO` | comprador | Descargar y verificar el hash |
| `DESCARGADO` | nadie | Terminado, esperando purga |
| `PURGADO` | nadie | Cerrado, archivo borrado |

### 1.4 Root del proyecto y estado actual

- **Root absoluto**: `C:\APLICACIONES\Trueque.com`
- **El root NO es un repositorio git.** No ejecutar `git init`.
- **Este plan toca ÚNICAMENTE `frontend/`.** Ni un archivo del backend.

```
C:\APLICACIONES\Trueque.com\
├── CLAUDE.md
├── BITACORA.md
├── Planes\                    ← este plan vive aquí
├── backend\                   ← NO SE TOCA
└── frontend\                  ← todo el trabajo ocurre aquí
    ├── index.html             ← se modifica (viewport-fit)
    ├── package.json           ← NO se toca
    ├── vite.config.ts         ← NO se toca
    ├── tsconfig.app.json      ← NO se toca
    └── src\
        ├── App.tsx            ← se modifica (rutas)
        ├── main.tsx           ← NO se toca
        ├── features\
        │   ├── auth\          ← se añade 1 archivo
        │   ├── landing\       ← se modifica solo MainPage.tsx
        │   └── orders\        ← TODO NUEVO
        ├── shared\components\ ← Button, TextField, Logo (existen; no se tocan)
        ├── styles\            ← se AMPLÍAN _mixins.scss y _tokens.scss
        └── test\setup.ts      ← NO se toca
```

### 1.5 Stack exacto (ya instalado — NO instalar nada)

| Paquete | Versión instalada |
|---|---|
| react / react-dom | ^19.2.8 |
| **react-router-dom** | **^7.18.3 — YA instalado y montado** |
| @tanstack/react-query | ^5.102.8 |
| zustand | ^5.0.15 |
| lucide-react | **^1.39.0** (v1, no v0) |
| sass | ^1.103.1 |
| vitest + @testing-library/react | ^4.1.11 / ^16.3.3 |
| @testing-library/user-event | ^14.6.7 |
| oxlint | ^1.79.0 (**no ESLint**) |
| typescript | ~6.0.2 |

> 🔴 **REGLA DURA: no ejecutar `pnpm add`.** Todo lo necesario ya está. Si algo parece
> faltar, DETENERSE y preguntar.

### 1.6 Routing actual — ya existe, solo se amplía

`src/main.tsx` **ya monta `<BrowserRouter>`** (NO modificar):

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

`src/App.tsx` **hoy** (este archivo SÍ se reemplaza):

```tsx
import { Route, Routes } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
    </Routes>
  )
}
```

### 1.7 Piezas existentes que se REUTILIZAN (no recrear, no modificar)

**`src/features/auth/store/authStore.ts`** (zustand):
```ts
export interface AuthUser {
  email: string
  handle: string        // "@trq-9k2f"
}
// useAuthStore expone: user, isHydrating, setUser, clearUser, setHydrated
```

**`src/features/auth/hooks/useCurrentUser.ts`** — llama a `GET /auth/me` y rellena el store.
Hoy se invoca dentro de `MainPage`; **este plan lo sube a `App.tsx`** (5.25), porque si el
usuario entra directo a `/panel` la landing nunca se monta y la sesión jamás se hidrataría.

**`src/features/auth/hooks/useAuthMutations.ts`** — **NO se modifica.** Ya expone
`useLoginMutation`, `useRegisterMutation` y `useLogoutMutation`.

**`src/shared/components/Logo/Logo.tsx`** — ⚠️ **NO se usa en el panel.** Su `variant="header"`
renderiza su propio `<a href="#top">`; meterlo dentro de un `<Link>` produce un `<a>` dentro
de otro `<a>`, que es HTML inválido (hallazgo **H2**, reproducido en Chromium). El panel
dibuja su marca inline (5.8), que además es distinta: más pequeña y sin el sufijo `.shop`,
que a 360px no cabe junto al avatar.

### 1.8 Tokens CSS disponibles — usar SOLO estos

Definidos en `src/styles/_tokens.scss`, globales como `var(--…)`:

```
Acento:    --c-accent  --c-accent-hover  --c-accent-light  --c-accent-text  --c-accent-mid
Señal:     --c-signal  --c-signal-hover  --c-on-signal  --c-on-signal-strong
Alerta:    --c-alert
Texto:     --c-ink  --c-text-secondary  --c-text-muted  --c-text-placeholder
Fondos:    --c-bg  --c-bg-alt  --c-surface  --c-surface-accent  --c-tabs-bg
Bordes:    --c-border  --c-border-strong  --c-border-input  --c-border-button
           --c-border-inner  --c-divider  --c-divider-soft
Oscuro:    --c-on-dark  --c-on-dark-secondary  --c-on-dark-border  --c-on-dark-border-strong
Tipos:     --font-sans  --font-mono
Layout:    --content-max (1180px)  --content-pad (32px)  --content-pad-mobile (18px)
Radios:    --r-button (8px)  --r-input (9px)  --r-card (16px)  --r-card-lg (18px)
           --r-tile (16px)  --r-pill (999px)
Sombras:   --sh-auth  --sh-file  --sh-flat  --sh-tab
```

El Paso 2 añade 4 tokens más, específicos del móvil.

> 🔴 **Prohibido escribir colores hexadecimales sueltos en los `.module.scss` nuevos.** Todo
> color sale de un token. Única excepción: `#ffffff` sobre fondos de acento u oscuros (no
> hay token de blanco puro).

### 1.9 Decisiones cerradas (NO reabrir)

1. **Mobile-first de verdad.** Los `.module.scss` se escriben con el móvil como base, **sin
   media query**, y lo de escritorio se añade dentro de `@include desde-md` / `desde-lg`
   (min-width). Nunca al revés.
2. **Alcance: solo la capa de presentación.** Este plan **NO** construye el backend de
   órdenes (subida de archivos, cifrado, hash real, purga, temporizadores). Las pantallas se
   alimentan de datos de ejemplo. Ese backend es un plan aparte.
3. **La costura con el backend futuro es `useOrders()`.** Los componentes NUNCA importan los
   fixtures: piden datos al hook. El día que exista el backend se cambia ese hook y **ningún
   componente se toca**.
4. **Modo demo por `?demo=1`.** Por defecto el panel sale vacío (el estado real: nadie tiene
   órdenes). Con `?demo=1` cargan 5 órdenes de ejemplo, y la preferencia queda en
   `sessionStorage` para sobrevivir a la navegación. Sin esto, 3 de las 5 pantallas serían
   imposibles de ver y verificar.
5. **Con sesión activa, `/` redirige a `/panel`.** Resuelve el problema actual (te logueas y
   te quedas mirando el formulario). Cubre los tres caminos: login, registro y vuelta de
   Google.
6. **`/panel/*` es privado.** Sin sesión redirige a `/`. **Mientras la sesión se hidrata se
   muestra una pantalla de carga** — nunca redirigir durante la hidratación, o quien recarga
   `/panel` con cookie válida sale expulsado.
7. **La acción principal va en barra fija inferior**, no en el flujo. Es la decisión central
   del rediseño: en escritorio la columna lateral estaba siempre visible, pero al apilarse en
   móvil el CTA quedaba enterrado tras 5 tarjetas.
8. **El `@usuario` y "Cerrar sesión" se mudan a `/panel/cuenta`.** En 390px el header no
   aguanta logo + chip + botón: se midieron 32px de desborde. El acceso es el avatar de la
   esquina, con área táctil de 44px.
9. **El hash de 64 caracteres NO se vuelca entero por defecto.** Se muestra abreviado
   (`a3f97c2e…b3d2c21b`) con botón Copiar grande y un `<details>` para verlo completo.
   Volcado entero ocupa 3 líneas en un teléfono y empuja todo lo demás.
10. **Sin `enum` de TypeScript.** `tsconfig.app.json` tiene `erasableSyntaxOnly: true`, que
    lo prohíbe. Los estados son uniones de literales.
11. **Sin cuenta regresiva en vivo.** El tiempo restante se calcula al renderizar, no con un
    `setInterval`. Un temporizador por segundo obliga a un efecto con limpieza y re-renders
    constantes, y no aporta: nadie mira el reloj.
12. **El formulario de "Nueva orden" es maqueta funcional.** Campos reales y editables, pero
    no hay endpoint al cual enviar. El botón final no hace submit a red.
13. **Marca dibujada inline en el header del panel**, sin usar `<Logo>` (ver 1.7).

---

## 2. Objetivo de la tarea

Al terminar:

1. `/panel` muestra la bandeja del usuario con sesión activa, con filtro por turno.
2. Sin órdenes, `/panel` muestra el estado vacío con el `@usuario` real.
3. `/panel?demo=1` muestra las 5 órdenes de ejemplo.
4. `/panel/orden/4821` muestra el detalle con la acción fija abajo.
5. `/panel/nueva` muestra el formulario de 3 pasos.
6. `/panel/cuenta` muestra el @usuario, el correo y el botón de cerrar sesión.
7. Entrar con sesión a `/` redirige a `/panel`; entrar a `/panel` sin sesión redirige a `/`.
8. **A 360px y a 390px: cero desborde horizontal y ningún toque por debajo de 48px** en las
   pantallas del panel.
9. `pnpm typecheck`, `lint`, `test` (**23 tests**) y `build` en verde.

---

## 3. Prerequisitos

Ejecutar **todos** desde `C:\APLICACIONES\Trueque.com`. Si alguno falla, DETENERSE.

| # | Requisito | Comando | Resultado esperado |
|---|---|---|---|
| 1 | Root correcto | `dir CLAUDE.md` | existe |
| 2 | El frontend pasa sus tests | `cd frontend && pnpm test` | **7 passed** |
| 3 | El frontend compila | `cd frontend && pnpm build` | exit 0 |
| 4 | react-router-dom instalado | `cd frontend && pnpm list react-router-dom` | `7.x` |
| 5 | lucide-react instalado | `cd frontend && pnpm list lucide-react` | `1.x` |
| 6 | El root **no** es repo git | `git rev-parse --is-inside-work-tree` | `fatal: not a git repository` |

> El backend **no hace falta** para construir (las pantallas usan datos de ejemplo), pero
> **sí** para la verificación del Paso 13. Levantarlo entonces con
> `cd backend && uv run uvicorn src.main:app --port 8000` (⚠️ siempre desde `backend/`).

---

## 4. Inventario de archivos

Rutas relativas a `C:\APLICACIONES\Trueque.com\frontend\`.

### 4.1 Base del dominio (4 nuevos)

| # | Ruta |
|---|---|
| 1 | `src/features/orders/types.ts` |
| 2 | `src/features/orders/utils/format.ts` |
| 3 | `src/features/orders/data/ordersFixtures.ts` |
| 4 | `src/features/orders/hooks/useOrders.ts` |

### 4.2 Componentes (24 nuevos — 8 componentes × 3 archivos)

| # | Carpeta bajo `src/features/orders/components/` | Qué es |
|---|---|---|
| 5–7 | `PanelHeader/` | Marca inline + avatar → `/panel/cuenta` |
| 8–10 | `BarraAccion/` | Barra fija inferior, con safe-area |
| 11–13 | `PanelShell/` | Layout común: header + main + barra |
| 14–16 | `StateChip/` | Chip del estado |
| 17–19 | `OrderStepper/` | Las 6 etapas como puntos |
| 20–22 | `FiltroTurno/` | Segmented control "Te toca / Esperando" |
| 23–25 | `HashField/` | Hash abreviado + copiar + desplegable |
| 26–28 | `OrderCard/` | Tarjeta de orden |

> Cada carpeta lleva `<Nombre>.tsx`, `<Nombre>.module.scss` e `index.ts`.

### 4.3 Pantallas (8 nuevos)

| # | Ruta |
|---|---|
| 29–30 | `src/features/orders/pages/PanelPage.tsx` + `.module.scss` |
| 31–32 | `src/features/orders/pages/DetalleOrdenPage.tsx` + `.module.scss` |
| 33–34 | `src/features/orders/pages/NuevaOrdenPage.tsx` + `.module.scss` |
| 35–36 | `src/features/orders/pages/CuentaPage.tsx` + `.module.scss` |

### 4.4 Infraestructura y tests (7 nuevos)

| # | Ruta | Qué es |
|---|---|---|
| 37 | `src/features/auth/components/RutaPrivada.tsx` | Guardia de rutas privadas |
| 38 | `src/test/renderConWrappers.tsx` | Helper de render |
| 39 | `src/features/auth/components/RutaPrivada.test.tsx` | 3 tests |
| 40 | `src/features/orders/utils/format.test.ts` | 5 tests |
| 41 | `src/features/orders/components/OrderCard/OrderCard.test.tsx` | 3 tests |
| 42 | `src/features/orders/pages/PanelPage.test.tsx` | 3 tests |
| 43 | `src/features/orders/pages/CuentaPage.test.tsx` | 2 tests |

### 4.5 Modificados (5)

| # | Ruta | Cambio |
|---|---|---|
| 44 | `src/styles/_mixins.scss` | **AÑADIR** 2 mixins `min-width` + 1 de toque |
| 45 | `src/styles/_tokens.scss` | **AÑADIR** 4 tokens |
| 46 | `index.html` | **AÑADIR** `viewport-fit=cover` al meta viewport |
| 47 | `src/App.tsx` | **reemplazo completo** — rutas + hidratación |
| 48 | `src/features/landing/pages/MainPage.tsx` | **reemplazo completo** — redirección a `/panel` |

> **Ningún otro archivo se toca.** En particular: `main.tsx`, `Header.tsx` de landing,
> `AuthPanel.tsx`, `useAuthMutations.ts`, `authStore.ts`, `authService.ts`, `Logo.tsx`,
> `package.json`, `vite.config.ts`, `tsconfig.*.json`, y **todo el backend**.

---

## 5. Especificación por archivo

> Código **literal**: copiar tal cual, sin reinterpretar.

### 5.1 `src/styles/_mixins.scss` — AÑADIR al final

> ⚠️ **Es un añadido, NO un reemplazo.** El archivo ya tiene `bp-lg`, `bp-md`, `bp-sm` y
> `mono-label`, que la landing sigue usando. **Conservarlos íntegros.**

Añadir al final del archivo:

```scss

// ─────────────────────────────────────────────────────────────────────────────
// Mobile-first: los de arriba son max-width (se escribe escritorio y se corrige
// hacia abajo). Estos son min-width: se escribe el TELÉFONO como base, sin media
// query, y aquí dentro va solo lo que cambia en pantallas grandes.
// El panel usa exclusivamente estos dos.
// ─────────────────────────────────────────────────────────────────────────────

@mixin desde-md {
  @media (min-width: 768px) {
    @content;
  }
}

@mixin desde-lg {
  @media (min-width: 1024px) {
    @content;
  }
}

// Todo lo que se toca con el dedo. 48px es el mínimo cómodo en un teléfono; los
// botones actuales de la landing miden 38px y se fallan. `touch-action` elimina el
// retardo de 300ms que algunos navegadores móviles aplican esperando un doble toque.
@mixin objetivo-tactil($alto: 48px) {
  min-height: $alto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
```

### 5.2 `src/styles/_tokens.scss` — AÑADIR 4 tokens

> ⚠️ **Es un añadido, NO un reemplazo** (hallazgo **H7**). El archivo tiene ~60 tokens de los
> que depende toda la landing. Copiar este bloque encima del archivo **destruiría el estilo
> del proyecto entero**.

**(a)** Localizar la línea `--c-accent-mid: oklch(0.45 0.16 300);` y **añadir justo debajo**:

```scss
  // Halo del punto activo en steppers y líneas de tiempo.
  --c-accent-halo: oklch(0.88 0.06 300);
```

**(b)** Localizar la línea `--content-pad-mobile: 18px;` y **añadir justo debajo**:

```scss
  // Márgenes laterales del panel en teléfono. 16px deja respirar sin desperdiciar
  // ancho: a 360px, 18px por lado ya aprietan las tarjetas.
  --pad-movil: 16px;
  // Alto de la barra de acción fija. El contenido reserva este espacio abajo para
  // que la barra nunca tape el final de la página.
  --alto-barra: 84px;
  // Respeto al indicador de inicio de iOS y a las barras de gestos de Android.
  // Sin esto, el botón fijo queda pisado por el hardware en un iPhone.
  --safe-bottom: env(safe-area-inset-bottom, 0px);
```

### 5.3 `index.html` — UNA línea

Localizar:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Reemplazar por:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

> Sin `viewport-fit=cover`, `env(safe-area-inset-bottom)` devuelve siempre `0` en iOS y la
> barra fija queda debajo del indicador de inicio. **No tocar nada más de este archivo.**

### 5.4 `src/features/orders/types.ts` — crear

```ts
/**
 * Tipos del dominio de órdenes.
 *
 * Los estados son una unión de literales y NO un `enum`: `tsconfig.app.json` tiene
 * `erasableSyntaxOnly: true`, que prohíbe `enum` (no es borrable en compilación).
 */

/** Las 6 etapas por las que pasa una orden, en orden. */
export const ORDER_STATES = [
  'EN_CUSTODIA',
  'EN_INSPECCION',
  'PAGO_ENVIADO',
  'LIBERADO',
  'DESCARGADO',
  'PURGADO',
] as const

export type OrderState = (typeof ORDER_STATES)[number]

/** El papel de QUIEN MIRA la pantalla, no el de la contraparte. */
export type OrderRole = 'vendedor' | 'comprador'

export interface OrderFile {
  nombre: string
  extension: string
  /** Tamaño en bytes. Se formatea para mostrar; nunca se muestra crudo. */
  bytes: number
  /** SHA-256 completo, 64 caracteres hex. */
  hash: string
  subidoEn: string
  archivosDentro?: number
}

export interface OrderCounterparty {
  nombre: string
  handle: string
  /** Operaciones completadas, para dar contexto de confianza. */
  operaciones: number
}

export interface OrderReceipt {
  nombre: string
  bytes: number
  cargadoEn: string
}

export interface Order {
  id: string
  estado: OrderState
  rol: OrderRole
  contraparte: OrderCounterparty
  archivo: OrderFile
  /** Monto en pesos, sin decimales. */
  montoCop: number
  creadaEn: string
  /**
   * Cuándo se libera sola (regla de las 24 h). Solo tiene valor en `PAGO_ENVIADO`;
   * en el resto de estados es `null`.
   */
  liberaAutomaticaEn: string | null
  /** Cuándo se purga el archivo si la orden no cierra (30 días). */
  purgaEn: string | null
  comprobante: OrderReceipt | null
  /** Dónde le pagan al vendedor. Solo en las órdenes propias. */
  cuentaDeCobro?: string
}

/**
 * De quién es el turno en cada estado.
 *
 * Es la regla que gobierna la bandeja: se agrupa por turno, no por fecha ni por rol.
 * `null` = la orden no espera acción de nadie (ya terminó).
 */
const TURNO_POR_ESTADO: Record<OrderState, OrderRole | null> = {
  EN_CUSTODIA: 'comprador',
  EN_INSPECCION: 'comprador',
  PAGO_ENVIADO: 'vendedor',
  LIBERADO: 'comprador',
  DESCARGADO: null,
  PURGADO: null,
}

/** true si la orden espera una acción de quien está mirando. */
export function esMiTurno(orden: Order): boolean {
  return TURNO_POR_ESTADO[orden.estado] === orden.rol
}

/** true si la orden ya terminó su ciclo. */
export function estaCerrada(orden: Order): boolean {
  return orden.estado === 'DESCARGADO' || orden.estado === 'PURGADO'
}

/** Etiqueta en mayúsculas para los chips, ej. "PAGO ENVIADO". */
export const ETIQUETA_ESTADO: Record<OrderState, string> = {
  EN_CUSTODIA: 'EN CUSTODIA',
  EN_INSPECCION: 'EN INSPECCIÓN',
  PAGO_ENVIADO: 'PAGO ENVIADO',
  LIBERADO: 'LIBERADO',
  DESCARGADO: 'DESCARGADO',
  PURGADO: 'PURGADO',
}
```

### 5.5 `src/features/orders/utils/format.ts` — crear

```ts
/** Formateo de los datos de una orden. Sin dependencias. */

/** 450000 -> "$450.000". Sin decimales: los montos acordados son cifras redondas. */
export function formatearMonto(cop: number): string {
  return `$${cop.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

/**
 * 252125184 -> "240,4 MB". Base 1024 (MiB), que es lo que reporta el sistema operativo
 * y contra lo que el usuario va a comparar.
 *
 * ⚠️ H1 — NO usar `i === 0 || valor >= 100 ? 0 : 1` para los decimales: esa condición mata
 * el decimal en TODO el rango de MB y "240,4 MB" sale como "240 MB". Y `minimumFractionDigits`
 * junto a `maximumFractionDigits` fuerza el decimal aunque sea cero, produciendo "18,0 MB".
 * Solo `maximumFractionDigits` da lo correcto. Verificado: 240,4 MB · 1,8 GB · 18 MB · 820 KB.
 */
export function formatearPeso(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  // Bytes y KB sin decimales: un "820,4 KB" no le dice nada a nadie.
  const decimales = i <= 1 ? 0 : 1
  return `${valor.toLocaleString('es-CO', {
    maximumFractionDigits: decimales,
  })} ${unidades[i]}`
}

/**
 * Hash completo -> "a3f97c2e…b3d2c21b".
 * En un teléfono, el hash entero ocupa 3 líneas y empuja todo lo demás: se muestra
 * abreviado y el completo vive tras un desplegable (ver HashField).
 */
export function hashCorto(hash: string): string {
  if (hash.length <= 20) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`
}

/** Versión muy corta para las tarjetas de la bandeja, donde el ancho es oro. */
export function hashMinimo(hash: string): string {
  if (hash.length <= 12) return hash
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`
}

/**
 * Tiempo que falta hasta `iso`, ej. "18 h 42 min".
 *
 * Devuelve null si ya pasó: quien llama decide qué mostrar, porque el texto correcto
 * depende del estado. NO es una cuenta regresiva en vivo: se calcula al renderizar.
 */
export function tiempoRestante(iso: string, ahora: Date = new Date()): string | null {
  const faltanMs = new Date(iso).getTime() - ahora.getTime()
  if (Number.isNaN(faltanMs) || faltanMs <= 0) return null

  const minutosTotales = Math.floor(faltanMs / 60000)
  const dias = Math.floor(minutosTotales / (60 * 24))
  if (dias >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`

  const horas = Math.floor(minutosTotales / 60)
  const minutos = minutosTotales % 60
  if (horas >= 1) return `${horas} h ${minutos} min`
  return `${minutos} min`
}

/** ISO -> "20 sep 2026, 14:32". */
export function fechaLegible(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const dia = fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${dia}, ${hora}`
}

/** ISO -> "hace 5 h". Para eventos recientes. */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const pasadoMs = ahora.getTime() - new Date(iso).getTime()
  if (Number.isNaN(pasadoMs) || pasadoMs < 0) return 'recién'

  const minutos = Math.floor(pasadoMs / 60000)
  if (minutos < 60) return `hace ${Math.max(minutos, 1)} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}
```

### 5.6 `src/features/orders/data/ordersFixtures.ts` — crear

```ts
/**
 * Órdenes de ejemplo para desarrollar y revisar las pantallas.
 *
 * ⚠️ TEMPORAL: desaparece cuando exista el backend de órdenes. Ningún componente debe
 * importar este archivo — todos piden los datos a `useOrders()`.
 *
 * Las fechas son relativas a "ahora" para que los tiempos restantes siempre muestren algo
 * con sentido, en vez de quedar vencidos al día siguiente de escribir el fixture.
 */
import type { Order } from '../types'

function enHoras(horas: number): string {
  return new Date(Date.now() + horas * 3600_000).toISOString()
}

function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3600_000).toISOString()
}

function enDias(dias: number): string {
  return enHoras(dias * 24)
}

export const ORDENES_DE_EJEMPLO: Order[] = [
  {
    id: '4821',
    estado: 'PAGO_ENVIADO',
    rol: 'vendedor',
    contraparte: { nombre: 'Ana R.', handle: '@trq-4f7k', operaciones: 17 },
    archivo: {
      nombre: 'entrega-final-branding.zip',
      extension: '.zip',
      bytes: 252_125_184,
      hash: 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b',
      subidoEn: haceHoras(31),
      archivosDentro: 34,
    },
    montoCop: 450_000,
    creadaEn: haceHoras(31),
    liberaAutomaticaEn: enHoras(18.7),
    purgaEn: enDias(28),
    comprobante: {
      nombre: 'transferencia-4821.png',
      bytes: 839_680,
      cargadoEn: haceHoras(5),
    },
    cuentaDeCobro: 'Nequi · 300 000 0000',
  },
  {
    id: '4812',
    estado: 'LIBERADO',
    rol: 'comprador',
    contraparte: { nombre: 'Daniel V.', handle: '@trq-7h3n', operaciones: 63 },
    archivo: {
      nombre: 'dataset-clientes-2026.csv',
      extension: '.csv',
      bytes: 356_515_840,
      hash: '77de9b41a0c8e5f2361d4b7a9e0c3f85d264b1a7f930e5c8d41b6a29f0e390a4',
      subidoEn: haceHoras(52),
    },
    montoCop: 200_000,
    creadaEn: haceHoras(52),
    liberaAutomaticaEn: null,
    purgaEn: enDias(26),
    comprobante: {
      nombre: 'comprobante-4812.pdf',
      bytes: 231_424,
      cargadoEn: haceHoras(9),
    },
  },
  {
    id: '4835',
    estado: 'EN_INSPECCION',
    rol: 'comprador',
    contraparte: { nombre: 'Carlos M.', handle: '@trq-9k2f', operaciones: 42 },
    archivo: {
      nombre: 'masterclass-fotografia.mp4',
      extension: '.mp4',
      bytes: 1_932_735_283,
      hash: '4b10c7d9e2f8a3516b0c4d7e9f2a8b5c1d6e3f0a7b4c9d2e5f8a1b6c3d0e7ff3',
      subidoEn: haceHoras(14),
    },
    montoCop: 120_000,
    creadaEn: haceHoras(14),
    liberaAutomaticaEn: null,
    purgaEn: enDias(29),
    comprobante: null,
  },
  {
    id: '4840',
    estado: 'EN_CUSTODIA',
    rol: 'vendedor',
    contraparte: { nombre: 'Lucía P.', handle: '@trq-2m8x', operaciones: 8 },
    archivo: {
      nombre: 'plantillas-notion-pack.zip',
      extension: '.zip',
      bytes: 18_874_368,
      hash: '2c8f1e6b9d4a7051c3e8f2b6d9a4c7e0f3b8d1a6c9e2f5b8d1a4c7e0f3b6d9a2',
      subidoEn: haceHoras(3),
      archivosDentro: 12,
    },
    montoCop: 60_000,
    creadaEn: haceHoras(3),
    liberaAutomaticaEn: null,
    purgaEn: enDias(29),
    comprobante: null,
    cuentaDeCobro: 'Bancolombia · ahorros 000-000000-00',
  },
  {
    id: '4829',
    estado: 'PAGO_ENVIADO',
    rol: 'comprador',
    contraparte: { nombre: 'Marta S.', handle: '@trq-5t1w', operaciones: 25 },
    archivo: {
      nombre: 'identidad-visual-cafe.ai',
      extension: '.ai',
      bytes: 94_371_840,
      hash: '9e3b7c1f5a8d2064e7b1c4f8a2d5e9b3c6f0a4d7e1b5c8f2a6d9e3b7c0f4a8d1',
      subidoEn: haceHoras(40),
    },
    montoCop: 310_000,
    creadaEn: haceHoras(40),
    liberaAutomaticaEn: enHoras(6.2),
    purgaEn: enDias(27),
    comprobante: {
      nombre: 'pago-4829.jpg',
      bytes: 1_048_576,
      cargadoEn: haceHoras(17.8),
    },
  },
]
```

### 5.7 `src/features/orders/hooks/useOrders.ts` — crear

```ts
/**
 * Punto único desde el que las pantallas obtienen órdenes.
 *
 * Hoy devuelve datos de ejemplo. Cuando exista el backend se reemplaza el cuerpo por un
 * `useQuery` contra `GET /orders` y **ningún componente cambia**: esa es toda la razón de
 * que este hook exista en vez de importar los fixtures desde las pantallas.
 */
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import type { Order } from '../types'

const CLAVE_DEMO = 'trueque_demo_ordenes'

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
  // Sin backend todavía: nunca hay carga real. `isLoading` ya está en la firma para que
  // las pantallas manejen ese estado desde hoy y no haya que retocarlas después.
  return {
    orders: MODO_DEMO ? ORDENES_DE_EJEMPLO : [],
    isLoading: false,
  }
}

/** Busca una orden por id. Devuelve undefined si no existe. */
export function useOrder(id: string | undefined): Order | undefined {
  const { orders } = useOrders()
  if (!id) return undefined
  return orders.find((orden) => orden.id === id)
}
```

### 5.8 `PanelHeader` — crear los 3 archivos

**`src/features/orders/components/PanelHeader/PanelHeader.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelHeader.module.scss'

interface PanelHeaderProps {
  /** Cuando se pasa, el header muestra "volver" en vez de la marca. */
  volverA?: string
  volverTexto?: string
  /** Título corto a la derecha (solo con `volverA`). */
  titulo?: string
}

/**
 * Header del panel. 56px en teléfono — 16 menos que el de la landing, que a 390px no deja
 * respirar al contenido.
 *
 * 🔴 La marca se dibuja aquí inline y NO se usa `<Logo>`: `Logo variant="header"` renderiza
 * su propio `<a href="#top">`, y meterlo dentro de un `<Link>` produce un `<a>` dentro de
 * otro `<a>` — HTML inválido que React reporta como error en consola (hallazgo H2, y se
 * reprodujo). Además esta marca es distinta: más pequeña y sin el sufijo ".shop", que a
 * 360px no cabe junto al avatar.
 *
 * El @usuario y "Cerrar sesión" NO viven aquí: se midieron 32px de desborde horizontal a
 * 390px con logo + chip + botón (hallazgo H3). Viven en /panel/cuenta, a un toque del avatar.
 */
export function PanelHeader({ volverA, volverTexto = 'Órdenes', titulo }: PanelHeaderProps) {
  const user = useAuthStore((state) => state.user)
  // Dos últimos caracteres del @usuario: "@trq-925j" -> "9j". Basta para reconocerse.
  const iniciales = user?.handle.slice(-2) ?? '··'

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {volverA ? (
          <Link to={volverA} className={styles.volver}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {volverTexto}
          </Link>
        ) : (
          <Link to="/panel" className={styles.marca} aria-label="Ir a tus órdenes">
            <span className={styles.placa} aria-hidden="true">
              <span className={styles.barraAcento} />
              <span className={styles.barraSenal} />
            </span>
            <span className={styles.wordmark}>MyTrueque</span>
          </Link>
        )}

        {titulo ? (
          <span className={styles.titulo}>{titulo}</span>
        ) : (
          <Link to="/panel/cuenta" className={styles.avatarZona} aria-label="Tu cuenta">
            <span className={styles.avatar}>{iniciales}</span>
          </Link>
        )}
      </div>
    </header>
  )
}
```

**`src/features/orders/components/PanelHeader/PanelHeader.module.scss`**

```scss
@use '@/styles/mixins' as *;

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
}

.bar {
  height: 56px;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 var(--pad-movil);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  @include desde-md {
    height: 68px;
    padding: 0 var(--content-pad);
  }
}

/* ── Marca ── */

.marca {
  // 🔴 H8 — También es un enlace (lleva a /panel), así que necesita área táctil como los
  // demás. Sin esto medía 30px de alto (el de la placa) y se fallaba con el dedo. El
  // margen negativo compensa el padding para que la marca no se despegue del borde.
  @include objetivo-tactil(44px);
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-left: -8px;
  padding: 0 8px;
  text-decoration: none;
  color: var(--c-ink);
}

.placa {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 9px;
  background: var(--c-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5px;
}

.barraAcento,
.barraSenal {
  width: 4px;
  height: 13px;
  border-radius: 2px;
  transform: skewX(-13deg);
}

.barraAcento {
  background: var(--c-accent-light);
}

.barraSenal {
  background: var(--c-signal);
}

.wordmark {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ── Volver ── */

.volver {
  @include objetivo-tactil(44px);
  display: inline-flex;
  align-items: center;
  gap: 2px;
  // Margen negativo: el área táctil crece hacia el borde sin que el texto se despegue.
  margin-left: -10px;
  padding: 0 10px;
  font-size: 15px;
  font-weight: 500;
  color: var(--c-ink);
  text-decoration: none;
}

.titulo {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

/* ── Avatar ── */

.avatarZona {
  @include objetivo-tactil(44px);
  min-width: 44px;
  margin-right: -10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--c-surface-accent);
  border: 1px solid var(--c-border-strong);
  color: var(--c-accent-text);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**`src/features/orders/components/PanelHeader/index.ts`**

```ts
export { PanelHeader } from './PanelHeader'
```

### 5.9 `BarraAccion` — crear los 3 archivos

**`src/features/orders/components/BarraAccion/BarraAccion.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './BarraAccion.module.scss'

interface BarraAccionProps {
  children: ReactNode
  /** Texto pequeño sobre el botón, para contexto o advertencias. */
  nota?: ReactNode
}

/**
 * Barra fija al fondo con la acción principal de la pantalla.
 *
 * Es la decisión central del rediseño móvil: en escritorio la acción vivía en una columna
 * lateral siempre visible, pero al apilarse en un teléfono quedaba enterrada al final del
 * scroll. Aquí está siempre al alcance del pulgar.
 *
 * El `padding-bottom` incluye `--safe-bottom` para no quedar debajo del indicador de inicio
 * de iOS. Quien la usa debe reservar `--alto-barra` al final de su contenido (PanelShell lo
 * hace solo).
 */
export function BarraAccion({ children, nota }: BarraAccionProps) {
  return (
    <div className={styles.barra}>
      <div className={styles.interior}>
        {nota && <p className={styles.nota}>{nota}</p>}
        {children}
      </div>
    </div>
  )
}
```

**`src/features/orders/components/BarraAccion/BarraAccion.module.scss`**

```scss
@use '@/styles/mixins' as *;

.barra {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--c-surface) 94%, transparent);
  border-top: 1px solid var(--c-border);
  // El desenfoque es un adorno: si el navegador no lo soporta, el color de arriba ya
  // deja el texto legible por sí solo.
  backdrop-filter: blur(12px);
}

.interior {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 12px var(--pad-movil) calc(12px + var(--safe-bottom));

  @include desde-md {
    padding: 14px var(--content-pad) calc(14px + var(--safe-bottom));
  }
}

.nota {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--c-text-secondary);
  text-align: center;
  margin-bottom: 10px;
}
```

**`src/features/orders/components/BarraAccion/index.ts`**

```ts
export { BarraAccion } from './BarraAccion'
```

### 5.10 `PanelShell` — crear los 3 archivos

**`src/features/orders/components/PanelShell/PanelShell.tsx`**

```tsx
import type { ReactNode } from 'react'
import { PanelHeader } from '../PanelHeader'
import styles from './PanelShell.module.scss'

interface PanelShellProps {
  children: ReactNode
  /** Si se pasa, el header muestra "volver" en lugar de la marca. */
  volverA?: string
  volverTexto?: string
  titulo?: string
  /** La barra fija de acción, si la pantalla tiene una. */
  barra?: ReactNode
}

/**
 * Armazón común de las 4 pantallas privadas: header + contenido + barra fija opcional.
 *
 * Existe para una cosa concreta: cuando hay barra fija, el contenido DEBE reservar su alto
 * al final o el último elemento queda tapado. Centralizarlo aquí evita que una pantalla se
 * olvide y el bug aparezca solo en un teléfono.
 */
export function PanelShell({
  children,
  volverA,
  volverTexto,
  titulo,
  barra,
}: PanelShellProps) {
  return (
    <div className={styles.page}>
      <PanelHeader volverA={volverA} volverTexto={volverTexto} titulo={titulo} />
      <main className={`${styles.main} ${barra ? styles.conBarra : ''}`}>{children}</main>
      {barra}
    </div>
  )
}
```

**`src/features/orders/components/PanelShell/PanelShell.module.scss`**

```scss
@use '@/styles/mixins' as *;

.page {
  min-height: 100vh;
  background: var(--c-bg);
}

.main {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 18px var(--pad-movil) 32px;

  @include desde-md {
    padding: 28px var(--content-pad) 48px;
  }
}

// Reserva el alto de la barra fija más un respiro, para que el último elemento de la
// página no quede debajo de ella.
.conBarra {
  padding-bottom: calc(var(--alto-barra) + var(--safe-bottom) + 16px);
}
```

**`src/features/orders/components/PanelShell/index.ts`**

```ts
export { PanelShell } from './PanelShell'
```

### 5.11 `StateChip` — crear los 3 archivos

**`src/features/orders/components/StateChip/StateChip.tsx`**

```tsx
import { ETIQUETA_ESTADO, type OrderState } from '../../types'
import styles from './StateChip.module.scss'

/**
 * Chip con el estado de la orden. El color comunica urgencia, no categoría:
 * - `activo`  (violeta sólido): el estado está esperando a alguien AHORA.
 * - `listo`   (borde violeta): liberado, la pelota está del otro lado pero sin reloj.
 * - `exito`   (lima): DESCARGADO. El lima está reservado al éxito en todo el producto.
 * - `neutro`  (borde gris): estados en reposo o cerrados.
 */
const VARIANTE_POR_ESTADO: Record<OrderState, 'activo' | 'listo' | 'exito' | 'neutro'> = {
  EN_CUSTODIA: 'neutro',
  EN_INSPECCION: 'activo',
  PAGO_ENVIADO: 'activo',
  LIBERADO: 'listo',
  DESCARGADO: 'exito',
  PURGADO: 'neutro',
}

interface StateChipProps {
  estado: OrderState
}

export function StateChip({ estado }: StateChipProps) {
  const variante = VARIANTE_POR_ESTADO[estado]
  return (
    <span className={`${styles.chip} ${styles[variante]}`} data-testid="state-chip">
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
```

**`src/features/orders/components/StateChip/StateChip.module.scss`**

```scss
@use '@/styles/mixins' as *;

.chip {
  @include mono-label(10px, 0.04em);
  display: inline-flex;
  align-items: center;
  border-radius: var(--r-pill);
  padding: 4px 9px;
  white-space: nowrap;

  @include desde-md {
    font-size: 10.5px;
    letter-spacing: 0.06em;
    padding: 4px 11px;
  }
}

.activo {
  background: var(--c-accent);
  color: #ffffff;
}

.listo {
  background: var(--c-surface);
  border: 1px solid var(--c-accent);
  color: var(--c-accent-text);
}

.exito {
  background: var(--c-signal);
  color: var(--c-on-signal-strong);
}

.neutro {
  background: transparent;
  border: 1px solid var(--c-border-strong);
  color: var(--c-text-secondary);
}
```

**`src/features/orders/components/StateChip/index.ts`**

```ts
export { StateChip } from './StateChip'
```

### 5.12 `OrderStepper` — crear los 3 archivos

**`src/features/orders/components/OrderStepper/OrderStepper.tsx`**

```tsx
import { ORDER_STATES, ETIQUETA_ESTADO, type OrderState } from '../../types'
import styles from './OrderStepper.module.scss'

interface OrderStepperProps {
  estado: OrderState
}

/**
 * Las 6 etapas como puntos conectados, con la actual resaltada.
 *
 * Es el mismo recorrido que promete la landing ("Seis estados. El último es el borrado"),
 * repetido dentro de cada orden para que la promesa de la portada se cumpla adentro.
 * En teléfono va sin etiquetas: solo los puntos, que caben de sobra a 360px.
 */
export function OrderStepper({ estado }: OrderStepperProps) {
  const indiceActual = ORDER_STATES.indexOf(estado)

  return (
    <ol
      className={styles.stepper}
      aria-label={`Etapa ${indiceActual + 1} de 6: ${ETIQUETA_ESTADO[estado]}`}
    >
      {ORDER_STATES.map((etapa, indice) => {
        const recorrida = indice < indiceActual
        const actual = indice === indiceActual
        const clasePunto = [
          styles.punto,
          recorrida ? styles.puntoRecorrido : '',
          actual ? styles.puntoActual : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={etapa} className={styles.etapa}>
            <span className={clasePunto} />
            {indice < ORDER_STATES.length - 1 && (
              <span
                className={`${styles.linea} ${recorrida ? styles.lineaRecorrida : ''}`}
                aria-hidden="true"
              />
            )}
            <span className={styles.oculto}>{ETIQUETA_ESTADO[etapa]}</span>
          </li>
        )
      })}
    </ol>
  )
}
```

**`src/features/orders/components/OrderStepper/OrderStepper.module.scss`**

```scss
.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.etapa {
  display: flex;
  align-items: center;
  flex-grow: 1;

  &:last-child {
    flex-grow: 0;
  }
}

.punto {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--c-border);
}

.puntoRecorrido {
  background: var(--c-accent);
}

.puntoActual {
  width: 12px;
  height: 12px;
  background: var(--c-accent);
  box-shadow: 0 0 0 3.5px var(--c-accent-halo);
}

.linea {
  flex-grow: 1;
  height: 2px;
  margin: 0 4px;
  background: var(--c-border);
}

.lineaRecorrida {
  background: var(--c-accent);
}

// Texto solo para lectores de pantalla: el stepper visual son puntos sin palabras.
.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

**`src/features/orders/components/OrderStepper/index.ts`**

```ts
export { OrderStepper } from './OrderStepper'
```

### 5.13 `FiltroTurno` — crear los 3 archivos

**`src/features/orders/components/FiltroTurno/FiltroTurno.tsx`**

```tsx
import styles from './FiltroTurno.module.scss'

export type Turno = 'mio' | 'ajeno'

interface FiltroTurnoProps {
  valor: Turno
  onChange: (turno: Turno) => void
  totalMio: number
  totalAjeno: number
}

/**
 * Segmented control que parte la bandeja en "te toca" / "esperando".
 *
 * En escritorio eran dos secciones apiladas, pero en un teléfono eso son varias pantallas
 * de scroll para llegar a la segunda. Con el filtro, lo urgente se ve sin deslizar.
 */
export function FiltroTurno({ valor, onChange, totalMio, totalAjeno }: FiltroTurnoProps) {
  return (
    <div className={styles.grupo} role="tablist" aria-label="Filtrar órdenes por turno">
      <button
        type="button"
        role="tab"
        aria-selected={valor === 'mio'}
        className={`${styles.opcion} ${valor === 'mio' ? styles.activa : ''}`}
        onClick={() => onChange('mio')}
      >
        Te toca
        <span className={`${styles.contador} ${valor === 'mio' ? styles.contadorActivo : ''}`}>
          {totalMio}
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={valor === 'ajeno'}
        className={`${styles.opcion} ${valor === 'ajeno' ? styles.activa : ''}`}
        onClick={() => onChange('ajeno')}
      >
        Esperando
        <span className={`${styles.contador} ${valor === 'ajeno' ? styles.contadorActivo : ''}`}>
          {totalAjeno}
        </span>
      </button>
    </div>
  )
}
```

**`src/features/orders/components/FiltroTurno/FiltroTurno.module.scss`**

```scss
@use '@/styles/mixins' as *;

.grupo {
  display: flex;
  gap: 4px;
  background: var(--c-tabs-bg);
  border-radius: 11px;
  padding: 4px;
}

.opcion {
  // 🔴 H9 — 44px, no 40. La regla 7.6 de este plan exige 44px como mínimo absoluto y la
  // v3 escribía 40 aquí: el código contradecía su propia regla. Medido en Chromium.
  @include objetivo-tactil(44px);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text-secondary);
  cursor: pointer;
}

.activa {
  background: var(--c-surface);
  box-shadow: var(--sh-tab);
  color: var(--c-ink);
  font-weight: 600;
}

.contador {
  font-family: var(--font-mono);
  font-size: 11px;
  border-radius: var(--r-pill);
  padding: 2px 7px;
  background: var(--c-border);
  color: var(--c-text-secondary);
}

.contadorActivo {
  background: var(--c-accent);
  color: #ffffff;
}
```

**`src/features/orders/components/FiltroTurno/index.ts`**

```ts
export { FiltroTurno } from './FiltroTurno'
export type { Turno } from './FiltroTurno'
```

### 5.14 `HashField` — crear los 3 archivos

**`src/features/orders/components/HashField/HashField.tsx`**

```tsx
import { Copy } from 'lucide-react'
import { hashCorto } from '../../utils/format'
import styles from './HashField.module.scss'

interface HashFieldProps {
  hash: string
  /** Texto explicativo bajo el campo. */
  nota?: string
}

/**
 * Hash SHA-256 abreviado, con botón Copiar y desplegable para verlo completo.
 *
 * Los 64 caracteres volcados ocupan 3 líneas en un teléfono y empujan todo lo demás. Casi
 * nadie los lee: lo que la gente hace es copiarlos y comparar. Por eso el botón Copiar es
 * grande (44px) y el texto completo vive tras un `<details>`, que funciona sin JavaScript
 * y es accesible por teclado de serie.
 */
export function HashField({ hash, nota }: HashFieldProps) {
  return (
    <div className={styles.caja}>
      <div className={styles.fila}>
        <div className={styles.valorZona}>
          <span className={styles.etiqueta}>HASH SHA-256</span>
          <span className={styles.abreviado} data-testid="hash-abreviado">
            {hashCorto(hash)}
          </span>
        </div>
        <button type="button" className={styles.copiar}>
          <Copy size={15} aria-hidden="true" />
          Copiar
        </button>
      </div>

      <details className={styles.desplegable}>
        <summary className={styles.resumen}>Ver hash completo</summary>
        <code className={styles.completo}>{hash}</code>
      </details>

      {nota && <p className={styles.nota}>{nota}</p>}
    </div>
  )
}
```

**`src/features/orders/components/HashField/HashField.module.scss`**

```scss
@use '@/styles/mixins' as *;

.caja {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 13px 14px;
}

.fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.valorZona {
  min-width: 0;
}

.etiqueta {
  @include mono-label(9.5px, 0.07em);
  display: block;
  color: var(--c-text-muted);
}

.abreviado {
  display: block;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--c-ink);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copiar {
  @include objetivo-tactil(44px);
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-accent-text);
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--c-accent);
  }
}

.desplegable {
  margin-top: 10px;
}

.resumen {
  @include objetivo-tactil(32px);
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-accent-text);
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    content: '';
    width: 7px;
    height: 7px;
    margin-left: 7px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg) translateY(-2px);
  }
}

.desplegable[open] .resumen::after {
  transform: rotate(-135deg) translateY(-2px);
}

.completo {
  display: block;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--c-ink);
  margin-top: 8px;
  word-break: break-all;
}

.nota {
  font-size: 13px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  margin-top: 11px;
}
```

**`src/features/orders/components/HashField/index.ts`**

```ts
export { HashField } from './HashField'
```

### 5.15 `OrderCard` — crear los 3 archivos

**`src/features/orders/components/OrderCard/OrderCard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Clock, Download, FileText, Lock } from 'lucide-react'
import { StateChip } from '../StateChip'
import { OrderStepper } from '../OrderStepper'
import { esMiTurno, type Order } from '../../types'
import { formatearMonto, formatearPeso, tiempoRestante } from '../../utils/format'
import styles from './OrderCard.module.scss'

interface OrderCardProps {
  orden: Order
}

interface AccionSugerida {
  titulo: string
  etiquetaBoton: string
  /** El botón oscuro con icono lima se reserva a la descarga (el momento de éxito). */
  tono: 'accent' | 'oscuro'
}

/**
 * Qué le toca hacer a quien mira, según el estado y su rol.
 * Devuelve null cuando la orden espera a la otra parte: entonces la tarjeta se dibuja
 * compacta y sin botón, para que la bandeja se lea de un vistazo.
 */
function accionDe(orden: Order): AccionSugerida | null {
  if (!esMiTurno(orden)) return null

  const nombre = orden.contraparte.nombre

  switch (orden.estado) {
    case 'EN_CUSTODIA':
      return {
        titulo: `${nombre} dejó el archivo en custodia. Revisa la ficha técnica.`,
        etiquetaBoton: 'Ver ficha',
        tono: 'accent',
      }
    case 'EN_INSPECCION':
      return {
        titulo: 'Revisa la ficha técnica antes de pagar.',
        etiquetaBoton: 'Ver ficha',
        tono: 'accent',
      }
    case 'PAGO_ENVIADO':
      return {
        titulo: `${nombre} cargó el comprobante. Verifica que el dinero llegó.`,
        etiquetaBoton: 'Revisar y liberar',
        tono: 'accent',
      }
    case 'LIBERADO':
      return {
        titulo: 'Liberado. Descárgalo y verifica el hash.',
        etiquetaBoton: 'Descargar',
        tono: 'oscuro',
      }
    default:
      return null
  }
}

export function OrderCard({ orden }: OrderCardProps) {
  const accion = accionDe(orden)
  const esVendedor = orden.rol === 'vendedor'
  const IconoRol = esVendedor ? ArrowUp : ArrowDown

  const faltaParaLiberar = orden.liberaAutomaticaEn
    ? tiempoRestante(orden.liberaAutomaticaEn)
    : null
  const faltaParaPurga = orden.purgaEn ? tiempoRestante(orden.purgaEn) : null

  return (
    <article
      className={`${styles.card} ${accion ? styles.cardActiva : ''}`}
      data-testid={`order-card-${orden.id}`}
    >
      <div className={styles.top}>
        <div className={styles.identidad}>
          <span className={styles.numero}>#{orden.id}</span>
          <span className={styles.rol}>
            <IconoRol size={11} aria-hidden="true" />
            {esVendedor ? 'VENDES' : 'COMPRAS'}
          </span>
          <span className={styles.contraparte}>{orden.contraparte.handle}</span>
        </div>
        <StateChip estado={orden.estado} />
      </div>

      <div className={styles.archivo}>
        <span className={styles.archivoIcono}>
          <FileText size={18} aria-hidden="true" />
        </span>
        <div className={styles.archivoDatos}>
          <span className={styles.archivoNombre}>{orden.archivo.nombre}</span>
          <span className={styles.archivoMeta}>{formatearPeso(orden.archivo.bytes)}</span>
        </div>
        <span className={styles.monto}>{formatearMonto(orden.montoCop)}</span>
      </div>

      {accion ? (
        <>
          <div className={styles.stepperFila}>
            <OrderStepper estado={orden.estado} />
          </div>

          <p className={styles.accionTitulo}>{accion.titulo}</p>

          {faltaParaLiberar && (
            <p className={styles.reloj}>
              <Clock size={13} aria-hidden="true" />
              QUEDAN {faltaParaLiberar.toUpperCase()}
            </p>
          )}

          <Link
            to={`/panel/orden/${orden.id}`}
            className={accion.tono === 'oscuro' ? styles.botonOscuro : styles.botonAccent}
          >
            {accion.tono === 'oscuro' ? (
              <Download size={16} aria-hidden="true" className={styles.iconoSignal} />
            ) : (
              <Lock size={16} aria-hidden="true" />
            )}
            {accion.etiquetaBoton}
          </Link>
        </>
      ) : (
        <p className={styles.espera}>
          {orden.estado === 'PAGO_ENVIADO' && faltaParaLiberar
            ? `Comprobante cargado. Si no libera, se habilita solo en ${faltaParaLiberar}.`
            : `Esperando a ${orden.contraparte.nombre}.`}
          {faltaParaPurga && (
            <span className={styles.purga}> SE PURGA EN {faltaParaPurga.toUpperCase()}</span>
          )}
        </p>
      )}
    </article>
  )
}
```

**`src/features/orders/components/OrderCard/OrderCard.module.scss`**

```scss
@use '@/styles/mixins' as *;

.card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 14px 15px 15px;
}

// Las órdenes que esperan una acción del usuario llevan el borde de acento a la
// izquierda: es lo que separa "te toca" de "esperando" sin leer una palabra.
.cardActiva {
  border-color: var(--c-border-strong);
  border-left: 4px solid var(--c-accent);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.identidad {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.numero {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--c-ink);
  flex: none;
}

.rol {
  @include mono-label(10.5px, 0.05em);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-secondary);
  flex: none;
}

.contraparte {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--c-accent-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archivo {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 12px;
}

.archivoIcono {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  background: var(--c-surface-accent);
  color: var(--c-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.archivoDatos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex-grow: 1;
}

.archivoNombre {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archivoMeta {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--c-text-muted);
}

.monto {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-ink);
  white-space: nowrap;
  flex: none;
}

.stepperFila {
  margin-top: 13px;
}

.accionTitulo {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--c-ink);
  margin-top: 13px;
}

.reloj {
  @include mono-label(11.5px, 0.04em);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  color: var(--c-alert);
}

.botonAccent,
.botonOscuro {
  @include objetivo-tactil(48px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.botonAccent {
  background: var(--c-accent);
  color: #ffffff;

  &:hover {
    background: var(--c-accent-hover);
    color: #ffffff;
  }
}

.botonOscuro {
  background: var(--c-ink);
  color: var(--c-on-dark);

  &:hover {
    color: #ffffff;
  }
}

.iconoSignal {
  color: var(--c-signal);
}

.espera {
  font-size: 13px;
  line-height: 1.5;
  color: var(--c-text-secondary);
  margin-top: 11px;
}

.purga {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--c-text-muted);
  margin-left: 4px;
}
```

**`src/features/orders/components/OrderCard/index.ts`**

```ts
export { OrderCard } from './OrderCard'
```

### 5.16 `src/features/auth/components/RutaPrivada.tsx` — crear

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface RutaPrivadaProps {
  children: ReactNode
}

/**
 * Deja pasar solo con sesión activa.
 *
 * 🔴 El caso `isHydrating` es obligatorio y NO es cosmético: al recargar /panel, el store
 * arranca con `user: null` mientras `GET /auth/me` viaja. Sin este chequeo, quien recarga
 * con una cookie perfectamente válida sale rebotado a la landing antes de que la respuesta
 * llegue.
 */
export function RutaPrivada({ children }: RutaPrivadaProps) {
  const user = useAuthStore((state) => state.user)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  if (isHydrating) {
    return (
      <div
        role="status"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.08em',
        }}
      >
        CARGANDO…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
```

### 5.17 `src/features/orders/pages/PanelPage.tsx` — crear

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Copy, Download, Info, Plus, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { OrderCard } from '../components/OrderCard'
import { FiltroTurno, type Turno } from '../components/FiltroTurno'
import { useOrders } from '../hooks/useOrders'
import { esMiTurno, estaCerrada } from '../types'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelPage.module.scss'

export function PanelPage() {
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  const [turno, setTurno] = useState<Turno>('mio')

  const abiertas = orders.filter((orden) => !estaCerrada(orden))
  const misTurnos = abiertas.filter(esMiTurno)
  const enEspera = abiertas.filter((orden) => !esMiTurno(orden))
  const visibles = turno === 'mio' ? misTurnos : enEspera

  if (orders.length === 0) {
    return (
      <PanelShell
        barra={
          <BarraAccion>
            <Link to="/panel/nueva" className={styles.ctaBarra}>
              <Plus size={18} aria-hidden="true" />
              Crear mi primera orden
            </Link>
          </BarraAccion>
        }
      >
        <EstadoVacio handle={user?.handle ?? ''} />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      barra={
        <BarraAccion>
          <Link to="/panel/nueva" className={styles.ctaBarra}>
            <Plus size={18} aria-hidden="true" />
            Nueva orden de venta
          </Link>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Tus órdenes</h1>
      <p className={styles.subtitulo}>Aquí ves de quién es el turno.</p>

      <div className={styles.filtro}>
        <FiltroTurno
          valor={turno}
          onChange={setTurno}
          totalMio={misTurnos.length}
          totalAjeno={enEspera.length}
        />
      </div>

      {visibles.length === 0 ? (
        <p className={styles.sinOrdenes}>
          {turno === 'mio'
            ? 'Nada pendiente de tu lado. Todo está esperando a la otra parte.'
            : 'No hay órdenes esperando a nadie más.'}
        </p>
      ) : (
        <div className={styles.lista}>
          {visibles.map((orden) => (
            <OrderCard key={orden.id} orden={orden} />
          ))}
        </div>
      )}
    </PanelShell>
  )
}

/* ───────────────────────── Estado vacío ───────────────────────── */

function EstadoVacio({ handle }: { handle: string }) {
  return (
    <div className={styles.vacio}>
      <span className={styles.vacioBadge}>
        <span className={styles.vacioPunto} aria-hidden="true" />
        CUENTA CREADA
      </span>

      <h1 className={styles.vacioTitulo}>Tu cuenta está lista. Este es tu @usuario.</h1>
      <p className={styles.vacioSubtitulo}>
        Aquí no hay catálogo ni perfiles públicos: cada trato es entre dos personas que se
        pasan su @usuario.
      </p>

      <div className={styles.identidad}>
        <span className={styles.identidadEtiqueta}>TU @USUARIO</span>
        <div className={styles.identidadHandle} data-testid="mi-handle">
          {handle}
        </div>
        <button type="button" className={styles.identidadCopiar}>
          <Copy size={17} aria-hidden="true" />
          Copiar mi @usuario
        </button>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Download size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>Si vas a comprar</span>
          <p className={styles.caminoTexto}>
            Pásale tu @usuario a quien te vende. La orden llega sola.
          </p>
        </div>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Upload size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>Si vas a vender</span>
          <p className={styles.caminoTexto}>
            Sube el archivo y di a qué @usuario se lo vendes. Él ve la ficha técnica antes de
            pagarte.
          </p>
        </div>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Banknote size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>El dinero no pasa por aquí</span>
          <p className={styles.caminoTexto}>
            Las transferencias son directas, cuenta a cuenta.
          </p>
        </div>
      </div>

      <p className={styles.vacioPie}>
        <Info size={15} aria-hidden="true" />
        No tienes que hacer nada más para recibir órdenes.
      </p>
    </div>
  )
}
```

### 5.18 `src/features/orders/pages/PanelPage.module.scss` — crear

```scss
@use '@/styles/mixins' as *;

/* ── Bandeja ── */

.titulo {
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--c-ink);

  @include desde-md {
    font-size: 29px;
  }
}

.subtitulo {
  font-size: 14.5px;
  color: var(--c-text-secondary);
  margin-top: 5px;
}

.filtro {
  margin-top: 16px;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;

  // En escritorio hay ancho de sobra: dos columnas evitan tarjetas de 1100px de largo.
  @include desde-lg {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

.sinOrdenes {
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--c-text-secondary);
  text-align: center;
  margin-top: 40px;
  padding: 0 20px;
}

.ctaBarra {
  @include objetivo-tactil(48px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: var(--c-accent);
  color: #ffffff;
  border-radius: 13px;
  font-size: 15.5px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    background: var(--c-accent-hover);
    color: #ffffff;
  }
}

/* ── Estado vacío ── */

.vacio {
  display: flex;
  flex-direction: column;
  padding-top: 6px;

  @include desde-md {
    max-width: 560px;
    margin: 0 auto;
  }
}

.vacioBadge {
  @include mono-label(10.5px, 0.08em);
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--c-text-secondary);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-pill);
  padding: 6px 12px;
}

.vacioPunto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-signal);
}

.vacioTitulo {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: var(--c-ink);
  margin-top: 16px;

  @include desde-md {
    font-size: 32px;
  }
}

.vacioSubtitulo {
  font-size: 15px;
  line-height: 1.5;
  color: var(--c-text-secondary);
  margin-top: 10px;
}

.identidad {
  background: var(--c-ink);
  border-radius: var(--r-card);
  padding: 20px;
  margin-top: 20px;
}

.identidadEtiqueta {
  @include mono-label(10.5px, 0.08em);
  color: var(--c-signal);
}

.identidadHandle {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #ffffff;
  margin-top: 8px;
  overflow-wrap: anywhere;
}

.identidadCopiar {
  @include objetivo-tactil(48px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 16px;
  border: 1px solid var(--c-on-dark-border-strong);
  background: var(--c-on-dark-border);
  color: #ffffff;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--c-accent-light);
  }
}

.camino {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-top: 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px;
}

.caminoIcono {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  background: var(--c-bg);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.caminoTitulo {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
}

.caminoTexto {
  font-size: 14px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  margin-top: 4px;
}

.vacioPie {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 13px;
  color: var(--c-text-muted);
}
```

### 5.19 `src/features/orders/pages/DetalleOrdenPage.tsx` — crear

```tsx
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
  Lock,
  TriangleAlert,
} from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { StateChip } from '../components/StateChip'
import { HashField } from '../components/HashField'
import { useOrder } from '../hooks/useOrders'
import { ORDER_STATES, ETIQUETA_ESTADO, esMiTurno, type Order, type OrderState } from '../types'
import {
  fechaLegible,
  formatearMonto,
  formatearPeso,
  haceCuanto,
  tiempoRestante,
} from '../utils/format'
import styles from './DetalleOrdenPage.module.scss'

/** Qué significa cada etapa, escrito desde el lado de quien mira. */
function descripcionEtapa(etapa: OrderState, orden: Order): string {
  const otro = orden.contraparte.nombre
  const yoVendo = orden.rol === 'vendedor'

  switch (etapa) {
    case 'EN_CUSTODIA':
      return yoVendo ? 'Subiste el archivo' : `${otro} subió el archivo`
    case 'EN_INSPECCION':
      return yoVendo ? `${otro} revisó la ficha` : 'Revisaste la ficha'
    case 'PAGO_ENVIADO':
      return yoVendo ? 'Comprobante cargado' : 'Cargaste el comprobante'
    case 'LIBERADO':
      return yoVendo ? 'Tú liberas, o se habilita solo' : `${otro} libera, o se habilita solo`
    case 'DESCARGADO':
      return yoVendo ? `${otro} descarga y verifica` : 'Descargas y verificas el hash'
    case 'PURGADO':
      return 'El archivo se borra. Sin copias.'
  }
}

/** Título de la acción pendiente, según el estado. */
function tituloAccion(estado: OrderState): string {
  switch (estado) {
    case 'PAGO_ENVIADO':
      return 'Verifica que el dinero llegó y libera el archivo'
    case 'LIBERADO':
      return 'Descarga el archivo y verifica el hash'
    default:
      return 'Revisa la ficha técnica antes de decidir'
  }
}

export function DetalleOrdenPage() {
  const { id } = useParams<{ id: string }>()
  const orden = useOrder(id)

  // Una orden inexistente (id inventado, o modo demo apagado) vuelve a la bandeja en vez
  // de mostrar una pantalla rota.
  if (!orden) return <Navigate to="/panel" replace />

  const miTurno = esMiTurno(orden)
  const esVendedor = orden.rol === 'vendedor'
  const IconoRol = esVendedor ? ArrowUp : ArrowDown
  const indiceActual = ORDER_STATES.indexOf(orden.estado)
  const falta = orden.liberaAutomaticaEn ? tiempoRestante(orden.liberaAutomaticaEn) : null

  return (
    <PanelShell
      volverA="/panel"
      titulo={`#${orden.id}`}
      barra={
        miTurno ? (
          <BarraAccion>
            <div className={styles.barraFila}>
              <button
                type="button"
                className={styles.botonProblema}
                aria-label="Reportar un problema"
              >
                <TriangleAlert size={20} aria-hidden="true" />
              </button>
              <button type="button" className={styles.botonPrincipal}>
                <Lock size={18} aria-hidden="true" />
                {orden.estado === 'PAGO_ENVIADO' ? 'Liberar el archivo' : 'Continuar'}
              </button>
            </div>
          </BarraAccion>
        ) : undefined
      }
    >
      <div className={styles.cabecera}>
        <StateChip estado={orden.estado} />
        <span className={styles.rol}>
          <IconoRol size={11} aria-hidden="true" />
          {esVendedor ? 'VENDES A' : 'COMPRAS A'} {orden.contraparte.handle}
        </span>
      </div>

      {miTurno && (
        <section className={styles.accion}>
          <span className={styles.accionEtiqueta}>
            <span className={styles.accionPunto} aria-hidden="true" />
            TE TOCA A TI
          </span>
          <h1 className={styles.accionTitulo}>{tituloAccion(orden.estado)}</h1>
          <p className={styles.accionTexto}>
            {orden.estado === 'PAGO_ENVIADO'
              ? `${orden.contraparte.nombre} cargó el comprobante ${
                  orden.comprobante ? haceCuanto(orden.comprobante.cargadoEn) : ''
                }. Revisa tu banco: el pago es directo y nosotros no lo vemos.`
              : orden.estado === 'LIBERADO'
                ? 'Al confirmar la descarga, el archivo se borra de nuestros servidores. Sin copias.'
                : 'Compara el hash y la ficha con lo que acordaron antes de pagar nada.'}
          </p>
          {falta && (
            <p className={styles.reloj}>
              <Clock size={15} aria-hidden="true" />
              SE LIBERA SOLO EN {falta.toUpperCase()}
            </p>
          )}
        </section>
      )}

      <section className={styles.tarjetaMonto}>
        <div>
          <span className={styles.montoEtiqueta}>ACORDADO</span>
          <div className={styles.monto}>
            {formatearMonto(orden.montoCop)} <span className={styles.montoMoneda}>COP</span>
          </div>
        </div>
        <div className={styles.contraparte}>
          <span className={styles.contraparteNombre}>{orden.contraparte.nombre}</span>
          <span className={styles.contraparteHandle}>{orden.contraparte.handle}</span>
          <span className={styles.contraparteOps}>
            {orden.contraparte.operaciones} operaciones
          </span>
        </div>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabeza}>
          <h2 className={styles.tarjetaTitulo}>Ficha técnica</h2>
          <span className={styles.selloVerificable}>
            <Check size={11} aria-hidden="true" />
            VERIFICABLE
          </span>
        </div>

        <div className={styles.archivo}>
          <span className={styles.archivoIcono}>
            <FileText size={19} aria-hidden="true" />
          </span>
          <div className={styles.archivoDatos}>
            <span className={styles.archivoNombre}>{orden.archivo.nombre}</span>
            <span className={styles.archivoFecha}>
              Subido el {fechaLegible(orden.archivo.subidoEn)}
            </span>
          </div>
        </div>

        <dl className={styles.metadatos}>
          <div>
            <dt>EXTENSIÓN</dt>
            <dd>{orden.archivo.extension}</dd>
          </div>
          <div>
            <dt>PESO</dt>
            <dd>{formatearPeso(orden.archivo.bytes)}</dd>
          </div>
          <div>
            <dt>ARCHIVOS</dt>
            <dd>{orden.archivo.archivosDentro ?? '—'}</dd>
          </div>
        </dl>

        <HashField
          hash={orden.archivo.hash}
          nota={
            esVendedor
              ? `${orden.contraparte.nombre} compara este hash al descargar. Si no coincide, no es el mismo archivo.`
              : 'Compara este hash con el del archivo descargado. Si no coincide, no es el mismo archivo.'
          }
        />
      </section>

      {orden.comprobante && (
        <section className={styles.tarjeta}>
          <h2 className={styles.tarjetaTitulo}>
            {esVendedor
              ? `Comprobante de ${orden.contraparte.nombre}`
              : 'Comprobante que cargaste'}
          </h2>
          <div className={styles.comprobante}>
            <span className={styles.comprobanteIcono}>
              <ImageIcon size={18} aria-hidden="true" />
            </span>
            <div className={styles.comprobanteDatos}>
              <span className={styles.comprobanteNombre}>{orden.comprobante.nombre}</span>
              <span className={styles.comprobanteMeta}>
                {haceCuanto(orden.comprobante.cargadoEn)} ·{' '}
                {formatearPeso(orden.comprobante.bytes)}
              </span>
            </div>
            <button type="button" className={styles.comprobanteVer}>
              Ver
            </button>
          </div>
          <p className={styles.comprobanteNota}>
            Es lo que la otra parte dice haber pagado, no una confirmación nuestra.{' '}
            <strong>Confirma en tu banco.</strong>
          </p>
        </section>
      )}

      <section className={styles.tarjeta}>
        <h2 className={styles.tarjetaTitulo}>Estado de la orden</h2>
        <ol className={styles.linea}>
          {ORDER_STATES.map((etapa, indice) => {
            const recorrida = indice < indiceActual
            const actual = indice === indiceActual
            return (
              <li key={etapa} className={styles.lineaItem}>
                <span
                  className={[
                    styles.lineaPunto,
                    recorrida ? styles.lineaPuntoHecho : '',
                    actual ? styles.lineaPuntoActual : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
                <div
                  className={`${styles.lineaCuerpo} ${recorrida ? styles.lineaCuerpoHecho : ''}`}
                >
                  <span
                    className={`${styles.lineaEtiqueta} ${
                      actual ? styles.lineaEtiquetaActual : ''
                    }`}
                  >
                    {ETIQUETA_ESTADO[etapa]}
                    {actual && ' — AHORA'}
                  </span>
                  <span className={styles.lineaTexto}>{descripcionEtapa(etapa, orden)}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {!miTurno && (
        <p className={styles.esperaPie}>
          <Clock size={15} aria-hidden="true" />
          Esperando a {orden.contraparte.nombre}. Te avisamos cuando haya movimiento.
        </p>
      )}

      <Link to="/panel" className={styles.volverPie}>
        Volver a tus órdenes
      </Link>
    </PanelShell>
  )
}
```

### 5.20 `src/features/orders/pages/DetalleOrdenPage.module.scss` — crear

```scss
@use '@/styles/mixins' as *;

.cabecera {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.rol {
  @include mono-label(11px, 0.04em);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-secondary);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-pill);
  padding: 4px 10px;
}

/* ── Acción pendiente (bloque oscuro) ── */

.accion {
  background: var(--c-ink);
  border-radius: var(--r-card);
  padding: 18px;
  margin-top: 14px;

  @include desde-md {
    padding: 24px 26px;
  }
}

.accionEtiqueta {
  @include mono-label(10.5px, 0.08em);
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--c-signal);
}

.accionPunto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-signal);
}

.accionTitulo {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #ffffff;
  margin-top: 11px;

  @include desde-md {
    font-size: 22px;
  }
}

.accionTexto {
  font-size: 14px;
  line-height: 1.5;
  color: var(--c-on-dark-secondary);
  margin-top: 9px;
}

.reloj {
  @include mono-label(12px, 0.04em);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--c-on-dark-border);
  color: var(--c-signal);
}

/* ── Tarjetas ── */

.tarjeta,
.tarjetaMonto {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px;
  margin-top: 14px;
}

.tarjetaMonto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.tarjetaCabeza {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tarjetaTitulo {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
}

.selloVerificable {
  @include mono-label(10px, 0.04em);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--c-signal);
  color: var(--c-on-signal-strong);
  border-radius: var(--r-pill);
  padding: 4px 9px;
}

/* ── Monto ── */

.montoEtiqueta {
  @include mono-label(10px, 0.08em);
  color: var(--c-text-muted);
}

.monto {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--c-ink);
  margin-top: 4px;
}

.montoMoneda {
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text-secondary);
}

.contraparte {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contraparteNombre {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-ink);
}

.contraparteHandle {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--c-accent-text);
}

.contraparteOps {
  font-size: 12px;
  color: var(--c-text-muted);
}

/* ── Archivo ── */

.archivo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.archivoIcono {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 12px;
  background: var(--c-surface-accent);
  color: var(--c-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.archivoDatos {
  min-width: 0;
}

.archivoNombre {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--c-ink);
  // El nombre puede ser largo: en un teléfono se parte en vez de desbordar.
  overflow-wrap: anywhere;
}

.archivoFecha {
  display: block;
  font-size: 13px;
  color: var(--c-text-secondary);
  margin-top: 3px;
}

.metadatos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0 14px;
  padding-top: 14px;
  border-top: 1px solid var(--c-border-inner);

  dt {
    @include mono-label(9.5px, 0.07em);
    color: var(--c-text-muted);
  }

  dd {
    font-size: 15px;
    font-weight: 600;
    color: var(--c-ink);
    margin: 4px 0 0;
  }
}

/* ── Comprobante ── */

.comprobante {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 13px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 12px;
}

.comprobanteIcono {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 10px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.comprobanteDatos {
  flex-grow: 1;
  min-width: 0;
}

.comprobanteNombre {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comprobanteMeta {
  display: block;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  margin-top: 2px;
}

.comprobanteVer {
  @include objetivo-tactil(44px);
  flex: none;
  min-width: 60px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-ink);
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.comprobanteNota {
  font-size: 13px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  margin-top: 11px;

  strong {
    font-weight: 600;
    color: var(--c-ink);
  }
}

/* ── Línea de tiempo ── */

.linea {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.lineaItem {
  display: flex;
  gap: 12px;
}

.lineaPunto {
  width: 11px;
  height: 11px;
  flex: none;
  border-radius: 50%;
  background: var(--c-surface);
  border: 2px solid var(--c-border-strong);
  box-sizing: border-box;
  margin-top: 3px;
}

.lineaPuntoHecho {
  background: var(--c-accent);
  border-color: var(--c-accent);
}

.lineaPuntoActual {
  width: 13px;
  height: 13px;
  background: var(--c-accent);
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3.5px var(--c-accent-halo);
  margin-top: 2px;
}

.lineaCuerpo {
  flex-grow: 1;
  margin-left: -17px;
  padding-left: 29px;
  padding-bottom: 14px;
  border-left: 2px dashed var(--c-border);

  .lineaItem:last-child & {
    border-left: none;
    padding-bottom: 0;
  }
}

.lineaCuerpoHecho {
  border-left: 2px solid var(--c-accent);
}

.lineaEtiqueta {
  @include mono-label(11px, 0.04em);
  display: block;
  font-weight: 500;
  color: var(--c-text-muted);
}

.lineaEtiquetaActual {
  color: var(--c-accent-text);
}

.lineaTexto {
  display: block;
  font-size: 13px;
  color: var(--c-text-secondary);
  margin-top: 2px;
}

/* ── Barra de acción ── */

.barraFila {
  display: flex;
  gap: 10px;
}

.botonProblema {
  @include objetivo-tactil(52px);
  flex: none;
  width: 52px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    border-color: var(--c-alert);
    color: var(--c-alert);
  }
}

.botonPrincipal {
  @include objetivo-tactil(52px);
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: var(--c-signal);
  color: var(--c-on-signal-strong);
  border: none;
  border-radius: 13px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--c-signal-hover);
  }
}

/* ── Pie ── */

.esperaPie {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 13.5px;
  color: var(--c-text-secondary);
  text-align: center;
}

.volverPie {
  @include objetivo-tactil(48px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  font-size: 14.5px;
  font-weight: 500;
}
```

### 5.21 `src/features/orders/pages/NuevaOrdenPage.tsx` — crear

```tsx
import { Banknote, Check, Info, Lock, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Formulario de creación de orden.
 *
 * ⚠️ MAQUETA FUNCIONAL: los campos son reales y editables, pero no hay endpoint al cual
 * enviarlos (el backend de órdenes no existe todavía). El botón final no envía nada. Es una
 * decisión explícita del plan, no un olvido.
 */
export function NuevaOrdenPage() {
  return (
    <PanelShell
      volverA="/panel"
      titulo="Nueva orden"
      barra={
        <BarraAccion
          nota={
            <>
              Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
              los 30 días si no cierra
            </>
          }
        >
          <button type="button" className={styles.botonCrear}>
            <Lock size={18} aria-hidden="true" />
            Poner en custodia
          </button>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Vender un archivo</h1>
      <p className={styles.subtitulo}>
        Tres datos y queda en custodia. El comprador lo verá en su panel.
      </p>

      {/* ── Paso 1 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>1</span>
          <h2 className={styles.pasoTitulo}>El archivo</h2>
        </div>

        <div className={styles.zonaSubida}>
          <span className={styles.zonaIcono}>
            <Upload size={21} aria-hidden="true" />
          </span>
          <p className={styles.zonaTitulo}>Elige el archivo a vender</p>
          <p className={styles.zonaTexto}>Hasta 5 GB. Se cifra al subirlo.</p>
          <button type="button" className={styles.zonaBoton}>
            Buscar en mi teléfono
          </button>
        </div>

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
          <h2 className={styles.pasoTitulo}>A quién se la vendes</h2>
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
          defaultValue="@trq-4f7k"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className={styles.confirmacion}>
          <Check size={15} aria-hidden="true" />
          Ana R. — 17 operaciones completadas
        </p>
      </section>

      {/* ── Paso 3 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>3</span>
          <h2 className={styles.pasoTitulo}>Cuánto acordaron</h2>
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
          defaultValue="450.000"
        />

        <label className={styles.etiqueta} htmlFor="cuenta">
          Dónde te paga
        </label>
        <input
          id="cuenta"
          name="cuenta"
          type="text"
          className={styles.campo}
          placeholder="Nequi, Bancolombia, Daviplata…"
          defaultValue="Nequi · 300 000 0000"
        />

        <p className={styles.avisoDinero}>
          <Banknote size={17} aria-hidden="true" />
          <span>
            Te transfiere <strong>directo a esa cuenta</strong>. MyTrueque no cobra, no
            retiene y no puede devolver ese dinero.
          </span>
        </p>
      </section>
    </PanelShell>
  )
}
```

### 5.22 `src/features/orders/pages/NuevaOrdenPage.module.scss` — crear

```scss
@use '@/styles/mixins' as *;

.titulo {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--c-ink);

  @include desde-md {
    font-size: 29px;
  }
}

.subtitulo {
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  margin-top: 7px;
}

/* ── Pasos ── */

.paso {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px;
  margin-top: 14px;
}

.pasoCabeza {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pasoNumero {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
  background: var(--c-accent);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 11.5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pasoTitulo {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
}

/* ── Zona de subida ── */

.zonaSubida {
  margin-top: 14px;
  border: 1.5px dashed var(--c-border-strong);
  border-radius: 13px;
  background: var(--c-bg-alt);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zonaIcono {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--c-surface-accent);
  color: var(--c-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.zonaTitulo {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
  margin-top: 12px;
  text-align: center;
}

.zonaTexto {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  margin-top: 4px;
}

.zonaBoton {
  @include objetivo-tactil(48px);
  width: 100%;
  margin-top: 14px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-ink);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--c-accent);
  }
}

/* ── Campos ── */

.etiqueta {
  display: block;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--c-text-secondary);
  margin-top: 14px;
}

.campo {
  @include objetivo-tactil(52px);
  width: 100%;
  box-sizing: border-box;
  margin-top: 7px;
  padding: 0 14px;
  border: 1px solid var(--c-border-input);
  border-radius: 12px;
  background: var(--c-surface);
  color: var(--c-ink);
  // 🔴 16px NO ES NEGOCIABLE: por debajo de eso, iOS hace zoom automático al enfocar el
  // campo y deja la pantalla descuadrada, con el usuario sin saber cómo volver.
  font-size: 16px;

  &:focus {
    outline: 2px solid var(--c-accent);
    outline-offset: -1px;
  }
}

.campoMono {
  font-family: var(--font-mono);
}

.campoMonto {
  font-size: 19px;
  font-weight: 700;
}

.confirmacion {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  font-size: 13.5px;
  color: var(--c-accent-text);
}

/* ── Notas ── */

.nota,
.avisoDinero {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 13px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--c-text-secondary);

  svg {
    flex: none;
    margin-top: 1px;
  }

  strong {
    font-weight: 600;
    color: var(--c-ink);
  }
}

.avisoDinero {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 13px;
}

/* ── Barra ── */

.notaEstado {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--c-ink);
  font-weight: 500;
}

.botonCrear {
  @include objetivo-tactil(52px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: var(--c-accent);
  color: #ffffff;
  border: none;
  border-radius: 13px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--c-accent-hover);
  }
}
```

### 5.23 `src/features/orders/pages/CuentaPage.tsx` — crear

```tsx
import { Copy, LogOut, Share2 } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations'
import styles from './CuentaPage.module.scss'

/**
 * Pantalla de cuenta.
 *
 * Existe porque en 390px el header no aguanta logo + chip del @usuario + botón de salir
 * (se midieron 32px de desborde horizontal). Todo eso se mudó aquí, a un toque del avatar.
 * De paso, "Cerrar sesión" deja de estar pegado al borde donde se toca por accidente.
 */
export function CuentaPage() {
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()

  return (
    <PanelShell volverA="/panel" titulo="Tu cuenta">
      <div className={styles.identidad}>
        <span className={styles.etiqueta}>TU @USUARIO</span>
        <div className={styles.handle} data-testid="mi-handle">
          {user?.handle ?? ''}
        </div>
        <p className={styles.texto}>
          Es lo único que compartes para comprar o vender. No hay enlaces públicos ni perfiles
          que alguien pueda buscar.
        </p>
        <div className={styles.acciones}>
          <button type="button" className={styles.botonSignal}>
            <Copy size={17} aria-hidden="true" />
            Copiar
          </button>
          <button type="button" className={styles.botonOscuro}>
            <Share2 size={17} aria-hidden="true" />
            Compartir
          </button>
        </div>
      </div>

      <div className={styles.datos}>
        <div className={styles.dato}>
          <span className={styles.datoEtiqueta}>CORREO</span>
          <span className={styles.datoValor} data-testid="mi-correo">
            {user?.email ?? ''}
          </span>
        </div>
      </div>

      <div className={styles.tarjeta}>
        <h2 className={styles.tarjetaTitulo}>Cómo funciona tu custodia</h2>
        <ul className={styles.lista}>
          <li>Los archivos van cifrados mientras dure la orden.</li>
          <li>Se borran al confirmarse la descarga. Sin copias.</li>
          <li>Si la orden no cierra, se purgan a los 30 días.</li>
          <li>El dinero nunca pasa por MyTrueque.</li>
        </ul>
      </div>

      <button
        type="button"
        className={styles.salir}
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut size={18} aria-hidden="true" />
        Cerrar sesión
      </button>
    </PanelShell>
  )
}
```

### 5.24 `src/features/orders/pages/CuentaPage.module.scss` — crear

```scss
@use '@/styles/mixins' as *;

.identidad {
  background: var(--c-ink);
  border-radius: var(--r-card);
  padding: 20px;
}

.etiqueta {
  @include mono-label(10.5px, 0.08em);
  color: var(--c-signal);
}

.handle {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #ffffff;
  margin-top: 8px;
  overflow-wrap: anywhere;
}

.texto {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--c-on-dark-secondary);
  margin-top: 12px;
}

.acciones {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.botonSignal,
.botonOscuro {
  @include objetivo-tactil(48px);
  flex-grow: 1;
  flex-basis: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.botonSignal {
  border: none;
  background: var(--c-signal);
  color: var(--c-on-signal-strong);

  &:hover {
    background: var(--c-signal-hover);
  }
}

.botonOscuro {
  border: 1px solid var(--c-on-dark-border-strong);
  background: var(--c-on-dark-border);
  color: #ffffff;

  &:hover {
    border-color: var(--c-accent-light);
  }
}

/* ── Datos ── */

.datos {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  margin-top: 16px;
  overflow: hidden;
}

.dato {
  padding: 15px 16px;
}

.datoEtiqueta {
  @include mono-label(9.5px, 0.07em);
  display: block;
  color: var(--c-text-muted);
}

.datoValor {
  display: block;
  font-size: 15px;
  color: var(--c-ink);
  margin-top: 4px;
  overflow-wrap: anywhere;
}

/* ── Recordatorios ── */

.tarjeta {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px;
  margin-top: 16px;
}

.tarjetaTitulo {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

.lista {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    position: relative;
    padding-left: 15px;
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--c-text-secondary);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 7px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--c-accent);
    }
  }
}

/* ── Salir ── */

.salir {
  @include objetivo-tactil(52px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 24px;
  border: 1px solid var(--c-border-button);
  background: var(--c-surface);
  color: var(--c-alert);
  border-radius: 13px;
  font-size: 15.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--c-alert);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
```

### 5.25 `src/App.tsx` — reemplazar el contenido completo

```tsx
import { Route, Routes } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'
import { PanelPage } from '@/features/orders/pages/PanelPage'
import { DetalleOrdenPage } from '@/features/orders/pages/DetalleOrdenPage'
import { NuevaOrdenPage } from '@/features/orders/pages/NuevaOrdenPage'
import { CuentaPage } from '@/features/orders/pages/CuentaPage'
import { RutaPrivada } from '@/features/auth/components/RutaPrivada'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

export function App() {
  // La hidratación de la sesión vive aquí y no dentro de una pantalla concreta: si alguien
  // entra directo a /panel, la landing nunca se monta y GET /auth/me jamás se dispararía,
  // dejando al usuario fuera de su propio panel pese a tener cookie válida.
  useCurrentUser()

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route
        path="/panel"
        element={
          <RutaPrivada>
            <PanelPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/nueva"
        element={
          <RutaPrivada>
            <NuevaOrdenPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/cuenta"
        element={
          <RutaPrivada>
            <CuentaPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/orden/:id"
        element={
          <RutaPrivada>
            <DetalleOrdenPage />
          </RutaPrivada>
        }
      />
      <Route path="*" element={<MainPage />} />
    </Routes>
  )
}
```

### 5.26 `src/features/landing/pages/MainPage.tsx` — reemplazar el contenido completo

> Dos cambios respecto a la versión actual: (1) se **quita** la llamada a `useCurrentUser()`
> —ahora vive en `App.tsx`—, y (2) se añade la **redirección a `/panel`** cuando hay sesión.
> Todo lo demás (lectura del `?auth=error` de Google) se conserva **idéntico**.

```tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { Inspection } from '../components/Inspection'
import { Guarantees } from '../components/Guarantees'
import { Faq } from '../components/Faq'
import { Footer } from '../components/Footer'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import { useAuthStore } from '@/features/auth/store/authStore'
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
 * cascada (oxlint react/set-state-in-effect) y se repetiría en StrictMode.
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
  const [authTab, setAuthTab] = useState<AuthTab>('login')
  const [googleError] = useState<string | null>(ERROR_DE_GOOGLE_INICIAL)
  const user = useAuthStore((state) => state.user)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  /** Cambia la pestaña y lleva al usuario al panel de acceso. */
  function goToAuth(tab: AuthTab) {
    setAuthTab(tab)
    document.getElementById('acceso')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Con sesión activa, la landing no es el sitio: el usuario ya entró y lo que necesita es
  // su bandeja. Cubre los tres caminos de entrada (formulario, registro y vuelta de Google,
  // que aterriza en "/"). El chequeo de isHydrating evita redirigir antes de saber si hay
  // sesión — y va DESPUÉS de todos los hooks, nunca antes.
  if (!isHydrating && user) {
    return <Navigate to="/panel" replace />
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

### 5.27 `src/test/renderConWrappers.tsx` — crear

```tsx
/**
 * Helper de render para los tests.
 *
 * 🔴 Resetea `useAuthStore` en cada llamada. El store de zustand es un **singleton de
 * módulo**: sin este reseteo, el usuario que un test mete en el store sigue ahí en el
 * siguiente, y los tests pasan o fallan según el orden en que corran.
 */
import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/features/auth/store/authStore'

interface OpcionesRender {
  /** Usuario en sesión. null = sin sesión. */
  usuario?: AuthUser | null
  /** true = la sesión aún se está resolviendo (GET /auth/me en vuelo). */
  hidratando?: boolean
  /** Ruta inicial del router en memoria. */
  ruta?: string
}

export const USUARIO_DE_PRUEBA: AuthUser = {
  email: 'ana@correo.com',
  handle: '@trq-925j',
}

export function renderConWrappers(ui: ReactElement, opciones: OpcionesRender = {}) {
  const { usuario = null, hidratando = false, ruta = '/' } = opciones

  useAuthStore.setState({ user: usuario, isHydrating: hidratando })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrappers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrappers })
}
```

### 5.28 `src/features/auth/components/RutaPrivada.test.tsx` — crear

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RutaPrivada } from './RutaPrivada'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

function Arbol() {
  return (
    <Routes>
      <Route path="/" element={<p>Landing pública</p>} />
      <Route
        path="/panel"
        element={
          <RutaPrivada>
            <p>Contenido privado</p>
          </RutaPrivada>
        }
      />
    </Routes>
  )
}

describe('RutaPrivada', () => {
  it('deja ver el contenido cuando hay sesión', () => {
    renderConWrappers(<Arbol />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })
    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })

  it('manda a la landing cuando no hay sesión', () => {
    renderConWrappers(<Arbol />, { usuario: null, ruta: '/panel' })
    expect(screen.getByText('Landing pública')).toBeInTheDocument()
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument()
  })

  it('espera sin expulsar mientras la sesión se está resolviendo', () => {
    renderConWrappers(<Arbol />, { usuario: null, hidratando: true, ruta: '/panel' })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Landing pública')).not.toBeInTheDocument()
  })
})
```

### 5.29 `src/features/orders/utils/format.test.ts` — crear

```ts
import { describe, it, expect } from 'vitest'
import { formatearMonto, formatearPeso, hashCorto, hashMinimo, tiempoRestante } from './format'

describe('formatearPeso', () => {
  // Estos casos son el hallazgo H1: la versión anterior devolvía "240 MB" y "18,0 MB".
  it('muestra un decimal de MB en adelante, y ninguno por debajo', () => {
    expect(formatearPeso(252_125_184)).toBe('240,4 MB')
    expect(formatearPeso(1_932_735_283)).toBe('1,8 GB')
    expect(formatearPeso(839_680)).toBe('820 KB')
    expect(formatearPeso(512)).toBe('512 B')
  })

  it('no deja decimales vacíos tipo "18,0 MB"', () => {
    expect(formatearPeso(18_874_368)).toBe('18 MB')
  })
})

describe('formatearMonto', () => {
  it('usa el punto como separador de miles y no pone decimales', () => {
    expect(formatearMonto(450_000)).toBe('$450.000')
    expect(formatearMonto(1_200_500)).toBe('$1.200.500')
  })
})

describe('hash', () => {
  it('abrevia dejando los extremos, que son los que se comparan', () => {
    const hash = 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b'
    expect(hashCorto(hash)).toBe('a3f97c2e…b3d2c21b')
    expect(hashMinimo(hash)).toBe('a3f9…c21b')
  })
})

describe('tiempoRestante', () => {
  it('devuelve null cuando el plazo ya venció', () => {
    const ahora = new Date('2026-09-21T12:00:00Z')
    expect(tiempoRestante('2026-09-21T11:00:00Z', ahora)).toBeNull()
  })
})
```

### 5.30 `src/features/orders/components/OrderCard/OrderCard.test.tsx` — crear

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { OrderCard } from './OrderCard'
import type { Order } from '../../types'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

function ordenBase(cambios: Partial<Order> = {}): Order {
  return {
    id: '1001',
    estado: 'PAGO_ENVIADO',
    rol: 'vendedor',
    contraparte: { nombre: 'Ana R.', handle: '@trq-4f7k', operaciones: 17 },
    archivo: {
      nombre: 'archivo-de-prueba.zip',
      extension: '.zip',
      bytes: 252_125_184,
      hash: 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b',
      subidoEn: new Date().toISOString(),
    },
    montoCop: 450_000,
    creadaEn: new Date().toISOString(),
    liberaAutomaticaEn: null,
    purgaEn: null,
    comprobante: null,
    ...cambios,
  }
}

describe('OrderCard', () => {
  it('ofrece la acción cuando el turno es del usuario', () => {
    // PAGO_ENVIADO siendo vendedor = le toca liberar.
    renderConWrappers(<OrderCard orden={ordenBase()} />, { usuario: USUARIO_DE_PRUEBA })
    expect(screen.getByRole('link', { name: /Revisar y liberar/ })).toBeInTheDocument()
    expect(screen.getByTestId('state-chip')).toHaveTextContent('PAGO ENVIADO')
  })

  it('no ofrece ninguna acción cuando el turno es de la otra parte', () => {
    // PAGO_ENVIADO siendo comprador = ya pagó, espera a que el vendedor libere.
    renderConWrappers(<OrderCard orden={ordenBase({ rol: 'comprador' })} />, {
      usuario: USUARIO_DE_PRUEBA,
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/Esperando a Ana R\./)).toBeInTheDocument()
  })

  it('muestra la contraparte, el monto y el peso legible', () => {
    renderConWrappers(<OrderCard orden={ordenBase()} />, { usuario: USUARIO_DE_PRUEBA })
    expect(screen.getByText('@trq-4f7k')).toBeInTheDocument()
    expect(screen.getByText('$450.000')).toBeInTheDocument()
    // toHaveTextContent sobre la tarjeta y no getByText: el meta del archivo son varios
    // nodos de texto dentro de un mismo elemento, y getByText no atraviesa nodos partidos
    // aunque el texto esté ahí (hallazgo H6).
    expect(screen.getByTestId('order-card-1001')).toHaveTextContent('240,4 MB')
  })
})
```

### 5.31 `src/features/orders/pages/PanelPage.test.tsx` — crear

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelPage } from './PanelPage'
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

// `useOrders` decide con sessionStorage al cargar el módulo, así que en los tests se
// sustituye el hook entero: es más honesto que manipular storage y recargar módulos.
vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn(),
  useOrder: vi.fn(),
}))

const { useOrders } = await import('../hooks/useOrders')
const useOrdersMock = vi.mocked(useOrders)

afterEach(() => {
  vi.clearAllMocks()
})

describe('PanelPage', () => {
  it('sin órdenes muestra el estado vacío con el @usuario del usuario', () => {
    useOrdersMock.mockReturnValue({ orders: [], isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    expect(screen.getByText(/Tu cuenta está lista/)).toBeInTheDocument()
    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
    expect(screen.getByRole('link', { name: /Crear mi primera orden/ })).toHaveAttribute(
      'href',
      '/panel/nueva',
    )
  })

  it('con órdenes arranca mostrando las que le tocan al usuario', () => {
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    // Las 3 de "te toca": 4821 (vendedor/PAGO_ENVIADO), 4812 (comprador/LIBERADO)
    // y 4835 (comprador/EN_INSPECCION).
    expect(screen.getByTestId('order-card-4821')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4812')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4835')).toBeInTheDocument()
    // Las de espera NO están montadas todavía.
    expect(screen.queryByTestId('order-card-4840')).not.toBeInTheDocument()
  })

  it('el filtro cambia a las órdenes que esperan a la otra parte', async () => {
    const user = userEvent.setup()
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    await user.click(screen.getByRole('tab', { name: /Esperando/ }))

    expect(screen.getByTestId('order-card-4840')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4829')).toBeInTheDocument()
    expect(screen.queryByTestId('order-card-4821')).not.toBeInTheDocument()
  })
})
```

### 5.32 `src/features/orders/pages/CuentaPage.test.tsx` — crear

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { CuentaPage } from './CuentaPage'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

describe('CuentaPage', () => {
  it('muestra el @usuario y el correo de la sesión', () => {
    renderConWrappers(<CuentaPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/cuenta' })
    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
    expect(screen.getByTestId('mi-correo')).toHaveTextContent('ana@correo.com')
  })

  it('ofrece cerrar sesión', () => {
    renderConWrappers(<CuentaPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/cuenta' })
    expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeEnabled()
  })
})
```

---

## 6. Orden de ejecución

Reportar cada paso como `✅ Paso N — OK` o `❌ Paso N — FALLO: razón`. Detenerse al primer fallo.

### Paso 1 — Prerequisitos
Correr los 6 checks de la Sección 3.

### Paso 2 — Estilos base
1. **AÑADIR** al final de `src/styles/_mixins.scss` el bloque de 5.1. ⚠️ Es un añadido.
2. **AÑADIR** los 4 tokens a `src/styles/_tokens.scss` según 5.2. ⚠️ Es un añadido, en **dos
   sitios distintos** del archivo.
3. Cambiar la línea del `meta viewport` en `index.html` (5.3).

### Paso 3 — Base del dominio
Crear, en este orden:
1. `types.ts` (5.4)
2. `utils/format.ts` (5.5)
3. `data/ordersFixtures.ts` (5.6)
4. `hooks/useOrders.ts` (5.7)

### Paso 4 — Armazón
Crear los 3 archivos de cada uno, en este orden (PanelShell usa PanelHeader):
1. `PanelHeader` (5.8)
2. `BarraAccion` (5.9)
3. `PanelShell` (5.10)

### Paso 5 — Componentes de presentación
1. `StateChip` (5.11)
2. `OrderStepper` (5.12)
3. `FiltroTurno` (5.13)
4. `HashField` (5.14)
5. `OrderCard` (5.15)

### Paso 6 — Guardia de rutas
Crear `src/features/auth/components/RutaPrivada.tsx` (5.16).

### Paso 7 — Pantallas
Crear cada una con su `.module.scss`:
1. `PanelPage` (5.17, 5.18)
2. `DetalleOrdenPage` (5.19, 5.20)
3. `NuevaOrdenPage` (5.21, 5.22)
4. `CuentaPage` (5.23, 5.24)

### Paso 8 — Cablear el routing
1. Reemplazar `src/App.tsx` (5.25).
2. Reemplazar `src/features/landing/pages/MainPage.tsx` (5.26).

### Paso 9 — Compilación intermedia
```bash
pnpm typecheck
```
Debe dar exit 0. **Si falla aquí, DETENERSE**: es más barato arreglarlo antes de los tests.

### Paso 10 — Tests
1. Crear `src/test/renderConWrappers.tsx` (5.27).
2. Crear los 5 archivos de test (5.28 a 5.32).
3. `pnpm test` → **23 passed** (7 existentes + 16 nuevos).

### Paso 11 — Calidad
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Los 4 en verde, `pnpm lint` **sin warnings**.

### Paso 12 — Levantar backend y frontend
```bash
# Terminal 1 — SIEMPRE desde backend/
cd backend
uv run uvicorn src.main:app --port 8000

# Terminal 2
cd frontend
pnpm dev
```

### Paso 13 — 🔴 Verificación MÓVIL (la que importa)

En el navegador, con **DevTools → Toggle device toolbar**, probar a **390 × 844** y repetir
a **360 × 780**. Reportar los checks M1–M9 de la Sección 8.

> Probar **también a 360px** no es opcional: es el ancho del Galaxy S23, uno de los teléfonos
> más comunes, y es donde aparecen los desbordes.

### Paso 14 — Verificación de escritorio
Repetir a 1280px los checks V1–V11 de la Sección 8.

### Paso 15 — Reportar
Detener los procesos. **No** ejecutar `git init`. **No** editar `BITACORA.md`.
Reportar archivos creados/modificados y el resultado de los checks de la Sección 8.

---

## 7. Reglas no negociables

1. **No instalar dependencias.** Ni `pnpm add`, ni cambiar `package.json`.
2. **No tocar el backend.** Ni un archivo bajo `C:\APLICACIONES\Trueque.com\backend\`.
3. **No tocar** `src/main.tsx`, el `Header` de la landing, `AuthPanel`, `useAuthMutations`,
   `authStore`, `authService`, `Logo.tsx`, `vite.config.ts` ni `tsconfig.*.json`.
4. **Mobile-first, sin excepción.** Los estilos base son los del teléfono, sin media query.
   Lo de escritorio va dentro de `@include desde-md` / `desde-lg`. **Está prohibido usar
   `bp-lg` / `bp-md` / `bp-sm` (max-width) en los archivos nuevos** — esos quedan para la
   landing.
5. **`_mixins.scss` y `_tokens.scss` se AMPLÍAN, no se reemplazan.** Copiar los bloques de
   5.1 o 5.2 encima del archivo destruiría lo que ya usa la landing (hallazgo **H7**).
6. **Objetivos táctiles, dos umbrales y ninguna excepción más:**
   - **48px** en todo botón o enlace de **acción** (los de las tarjetas, los de las barras
     fijas, los de los formularios).
   - **44px** como **mínimo absoluto** en navegación y controles (marca, volver, avatar,
     filtro, "Copiar", "Ver", `summary` del hash). Nada baja de ahí.
   Usar siempre el mixin `objetivo-tactil`. La v3 dejó la marca del header en 30px y el
   filtro en 40px (**H8** y **H9**): ambos se midieron en navegador y ambos violaban esta
   regla. El check M7 los detecta.
7. **Los `<input>` llevan `font-size: 16px` como mínimo.** Por debajo, iOS hace zoom
   automático al enfocar. No negociable.
8. **Sin `enum` de TypeScript.** `erasableSyntaxOnly: true` lo prohíbe y el build falla.
9. **`import type` para todo lo que sea solo un tipo.** `verbatimModuleSyntax: true` está
   activo: un tipo importado sin `type` rompe el build.
10. **No usar `<Logo>` dentro del panel.** Renderiza su propio `<a>` y anidarlo en un `<Link>`
    produce HTML inválido que React reporta como error (hallazgo **H2**).
11. **Iconos de `lucide-react` v1.** Los nombres usados aquí (`ArrowUp`, `ArrowDown`,
    `Banknote`, `Check`, `Clock`, `Copy`, `Download`, `FileText`, `Image`, `Info`, `Lock`,
    `LogOut`, `Plus`, `Share2`, `TriangleAlert`, `Upload`) existen en v1. Si alguno no
    resolviera, DETENERSE y preguntar — **no sustituir por un emoji ni por un SVG inventado**.
12. **Cero colores hex sueltos en los `.module.scss` nuevos**, salvo `#ffffff` sobre fondos
    de acento u oscuros.
13. **Nada de `setState` dentro de `useEffect`.** oxlint marca `react/set-state-in-effect`.
    Los cálculos de una sola vez van a nivel de módulo.
14. **Los componentes NO importan `ordersFixtures` directamente.** Solo `useOrders()` puede.
15. **El `return` condicional de `MainPage` va DESPUÉS de todos los hooks.**
16. **No inventar copy que contradiga el modelo de negocio** de la Sección 1.3.
17. **No ejecutar `git init`** ni comitear.
18. Si algo no está especificado, **preguntar antes de decidir**.

---

## 8. Validaciones post-ejecución

### Automáticas (desde `frontend/`)

| # | Check | Comando | Esperado |
|---|---|---|---|
| F1 | Typecheck | `pnpm typecheck` | exit 0 |
| F2 | Lint | `pnpm lint` | exit 0, **sin warnings** |
| F3 | Tests | `pnpm test` | **23 passed** (7 previos + 16 nuevos) |
| F4 | Build | `pnpm build` | exit 0 |
| F5 | Sin dependencias nuevas | comparar `package.json` con la Sección 1.5 | idéntico |

### 🔴 Móvil — a 390px Y a 360px (las dos)

| # | Check | Cómo | Esperado |
|---|---|---|---|
| M1 | Cero desborde en bandeja | `/panel?demo=1` | La página **no se arrastra** de lado |
| M2 | Cero desborde en detalle | `/panel/orden/4821` | ídem |
| M3 | Cero desborde en nueva orden | `/panel/nueva` | ídem |
| M4 | Cero desborde en cuenta | `/panel/cuenta` | ídem |
| M5 | Barra fija visible sin scroll | `/panel?demo=1` nada más entrar | El botón "Nueva orden de venta" se ve **sin deslizar** |
| M6 | La barra no tapa el final | Bajar hasta el fondo en `/panel/orden/4821` | El enlace "Volver a tus órdenes" se ve **completo**, no tapado |
| M7 | Toques cómodos | En DevTools, medir **todo** `button`, `a[href]`, `input`, `[role="tab"]` y `summary` del panel | **Ninguno por debajo de 44px** de alto, y los botones de **acción** a **48px** o más. Ojo con la marca del header y el filtro: son los dos que fallaron en la v3 (H8, H9) |
| M8 | Hash abreviado | `/panel/orden/4821` | Se ve `a3f97c2e…b3d2c21b`, **no** los 64 caracteres. Al pulsar "Ver hash completo" se despliegan |
| M9 | Inputs sin zoom | `/panel/nueva`, enfocar "Monto en COP" en iOS o simulador | **La pantalla no hace zoom** |

### Funcional (ambos tamaños)

| # | Check | Cómo | Esperado |
|---|---|---|---|
| V1 | `/panel` es privada | Ir a `/panel` sin sesión | Redirige a `/` |
| V2 | Login lleva al panel | Entrar con correo/contraseña | Aterriza en `/panel` |
| V3 | Estado vacío real | Ya en `/panel` | "Tu cuenta está lista" + el **@usuario real** |
| V4 | Recargar no expulsa | F5 en `/panel` | Sigue en `/panel` — valida el caso `isHydrating` |
| V5 | Landing redirige con sesión | Ir a `/` con sesión | Redirige a `/panel` |
| V6 | Filtro por turno | `/panel?demo=1`, pulsar "Esperando" | Cambia a `#4840` y `#4829`; desaparecen las otras 3 |
| V7 | Detalle y vuelta | Pulsar "Revisar y liberar" en `#4821` | `/panel/orden/4821`; "Órdenes" vuelve a `/panel` |
| V8 | Orden inexistente | Ir a `/panel/orden/9999` | Redirige a `/panel` sin pantalla rota |
| V9 | Cuenta y salir | Pulsar el avatar → "Cerrar sesión" | Cierra sesión y vuelve a la landing |
| V10 | Peso formateado | Mirar `#4821` en la bandeja | Dice **`240,4 MB`**, no `240 MB` ni `240,0 MB` |
| V11 | Consola limpia | DevTools durante todo lo anterior | **Cero errores** de JavaScript. En particular, ningún `<a> cannot contain a nested <a>` |

---

## 9. Fuera de alcance

Nada de esto se implementa. **No intentarlo.**

1. **Todo el backend de órdenes**: tablas, endpoints, subida de archivos, cifrado en
   custodia, hash real, purga a los 30 días, temporizador real de 24 h. Es el plan
   **ORDENES**, siguiente en la fila.
2. **Que los botones de acción hagan algo.** "Liberar el archivo", "Descargar", "Ver",
   "Copiar", "Compartir" y "Poner en custodia" son maqueta: no hay endpoint detrás.
3. **Cuenta regresiva en vivo.** El tiempo restante se calcula al renderizar.
4. **Órdenes cerradas / historial.** La bandeja solo muestra las abiertas.
5. **Disputas.** El botón de reportar no abre nada: una disputa real necesita quien la
   resuelva, y esa figura no existe todavía en el producto.
6. **Notificaciones** (correo, push o in-app) cuando cambia el estado de una orden.
7. **Arreglar el responsive de la landing.** Sigue con sus 8 toques por debajo de 44px y sus
   textos a 9,5px. Es un plan aparte (**LANDING-MOBILE**), y este plan no toca ni uno de sus
   archivos salvo `MainPage.tsx`.
8. **La pantalla de éxito del registro** en `AuthPanel` queda inalcanzable, porque el registro
   redirige a `/panel` (donde el estado vacío muestra el @usuario, que era su función). **No
   se borra** aquí para no tocar `AuthPanel` ni sus tests; queda como deuda anotada.
9. **Modo demo permanente.** El `?demo=1` y `ordersFixtures.ts` se eliminan cuando exista el
   backend.
10. **Despliegue** a `mytrueque.shop`, DNS, HTTPS y el registro del dominio productivo en
    Google Cloud Console.
11. **`git init` y commit.**

---

## 10. Qué cambió respecto a la v2 (desktop-first)

Contexto para quien compare este plan con la versión anterior, archivada como
`plan_PANEL_20260921_v2_desktop.md.bak`.

| Área | v2 (desktop-first) | v3 (mobile-first) |
|---|---|---|
| Base de los estilos | 1280px, corregido hacia abajo con `max-width` | **390px**, ampliado hacia arriba con `min-width` |
| Acción principal | En columna lateral derecha | **Barra fija inferior**, en la zona del pulgar |
| El `@usuario` y "Salir" | En el header | En **`/panel/cuenta`** (pantalla nueva) |
| Bandeja | Dos secciones apiladas | **Filtro por turno** (segmented control) |
| Hash SHA-256 | Volcado completo, 3 líneas | **Abreviado** + Copiar + desplegable |
| Toques | 38–44px | **48–52px** |
| Texto de lectura | 12,5–13px | **14–15px** |
| Inputs | 14–16px | **16px fijo** (evita el zoom de iOS) |
| Safe area iOS | No contemplada | `env(safe-area-inset-bottom)` + `viewport-fit=cover` |
| Pantallas | 4 | **5** |
| Tests | 16 | **23** |

**Por qué cambió:** se midió la app real a 360/390/412/430px. La landing no desbordaba, pero
tenía 8 objetivos táctiles por debajo de 44px (incluidos "Entrar" y "Crear cuenta", a 38px),
más de 60 textos por debajo de 14px y 5 a 9,5px. El panel planificado heredaba todo eso y
además enterraba su CTA principal al final del scroll. Con el 90% del tráfico llegando desde
teléfonos de 6–7", eso es construir para el usuario equivocado.

---

## 11. Hallazgos previos que este plan ya incorpora

La versión anterior de este plan se auditó ejecutándola completa sobre un clon del proyecto
(30 archivos extraídos del `.md`, `pnpm install` limpio, 16 tests, y las pantallas
ejercitadas en Chromium real contra el backend de verdad). Estos hallazgos siguen vigentes y
**ya están corregidos en el código de la Sección 5** — no hay que descubrirlos otra vez:

| # | Hallazgo | Dónde está la corrección |
|---|---|---|
| **H1** | `formatearPeso` devolvía `"240 MB"` donde debía decir `"240,4 MB"`, y `"18,0 MB"` con decimal vacío. La condición `valor >= 100 ? 0 : 1` mata el decimal en todo el rango de MB, y `minimumFractionDigits` fuerza ceros. **1 de 16 tests fallaba por esto.** | 5.5, con comentario de aviso; cubierto por los tests de 5.29 |
| **H2** | `<a>` anidado dentro de otro `<a>`: el header envolvía `<Logo variant="header">` (que ya es un `<a>`) en un `<Link>`. React lo reportaba como error en consola en todas las pantallas. | 5.8: la marca se dibuja inline, sin `<Logo>`. Regla 7.10 |
| **H3** | 32px de desborde horizontal a 390px por el header (logo + chip + "Salir"). | Resuelto por diseño: el header solo lleva marca + avatar (5.8), y el resto se mudó a `/panel/cuenta` (5.23) |
| **H6** | Un test usaba `getByText(/240,4 MB/)` sobre texto partido en varios nodos y no lo encontraba aunque estuviera. | 5.30 usa `toHaveTextContent` sobre la tarjeta |
| **H7** | `_tokens.scss` es un **parche**, no un archivo completo. Copiar el bloque encima destruye los ~60 tokens del proyecto. | Aviso en rojo en 5.2, y ahora también en 5.1 (`_mixins.scss`, mismo riesgo). Regla 7.5 |

> El hallazgo **H4** de aquella auditoría (`align-items: flex-start` heredado al apilar en
> columna) **ya no aplica**: en mobile-first la columna es el estado base y no hay una fila
> de la que heredar nada. El **H5** tampoco: el `@usuario` ya no se repite en el header.

---

## 12. Auditoría v3 → v4 — hallazgos integrados

**Método.** No fue una relectura. Se **clonó el frontend entero** a un directorio aislado,
`pnpm install` limpio, y los **45 archivos completos se extrajeron automáticamente del propio
`.md`**; los 3 bloques que son parches (`_mixins.scss`, `_tokens.scss`, `index.html`) se
aplicaron a mano, como hará el executor. Después se ejecutó todo: `typecheck`, `lint`, `test`
y `build`, y las 5 pantallas se ejercitaron en **Chromium real a 360px y a 390px** contra el
backend de verdad — registro, sesión, recarga, filtro, navegación entre las 5 rutas, hash
desplegable y logout. El proyecto real no se tocó, y las cuentas de prueba se borraron al
terminar.

**Resultado:** la cadena automática pasó **a la primera** (typecheck, lint sin warnings,
**23/23 tests**, build). De las **25 comprobaciones de navegador, 23 pasaron**. Las 2 que
fallaron eran del mismo check y ambas de accesibilidad táctil.

**Sobre "pipelines configurados"**: siguen sin existir CI, Docker ni repositorio git. Los
pipelines reales son los scripts de `frontend/package.json`. Este plan **no toca**
`.oxlintrc.json`, `tsconfig.*.json`, `vite.config.ts` ni `package.json` — verificado: las
dependencias quedan idénticas. Los 7 tests previos siguen pasando sin modificarlos, y la
landing conserva su comportamiento salvo la redirección deliberada a `/panel`.

| # | Severidad | Hallazgo | Cómo se integró |
|---|---|---|---|
| **H8** | 🟠 Alto | **La marca del header medía 30px de alto.** Es un enlace (lleva a `/panel`), pero la v3 solo le puso área táctil al botón "volver" y al avatar y se olvidó de ella. En un teléfono es un blanco que se falla. Medido en Chromium a 360 y 390px. | `objetivo-tactil(44px)` con padding y margen negativo compensatorio, para que el área crezca sin despegar la marca del borde (5.8) |
| **H9** | 🟠 Alto | **El filtro "Te toca / Esperando" medía 40px, y la regla 7.6 del propio plan exigía 44 como mínimo.** El plan se contradecía a sí mismo: el código de la Sección 5 incumplía una regla escrita dos secciones más abajo. | Subido a 44px (5.13). Y la regla 7.6 se reescribió con **dos umbrales explícitos** —48px en acciones, 44px en navegación y controles— porque la redacción anterior era ambigua y permitía justo esta confusión |

**Verificado además, sin incidencias** (todo lo demás funcionó tal como estaba escrito):

- Los 45 archivos se extraen del `.md` sin ambigüedad; los 3 parches encuentran sus anclas.
- **23/23 tests** a la primera; `typecheck`, `lint` (sin warnings) y `build` en verde.
- **Cero desborde horizontal** en las 4 rutas del panel, **a 360px y a 390px**. Era el
  defecto que hundió a la v2 y aquí no aparece ni una vez.
- **La barra fija cumple su promesa**: el CTA se ve sin deslizar nada más entrar (top=720 a
  360px, top=784 a 390px), y **no tapa el final del contenido** — el pie del detalle termina
  en 680px con la barra empezando en 703px. El `padding-bottom` reservado por `PanelShell`
  funciona.
- **Inputs a 16px o más** (16 / 19 / 16), que es lo que evita el zoom automático de iOS. Los
  tres miden 52px de alto.
- **Botones de acción a 48px** exactos: "Revisar y liberar", "Descargar", "Ver ficha" y
  "Nueva orden de venta".
- **El hash se comporta**: se muestra `a3f97c2e…b3d2c21b` con el `<details>` cerrado, y al
  pulsar "Ver hash completo" aparecen los 64 caracteres.
- **El filtro por turno agrupa bien**: `4821, 4812, 4835` en "te toca" y `4840, 4829` en
  "esperando" — la tabla de turnos por estado es correcta.
- Registro → redirección a `/panel` → estado vacío con el **@usuario real**; F5 no expulsa
  (el caso `isHydrating` funciona); `/` con sesión redirige; `/panel/orden/9999` vuelve a la
  bandeja; el avatar lleva a la cuenta con el correo correcto.
- **Cero errores de JavaScript** en toda la sesión. En particular, ningún `<a>` anidado: la
  decisión de dibujar la marca inline en vez de usar `<Logo>` (H2) resolvió el problema de
  raíz.

---

## Resumen ejecutivo

Cinco pantallas privadas mobile-first con barra de acción fija, routing protegido y datos de
ejemplo; backend aparte.
