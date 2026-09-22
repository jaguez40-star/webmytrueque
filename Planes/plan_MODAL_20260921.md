# Plan MODAL — "Nueva orden" como modal en escritorio, pantalla completa en teléfono

> Plan de ejecución para agente EXECUTOR externo. **Autocontenido**: no requiere contexto
> previo, conversaciones anteriores ni historial de Git. Ejecutar AL PIE DE LA LETRA, en
> orden. Si un paso falla, DETENERSE y reportar.
>
> **Versión 2 (2026-09-21).** Reformulada tras auditar la v1 ejecutándola de verdad:
> copia completa del proyecto, `typecheck` + `lint` + `test` + `build` reales y 39 pruebas
> en Chromium a 360, 390, 430, 767, 768 y 1280 px. Los hallazgos están en §1.8 y ya vienen
> aplicados en el código de la §5.

---

## 1. Contexto del proyecto

### 1.1 Qué se construye

**MyTrueque.shop** es un marketplace P2P de archivos con custodia. El panel privado ya está
construido: bandeja de órdenes (`/panel`), detalle (`/panel/orden/:id`) y creación
(`/panel/nueva`), todo mobile-first.

Hoy **crear una orden te saca del panel**: `/panel/nueva` es una pantalla completa. En
escritorio eso hace perder de vista la bandeja sin necesidad, porque sobra ancho. Este plan
convierte esa pantalla en un **modal sobre el panel — SOLO desde 768px**. En teléfono se
queda **exactamente como está**, a pantalla completa.

### 1.2 🔴 Por qué en teléfono NO se usa modal

Esto no es una preferencia estética: se midió la pantalla real antes de decidir.

| Medición a 390×844 | Valor |
|---|---|
| Alto del documento de `/panel/nueva` | **1337px** (1,58 pantallas: ya requiere scroll) |
| Alto del formulario | 1022px en 3 secciones |
| Alto útil **con el teclado abierto** | **~456px** |
| Posición de los tres inputs | 622px, 808px y 897px desde el inicio |

Con el teclado desplegado hay que desplazar **más de 400px** para llegar al campo del monto.
Dentro de un modal eso arrastra cuatro problemas conocidos:

1. **El teclado tapa el campo.** En iOS, al enfocar un input dentro de un contenedor
   `position: fixed`, el navegador desplaza el contenedor por su cuenta y el campo acaba
   debajo del teclado.
2. **Doble scroll.** El modal scrollea dentro y la página detrás también; al llegar al final
   del modal el gesto "se escapa" al panel de atrás.
3. **El botón atrás de Android.** Hoy `/panel/nueva` es una ruta y atrás vuelve al panel. Un
   modal sin gestión de historial haría que atrás sacara al usuario del panel entero.
4. **Se pierde el enlace.** Una ruta se recarga y se comparte; un modal no.

**Por eso el modal se activa por ancho, no siempre.** Es el mismo patrón de Gmail o Mail de
iOS: escritorio modal, teléfono pantalla completa.

### 1.3 Root del proyecto y estado actual

- **Root absoluto**: `C:\APLICACIONES\Trueque.com`
- **Este plan toca ÚNICAMENTE `frontend/`.** Ni un archivo del backend.
- El root **SÍ es un repositorio git** con remoto (`github.com/jaguez40-star/webmytrueque`).
  **No comitear ni pushear**: el usuario decide cuándo.

```
C:\APLICACIONES\Trueque.com\
├── backend\                  ← NO SE TOCA
└── frontend\
    └── src\
        ├── App.tsx           ← se modifica (routing con ubicación de fondo)
        ├── features\orders\
        │   ├── components\   ← se añade ModalNuevaOrden\
        │   └── pages\        ← se modifican PanelPage y NuevaOrdenPage
        └── shared\
            ├── components\   ← se añade Modal\
            └── hooks\        ← TODO NUEVO (la carpeta no existe)
```

### 1.4 Stack exacto (ya instalado — NO instalar nada)

| Paquete | Versión |
|---|---|
| react / react-dom | ^19.2.8 |
| react-router-dom | ^7.18.3 |
| lucide-react | ^1.39.0 (v1) |
| sass | ^1.103.1 |
| vitest + @testing-library/react | ^4.1.11 / ^16.3.3 |
| @testing-library/user-event | ^14.6.7 |
| oxlint | ^1.79.0 (**no ESLint**) |
| typescript | ~6.0.2 |

> 🔴 **REGLA DURA: no ejecutar `pnpm add`.** Si algo parece faltar, DETENERSE y preguntar.

### 1.5 Estado ACTUAL de los archivos que se tocan

**`src/App.tsx`** (tal como está HOY — se reemplaza en 5.6):

```tsx
import { Route, Routes } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'
import { PanelPage } from '@/features/orders/pages/PanelPage'
import { DetalleOrdenPage } from '@/features/orders/pages/DetalleOrdenPage'
import { NuevaOrdenPage } from '@/features/orders/pages/NuevaOrdenPage'
import { RutaPrivada } from '@/features/auth/components/RutaPrivada'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

export function App() {
  useCurrentUser()

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/panel" element={<RutaPrivada><PanelPage /></RutaPrivada>} />
      <Route path="/panel/nueva" element={<RutaPrivada><NuevaOrdenPage /></RutaPrivada>} />
      <Route path="/panel/orden/:id" element={<RutaPrivada><DetalleOrdenPage /></RutaPrivada>} />
      <Route path="*" element={<MainPage />} />
    </Routes>
  )
}
```
*(El original tiene cada `<Route>` en varias líneas; el contenido es ese.)*

