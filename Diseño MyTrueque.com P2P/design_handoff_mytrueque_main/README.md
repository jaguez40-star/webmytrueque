# Handoff: MyTrueque.com — Página principal (Main / Landing + Auth)

## Overview
Página principal pública de **MyTrueque.com**: marketplace de compraventa de archivos entre dos personas (vendedor y comprador) con **custodia (escrow) del archivo** en el servidor y **pago fuera de la plataforma**. La página explica el modelo de forma gráfica y contiene el acceso: **login** y **creación de cuenta** en un panel con pestañas.

Secciones, en orden:
1. Header fijo (logo, nav, Entrar / Crear cuenta, menú hamburguesa en móvil)
2. Hero: badge + titular + párrafo + 3 beneficios · panel de autenticación (Entrar / Crear cuenta)
3. "Cómo funciona": pipeline de 6 estados + módulo "Una orden, dos personas" + franja de la ruta del dinero
4. "La inspección": copy + ficha técnica del archivo con demo interactiva (bloqueado ↔ liberado)
5. "Garantías": 4 tarjetas + nota legal
6. "Preguntas" (bloque oscuro): CTA + 4 preguntas frecuentes
7. Footer

## About the Design Files
Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran el aspecto y el comportamiento buscados, **no código de producción para copiar y pegar**. La tarea es **recrear estos diseños en el entorno del proyecto** (React 19 + TypeScript + Vite, según el stack definido más abajo), usando sus patrones y librerías establecidas.

Notas específicas de los archivos:
- `MyTrueque Main v5.dc.html` es la fuente de verdad (versión aprobada).
- El HTML usa **estilos inline** por requisitos de la herramienta de diseño. En la implementación real se espera **Sass (módulos .scss)** según el stack.
- `image-slot.js` es un componente de la herramienta de diseño para arrastrar imágenes. **No se implementa**: en producción son `<img>` normales con las fotos reales de los usuarios (avatares).
- Las fotos de `i.pravatar.cc` son placeholders de demo.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, estados e interacciones son definitivos. Recrear la UI fielmente con las librerías del codebase.

## Stack objetivo (definido por el cliente)
| Componente | Versión | Uso |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5.x | Tipado estricto |
| Vite | latest | Bundler / dev server |
| TanStack Query | v5 | Estado de servidor |
| Zustand | 5 | Estado global cliente |
| react-hook-form | 7.74 | Formularios |
| zod | 4.3 | Validación de schemas |
| react-router-dom | latest | Routing SPA |
| Sass | latest | Estilos |
| Lucide React | latest | Iconografía tree-shakeable |
| openapi-typescript + openapi-fetch | latest | Tipos auto + cliente HTTP tipado |
| Vitest + RTL | latest | Tests unitarios |
| Playwright | latest | Tests E2E |
| pnpm | latest | Package manager + workspaces |

Sugerencia de implementación: ruta `/` con `react-router-dom`; el panel de auth como componente `<AuthPanel />` con `react-hook-form` + `zod`; los iconos geométricos del pipeline pueden sustituirse por **Lucide** (equivalencias más abajo).

## Modelo de negocio que la página comunica (imprescindible para el copy)
- Relación **1 a 1**: el vendedor comparte un archivo con **un** comprador identificado por su **@usuario**, asignado por el sistema al registrarse (ej. `@trq-9k2f`). Si el handle se escribe mal, la orden no se crea y no se comparte nada.
- El **archivo** sí pasa por los servidores (custodia cifrada) **solo mientras la orden vive**; al confirmarse la descarga se **purga**. Órdenes sin cerrar se purgan a los 30 días.
- El **dinero nunca** pasa por la plataforma: transferencia directa comprador → vendedor.
- Regla de tiempo: con comprobante cargado, si el vendedor no libera en **24 h**, la plataforma habilita la descarga (aparece en Garantías y FAQ).
- Estados de la orden: `EN CUSTODIA` → `EN INSPECCIÓN` → `PAGO ENVIADO` → `LIBERADO` → `DESCARGADO` → `PURGADO`.

## Design Tokens