**`src/features/orders/pages/NuevaOrdenPage.tsx`** — hoy envuelve TODO en `PanelShell` y
pone el botón en una `BarraAccion` fija. El Paso 4 lo parte en dos: el formulario suelto y
la página que lo envuelve.

**`src/features/orders/pages/PanelPage.tsx`** — tiene **dos** enlaces a `/panel/nueva`:
- línea ~41: `<Link to="/panel/nueva" className={styles.ctaBarra}>` (barra fija, bandeja con órdenes)
- línea ~113: `<Link to="/panel/nueva" className={styles.botonVender}>` (estado vacío)

**Componentes existentes que se reutilizan sin tocar**: `PanelShell`, `PanelHeader`,
`PanelFooter`, `BarraAccion`, `MenuCuenta`, `GrillaArchivos`, `OrderCard`.

### 1.6 Tokens CSS disponibles — usar SOLO estos

Definidos en `src/styles/_tokens.scss`:

```
Acento:    --c-accent  --c-accent-hover  --c-accent-light  --c-accent-text  --c-accent-mid
           --c-accent-halo
Señal:     --c-signal  --c-signal-hover  --c-on-signal  --c-on-signal-strong
Alerta:    --c-alert
Texto:     --c-ink  --c-text-secondary  --c-text-muted  --c-text-placeholder
Fondos:    --c-bg  --c-bg-alt  --c-surface  --c-surface-accent  --c-tabs-bg
Bordes:    --c-border  --c-border-strong  --c-border-input  --c-border-button
           --c-border-inner  --c-divider  --c-divider-soft
Oscuro:    --c-on-dark  --c-on-dark-secondary  --c-on-dark-border  --c-on-dark-border-strong
Tipos:     --font-sans  --font-mono
Layout:    --content-max  --content-pad  --content-pad-mobile  --pad-movil
           --alto-barra  --safe-bottom
Radios:    --r-button  --r-input  --r-card  --r-card-lg  --r-tile  --r-pill
Sombras:   --sh-auth  --sh-file  --sh-flat  --sh-tab
```

Mixins en `src/styles/_mixins.scss` (`@use '@/styles/mixins' as *;`):
```scss
@include bp-lg / bp-md / bp-sm     // max-width — SOLO para la landing
@include desde-md                   // min-width: 768px  ← el panel usa estos
@include desde-lg                   // min-width: 1024px
@include mono-label($size, $tracking)
@include objetivo-tactil($alto: 48px)
```

> 🔴 **Prohibido escribir colores hex sueltos** en los `.module.scss` nuevos, salvo
> `#ffffff` sobre fondos de acento u oscuros.

### 1.8 Hallazgos de la auditoría de la v1 (ya aplicados)

La v1 se ejecutó entera sobre una copia del proyecto y se probó en Chromium real. Cuatro
cosas no cuadraron. Las cuatro están corregidas en este documento; se listan para que el
executor entienda **por qué** el código dice lo que dice y no lo "simplifique".

| # | Hallazgo | Corrección |
|---|---|---|
| **H1** | 🔴 **Al cerrar, el foco caía en `<body>`.** Medido: tras Escape, `document.activeElement` era `BODY`. Quien navega con teclado se quedaba sin punto de partida. `showModal()` **no** cubre este caso porque el modal no se cierra con `close()`, se desmonta al navegar. Además el propio `MenuCuenta` del proyecto ya devuelve el foco al avatar: la v1 era incoherente con una convención que el codebase ya tenía. | `Modal.tsx` guarda `document.activeElement` antes de abrir y lo re-enfoca en el cleanup. Verificado: el foco vuelve al enlace "Nueva orden de venta". Cubierto por un test. |
| **H2** | `aria-labelledby="titulo-modal"`: id escrito a mano en un componente que el propio plan declara reutilizable. Dos modales montados a la vez ⇒ id duplicado ⇒ nombre accesible roto. | `useId()`. Verificado: `aria-labelledby` apunta al título correcto. |
| **H3** | ❌ **El criterio E6 de la v1 era falso.** Decía que al recargar con el modal abierto "queda la página completa". Lo real: `location.state` vive en la entrada del historial y **sobrevive a la recarga**, así que el modal reaparece sobre el panel. Es el comportamiento correcto, pero un executor siguiendo la tabla habría reportado FALLO sobre algo que funciona. | Criterio E6 reescrito a lo que de verdad ocurre, y añadido E6b (cerrar tras recargar vuelve a `/panel`). |
| **H4** | ⚠️ **El criterio E4 no era verificable.** "El foco no sale del diálogo" da falso negativo: en Chromium el ciclo de tabulación pasa por `<body>` como paso intermedio. Medido: 18 tabulaciones, `<body>` aparece 2 veces, **0 controles fuera del diálogo**. | E4 reescrito: lo que importa es que ningún control *interactivo* de fuera reciba el foco. |

**Medidas de la auditoría** (Chromium, con el plan aplicado):

| Qué | Resultado |
|---|---|
| `typecheck` · `lint` · `build` | los tres en verde, lint sin warnings |
| Tests | 31 → **38 passed** |
| Umbral del modal | 767px → sin modal · 768px → modal de 560px. Exacto |
| Diálogo a 1280×800 | 560×720, pie visible (botón a 744px de 800) |
| Scroll | scrollea el cuerpo, no el diálogo; `body` bloqueado y restaurado |
| Móvil 360 / 390 / 430 | sin modal, sin desborde, inputs 16/19/16px, **0 objetivos táctiles <44px** |
| Encoger a móvil con el modal abierto | pasa a página completa y **restaura el scroll del body** |
| Sin sesión en `/panel/nueva` | redirige a `/`, no monta el modal |
| Errores de consola | **0** en todos los escenarios |

> **Observación fuera de alcance:** `CLAUDE.md` §1 lista Playwright en el stack, pero
> `frontend/package.json` **no lo tiene instalado**. No es problema de esta tarea (aquí se
> usó una instalación aparte, fuera del proyecto), pero conviene reconciliarlo.

---

### 1.7 Decisiones cerradas (NO reabrir)

1. **El modal se activa por ancho: `min-width: 768px`.** Por debajo, navegación normal a
   pantalla completa. Motivo medido en 1.2.
2. **Se usa `<dialog>` nativo con `showModal()`**, no un `<div>` con overlay. El navegador
   aporta gratis y bien hecho: atrapado del foco, cierre con Escape, `::backdrop`, e `inert`
   sobre el resto de la página. Soporte: Chrome 37+, Firefox 98+, Safari 15.4+. Escribir un
   atrapado de foco a mano es una fuente clásica de fallos de accesibilidad.
3. **Routing con "ubicación de fondo"** (el patrón estándar de React Router para modales):
   al navegar se pasa `state={{ background: location }}`. Si ese state existe **y** la
   ventana es ancha, se renderiza el panel con el modal encima; si no, la página completa.
   Así el enlace directo a `/panel/nueva` sigue funcionando y atrás cierra el modal, porque
   es una navegación de verdad.
4. **`useSyncExternalStore` para el media query**, no `useEffect` + `setState`. Es la API de
   React para suscribirse a fuentes externas y además evita el aviso
   `react/set-state-in-effect` de oxlint.
5. **El formulario se extrae a un componente reutilizable.** El mismo marcado sirve para la
   página y para el modal; duplicarlo garantizaría que se desincronicen.
6. **Dentro del modal el botón va en el pie del propio modal**, no en la `BarraAccion` fija
   a la ventana: una barra fija dentro de un modal se saldría del diálogo.
7. **El modal bloquea el scroll del `body`.** `showModal()` hace inerte el resto pero NO
   impide que la página de atrás scrollee.
8. **El modal devuelve el foco al cerrarse.** Tampoco lo cubre `showModal()` aquí, porque
   el diálogo no se cierra con `close()` sino desmontándose al navegar (ver H1 en §1.8).
9. **El formulario sigue siendo maqueta.** No hay endpoint: "Poner en custodia" no envía
   nada. Igual que hasta ahora.

---

## 2. Objetivo de la tarea

Al terminar:

1. En una ventana **≥768px**, pulsar "Subir archivo para vender" o "Nueva orden de venta"
   abre el formulario **en un modal** sobre el panel, que sigue visible detrás.
2. En **<768px**, esos mismos botones navegan a `/panel/nueva` **a pantalla completa**,
   exactamente como hoy.
3. El modal se cierra con la **✕**, con **Escape**, pulsando el **fondo** y con el botón
   **atrás** del navegador.
4. Entrar **directo** a `/panel/nueva` (recarga o enlace pegado) muestra la página completa
   en cualquier ancho.
5. El `body` no scrollea detrás del modal abierto.
6. `pnpm typecheck`, `lint`, `test` (**38 tests**) y `build` en verde.

---

## 3. Prerequisitos

Desde `C:\APLICACIONES\Trueque.com`. Si alguno falla, DETENERSE.

| # | Requisito | Comando | Esperado |
|---|---|---|---|
| 1 | Root correcto | `dir CLAUDE.md` | existe |
| 2 | Tests en verde | `cd frontend && pnpm test` | **31 passed** |
| 3 | Compila | `cd frontend && pnpm build` | exit 0 |
| 4 | Existe el panel | `dir frontend\src\features\orders\pages\NuevaOrdenPage.tsx` | existe |
| 5 | react-router-dom | `cd frontend && pnpm list react-router-dom` | `7.x` |

> Para el Paso 9 hacen falta backend y frontend arriba:
> `cd backend && uv run uvicorn src.main:app --port 8000` (⚠️ siempre desde `backend/`) y
> `cd frontend && pnpm dev`.

---

## 4. Inventario de archivos

Rutas relativas a `C:\APLICACIONES\Trueque.com\frontend\`.

### 4.1 Nuevos (10)

| # | Ruta | Qué es |
|---|---|---|
| 1 | `src/shared/hooks/useMediaQuery.ts` | Media query reactivo con `useSyncExternalStore` |
| 2 | `src/shared/components/Modal/Modal.tsx` | Modal accesible sobre `<dialog>` nativo |
| 3 | `src/shared/components/Modal/Modal.module.scss` | |
| 4 | `src/shared/components/Modal/index.ts` | |
| 5 | `src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.tsx` | Los 3 pasos, sin armazón |
| 6 | `src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.module.scss` | |
| 7 | `src/features/orders/components/FormularioNuevaOrden/index.ts` | |
| 8 | `src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.tsx` | Modal + formulario + pie |
| 9 | `src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.module.scss` | |
| 10 | `src/features/orders/components/ModalNuevaOrden/index.ts` | |

### 4.2 Tests nuevos (2)

| # | Ruta | Tests |
|---|---|---|
| 11 | `src/shared/components/Modal/Modal.test.tsx` | 5 |
| 12 | `src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.test.tsx` | 2 |

### 4.3 Modificados (4)

| # | Ruta | Cambio |
|---|---|---|
| 13 | `src/App.tsx` | **reemplazo completo** — ubicación de fondo |
| 14 | `src/features/orders/pages/NuevaOrdenPage.tsx` | **reemplazo completo** — usa el formulario extraído |
| 15 | `src/features/orders/pages/NuevaOrdenPage.module.scss` | **reemplazo completo** — se queda solo con lo de la página |
| 16 | `src/features/orders/pages/PanelPage.tsx` | 2 ediciones puntuales — los enlaces pasan `state` |

> **Ningún otro archivo se toca.** En particular: `main.tsx`, `PanelShell`, `PanelHeader`,
> `PanelFooter`, `BarraAccion`, `_tokens.scss`, `_mixins.scss`, `package.json`, y **todo el
> backend**.

---

## 5. Especificación por archivo

> Código **literal**: copiar tal cual.

### 5.1 `src/shared/hooks/useMediaQuery.ts` — crear

> ⚠️ La carpeta `src/shared/hooks/` **no existe**: hay que crearla.

```ts
import { useCallback, useSyncExternalStore } from 'react'