### Colores
| Rol | Valor | Uso |
|---|---|---|
| Acento (violeta) | `oklch(0.50 0.16 300)` ≈ `#6D3BC4` | CTA, enlaces, iconos, chips activos, línea de flujo |
| Acento hover | `oklch(0.43 0.16 300)` | hover de botones primarios |
| Acento claro | `oklch(0.65 0.18 300)` | bordes/marca sobre fondo oscuro |
| Acento texto | `oklch(0.42 0.16 300)` | texto violeta sobre claro (contraste AA) |
| Señal (lima) | `oklch(0.85 0.16 120)` ≈ `#C2E34F` | SOLO éxito: chip DESCARGADO, sello VERIFICABLE, CTA del bloque oscuro, badge de reputación |
| Texto sobre lima | `#29380a` | |
| Tinta | `#161020` | texto principal, bloques oscuros, footer |
| Texto secundario | `#58526b` | párrafos |
| Texto mudo | `#6f6885` | etiquetas mono (mínimo legible ~5.4:1) |
| Divisor mudo | `#b6afc9` / `#cec7e2` / `#d6d1e2` | líneas, tachados |
| Fondo página | `#f5f4f9` | |
| Fondo alterno | `#faf9fd` | bandas de sección, inputs |
| Superficie | `#ffffff` | tarjetas |
| Borde | `#e6e3ee` / `#dcd7ea` / `#f0eef7` (interno) | |
| Fondo violeta suave | `#f5f2fc` / `#f7f4fd` | chips y cajas de acento |
| Sobre oscuro: texto | `#f3f0f8`, secundario `#a9a2bd`, borde `#2b2440` / `#3b3350` | |
| Alerta (tachado) | `oklch(0.58 0.20 25)` | única línea roja: tacha "MYTRUEQUE" en la ruta del dinero |

### Tipografía
- Titulares y UI: **Instrument Sans** (Google Fonts, 400/500/600/700)
- Datos, etiquetas y estados: **IBM Plex Mono** (400/500), casi siempre en MAYÚSCULAS con `letter-spacing` 0.06–0.09em
- Escala: H1 60px / line-height 1.02 / `letter-spacing -0.035em` / 700 · H2 sección 38px / -0.03em / 700 · H2 bloque oscuro 34px · H3 tarjeta 17px/600 · H3 paso 14.5px/600 · body hero 19px/1.55 · body 16.5px/1.6 · body pequeño 14.5px/1.55 · caption 13px/1.5 · mono etiqueta 10–11.5px
- `text-wrap: pretty` en titulares y párrafos largos

### Espaciado y formas
- Ancho de contenido: **1180px** máx., padding lateral 32px (18px en móvil)
- Padding de sección: 76px arriba / 84px abajo (44/48 en móvil); hero 84/72 (40/44)
- Radios: botón/input 8–10px · tarjeta 14–16px · tarjeta grande 18–20px · tile de icono 16px · chip/pill 999px
- Sombras: tarjeta de auth `0 1px 2px rgba(22,16,32,.04), 0 22px 44px -28px rgba(22,16,32,.28)`; ficha `0 1px 2px rgba(22,16,32,.04), 0 26px 52px -34px rgba(22,16,32,.32)`; tarjeta plana `0 1px 2px rgba(22,16,32,.03)`
- Header: `position: sticky; top: 0`, fondo `rgba(245,244,249,0.88)` + `backdrop-filter: blur(10px)`, borde inferior `#e6e3ee`

## Screens / Views

### 1. Header (sticky)
- Barra: max 1180px, padding 18px 32px, flex, gap 40px.
- **Logo destacado**: placa 44×44px, radio 12px, fondo `#161020`, con dos barras de 8×22px `skewX(-18deg)` radio 2px — la izquierda `oklch(0.65 0.18 300)`, la derecha `oklch(0.85 0.16 120)`, gap 3px. Al lado, wordmark "MyTrueque" 25px/700/-0.035em en `#161020` y sufijo ".com" 15px/500 en `#8b84a3`. Enlaza a `#top`.
- Nav (4 enlaces, 14.5px, `#58526b`, hover violeta): Cómo funciona · Inspección · Garantías · Preguntas → anclas `#como-funciona`, `#inspeccion`, `#garantias`, `#preguntas`.
- Botones: "Entrar" (borde `#d6d1e2`, fondo blanco, hover borde violeta) y "Crear cuenta" (violeta sólido, texto blanco, 600). Ambos `white-space: nowrap`. Al pulsarlos se selecciona la pestaña correspondiente del panel de auth (y se cierra el menú móvil).
- **Hamburguesa** (solo ≤1130px): 42×42px, borde `#d6d1e2`, radio 10px, tres barras de 17×2px (la tercera violeta). Abre/cierra un panel desplegable bajo la barra con los 4 enlaces apilados (padding 13px 4px, 15.5px/500, divisor `#f0eef7`); al pulsar un enlace se cierra.