/**
 * Media query reactivo.
 *
 * Con `useSyncExternalStore` y no con `useEffect` + `setState` por dos razones: es la API
 * que React expone para suscribirse a fuentes externas (sin parpadeo entre el primer
 * render y el efecto), y evita el aviso `react/set-state-in-effect` de oxlint.
 *
 * El tercer argumento devuelve el valor del servidor: aquí `false`, porque sin ventana no
 * hay ancho que consultar.
 */
export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (alCambiar: () => void) => {
      if (typeof window === 'undefined') return () => {}
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', alCambiar)
      return () => lista.removeEventListener('change', alCambiar)
    },
    [consulta],
  )

  const leer = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(consulta).matches
  }, [consulta])

  return useSyncExternalStore(suscribir, leer, () => false)
}

/**
 * El umbral del panel para pasar a modal: el mismo 768px del mixin `desde-md`, para que
 * el comportamiento y los estilos cambien a la vez.
 */
export function useEsPantallaAncha(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
```

### 5.2 `Modal` — crear los 3 archivos

**`src/shared/components/Modal/Modal.tsx`**

```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.scss'

interface ModalProps {
  /** Texto del encabezado; también da nombre accesible al diálogo. */
  titulo: string
  /** Frase corta bajo el título. Opcional. */
  subtitulo?: string
  children: ReactNode
  /** Pie fijo del modal (botones de acción). Opcional. */
  pie?: ReactNode
  onCerrar: () => void
}

/**
 * Modal accesible construido sobre el `<dialog>` nativo.
 *
 * 🔴 Se usa `showModal()` y no un `<div>` con overlay a propósito: el navegador aporta el
 * atrapado del foco, el cierre con Escape, el `::backdrop` y deja inerte el resto de la
 * página. Escribir un focus trap a mano es una de las fuentes más habituales de fallos de
 * accesibilidad, y aquí no hace falta.
 *
 * Lo que `showModal()` NO hace, y por eso está resuelto aquí: bloquear el scroll de la
 * página de detrás, y devolver el foco al cerrar.
 */
export function Modal({ titulo, subtitulo, children, pie, onCerrar }: ModalProps) {
  const dialogoRef = useRef<HTMLDialogElement>(null)
  // Un id por instancia. El `<dialog>` toma su nombre accesible de aquí, y un id escrito a
  // mano colisionaría en cuanto hubiera dos modales montados a la vez.
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = dialogoRef.current
    if (!dialogo) return

    // Quién tenía el foco antes de abrir, para devolvérselo al cerrar. El navegador lo hace
    // solo cuando el diálogo se cierra con `close()`, pero aquí se cierra desmontándose al
    // navegar, así que el foco acabaría en `<body>` y quien use teclado tendría que
    // retabular desde el principio de la página.
    const previo = document.activeElement as HTMLElement | null

    // `showModal` falla si ya está abierto (p. ej. tras un re-render en StrictMode).
    if (!dialogo.open) dialogo.showModal()

    const desbordeOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = desbordeOriginal
      if (dialogo.open) dialogo.close()
      // `document.contains` porque el disparador pudo desmontarse mientras tanto.
      if (previo && document.contains(previo)) previo.focus()
    }
  }, [])

  // Escape dispara "cancel": se intercepta para que el cierre pase siempre por onCerrar
  // (que además navega hacia atrás) en vez de dejar el diálogo cerrado y la ruta abierta.
  function alCancelar(evento: React.SyntheticEvent<HTMLDialogElement>) {
    evento.preventDefault()
    onCerrar()
  }

  // Pulsar el fondo: el click cae sobre el propio <dialog>, no sobre su contenido.
  function alPulsar(evento: React.MouseEvent<HTMLDialogElement>) {
    if (evento.target === dialogoRef.current) onCerrar()
  }

  return (
    <dialog
      ref={dialogoRef}
      className={styles.dialogo}
      onCancel={alCancelar}
      onClick={alPulsar}
      aria-labelledby={idTitulo}
    >
      <div className={styles.panel}>
        <div className={styles.cabecera}>
          <div className={styles.textos}>
            <h2 className={styles.titulo} id={idTitulo}>
              {titulo}
            </h2>
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          <button
            type="button"
            className={styles.cerrar}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.cuerpo}>{children}</div>

        {pie && <div className={styles.pie}>{pie}</div>}
      </div>
    </dialog>
  )
}
```

**`src/shared/components/Modal/Modal.module.scss`**

```scss
@use '@/styles/mixins' as *;

// El <dialog> es el contenedor centrado; el fondo oscuro lo pinta ::backdrop.
.dialogo {
  width: min(560px, calc(100vw - 48px));
  max-height: calc(100vh - 80px);
  padding: 0;
  border: none;
  border-radius: var(--r-card-lg);
  background: var(--c-bg);
  box-shadow: var(--sh-auth);
  overflow: hidden;

  &::backdrop {
    background: rgb(22 16 32 / 0.55);
  }
}

// Columna con cabecera y pie fijos y el cuerpo scrolleable en medio.
.panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 80px);
}

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 22px 16px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
}

.textos {
  min-width: 0;
}

.titulo {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--c-ink);
}

.subtitulo {
  font-size: 14px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  margin-top: 5px;
}

.cerrar {
  @include objetivo-tactil(44px);
  min-width: 44px;
  flex: none;
  margin: -8px -8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--r-button);
  cursor: pointer;

  &:hover {
    color: var(--c-ink);
    background: var(--c-bg);
  }
}

// El único que scrollea: la cabecera y el pie quedan siempre a la vista.
.cuerpo {
  flex-grow: 1;
  overflow-y: auto;
  padding: 18px 22px;
}

.pie {
  flex: none;
  padding: 16px 22px;
  background: var(--c-surface);
  border-top: 1px solid var(--c-border);
}
```

**`src/shared/components/Modal/index.ts`**

```ts
export { Modal } from './Modal'
```

### 5.3 `FormularioNuevaOrden` — crear los 3 archivos

> Es el contenido que hoy vive dentro de `NuevaOrdenPage`, extraído tal cual para que lo
> compartan la página y el modal.

**`src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.tsx`**

```tsx
import { Banknote, Check, Info, Upload } from 'lucide-react'
import styles from './FormularioNuevaOrden.module.scss'

/**
 * Los tres pasos de crear una orden, sin armazón alrededor.
 *
 * Vive aparte de la página porque el mismo marcado se usa en dos sitios: a pantalla
 * completa en teléfono y dentro de un modal en escritorio. Duplicarlo sería garantizar que
 * los dos se desincronicen a la primera corrección de copy.
 *
 * ⚠️ MAQUETA FUNCIONAL: los campos son reales y editables, pero no hay endpoint al cual
 * enviarlos. El botón de envío vive fuera (lo pone quien lo use) y tampoco envía nada.
 */