### 2. Hero (`#top`)
- Grid 2 columnas `1.08fr 0.92fr`, gap 72px, `align-items: start`.
- **Badge**: pill blanco, borde `#dcd7ea`, mono 11.5px mayúsculas, color `oklch(0.42 0.16 300)`, punto lima de 8px. Texto: "Transacción protegida de punta a punta".
- **H1**: "Comprar y vender archivos, con las dos partes protegidas."
- **Párrafo** (máx 500px): "El vendedor sube el archivo a custodia y comparte su ficha técnica: extensión, peso, metadata y hash. Tú verificas todo, pagas por fuera —el dinero nunca pasa por aquí— y descargas cuando él libera. Al descargarse, el archivo se borra de nuestros servidores."
- **3 beneficios**: viñeta = barra 7×16px `skewX(-18deg)` (violeta en los dos primeros, lima en el tercero) + texto 15.5px con la primera frase en 600 y el resto en `#58526b`:
  1. "Transacción segura para ambos." / "Vendedor y comprador quedan cubiertos por las mismas reglas."
  2. "El archivo se purga al descargarse." / "Solo permanece en el sistema durante la transacción: más privacidad para quien vende."
  3. "Recibes lo que negociaste." / "El comprador verifica la ficha y el hash antes de pagar y al descargar."
- **Panel de auth (`#acceso`)**: tarjeta blanca, borde `#e6e3ee`, radio 16px, padding 30px, sombra de auth.
  - Selector de pestañas: contenedor `#f2f0f8`, radio 10px, padding 4px; pestaña activa = fondo blanco, 600, texto `oklch(0.42 0.16 300)`, sombra `0 1px 3px rgba(22,16,32,.12)`; inactiva = transparente, 500, `#6f6885`. Transición `background .15s, color .15s`.
  - **Entrar**: H2 21px/600 "Bienvenido de vuelta" + sub 14px `#6f6885` "Entra para ver tus órdenes, liberaciones y descargas." Campos: Correo (email, placeholder `tu@correo.com`), Contraseña (password, placeholder `••••••••`) con enlace "¿La olvidaste?" a la derecha de la etiqueta. Botón violeta full-width 13px/15px/600 "Entrar". Pie: "¿Primera vez aquí? **Crea tu cuenta**" (cambia de pestaña).
  - **Crear cuenta**: H2 "Crea tu cuenta" + sub "Al registrarte recibes tu @usuario: es lo único que compartes para comprar o vender." Campos: Nombre (`Ana Ríos`), Correo, Contraseña (`Mínimo 8 caracteres`), checkbox de términos + reglas de custodia (accent-color violeta). Botón "Crear cuenta". Pie: "¿Ya tienes cuenta? **Entrar**".
  - Inputs: borde `#ddd8e9`, radio 9px, padding 11px 13px, 15px, fondo `#faf9fd`; focus = borde violeta + `box-shadow 0 0 0 3px oklch(0.50 0.16 300 / .12)`; etiquetas 12.5px/500 `#58526b`; placeholder `#8b84a3`.