export function FormularioNuevaOrden() {
  return (
    <>
      {/* ── Paso 1 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>1</span>
          <h3 className={styles.pasoTitulo}>El archivo</h3>
        </div>

        <div className={styles.zonaSubida}>
          <span className={styles.zonaIcono}>
            <Upload size={21} aria-hidden="true" />
          </span>
          <p className={styles.zonaTitulo}>Elige el archivo a vender</p>
          <p className={styles.zonaTexto}>Hasta 5 GB. Se cifra al subirlo.</p>
          <button type="button" className={styles.zonaBoton}>
            Buscar archivo
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
    </>
  )
}
```

**`src/features/orders/components/FormularioNuevaOrden/FormularioNuevaOrden.module.scss`**

```scss
@use '@/styles/mixins' as *;

.paso {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px;

  & + & {
    margin-top: 14px;
  }
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

  @include desde-md {
    width: auto;
    padding: 0 24px;
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
  // 🔴 16px NO ES NEGOCIABLE: por debajo, iOS hace zoom automático al enfocar el campo y
  // deja la pantalla descuadrada.
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
```

**`src/features/orders/components/FormularioNuevaOrden/index.ts`**

```ts
export { FormularioNuevaOrden } from './FormularioNuevaOrden'
```

### 5.4 `ModalNuevaOrden` — crear los 3 archivos

**`src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Modal } from '@/shared/components/Modal'
import { FormularioNuevaOrden } from '../FormularioNuevaOrden'
import styles from './ModalNuevaOrden.module.scss'

/**
 * El formulario de nueva orden dentro de un modal, para pantallas anchas.
 *
 * Al cerrar hace `navigate(-1)` en vez de ocultar un estado local: la ruta /panel/nueva
 * está realmente activa (por eso el botón atrás del navegador también lo cierra), así que
 * cerrar es exactamente volver atrás. Si se ocultara sin navegar, la URL quedaría mintiendo.
 */
export function ModalNuevaOrden() {
  const navigate = useNavigate()

  return (
    <Modal
      titulo="Vender un archivo"
      subtitulo="Tres datos y queda en custodia. El comprador lo verá en su panel."
      onCerrar={() => navigate(-1)}
      pie={
        <div className={styles.pie}>
          <p className={styles.nota}>
            Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
            los 30 días si no cierra
          </p>
          <button type="button" className={styles.botonCrear}>
            <Lock size={18} aria-hidden="true" />
            Poner en custodia
          </button>
        </div>
      }
    >
      <FormularioNuevaOrden />
    </Modal>
  )
}
```

**`src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.module.scss`**

```scss
@use '@/styles/mixins' as *;

.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.nota {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--c-text-secondary);
  max-width: 260px;
}

.notaEstado {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--c-ink);
  font-weight: 500;
}

.botonCrear {
  @include objetivo-tactil(52px);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 22px;
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

**`src/features/orders/components/ModalNuevaOrden/index.ts`**

```ts
export { ModalNuevaOrden } from './ModalNuevaOrden'
```

### 5.5 `src/features/orders/pages/NuevaOrdenPage.tsx` — reemplazar el contenido completo

```tsx
import { Lock } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { FormularioNuevaOrden } from '../components/FormularioNuevaOrden'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Nueva orden a pantalla completa.
 *
 * Es lo que se ve en teléfono siempre, y en cualquier ancho al entrar directo por URL
 * (recarga o enlace pegado), porque entonces no hay panel debajo sobre el que superponer
 * nada. En escritorio, navegando desde el panel, se usa ModalNuevaOrden.
 */
export function NuevaOrdenPage() {
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

      <div className={styles.formulario}>
        <FormularioNuevaOrden />
      </div>
    </PanelShell>
  )
}
```

### 5.6 `src/features/orders/pages/NuevaOrdenPage.module.scss` — reemplazar el contenido completo

> Todo lo del formulario se fue a `FormularioNuevaOrden.module.scss`. Aquí queda solo lo que
> es propio de la página.

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

.formulario {
  margin-top: 14px;
}

/* ── Barra fija ── */

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

### 5.7 `src/App.tsx` — reemplazar el contenido completo

```tsx
import { Route, Routes, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'
import { PanelPage } from '@/features/orders/pages/PanelPage'
import { DetalleOrdenPage } from '@/features/orders/pages/DetalleOrdenPage'
import { NuevaOrdenPage } from '@/features/orders/pages/NuevaOrdenPage'
import { ModalNuevaOrden } from '@/features/orders/components/ModalNuevaOrden'
import { RutaPrivada } from '@/features/auth/components/RutaPrivada'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useEsPantallaAncha } from '@/shared/hooks/useMediaQuery'

/** Lo que PanelPage guarda en `state` al abrir la creación desde el panel. */
interface EstadoConFondo {
  background?: Location
}

export function App() {
  // La hidratación de la sesión vive aquí y no dentro de una pantalla concreta: si alguien
  // entra directo a /panel, la landing nunca se monta y GET /auth/me jamás se dispararía,
  // dejando al usuario fuera de su propio panel pese a tener cookie válida.
  useCurrentUser()

  const location = useLocation()
  const esAncha = useEsPantallaAncha()

  // "Ubicación de fondo": al navegar desde el panel se guarda de dónde se venía. Si existe
  // Y la ventana da de sí, las rutas se resuelven contra ESA ubicación —así el panel sigue
  // montado detrás— y el modal se pinta encima.
  //
  // En teléfono se ignora a propósito: el formulario mide 1337px y con el teclado abierto
  // quedan ~450px útiles, así que dentro de un modal el campo del monto acaba tapado. Ahí
  // se navega de verdad, a pantalla completa.
  const estado = location.state as EstadoConFondo | null
  const fondo = esAncha ? estado?.background : undefined

  return (
    <>
      <Routes location={fondo ?? location}>
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
          path="/panel/orden/:id"
          element={
            <RutaPrivada>
              <DetalleOrdenPage />
            </RutaPrivada>
          }
        />
        <Route path="*" element={<MainPage />} />
      </Routes>

      {fondo && (
        <Routes>
          <Route
            path="/panel/nueva"
            element={
              <RutaPrivada>
                <ModalNuevaOrden />
              </RutaPrivada>
            }
          />
        </Routes>
      )}
    </>
  )
}
```

### 5.8 `src/features/orders/pages/PanelPage.tsx` — dos ediciones puntuales

🔴 **NO reemplazar el archivo.** Esta sección es la única de la §5 cuyos bloques de código
son **fragmentos a buscar y sustituir**, no el contenido de un archivo. Escribir estos
bloques encima de `PanelPage.tsx` lo destruye. Son tres cambios pequeños sobre el archivo
existente.

**(a)** En la zona de imports, la línea:

```tsx
import { Link } from 'react-router-dom'
```

se reemplaza por:

```tsx
import { Link, useLocation } from 'react-router-dom'
```

**(b)** Dentro de `export function PanelPage()`, localizar:

```tsx
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  const [turno, setTurno] = useState<Turno>('mio')
```

y reemplazar por:

```tsx
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  const [turno, setTurno] = useState<Turno>('mio')
  // Se pasa como `state` al navegar a /panel/nueva: le dice a App sobre qué pantalla
  // superponer el modal en escritorio. En teléfono se ignora y la navegación es normal.
  const location = useLocation()
```

**(c)** Los **dos** enlaces a `/panel/nueva` ganan el `state`. Localizar:

```tsx
          <Link to="/panel/nueva" className={styles.ctaBarra}>
```
y reemplazar por:
```tsx
          <Link to="/panel/nueva" state={{ background: location }} className={styles.ctaBarra}>
```

Y localizar:

```tsx
      <Link to="/panel/nueva" className={styles.botonVender}>
```
y reemplazar por:
```tsx
      <Link to="/panel/nueva" state={{ background: location }} className={styles.botonVender}>
```

> ⚠️ El segundo está dentro de `EstadoVacio`, que **no** tiene acceso a `location`. Hay que
> pasárselo. Localizar la firma:
> ```tsx
> function EstadoVacio({ handle }: { handle: string }) {
> ```
> y reemplazarla por:
> ```tsx
> function EstadoVacio({ handle, location }: { handle: string; location: Location }) {
> ```
> Añadir a los imports de `react-router-dom` el tipo:
> ```tsx
> import type { Location } from 'react-router-dom'
> ```
> Y en la llamada, localizar:
> ```tsx
>         <EstadoVacio handle={user?.handle ?? ''} />
> ```
> reemplazar por:
> ```tsx
>         <EstadoVacio handle={user?.handle ?? ''} location={location} />
> ```

### 5.9 `src/shared/components/Modal/Modal.test.tsx` — crear

```tsx
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

// jsdom no implementa showModal/close del <dialog>: se rellenan a mano para poder montar
// el componente. Lo que se prueba aquí es el comportamiento propio, no el del navegador.
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

function montar(onCerrar = vi.fn()) {
  render(
    <Modal titulo="Vender un archivo" subtitulo="Tres datos" onCerrar={onCerrar} pie={<button type="button">Guardar</button>}>
      <p>Contenido del formulario</p>
    </Modal>,
  )
  return onCerrar
}

describe('Modal', () => {
  it('muestra título, subtítulo, contenido y pie', () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Vender un archivo' })).toBeInTheDocument()
    expect(screen.getByText('Tres datos')).toBeInTheDocument()
    expect(screen.getByText('Contenido del formulario')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('el diálogo toma su nombre accesible del título', () => {
    montar()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Vender un archivo')
  })

  it('la ✕ avisa de que hay que cerrar', async () => {
    const user = userEvent.setup()
    const onCerrar = montar()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('al cerrarse devuelve el foco a quien lo abrió', () => {
    // Sin esto el foco cae en <body> y quien navega con teclado tiene que retabular desde
    // el principio. El navegador solo lo hace cuando el diálogo se cierra con close(); este
    // se cierra desmontándose al navegar.
    const disparador = document.createElement('button')
    disparador.textContent = 'Abrir'
    document.body.appendChild(disparador)
    disparador.focus()
    expect(document.activeElement).toBe(disparador)

    const { unmount } = render(
      <Modal titulo="X" onCerrar={vi.fn()}>
        <p>hola</p>
      </Modal>,
    )
    unmount()

    expect(document.activeElement).toBe(disparador)
    disparador.remove()
  })

  it('bloquea el scroll del body mientras está abierto y lo restaura al cerrarse', () => {
    const { unmount } = render(
      <Modal titulo="X" onCerrar={vi.fn()}>
        <p>hola</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
```

### 5.10 `src/features/orders/components/ModalNuevaOrden/ModalNuevaOrden.test.tsx` — crear

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

    expect(screen.getByRole('heading', { name: 'Vender un archivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'El archivo' })).toBeInTheDocument()
    expect(screen.getByLabelText('@usuario del comprador')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto en COP')).toBeInTheDocument()
  })

  it('los inputs van a 16px, para que iOS no haga zoom al enfocarlos', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })
    // La clase compartida es la que fija el tamaño; basta comprobar que la llevan.
    expect(screen.getByLabelText('@usuario del comprador').className).toContain('campo')
    expect(screen.getByLabelText('Dónde te paga').className).toContain('campo')
  })
})
```

---

## 6. Orden de ejecución

Reportar cada paso como `✅ Paso N — OK` o `❌ Paso N — FALLO: razón`. Detenerse al primer fallo.

### Paso 1 — Prerequisitos
Correr los 5 checks de la Sección 3.

### Paso 2 — Hook de media query
1. Crear la carpeta `src/shared/hooks/` (no existe).
2. Crear `src/shared/hooks/useMediaQuery.ts` (5.1).

### Paso 3 — Modal genérico
Crear los 3 archivos de `src/shared/components/Modal/` (5.2).

### Paso 4 — Extraer el formulario
1. Crear los 3 archivos de `FormularioNuevaOrden` (5.3).
2. Reemplazar `NuevaOrdenPage.tsx` (5.5).
3. Reemplazar `NuevaOrdenPage.module.scss` (5.6).

Verificar: `pnpm typecheck` en verde. La pantalla debe seguir igual que antes — este paso
solo mueve código.

### Paso 5 — Modal de nueva orden
Crear los 3 archivos de `ModalNuevaOrden` (5.4).

### Paso 6 — Cablear el routing
1. Reemplazar `src/App.tsx` (5.7).
2. Aplicar las tres ediciones de `PanelPage.tsx` (5.8).

### Paso 7 — Compilación intermedia
```bash
pnpm typecheck
```
Exit 0. **Si falla aquí, DETENERSE.**

### Paso 8 — Tests
1. Crear `Modal.test.tsx` (5.9).
2. Crear `ModalNuevaOrden.test.tsx` (5.10).
3. `pnpm test` → **38 passed** (31 existentes + 7 nuevos).

### Paso 9 — Calidad
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Los 4 en verde, `pnpm lint` **sin warnings**.

### Paso 10 — Verificación en navegador
Levantar backend y frontend, y comprobar la tabla M1–M6 y E1–E6 de la Sección 8.

> Probar **a 390px y a 1280px**: el comportamiento es distinto a propósito y hay que ver
> los dos.

### Paso 11 — Reportar
Detener los procesos. **No comitear ni pushear.** Reportar archivos tocados y los checks.

---

## 7. Reglas no negociables

1. **No instalar dependencias.** Ni `pnpm add`, ni tocar `package.json`.
2. **No tocar el backend.** Ni un archivo bajo `backend\`.
3. **No comitear ni pushear.** El repositorio tiene remoto; el usuario decide cuándo subir.
4. **No tocar** `main.tsx`, `PanelShell`, `PanelHeader`, `PanelFooter`, `BarraAccion`,
   `MenuCuenta`, `_tokens.scss`, `_mixins.scss`, `vite.config.ts` ni `tsconfig.*.json`.
5. **El modal NO se activa por debajo de 768px.** Es el punto entero de este plan; si se
   activa siempre, el formulario queda inservible con el teclado abierto (medido en 1.2).
6. **Se usa `<dialog>` nativo con `showModal()`.** No sustituirlo por un `<div>` con
   overlay ni escribir un atrapado de foco a mano.
7. **`useSyncExternalStore` para el media query**, no `useEffect` + `setState`: oxlint marca
   `react/set-state-in-effect` y el objetivo es lint sin avisos.
8. **Los `<input>` llevan `font-size: 16px` como mínimo.** Por debajo, iOS hace zoom
   automático al enfocar.
9. **Mobile-first en los `.module.scss` nuevos**: base sin media query, y lo de escritorio
   dentro de `@include desde-md` / `desde-lg`. **Prohibido `bp-lg` / `bp-md` / `bp-sm`** en
   archivos nuevos: esos son de la landing.
10. **Ningún objetivo táctil por debajo de 44px**; 48px en botones de acción.
11. **Cero colores hex sueltos** en los `.module.scss` nuevos, salvo `#ffffff` sobre fondos
    de acento u oscuros, y el `rgb(22 16 32 / 0.55)` del `::backdrop`, que necesita alfa.
12. **El formulario sigue sin enviar nada.** No inventar endpoints ni lógica de guardado.
13. **No inventar copy nuevo.** Los textos son los que ya existen, movidos de sitio.
14. Si algo no está especificado, **preguntar antes de decidir**.

---

## 8. Validaciones post-ejecución

### Automáticas (desde `frontend/`)

| # | Check | Comando | Esperado |
|---|---|---|---|
| F1 | Typecheck | `pnpm typecheck` | exit 0 |
| F2 | Lint | `pnpm lint` | exit 0, sin warnings |
| F3 | Tests | `pnpm test` | **38 passed** |
| F4 | Build | `pnpm build` | exit 0 |
| F5 | Sin dependencias nuevas | comparar `package.json` con 1.4 | idéntico |

### 🔴 Móvil — a 390px (DevTools → device toolbar)

| # | Check | Cómo | Esperado |
|---|---|---|---|
| M1 | Sigue a pantalla completa | En `/panel`, pulsar "Subir archivo para vender" | Navega a `/panel/nueva`, **sin modal**: se ve la cabecera "< Órdenes" y el footer |
| M2 | La barra fija sigue ahí | En `/panel/nueva` | "Poner en custodia" fijo abajo, con su nota encima |
| M3 | Volver funciona | Pulsar "< Órdenes" | Vuelve a `/panel` |
| M4 | Sin desborde | `/panel/nueva` | Cero scroll horizontal |
| M5 | Inputs a 16px | Enfocar "Monto en COP" | La pantalla **no** hace zoom |
| M6 | Nada tapado | Bajar hasta el fondo | El footer se ve completo, no lo tapa la barra |