### 3. Cómo funciona (`#como-funciona`, fondo `#faf9fd`)
- Cabecera: eyebrow mono violeta "CÓMO FUNCIONA"; H2 "Seis estados. El último es el borrado."; a la derecha, mono `#6f6885` "ORDEN #4821".
- **Tarjeta blanca** (radio 18px, padding 44px 34px 38px) que contiene:
  - **Pipeline**: grid de 6 columnas, gap 10px. Detrás, dos líneas horizontales a `top: 31px`: de 8% a 75% `1.5px dashed #cec7e2` y de 75% a 92% `1.5px dotted #cec7e2` (la parte punteada marca el tramo de purga).
  - Cada columna: **tile de icono 62×62px, radio 16px** (centrado) → chip de estado (mono 10px, pill) → número mono 10.5px → título 14.5px/600 → caption 12.5px/1.45. Todo centrado.
  - Tiles y contenido, en orden (equivalencia Lucide sugerida entre paréntesis):
    1. `#f5f2fc` borde `#dcd7ea`; flecha arriba + barra violeta (`UploadCloud`) · chip "EN CUSTODIA" (violeta sobre `#f5f2fc`) · 01 "Sube y comparte" · "Elige el @usuario del comprador."
    2. Fondo violeta sólido con **anillo pulsante** (`@keyframes pulseRing`: scale 1→2.1, opacity .5→0, 2.6s infinito); lupa blanca (`Search`) · chip "EN INSPECCIÓN" (violeta sólido, texto blanco) · 02 "Inspecciona" · "Extensión, peso, metadata y hash."
    3. Blanco borde `#dcd7ea`; "$" mono 24px violeta (`Banknote`) · chip "PAGO ENVIADO" (`#faf9fd`) · 03 "Paga por fuera" · "Directo al vendedor, fuera de la app."
    4. Blanco; barra vertical `#cec7e2` + chevron violeta (`LockOpen`) · chip "LIBERADO" · 04 "Libera" · "Recibido el pago, habilita la descarga."
    5. **Lima sólido**; flecha abajo + barra `#29380a` (`Download`) · chip "DESCARGADO" (lima, texto `#29380a`) · 05 "Descarga" · "Se comprueba el hash al terminar."
    6. `#f5f4f9` borde `1.5px dashed #cec7e2`; círculo 22px `2.5px dashed #b6afc9` (`Trash2` / `CircleDashed`) · chip "PURGADO" (borde discontinuo) · 06 "Purga" · "El archivo se borra. Sin copias."
  - **Módulo "Una orden, dos personas"** (separado por `border-top: 1px solid #f0eef7`, margen 36px, padding-top 30px):
    - Cabecera: mono violeta "UNA ORDEN, DOS PERSONAS" · mono `#6f6885` "CIFRADO · SHA-256".
    - Grid `1fr auto 1fr`, gap 20px, `align-items: stretch`:
      - **Tarjeta vendedor** (borde `#e6e3ee`, radio 16px, fondo `#faf9fd`, flex): foto 148px de ancho a sangre a la izquierda; a la derecha: mono 9.5px violeta "VENDEDOR", nombre 17px/600 "Carlos M.", handle mono 11px `#6f6885` `@trq-9k2f` (`nowrap`), chip lima "42 ÓRDENES" + "100% liberadas" 12px, y caption "Sube sus archivos y libera al recibir el pago."
      - **Bloque custodia** (168px, fondo `#161020`, radio 16px, centrado): **logo pequeño en la esquina superior izquierda** (barras 3.5×10px + wordmark 9.5px/700 `#f3f0f8`, opacidad .85); mono lima "CUSTODIA"; **candado** = tile 72×60px violeta radio 14px con anillo pulsante, arco 14×8px (borde 2.5px blanco, sin borde inferior, radio 7px 7px 0 0) sobre cuerpo 23×17px (borde 2.5px blanco, radio 3px); tres cuadrados de 8px (lima / violeta claro / `#3b3350`); caption 12px `#a9a2bd` "Se borra al descargarse".
      - **Tarjeta comprador**: espejo (texto a la izquierda alineado a la derecha, foto 148px a la derecha): "COMPRADOR", "Ana R.", `@trq-4f7k`, "cuenta verificada" + chip violeta claro "17 COMPRAS", caption "Inspecciona la ficha, paga y descarga."
    - **Franja del dinero**: caja `#faf9fd`, borde `1px dashed #dcd7ea`, radio 14px, padding 16px 20px: badge "MYTRUEQUE" (borde discontinuo, mono 10px `#b6afc9`, con las dos barras del logo en gris) **tachado con una línea roja** `oklch(0.58 0.20 25)` de 2px rotada -8°; a su lado: "El pago va de Ana a Carlos, cuenta a cuenta. **Nunca pasa por la plataforma.**"
- Animación opcional: `@keyframes flowDot` (left 0→100%, fade in/out) para paquetes en tránsito.

### 4. La inspección (`#inspeccion`)
- Grid `0.82fr 1.18fr`, gap 64px, centrado vertical.
- Izquierda: eyebrow "LA INSPECCIÓN"; H2 "Todo sobre el archivo. Menos el archivo."; párrafo 16.5px; **botón de demo** (borde violeta, fondo blanco, texto `oklch(0.42 0.16 300)`, 600, hover invertido) con texto "Simular: el vendedor libera la descarga" / "Volver al estado bloqueado"; debajo mono "DEMO INTERACTIVA".
- Derecha: **ficha del archivo** (tarjeta blanca, radio 18px, sombra de ficha):
  - Cabecera `#faf9fd`: tile 34×34px violeta radio 9px con "PSD" mono 10px blanco; nombre `catalogo-otoño-master.psd` 14.5px/600; línea mono 11px `#6f6885`: "ORDEN #4821 · @trq-9k2f → @trq-4f7k" (los handles en violeta, `nowrap`); a la derecha, **chip de estado dinámico**: "EN INSPECCIÓN" (violeta sólido/blanco) o "LIBERADO" (lima/`#29380a`).
  - Rejilla de metadata 2×3 (gap 1px sobre `#f0eef7`, celdas blancas, padding 18px 24px): etiqueta mono 10.5px `#6f6885` + valor 15px/500. Pares: EXTENSIÓN ".psd · Adobe Photoshop" · TAMAÑO "1.84 GB (1 976 445 184 bytes)" · DIMENSIONES "5 906 × 8 268 px · 300 dpi" · CAPAS "148 · CMYK · sin aplanar" · EN CUSTODIA DESDE "28 ago 2026, 14:02" · PRECIO ACORDADO "$ 420 000 COP" (violeta, 600).
  - Bloque hash `#faf9fd`: "HASH SELLADO AL SUBIR · SHA-256" + chip lima "VERIFICABLE"; valor mono 12px con `word-break: break-all`: `9f2c4ab1e7d80355c6ae19f4b23d70e8a1c5fd6207bb94e3812a0cf7d45b6e91`.
  - Zona de acción, dos estados:
    - **Bloqueado**: botón full-width deshabilitado, borde discontinuo `#d6d1e2`, fondo `#f5f4f9`, texto `#6f6885`, `cursor: not-allowed`: "Descarga bloqueada · esperando liberación del vendedor" + nota "Puedes verificar todos los datos y el hash. El archivo está en custodia cifrada: ni el vendedor puede retirarlo ni tú descargarlo aún."
    - **Liberado**: botón violeta 600 "Descargar ahora · 1.84 GB" + nota "El vendedor liberó la orden. Al confirmarse la descarga se comprueba el hash y el archivo se purga de la custodia."

### 5. Garantías (`#garantias`, fondo `#faf9fd`)
- Eyebrow "GARANTÍAS"; H2 "Custodia mientras dura el trato. Nada después."; párrafo (máx 640px).
- 4 tarjetas blancas (radio 16px, padding 24px, gap 20px): eyebrow mono violeta + H3 17px/600 + texto 14px:
  1. "01 · INTEGRIDAD" — **Hash sellado** — "Se registra al subir y se comprueba al descargar. Nadie cobra por un archivo y entrega otro."
  2. "02 · ENTREGA" — **Liberación por tiempo** — "Con comprobante cargado, si el vendedor no libera en 24 h la plataforma habilita la descarga por él."
  3. "03 · PRIVACIDAD" — **Purga al descargar** — "Confirmada la descarga, el archivo se borra. Órdenes sin cerrar se purgan a los 30 días."
  4. "04 · REPUTACIÓN" — **Historial público** — "Órdenes pagadas y no liberadas quedan visibles en el perfil del vendedor, con su tiempo de respuesta."
- Nota: tarjeta blanca con badge lima "SÉ CLARO" + texto: "MyTrueque custodia el archivo, no el dinero: no podemos devolver un pago hecho por fuera. Usa siempre un medio con comprobante y sube el soporte a la orden — es lo que activa la liberación automática a tu favor."

### 6. Preguntas (`#preguntas`, fondo `#161020`)
- Grid 2 columnas, gap 72px, centrado.
- Izquierda: H2 34px "Sube tu primer archivo hoy."; párrafo `#a9a2bd`; botones: **lima** (texto `#1d2a0a`, 700) "Crear cuenta" y contorno `#3b3350` "Ya tengo cuenta".
- Derecha: 4 preguntas (H3 15.5px/600 + respuesta 14.5px `#a9a2bd`):
  1. ¿Ustedes pueden abrir mi archivo? — "No. Se cifra en el equipo del vendedor antes de subirse; guardamos el contenido cifrado, no la llave."
  2. ¿Quién puede ver el archivo compartido? — "Solo el @usuario que el vendedor indicó al crear la orden. No hay enlaces públicos: si el handle está mal escrito, la orden no se crea y no se comparte nada."
  3. ¿Y si pago y el vendedor no libera? — "Con el comprobante cargado, a las 24 h la plataforma habilita la descarga a tu favor."
  4. ¿Cuánto tiempo guardan el archivo? — "Hasta que se descargue: ahí se purga. Si la orden no se cierra, se borra a los 30 días."