### 🖥️ Escritorio — a 1280px

| # | Check | Cómo | Esperado |
|---|---|---|---|
| E1 | Abre como modal | En `/panel`, pulsar "Nueva orden de venta" | Se abre un diálogo centrado **con el panel visible detrás**; la URL pasa a `/panel/nueva` |
| E2 | Cierra de cuatro formas | ✕ · Escape · clic en el fondo · botón atrás | Las cuatro cierran y devuelven a `/panel` |
| E3 | El fondo no scrollea | Con el modal abierto, rueda del ratón | La página de detrás **no se mueve** |
| E4 | Foco atrapado | Con el modal abierto, pulsar Tab ~18 veces | **Ningún control de fuera del diálogo** recibe el foco. ⚠️ Que el foco pase por `<body>` entre vuelta y vuelta es normal en Chromium y **no es un fallo** |
| E4b | Foco devuelto | Abrir el modal con Enter desde "Nueva orden de venta" y cerrarlo con Escape | El foco **vuelve a ese mismo enlace**, no a `<body>` |
| E5 | Enlace directo | Escribir `localhost:5173/panel/nueva` y Enter | **Página completa**, no modal (no hay panel debajo sobre el que superponer) |
| E6 | Recargar con el modal abierto | Abrir el modal y pulsar F5 | **El modal sigue abierto** sobre el panel. Es lo correcto: el `state` vive en la entrada del historial y sobrevive a la recarga |
| E6b | Cerrar tras recargar | Después de E6, pulsar ✕ | Vuelve a `/panel` y el modal desaparece |
| E7 | Umbral exacto | Abrir el modal a 767px de ancho, y luego a 768px | 767 → navega a pantalla completa · 768 → modal. Justo ahí |
| E8 | Encoger con el modal abierto | Con el modal abierto, bajar la ventana a 390px | Pasa a página completa y el `body` **vuelve a scrollear** (sin overflow bloqueado) |
| E9 | Estado vacío | Sin órdenes, pulsar "Subir archivo para vender" | También abre el modal |
| E10 | Sin sesión | Cerrar sesión y entrar a `/panel/nueva` | Redirige fuera; **no** monta el modal |

### Consola

| # | Check | Esperado |
|---|---|---|
| C1 | Sin errores | Cero errores de JavaScript durante M1–E6. En particular, ningún aviso de `<dialog>` ni de `showModal` |

---

## 9. Fuera de alcance

1. **Que el formulario envíe algo.** Sigue siendo maqueta: no hay backend de órdenes.
2. **Convertir en modal el detalle de la orden** (`/panel/orden/:id`). Ese lleva más
   contenido y merece su propia decisión.
3. **Animaciones de entrada y salida** del modal.
4. **Modal en teléfono.** Es justo lo que este plan descarta, con medidas (1.2).
5. **Subida real de archivos, cifrado, hash o cálculo de peso.**
6. **Reutilizar el Modal en los diálogos de confirmación** de "Liberar el archivo" o
   "Reportar un problema" — el componente queda listo para ello, pero esas pantallas no se
   tocan aquí.
7. **`git commit` y `git push`.**

---

## Resumen ejecutivo

El formulario de nueva orden se abre en modal desde 768px y a pantalla completa en teléfono,
donde el teclado lo haría inservible.