### 7. Footer
- Fondo `#161020`, borde superior `#2b2440`, padding 26px 32px, flex space-between, 13px: logo pequeño (barras 6×15px + "MyTrueque.com" `#f3f0f8`/600) y mono 11.5px `#8b84a3` "© 2026 · CUSTODIA CIFRADA · PURGA AL DESCARGAR".

## Interactions & Behavior
- **Pestañas de auth**: estado local `tab: 'login' | 'register'`. Los botones del header, los enlaces de pie del panel y los CTA del bloque oscuro cambian la pestaña y hacen scroll/foco al panel (`#acceso`).
- **Demo de la ficha**: estado local `released: boolean`. Alterna chip, botón y nota. Solo demo de landing.
- **Menú móvil**: `menuOpen: boolean`; se cierra al pulsar un enlace y al abrir Entrar/Crear cuenta.
- **Hover**: botones primarios oscurecen el violeta; secundarios cambian el borde a violeta; enlaces pasan a `oklch(0.42 0.16 300)`; nav a violeta.
- **Animaciones**: `pulseRing` (2.6–2.8s, ease-out, infinito) en el tile de inspección y en el candado; `flowDot` (3.2s lineal) opcional para paquetes. Respetar `prefers-reduced-motion` en la implementación (no está en el prototipo).
- **Validación esperada (zod)**: correo válido; contraseña ≥8 caracteres; nombre obligatorio; checkbox de términos obligatorio en registro. Estados de error no diseñados: usar el patrón de error del codebase (sugerido: borde `oklch(0.58 0.20 25)` + mensaje 12.5px del mismo color bajo el campo).
- **Estados de carga**: no diseñados. Sugerencia: botón con spinner y `disabled` reutilizando el estilo deshabilitado de la ficha.
- **Responsive** (móvil es el dispositivo principal):
  - ≤1130px: H1 42px; nav oculto y hamburguesa visible; botones del header `nowrap`.
  - ≤880px: header padding 14px 18px; hero a 1 columna (panel de auth debajo), padding 40px 18px 44px; H1 36px; H2 27px; secciones padding 44px 18px 48px; inspección a 1 columna; pipeline a 2 columnas y **líneas de flujo ocultas**; módulo de personas a 1 columna con tarjetas apiladas (foto arriba, 190px de alto) y la tarjeta del comprador alineada a la izquierda; metadata de la ficha a 1 columna; garantías a 1 columna; FAQ a 1 columna; footer en columna.
  - ≤560px: H1 31px; pipeline a 1 columna.
  - Objetivos táctiles: mínimo 44px (hamburguesa 42px → subir a 44px en producción).

## State Management
- **Local (componente)**: `tab`, `released` (demo), `menuOpen`.
- **Zustand**: sesión del usuario (`user`, `@handle`, token) tras login/registro.
- **TanStack Query + openapi-fetch**: mutaciones `POST /auth/login` y `POST /auth/register` (contratos reales por definir con el backend); la respuesta de registro debe devolver el **@usuario asignado** para mostrarlo al usuario.
- **react-hook-form + zod**: ambos formularios; `mode: 'onBlur'`.
- La landing no requiere fetch de datos: la ficha y los perfiles son contenido de marketing estático.

## Assets
- **Fuentes**: Google Fonts — Instrument Sans (400/500/600/700) e IBM Plex Mono (400/500).
- **Iconos**: en el prototipo son formas CSS (sin SVG). En producción usar **Lucide React** con las equivalencias indicadas en el pipeline y el candado (`Lock` / `LockOpen`).
- **Fotos de personas**: placeholders de `i.pravatar.cc/480?img=12` y `?img=45`. Sustituir por avatares reales o imágenes propias con licencia. Las dimensiones de diseño son 148px de ancho (columna) y 190px de alto en móvil.
- **Logo**: no hay archivo. Se construye con dos barras `skewX(-18deg)` (violeta + lima) sobre placa oscura opcional; entregar como SVG en la implementación. Favicon sugerido: la placa 44×44 con las dos barras.

## Files
- `MyTrueque Main v5.dc.html` — **diseño aprobado** (fuente de verdad).
- `MyTrueque Main v4.dc.html` — misma estructura en blanco y negro, antes de la identidad.
- `MyTrueque Logo.dc.html` — cuatro direcciones de identidad exploradas; la elegida es **1d (violeta + lima)**.
- `MyTrueque Rutas.dc.html` — tres variantes del módulo "dos personas"; la elegida es **1b (perfiles enfrentados con reputación)**.
- `image-slot.js` — utilidad de la herramienta de diseño para los placeholders de foto; **no se implementa**.
