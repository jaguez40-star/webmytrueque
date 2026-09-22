# CLAUDE.md — Robustez V2.0 (FastAPI + React 19)

> Memoria de proyecto para Claude Code. Punto de entrada para retomar contexto sin tener que releer todo.
> **Codebase nuevo** (no es refactor de V01) — vertical slicing por features, alineado con `Plan_Migracion_Robustez_V06.docx` v0.6.

---

## 0. Idioma de comunicación

**⚠️ OBLIGATORIO:** Toda la comunicación con Claude Code debe ser **100% en español**. Sin excepciones:
- Mensajes del usuario → español
- Respuestas de Claude Code → español
- Comentarios en código → español (documentación, TODOs, ADRs)
- Commits → español (`feat(W1.4): crear robustez_v02_auth.db con DDL v0.2`)
- Nombres de ramas → español si es posible, en su defecto snake_case inglés

> Si Claude Code usa inglés, el usuario debe interrumpir y recordarle esta directriz explícitamente.

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

## 0.2 Directiva obligatoria del Planner — auditoría previa antes de escribir

🔴 **ANTES de escribir cualquier plan (`plan:`) Claude Code debe ejecutar internamente los pasos 1-3 del flujo profesional §15** (Mapeo + Auditoría + Diagnóstico). NO entregar nunca un plan "v1 improvisado" para luego mejorarlo en "v2" cuando el usuario detecte fallos.

### Razón de esta directiva

Lecciones aprendidas en F4.8 y F5.0 (2026-05-23): Claude Code entregó planes improvisados sin auditar el código real. El usuario tuvo que pedir explícitamente "aplica el flujo profesional" para que la auditoría se hiciera. Resultado: 13 hallazgos en F4.8 v2 y 25 hallazgos en F5.0 v2 que **debieron descubrirse antes** de entregar el plan al usuario. Eso traslada la carga de validar la calidad del plan al usuario — inaceptable.

### Compromiso obligatorio

El plan que se entrega al usuario debe ser ya equivalente a un **v2 auditado**. Si la auditoría revela algo bloqueante (decisión D1-D14 afectada, riesgo crítico), avisar ANTES de escribir el plan completo.

### Checklist mínimo antes de escribir un plan

Si la tarea cumple ≥1 de estos criterios, los pasos 1-3 son obligatorios:
- Toca >3 archivos.
- Introduce primitivos, hooks, utils o servicios nuevos.
- Modifica archivos compartidos (`router.tsx`, `LayoutMain`, stores, `vite.config`, `package.json`).
- Implica imports cross-feature o cambios de routing.
- Cambia el contrato entre Interceptor 1 (Pydantic) e Interceptor 2 (mappers).

Acciones mínimas obligatorias antes de escribir:

1. **Grep del patrón de archivos similares ya existentes.** Ej.: si vas a crear un primitivo, leer `ls primitives/Button/` para confirmar la convención (incluye `.test.tsx`, `index.ts`, etc.).
2. **Read del archivo a modificar** completo, no de memoria.
3. **Verificación de paths `@use` SCSS** contra archivos vecinos a la misma profundidad.
4. **Lectura de configs relevantes** (`vitest.config.ts`, `vite.config.ts`, `package.json`, `_tokens.scss`, `.npmrc`).
5. **Cruzar contra deuda técnica §17** (DT-9, DT-10, DT-11, DT-13, DT-14, DT-15, DT-16, DT-17 — comprobar si la tarea las activa).
6. **Cruzar contra reglas duras §17.5 R1/R2/R3** (no tocar `.npmrc`, no acoplar selección al `data` de Plotly, no declarar "completado" sin validación humana).

### Qué hacer si la auditoría revela un bloqueante

- Decisión D1-D14 afectada → detener y escalar al usuario antes de seguir.
- DT-13 activa (la tarea requiere `pnpm install`) → escalar; no proponer instalación.
- Patrón del proyecto contradice una intención del plan → ajustar el plan al patrón, no inventar uno nuevo.

### Anti-patrones explícitamente prohibidos

- ❌ Entregar un plan v1 "rápido" sabiendo que falta auditar.
- ❌ Asumir paths, convenciones o configs "de memoria".
- ❌ Decir "esto probablemente funciona, lo confirma el typecheck" — confirmar antes de escribir, no después.
- ❌ Esperar a que el usuario pida "aplica el flujo profesional" — ya está aplicado por defecto.
- ❌ Justificar incoherencias con "el v2 las arreglará" — el v1 no debe existir.

---

## 0.3 Modo Planner para ejecución externa

Cuando el usuario escriba `plan:` al inicio de su mensaje, Claude Code actúa exclusivamente como **Planner**. NO ejecuta código. Solo genera un archivo `.md` en `Planes/` con la especificación completa para que un **agente externo sin acceso al repositorio ni contexto previo** pueda ejecutarlo al pie de la letra.

### Reglas del Planner

1. **Solo genera el plan, nunca ejecuta.** Cero archivos creados fuera de `Planes/`. Cero comandos bash. Cero ediciones a código. Solo el `.md`.
2. **El plan debe ser 100% autocontenido.** El agente executor NO tiene acceso a conversaciones previas, historial de Git, ni memoria de decisiones anteriores.
3. **Rutas absolutas siempre.** Nunca "el archivo del layout". Siempre `robustez_v02_frontend/src/shared/components/primitives/Button/Button.tsx`.
4. **Código de referencia obligatorio.** Si el plan pide crear un archivo, incluir el código completo.
5. **Contexto del proyecto inline.** Stack, estructura de carpetas relevante, convenciones, variables de entorno.
6. **Dependencias explícitas.** Qué debe existir antes + check de verificación ejecutable.
7. **Criterios de aceptación verificables** — tabla con comando y resultado esperado.
8. **Decisiones cerradas.** El executor no decide nada — solo implementa.
9. **Secciones obligatorias:** Contexto → Objetivo → Prerequisitos → Inventario archivos → Especificación → Orden ejecución → Reglas no negociables → Validaciones → Fuera de alcance.
10. **Naming:** `Planes/plan_[ID_TAREA]_[fecha].md`
11. **Modo A:** Mostrar ruta + resumen 5 líneas → esperar "¿Aprobado?"

> Especificación canónica completa: [`Migracion/instruccion_planner_claude_code.md`](./Migracion/instruccion_planner_claude_code.md)

### Prompt estándar para el executor

```
Eres un agente EXECUTOR. Lee completo el plan indicado y ejecútalo AL PIE DE LA LETRA.
Reglas: CERO modificaciones. Orden secuencial. Si falla, DETENTE. Reporta: ✅/❌ Paso N.
Al final: archivos tocados + "¿Hago commit?"
```

---

## 0.4 Modo Backup (`backup:`)

Cuando el usuario escriba `backup:` al inicio del mensaje, Claude Code ejecuta `pnpm backup` → `scripts/backup.ps1`. Único modo: full siempre (Tier 1 + Tier 2, ~350 MB).

- **Destino fijo:** `E:\APLICACIONES\Robustez\back_robustez_2.0` (se crea automáticamente).
- **Naming:** `backup_robustez_v02_{YYYYMMDD_HHMM}.zip`.
- **Retención:** indefinida — cleanup manual cuando haga falta.
- **Script:** [`scripts/backup.ps1`](./scripts/backup.ps1) (PowerShell puro, sin dependencias).

### Qué se respalda

**Tier 1 — Irrecuperables:**
- `robustez_v02_backend/.env` (SECRET_KEY único)
- `.claude/settings.local.json` (allowlist personal)
- BD SQLite: `robustez_v02_auth.db` (+ WAL/SHM) y `bitacora.db`
- `data/wells_attributes_duplicados.csv` (análisis intermedio)
- Carpetas: `Planes/`, `docs/claude/`, `Migracion/` (sin `Plantilla base/`)
- **Código untracked en `src/`, tests, scripts** (filtrado por extensión)
- `CLAUDE.md.bak_*`, `Start_*.bat`, `Gota.png`

**Tier 2 — Caros de regenerar:**
- `data/seeds/*.csv` (~215 MB)
- `data/robustez_v02.db` (~127 MB)

**Brechas conocidas (cubrir aparte si se necesita recovery total):**
- Código **tracked en git** — no hay git remote configurado, la historia vive solo en `.git/` local. Considerar configurar remote (Azure DevOps / GitHub privado) o `git bundle create repo.bundle --all`.
- **PostgreSQL schema `ops`** — la BD operacional real → `pg_dump -n ops robustez_v02 > ops_YYYYMMDD.sql`.
- `node_modules/`, `.venv/`, caches, `dist/` (regenerables con `pnpm setup`).

Cada .zip incluye `BACKUP_MANIFEST.md` en su raíz con: lista de archivos, `git HEAD`, branch y receta de restauración.

---

## 1. Descripción general

**Cliente:** Ecopetrol S.A.
**Proyecto:** WebApp Robustez V2.0 — migración de V01 (Flask + Vanilla JS, `../Des_Robustez/`) a stack moderno preservando paridad funcional y numérica.

**V01 sigue operativa** (`:5096` Des / `:5002` Prod). V2.0 en paralelo `:8000` (back) / `:5173` (front).

### Qué hace la aplicación
Plataforma de analítica operacional para producción de hidrocarburos:
- Dashboard de KPIs (Qo, Qw, Qg) por pozo, campo, activo
- Análisis EBITDA en múltiples variantes (KUSD, USD/Bl, Real, Tasa, Activos, A+I)
- Priorización económica de pozos, predicción/regresiones, reportes Excel
- Login LDAP corporativo + RBAC granular por campo y sección

**Roles:** Admin (acceso total) | Limitado (ej. Orinoquia: solo campos asignados al grupo)

---

## 2. Stack tecnológico

### Backend (`robustez_v02_backend/`)

| Componente | Versión | Uso |
|------------|---------|-----|
| Python | 3.12+ | Lenguaje |
| FastAPI | latest | Framework + OpenAPI auto |
| SQLAlchemy | 2.0+ | ORM |
| Alembic | latest | Migraciones BD |
| Pydantic | 2.x | Validación + Interceptor 1 (alias) |
| ldap3 | 2.9+ | Auth AD `red.ecopetrol.com.co` |
| structlog | latest | Logs JSON UTC |
| itsdangerous | 2.x | Cookie firmada de sesión |
| uv | latest | Package manager |
| Ruff + Black + mypy | latest | Lint + format + type check |

### Frontend (`robustez_v02_frontend/`)

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

## 3. Estructura del monorepo

```
Des_robustez_2.0/
├── CLAUDE.md
├── MIGRA.bat · DEPLOY.bat             ← empaquetar / desplegar sin errores de ruta (ver §11.5)
├── Planes/                            ← planes de ejecución para agente EXECUTOR
├── Migracion/                         ← documentos fuente (plan, DDL, Gantts)
├── .agents/skills/
│   └── emil-design-eng/SKILL.md       ← skill instalado (Emil Kowalski — UI polish + animation)
├── docs/
│   ├── decisions/                     ← ADRs del proyecto
│   └── claude/                        ← bd_operacional_v10, design_system, bitacora_guia, flujo_6_pasos
│
├── robustez_v02_backend/
│   ├── src/
│   │   ├── main.py
│   │   ├── core/                      config, logger, secrets, exceptions
│   │   ├── features/
│   │   │   ├── auth/                  api, services, repositories, models, schemas ✅
│   │   │   ├── permissions/           PermissionService + 4 tablas RBAC ✅
│   │   │   ├── audit/                 auth_events instrumentada ✅
│   │   │   ├── filters/               GET /hierarchy/{level} + /periods/years + /periods/months/{year} ✅
│   │   │   ├── kpis_financieros/      api + services + schemas + waterfall_service + waterfall_schemas ✅
│   │   │   ├── kpis_costos/           api + services + schemas + services_costos_fijos + services_costos_gastos + schemas_costos_fijos + schemas_costos_gastos ✅
│   │   │   ├── kpis_produccion/       api + services + schemas ✅ (🔴 valores inflados — DT-18)
│   │   │   ├── ebitda_rank/           api + services + schemas + report_service (9 reportes Excel: 4 del waffle + Redistribuido/V02/V03/V04/V05) ✅
│   │   │   │                          `_optimizar_mes_v03(rows, *, orden)` — bucle EBITDA compartido por V03/V04 (`orden="ebitda"`, default) y V05 (`orden="ebitda_cfg"`)
│   │   │   │                          `_optimizar_mes_v03_bl(rows, *, orden)` — bucle EBITDA/Bl: `orden="ebitda_bl"` (default, V03/V04) | `"efecto_bl"` ((EBITDA+CF+Gasto)/barriles)
│   │                          `_elegir_mejor_bl` — capa determinista del V05: corre los 2 métodos y elige por EBITDA KUSD (log structlog, la hoja no lo muestra)
│   │   │   │                          `comparacion_service.py` + `comparacion_schemas.py` — GET /comparacion-modelos: corre 5 bucles por campo sobre la línea base del V05 (2026-08-19) ✅
│   │   │   │                          `_optimizar_mes_v05_agua` — hoja RDT-EBITDA-Bl del V05: ventana de 2 peores /Bl → apaga el de más agua, parada en KUSD (2026-08-19)
│   │   │   ├── regression/            api + services + schemas (classify_well integrado) ✅
│   │   │   ├── detalle_ingresos/      api + services + schemas (GET /ingresos-combo — 4 series mensuales con DISTINCT ON UWI) ✅
│   │   │   ├── kpis_delta/            api + services + schemas (GET /kpis-delta/ — Δ BRENT, Δ DIF OIL, Δ PRODUCCIÓN, Δ TRM con spark+start+end) ✅
│   │   │   ├── kpis_mercado/          api + services + schemas (KPIs públicos Brent/WTI/TRM/Ecopetrol pre-login) ✅
│   │   │   ├── kpis_operacionales/    api + services + schemas (KPIs públicos QO/QW/EBITDA para login) ✅
│   │   │   ├── reports/               (S7+)
│   │   │   └── prediction/            (S7+)
│   │   ├── shared/                    db, utils, well_condition.py (classify_well + resolve_columns + build_condition_select_columns) ✅
│   │   └── middleware/                correlation_id, auth, request_logger
│   ├── alembic/versions/              0001_initial_auth.py
│   ├── tests/
│   │   ├── unit/                      352 tests ✅ (test_reporte_periodo.py — 29: _filtrar_fc_mes_final + conversión a Bl + layout 31 col + 5 de _ajustar_pozos_sin_crudo + 6 de _aplicar_descuento_costos_fijos (V05) · test_redistribuido_v03.py — 34: bucle V03/V04 + encabezado + _texto_delta + 3 del parámetro `orden` del V05 + 1 de que `_fc_v04_comunes` lea `qo_mes_final`/`qw_mes_final` en vez de promediar el período)
│   │   └── integration/               3 tests (incluye test_login_real.py vs LDAP) ✅
│   ├── scripts/                       log_bitacora.py, check_all_ids.py, poblar_postgres.py (🔴 bloqueado) · restaurar_ops_dump.py (aplica un dump de pg_dump sin psql, vía psycopg2 + copy_expert, en una sola transacción) · RRDC.py (parchea un report_service.py YA desplegado sin git ni migra: --verificar/--aplicar/--revertir, idempotente, respaldo + py_compile previo) · ajuste_Q.py (mismo patrón que RRDC.py — corrige el caudal de Prod. Aceite/Agua en las hojas RDT-EBITDA/RDT-EBITDA-Bl del V04/V05 para que lean `qo_mes_final`/`qw_mes_final` en vez de promediar el período; aplicado en productivo 2026-08-13)
│   └── data/                          robustez_v02_auth.db (8t, 1745 filas) · robustez_v02.db · bitacora.db
│
└── robustez_v02_frontend/
    ├── src/
    │   ├── app/
    │   │   ├── router.tsx · providers.tsx
    │   │   ├── layouts/               LayoutMain.tsx + .module.scss (Header + DrawerStrip + Footer + ResolutionGuard)
    │   │   └── store/
    │   │       ├── filtersStore.ts    jerarquía draft/applied ✅
    │   │       ├── periodoStore.ts    período draft/applied + _isInitialized ✅
    │   │       └── wellConfigStore.ts well config draft/applied + countDraftFromDefault ✅
    │   ├── features/
    │   │   ├── auth/                  LoginPage · useCurrentUser · authStore · ProtectedRoute · SessionExpiryBanner ✅
    │   │   │                          InactivitySessionModal · useIdleTimer · useInactivityLogout · useSessionTimeoutMinutes · sessionTimeoutService (modal por inactividad REAL de usuario, 2026-08-11) ✅
    │   │   │                          useCinematicLogin · AuthSteps · SubmitButton · Curtain · MainPreview (transición cinematográfica login→Main tras autenticar, 2026-08-18) ✅ ⏳
    │   │   ├── home/                  HomePage · Carousel ✅
    │   │   ├── filters/
    │   │   │   ├── schemas/           wellConfigSchema.ts (Zod, 4 uniones tipadas) ✅
    │   │   │   ├── services/          periodoService.ts · filtersService.ts (fetchPeriodYears/Months + hierarchy con params EBITDA) ✅
    │   │   │   ├── utils/             periodoRange.ts (yearsInRange, validateRangeAgainstBD…) ✅
    │   │   │   ├── hooks/             useHierarchyFilters.ts · usePeriodoFilters.ts ✅
    │   │   │   └── applied-filters/   AppliedFiltersPanel + MobileAppliedFiltersSheet + hooks + types ✅
    │   │   ├── ebitda_costos/
    │   │   │   ├── pages/             EbitdaCostosPage ✅
    │   │   │   ├── components/        EbitdaInspectorCard · InspectorHeader · InspectorSidebar · WaterfallChart ✅
    │   │   │   ├── hooks/             useEbitdaKpis · useKpiQoQw · useEbitdaWaterfallData ✅
    │   │   │   ├── mappers/           ebitdaKpiMapper · ebitdaWaterfallMapper ✅
    │   │   │   ├── services/          ebitdaKpiService · kpiProductionService · ebitdaWaterfallService ✅
    │   │   │   ├── utils/             formatInspectorValue ✅
    │   │   │   └── types/             waterfall.ts ✅
    │   │   ├── ebitda_rank/
    │   │   │   ├── pages/             EbitdaRankPage (layout 2-panel inline expand desktop · modal mobile) ✅
    │   │   │   ├── components/        TendenciaEbitdaChart (+ `zoneShapes.ts` — bandas por cruce por cero interpolado, con 17 tests) · RangeSlider · KpiStrip · KpiCard · CardHeader · WellConditionMap · ChartModal · CollapsedTab ✅
    │   │   │   │                      CurvasWaffle/ (CurvasWaffle · WaffleTile · curvesDef · useVisibleCurves — trío por criterio + paleta) ✅
    │   │   │   │                      CondicionPozosModal/ (acordeón por pozo · tabla mensual con QO/QW + ACUMULADO) ✅
    │   │   │   │                      ReporteWaffle/ (4 tiles: Resumen · Excel · Periodo+End · Periodo End V02) · ResumenModal · MapaCoberturaModal ✅
    │   │   │   │                      DescuentoCfModal/ (slider 0-100 con 1 decimal — pide el % del reporte V05 antes de descargar) ✅
    │   │   │   ├── hooks/             useEbitdaRankData(criterio) · useEbitdaKpis · useWellConditionData · useCondicionPozos ✅
    │   │   │   ├── mappers/           ebitdaRankMapper · ebitdaKpiMapper · wellConditionMapper ✅
    │   │   │   ├── services/          ebitdaRankService · ebitdaKpiService · wellConditionService · condicionPozosService · reportService (9 descargas: 4 del waffle Reporte + Redistribuido/V02/V03/V04/**V05** desde el AvatarPanel) ✅
    │   │   │   ├── utils/             criterioMetric.ts (getCriterioMetricBl/Label — única fuente de la regla "métrica del criterio activo") ✅
    │   │   │   └── types/             rankingTypes · wellCondition · condicionPozos ✅
    │   │   ├── reports/
    │   │   │   ├── pages/             ReportsPage (layout sidebar + SoonPage placeholder) ✅
    │   │   │   ├── hooks/             useEbitdaKpis (ticker overrides) ✅
    │   │   │   ├── mappers/           ebitdaKpiMapper ✅
    │   │   │   └── services/          ebitdaKpiService ✅
    │   │   ├── regresiones/           RegresionesPage + PredVsActualChart (4 categorías condición pozo) ✅
    │   │   ├── detalle_ingresos/
    │   │   │   ├── pages/             DetalleIngresosPage (sidebar + grid 2×2 + KPIs delta en ticker) ✅
    │   │   │   ├── charts/            ChartsGrid + ChartCard + ExpandToggleButton + chart.config ✅
    │   │   │   ├── components/        DeltaKpiStrip (componente standalone, actualmente no usado — KPIs delta van en KpiTicker) ✅
    │   │   │   ├── hooks/             useIngresosCombo + useKpisDelta (TanStack Query → GET /kpis-delta/) ✅
    │   │   │   ├── mappers/           kpisDeltaMapper (ensureTwoPoints + toKpiDeltaList) ✅
    │   │   │   ├── services/          ingresosComboService + kpisDeltaService (fetch + URL params) ✅
    │   │   │   ├── state/             chartsStore (Zustand expandedId) ✅
    │   │   │   └── types/             types.ts + deltaKpi.ts (DeltaKpiId, DeltaKpiItem) ✅
    │   │   ├── seguimiento/
    │   │   │   ├── pages/             SeguimientoPage (PageHeader + KpiRibbon mock + ChartRail + FeaturedChart) ✅
    │   │   │   ├── components/        PageHeader + KpiRibbon + KpiRibbonCard + KpiSparkline + ChartRail + FeaturedChart ✅
    │   │   │   ├── hooks/             (useKpisDelta movido a detalle_ingresos)
    │   │   │   ├── mappers/           (kpisDeltaMapper movido a detalle_ingresos)
    │   │   │   ├── services/          (kpisDeltaService movido a detalle_ingresos)
    │   │   │   ├── store/             seguimientoUiStore ✅
    │   │   │   ├── data/              mockKpis + mockSeries ✅
    │   │   │   ├── utils/             format (fmtK, fmtPct) + btnToPanel ✅
    │   │   │   └── types/             seguimiento.ts (KpiId, KpiVariation, PanelId) ✅
    │   │   ├── detalle_costos/
    │   │   │   ├── pages/             DetalleCostosPage (sidebar + CostosGastosCard) ✅
    │   │   │   ├── components/        CostosGastosCard (inspector layout rail+chart+expand) · StackedBarChart (Plotly stacked bar + custom HTML tooltip) · StackedBarPreview (SVG miniatura) ✅
    │   │   │   ├── hooks/             useCostosFijosKpis · useCostosGastosMensual ✅
    │   │   │   ├── mappers/           costosFijosKpiMapper ✅
    │   │   │   ├── services/          costosFijosKpiService (ticker + gastos mensual) ✅
    │   │   │   └── types/             costosFijosKpi.ts (CostosGastosSerie, CostosGastosMensualData, 4 API interfaces) ✅
    │   │   ├── detalle_dilucion/      DetalleDilucionPage (stub) ✅
    │   │   ├── comparacion_modelos/   ← NUEVO 2026-08-19
    │   │   │   ├── pages/             ComparacionModelosPage (rejilla 2×2 sin scroll de página) ✅
    │   │   │   ├── components/        ComparacionBarChart (marcadores por campo, 2 métricas de orden) · EfectividadPanel (tabla mejoran/iguales/desmejoran) · EjeRangeSlider (recorta la ventana de campos) ✅
    │   │   │   ├── hooks/             useComparacionModelos (no lee jerarquía: compara TODOS los campos) ✅
    │   │   │   ├── mappers/           comparacionMapper ✅
    │   │   │   ├── services/          comparacionService ✅
    │   │   │   └── types/             comparacion.ts ✅
    │   │   └── [analytics · admin · help · settings]   stubs — S7+
    │   └── shared/
    │       ├── components/
    │       │   ├── primitives/        Button · Input · Card · Badge · Spinner · Tooltip · Modal · Toast (8 con tests) ✅
    │       │   ├── charts/            ComboChart (Plotly bar+line · createPlotlyComponent · useResizeHandler · props opcionales retrocompatibles: monthlyMarkerValues/monthlyMarkerColor/monthlyMarkerLabel/customTooltip/barUnit/lineLabel + 4 de eje: xTickAngle/xTickSize/xTickWeight/xTickEveryCategory — 3.ª traza de marcadores sueltos + tooltip DOM con línea punteada posicionada por la geometría real del eje `_offset`+`d2p` + formas de indicador por serie vía clip-path) ✅
    │       │   ├── navigation/        AppMenuPopover + AppList + AppPill + SubViewGrid + SubViewTile + nav.config (hover popover navegación) ✅
    │       │   ├── kpi/               KpiTicker (marquee animado + TickerItem delta layout INICIO|Δ|FIN) · KpiCard · ChartPlaceholder · Sparkline ✅
    │       │   ├── PozosDetalleModal/ tabla plana por pozo (Item·CAMPO·UWI·QO·QW·Ingresos·EBITDA·U.Oper·U.Neta) + CriterioSegmented ✅
    │       │   │                      compartido por ebitda_rank y ebitda_costos · 1012px · columnas numéricas centradas
    │       │   ├── filters/
    │       │   │   ├── HierarchyPills/       F1 ✅ — acordeón 6 niveles · búsqueda >8 · teclado · auto-cleanup cascada
    │       │   │   ├── PeriodoControls/      F2 ✅ — MiniCalendar · YearMonthSelect · PeriodoSummary · RangeWarningBanner · bootstrap YTD fix
    │       │   │   └── WellConfigControls/   F3 ✅ — OptionTile<T> · BinarySelector<T> genéricos · icon-leading · accent CSS var
    │       │   ├── Drawer/
    │       │   │   ├── Drawer.tsx             3 tabs wireteados (jerarquía/período/wellconfig) Limpiar+Aplicar ✅
    │       │   │   ├── Drawer.module.scss     limpio (sin clases huérfanas) ✅
    │       │   │   └── panels/
    │       │   │       ├── HierarchyPanel.tsx ✅
    │       │   │       ├── PeriodoPanel.tsx   ✅ (bootstrap YTD fix · yearsForBulk · availableYears memo)
    │       │   │       └── WellConfigPanel.tsx ✅ (tiles icon-leading · badge dinámico · subtítulo live)
    │       │   ├── ErrorBoundary · ResolutionGuard · SessionExpiryBanner · SoonPage · skeletons ✅
    │       │   └── forms/                     (S6+)
    │       ├── icons/                         ✅
    │       ├── services/                      apiClient.ts (openapi-fetch tipado) ✅
    │       └── hooks/                         ✅
    ├── tests/
    │   ├── setup/                     vitest.setup.ts (jest-dom + ResizeObserver mock) ✅
    │   ├── unit/
    │   │   └── auth/                  ⚠️ UNTRACKED · tests rotos (ver DT-8)
    │   └── e2e/                       (Playwright — pendiente)
    └── docs/                          RESPONSIVE_STRATEGY.md ✅
```

**Regla operativa:** una feature solo importa de `shared/` o `core/`/`app/` — **nunca** de otra feature.

---

## 4. Decisiones bloqueadas (D1–D14)

| # | Decisión |
|---|----------|
| D1 | Ubicación: `E:\APLICACIONES\Robustez\Des_robustez_2.0\` con subcarpetas `robustez_v02_backend/` y `robustez_v02_frontend/` |
| D2 | Sin Azure DevOps esta semana (postponed a S6+) |
| D3 | Sin reverse proxy `/v02/` — back `:8000` / front `:5173` independientes |
| D4 | LDAP real desde día 1 (sin mock) — `red.ecopetrol.com.co` |
| D5 | Whitelist de emails abolida — solo tabla `app_users` |
| D6 | Seguridad: 6 capas según plan v0.6 §2.7 (HTTPS diferido a despliegue) |
| D7 | BD operacional v10 en uso desde S6 — solo `robustez_v02_auth.db` en MVP |
| D8 | Réplica completa diapositiva "services" + vínculos a placeholders en 8 secciones |
| D9 | 2 devs full-stack: J=backend lead, C=frontend lead |
| D10 | Modal zoom 70% post-login **eliminado** definitivamente |
| D11 | Plotly **activado en F7** — bundle `plotly.js` (~1.5MB gzip). Optimización a `plotly.js-finance-dist-min` documentada como DT-12 |
| D12 | Responsive ampliado a mobile en F6 — rango 360–1920px. M1 bottom sheet para <1024px. Estrategia: `frontend/docs/RESPONSIVE_STRATEGY.md` |
| D13 | DDL v0.2 aprobado para `robustez_v02_auth.db` (8 tablas) |
| D14 | Audit nivel MEDIO para MVP: `auth_events` activa, `user_actions` lista pero sin instrumentación |

---

## 5. Base de datos auth+audit (`robustez_v02_auth.db`)

**Fuente de verdad:** [`Migracion/DDL.md`](./Migracion/DDL.md) v0.2.

| # | Tabla | Rol |
|---|-------|-----|
| 1 | `permission_groups` | Grupos de permisos (Admin, Orinoquia, …) |
| 2 | `app_users` | Usuarios + cache `last_login_at` |
| 3 | `group_campo_permissions` | Campos por grupo |
| 4 | `group_section_permissions` | Secciones por grupo |
| 5 | `user_campo_permissions` | Extras de campo individuales |
| 6 | `user_section_permissions` | Extras de sección individuales |
| 7 | `user_actions` | Auditoría UI (lista, sin instrumentar en MVP) |
| 8 | `auth_events` | ★ NUEVA — Login/logout/expiración |

**Convenciones clave:**
- `auth_events` es la fuente canónica de sesión; `app_users.last_login_at` se actualiza en la misma transacción.
- `auth_events.domain` es `NOT NULL` sin DEFAULT — se lee de `core/config.py` (`AUTH_AD_DOMAIN`).
- `user_actions.details` tiene `CHECK (details IS NULL OR json_valid(details))`.
- Navegación tiene debounce 30s frontend + dedupe server-side + regla `prevSection !== nextSection`.

---

## 6. Sprint actual — S6 (inicio 2026-05-19)

**S5 W1 cerrada** ✅ — backend auth/permisos/audit operativo, frontend scaffold completo, BDs creadas, PostgreSQL schema `ops` + seeds listos.

**F2 cerrada** ✅ — PeriodoPanel bootstrap YTD fix + Drawer wiring Período + SCSS cleanup. 4 commits (faa2534, b067285, f80f2e8, 32be7e0).

**F3 cerrada** ✅ — WellConfigPanel rediseño completo: schema Zod + wellConfigStore draft/applied + OptionTile/BinarySelector genéricos + badge dinámico + Drawer wiring + SCSS cleanup. 6 commits (9a5aa6b → 0143b8f).

**Foco S6 siguiente: refinamiento visual + validación humana**
- `ebitda_costos` operativo (shell + waterfall + KPIs + sidebar) — pendiente validación visual
- `ebitda_rank` operativo (TendenciaEbitdaChart + RangeSlider + KpiStrip + WellConditionMap con 4 categorías) — pendiente validación visual
- `reports` operativo (sidebar + ticker EBITDA + SoonPage placeholder) — pendiente validación visual
- `regresiones` operativo (PredVsActualChart con categorías de condición de pozo) — pendiente validación visual
- `detalle_ingresos` operativo (grid 2×2 de 4 combo charts Ingreso KUSD vs Brent/DifOil/TRM/Producción + expand/collapse) — pendiente validación visual
- `navigation` AppMenuPopover hover behavior (sub-tiles aparecen al hover, click navega) ✅ — título "Panel de Navegación", sin eyebrow, sin Admin (movido a AvatarPanel)
- `AvatarPanel` rediseñado estilo tarjeta (avatar + badge ADMIN + grid iconos) ✅
- Clasificación de condición de pozo (`well_condition.py`) integrada en backend (ebitda_rank + regression) ✅
- Próximo: `DetalleDilucionPage` (mismo patrón stacked bar), reporte Excel ebitda_rank, deduplicación wells_attributes

**Avance 2026-08-06 — commits:**

| Commit | Feature | Descripción |
|--------|---------|-------------|
| ed5f7a2 | FIX-usdbl + marcador mensual | Denominador USD/Bl a crudo bruto (paridad Excel: feb **52,0608**, chip Levantamiento **61,93**) + 3.ª serie de marcadores "USD/Bl del mes" y tooltip custom en `ComboChart` |
| 12ce5cd, 0668db7, ae9d17c | style | Marcador mensual → triángulo navy 16px; barras de EBITDA negativas en `/seguimiento` → rojo Tomate vivo `#ED5F52` |
| c2e2663 | F-periodo-end | Hoja **"Periodo End"** en el reporte del período (4.ª hoja): mismo agregado del rango, pero solo con los pozos del **mes final** (TIBU Ene–Jun: 71→65). Tile renombrado a "Excel Periodo + End" |
| 7ca4889, 75791a5 | ops-restaurar-dump | `restaurar_ops_dump.py`: aplica un dump de `pg_dump` sin `psql`, en una sola transacción con validación de conteos y suma de control |

**Bloqueado activo:** 🔴 `poblar_postgres.py` — `wells_atributes.csv` tiene UWI duplicado `CAST0059` (línea 82). Decisión pendiente: deduplicar en script vs corregir CSV fuente.

**Pendiente antes de ebitda_costos:**
- Resolver DT-8 (`tests/unit/auth/` untracked con tests rotos).
- Commit masivo de archivos pre-existentes no commiteados (CLAUDE.md, scripts, pnpm-lock.yaml, etc.).
- Resolver DT-9 si coverage es gate de CI (pool threads vs isolate).

---

## 7. Reglas operativas para Claude Code

1. **Cada commit referencia su tarea por ID.** Formato: `feat(W1.4): crear robustez_v02_auth.db con DDL v0.2`.
2. **Nunca cambiar decisiones bloqueadas (D1–D14) sin confirmación explícita.**
3. **Si una tarea se bloquea:** marcar `🔴 BLOCKED` y pasar a la siguiente. No quedarse atascado >1h.
4. **Cambios de scope** → `Migracion/PLAN_S5_W1.md` §"Cambios al plan".
5. **Decisiones técnicas no triviales** → ADR ligero en `docs/decisions/`.

---

## 8. Estado actual (2026-08-25 — sesión activa)

### Resumen de la sesión 2026-08-25

| Commit | Qué |
|---|---|
| `7ce570e` | Scripts de respaldo/restauración de producción + `.gitignore` para volcados + ADR-003 |
| `e47675f` | `Start_Front.bat` resuelve Node por su cuenta (no depende del PATH del invocador) |
| `31864ff` | **Reporte Excel Redistribuido V06** — backend + frontend, con la línea base en KUSD |
| `44a1c54` | Dos hojas de ordenamiento en el V06 que explicitan el criterio de apagado |

**Reporte V06 (nuevo).** Duplica la cadena del V05 **en paralelo, sin tocarlo** —
el V05 ya está validado en producción. Se copia el cuerpo en vez de delegar por
el mismo motivo por el que el V05 no reusó el del V04: en cuanto una versión
diverge, compartir implementación obliga a meter condicionales dentro de la
cadena validada. Verificado contra la BD: **sin la conversión el V06 sale
idéntico al V05 celda por celda** (6.537 celdas, 0 diferencias).

**Diferencias del V06 frente al V05** (las únicas, ambas de presentación — los
dos bucles siguen corriendo sobre los mismos USD/Bl, las hojas RDT no cambian):

1. **Línea base en KUSD.** Las 9 columnas de costo (los 8 del puente de caja
   más Breakeven) van en KUSD en vez de USD/Bl, cada celda anotada con su valor
   por barril y los barriles de mezcla de la conversión. `EBITDA/Bl` y
   `EBITDA_Var/Bl` siguen por barril: convertirlas duplicaría columnas que ya
   existen en KUSD en la misma fila.
2. **Dos hojas de ordenamiento** que hacen explícito el criterio de cada bucle.
   No intervienen en el cálculo.

🔴 **La hoja `Ordenamiento RDT -Ebitda-Bl` marca la ventana a propósito.** El
criterio de `_optimizar_mes_v05_agua` no es un único valor ordenable sino dos
pasos: de los **2 pozos de menor EBITDA/Bl** se apaga el de **mayor producción
de agua**. Medido en TIBU al 61%, el pozo que se apaga (TIBU0568) es el **2.º
por EBITDA/Bl, no el 1.º** — una lista ordenada sin marcar señalaría al pozo
equivocado. Ambas hojas son la **foto del arranque**, no la secuencia de
apagados: el bucle recalcula en cada vuelta tras repartir el CF+Gasto.

**Recarga del dataset operacional** (`Tablas Nuevo Esquema 2026-07-17`, 6 CSV
sobre `ops` en una única transacción). Dos anomalías del origen resueltas al
cargar: (a) `zone` llega **vacío en 14.310 filas por tabla** y es parte de la
PK — se restituye el literal `SIN_ZONE` que la BD ya usaba, verificado por
conteo exacto en las 5 tablas; (b) **duplicados de PK** — 19.513 filas en
`wells_attributes` (cada pozo dos veces, difiriendo SOLO en `vice_presidency` y
`management`) y 7 por tabla en las de datos, deduplicados por primera
aparición, que coincide con la BD en los 18.534 casos y la segunda en ninguno.
Resultado: **326.403 filas por tabla, 19 meses (2025-01 → 2026-07), 0
huérfanos**, y `monetization_*` intacta (317.734 valores) porque los CSV no
traen esas columnas.

⏳ **Pendiente de validar en origen:** 2 duplicados cuyas filas **no** eran
idénticas y donde se conservó la primera — `CHIC0001SW` (líneas 34002/34003) y
`CHSW0038` (líneas 305026/305084), ambos 2025-04. El segundo difiere ~11× en
producción e ingresos.

🔴 **Entorno de desarrollo — tres causas encadenadas.** El frontend no arrancaba
porque (1) Node no estaba instalado, (2) la Execution Policy de PowerShell
estaba en `Restricted` (default de fábrica, sin GPO) y bloqueaba el shim
`pnpm.ps1`, y (3) `node_modules` estaba a medio instalar: los shims existían
pero **faltaba el paquete `vite`**. Se reinstalaron 860 paquetes y se hizo
`pnpm rebuild esbuild` (pnpm 10 bloquea build scripts por defecto). Faltaban
además `black`, `mypy` y `pytest` en el venv del backend
(`uv sync --all-extras`).

🔴 **El `.env` de desarrollo apuntaba a producción.** `OPS_DATABASE_URL` tenía
el host `10.100.26.139` en una máquina con PostgreSQL local; corregido a
`localhost` con la línea de producción comentada. **El default de `config.py:35`
sigue apuntando a producción**, así que un clon sin `.env` va contra el servidor
real — pendiente de revisar, junto con los scripts sueltos del backend que
tienen esa IP hardcodeada (`restaurar_produccion.py` arranca con
`DROP SCHEMA ops CASCADE`).

### Resumen de la sesión 2026-08-20

| Commit | Qué |
|---|---|
| `40e3276` | Restauración de `node_modules/`+`.venv/` (39.222 archivos inaccesibles por propiedad NTFS ajena) + anclaje a Python 3.12 |
| `016a2be` | Reporte V05: memoria de cálculo del descuento en la celda + `%` en el nombre de la hoja |
| `020519d` | Reporte V05: el ahorro de Costos Fijos se abona al EBITDA (y a EBITDA_Var, `/Bl` y condición) |

**Regla del V05 cerrada con el usuario:** se descuenta el % **solo sobre
Costos Fijos**, ese ahorro **se abona a los EBITDA**, y el **Gasto queda como
está**. Los criterios de orden y el método de apagado de los 3 bucles **no se
tocan**.

🔴 **Efecto medido** (TIBU, 2026 Ene–Jun, real/activos, 60%): el ejercicio pasa
de apagar **21 pozos a 4** (hoja /Bl: 17 → 2) y la línea base de 25 a **43
rentables**. Es la consecuencia lógica de acreditar el ahorro, pero cambia la
conclusión del reporte — ⏳ pendiente de que el usuario confirme que es lo
buscado.

🔴 **Hardware, tercer episodio:** tras restaurar las dependencias, la suite
backend crashea de forma **intermitente** con `access violation` (errores RPC
en `pathlib.stat()`) — 3 corridas idénticas dieron crash / 358 passed / crash.
No confiar en un resultado verde aislado. Ver `INCIDENTE-PERMISOS-DEPS` en §19.

### Resumen de la sesión 2026-08-19

| Commit | Qué |
|---|---|
| `dc5bafd` | Rescate INACT en la app: 8 puntos del backend (tickers, waterfalls, curva, mapa, modal acordeón, filtro UWI) |
| `c54d729` | Rescate INACT en `ResumenService` + los 9 reportes Excel |
| `dec90ac` | Login cinematográfico (F-LOGIN-CINE) |
| `3cb901f` | Caudal de FC-Periodo cuadra con el KPI QO/QW de la cinta |
| `482f142` | Hoja RDT-EBITDA-Bl del V05 elimina por agua entre los 2 peores /Bl |
| `6508524` | Módulo nuevo `/comparacion-modelos` |
| `c6461ed` | `diapositiva.md` — estado del proyecto para comité |

**Cifras verificadas** (RUBIALES, 2026 Ene–Jun, Activos/Real): ticker EBITDA
**704.116,44 → 711.278,45 KUSD**; curva y summary **788 → 805 pozos**; caudal
del Excel coincidente al centavo con la cinta en 3 campos.

🔴 **Incidente:** objeto Git corrupto (`c08dbb32`, de un commit del 11 de
agosto) bloqueó los commits. Reparado desde un clon limpio, sin pérdida. `git
fsck` posterior sin errores. Encaja con los **10 BSOD `MEMORY_MANAGEMENT`**
auditados el 2026-08-12 — diagnóstico de hardware aún abierto.

### Funcionalidades incorporadas — Frontend ✅

| Capa | Componentes operativos |
|---|---|
| **Auth UI** | LoginPage con splash + BetaBanner + DashboardPreview (Brent SVG histórico + ticker 4 KPIs). Auth hooks/store/guards + ProtectedRoute (lazy) + SessionExpiryBanner (aviso ≤5 min antes de expirar, vía header `X-Session-Expires`). Favicon `/public/favicon.png` (Gota.png) |
| **Login — transición cinematográfica a Main (F-LOGIN-CINE, 2026-08-18)** | Sobre el login existente: **4 pasos LDAP** revelados en secuencia (`AuthSteps`, `role=status aria-live=polite`) bajo el submit; **`SubmitButton`** local del feature con 3 estados (idle/busy con spinner+barrido de luz/done verde — el primitivo `Button` compartido no modela el estado done); tras `onSuccess` real del backend, **`Curtain`** (2 hojas verdes + sello de marca con anillos dorados en pulso, "ROBUSTEZ", "ACCESO CONCEDIDO", correo del usuario) cierra sobre una **`MainPreview`** estática (shell sin hooks de datos) y `navigate('/')` al terminar — el `LayoutMain` real se monta recién en la ruta destino. `useCinematicLogin` orquesta las fases `idle→auth→done→close→hold→open`; la revelación de los 4 pasos LDAP **siempre completa su recorrido mínimo** aunque el backend responda rápido (se desacopló del tiempo de respuesta real tras detectar que colapsaba a "todo listo" de inmediato). El `<Navigate>` de sesión activa se gatea con `cine.phase==='idle'` porque `setSession()` es síncrono y dispararía antes de que la cortina alcance a encadenarse; los toasts (z-index 10001) se gatean igual para no dibujarse sobre la cortina (10000). Paleta 100% Ecopetrol vigente (no Bootstrap, no tokens nuevos). ⏳ PENDIENTE validación humana en navegador. |
| **Sesión inactiva — modal (2026-08-11)** | `InactivitySessionModal` (icono mano circular amarillo `#F7DB17` + título + texto + botón "Entendido" ancho) montado en `LayoutMain.tsx`, orquestado por `useInactivityLogout`. **Detecta inactividad REAL del usuario** — `useIdleTimer` escucha `mousemove`/`keydown`/`scroll`/`click`/`touchstart` (throttle 1s, se limpia en unmount) — a diferencia del `SessionExpiryBanner`/`sessionInterceptor.ts` existentes, que miden ausencia de *requests HTTP*, no de interacción humana. El timeout usado es el mismo configurable del panel Admin (5-240 min), obtenido vía `useSessionTimeoutMinutes` → `GET /api/v1/auth/session-timeout` (endpoint nuevo, **solo lectura, sin rol admin** — el existente `GET /admin/settings/session-timeout` exige `require_admin` y no servía para esto). Mientras el modal está abierto el timer se pausa (`paused=true`) para no re-cerrarse solo. Click en "Entendido" → `useLogout().mutate()` + redirect a `/login`. |
| **Layout** | Header (Waffle + AvatarPanel tarjeta + Breadcrumb) + Footer + DrawerStrip vertical (3 tabs) + Drawer 340px (lazy) + KpiTicker animado + ResolutionGuard (bloquea <1024px). LayoutMain lazy desde `router.tsx`. **AvatarPanel** rediseñado estilo tarjeta: avatar 48px + nombre completo + badge "ADMIN" (pill verde `#004236`) + email truncado + grid 3 cols de accesos rápidos (Admin, Configuración, Ayuda) con iconos 24px coloreados + borde sutil `rgb(0 0 0 / 6%)` + "Cerrar sesión" centrado rojo. Props: `username`, `fullName`, `email`, `isAdmin` desde `useAuthStore`. Header pasa `fullName` e `isAdmin` al panel. |
| **Home** | HomePage con Carousel + 3 paneles Drawer accesibles |
| **Primitivos UI** | Button, Input, Card, Badge, Spinner, Tooltip, Modal, Toast (8 con tests) + **UnitToggle** (segmented control genérico `T extends string`, role radiogroup) |
| **Filtro Jerarquía (F1)** | `HierarchyPills` acordeón 6 niveles (VICEPRESIDENCIA / GERENCIA / ACTIVO / CAMPO / CAMPO_CONTRATO / POZO) con búsqueda interna >8 opciones + navegación teclado + auto-cleanup cascada + draft/applied + paleta Ecopetrol |
| **Filtro Período (F2)** | `PeriodoControls` con ModeSegmented (Rango / Mes único) + YearMonthSelect Desde/Hasta + MiniCalendar 6x2 (preview en range, interactivo en single) + PeriodoSummary + RangeWarningBanner (gaps/invalid) + draft/applied + `_isInitialized` + validación cross-year contra `ops.periods` vía `useQueries` |
| **Filtro Well Config (F3)** | `WellConfigControls` con 4 tiles icon-leading binarios (TipoPozo / Producto / EstadoPozo / Producción) + badge dinámico + subtítulo live + draft/applied + tipos genéricos `<T>` sin casts. Sin enlace a BD por ahora |
| **Applied Filters Panel (F4.1–F4.6)** | `AppliedFiltersPanel` (desktop sidebar) + `MobileAppliedFiltersSheet` (bottom sheet <1024px) montados en `EbitdaCostosPage`. Hooks `useAppliedFilters` + `useWellConfigAccents`. Helpers `formatRelativeES` + `useNow`. Stores con campo `appliedAt`. |
| **EBITDA Costos (F5.0–F5.0b)** | `EbitdaInspectorCard`: layout grid 2col (chart + sidebar) desktop / 1col mobile. `UnitToggle` (USD/Bl \| KUSD). `InspectorHeader` + `InspectorSidebar` 7 filas (Ingresos, M.Subsuelo, Dilución, Tratamiento, Energía, Transporte, Costos Fijos). `WaterfallChart` (Plotly). Llena 100% altura disponible. Ruta `/ebitda-costos` activa. Hooks: `useEbitdaKpis` + `useKpiQoQw` + `useEbitdaWaterfallData`. Mappers + services completos. |
| **EBITDA Inspector Transiciones (F13)** | `EbitdaInspectorCard` con animación `liquid morph` al alternar USD/BI ↔ KUSD: clase `.chartCanvas` envuelve `<WaterfallChart>` DENTRO del `<Suspense>` con `key={activeUnit}` (aislado del lazy chunk, sin flash). Keyframe `@chart-canvas-in` combina `clip-path: inset(... round 80px)` + `scale(0.92→1)` + `opacity(0→1)`, 500ms `cubic-bezier(0.4, 0, 0.2, 1)` (curva del proyecto). `InspectorThumbnail` con fixes Emil: `transition` con 4 props específicas (background/border-color/box-shadow/transform), `:active scale(0.97)` feedback de press, transición opacity en `.preview`, transición background+color en `.icon`. Sin `@media (prefers-reduced-motion)` local (regla global de `styles/index.scss` cubre). |
| **EBITDA Rank — Curva de Rentabilidad (F8)** | `EbitdaRankPage`: layout 2-panel (gráfico izq + mapa der) con `panelCard` + leyenda + segmented toggle + footer meta. **Expand inline desktop (≥1024px)**: botón "Ampliar"/"Reducir" (Maximize2/Minimize2) cambia `gridTemplateColumns` con `transition cubic-bezier(0.7,0,0.3,1) 0.4s`. Panel ampliado ocupa el grid (`1fr 44px` o `44px 1fr`); el otro colapsa a `CollapsedTab` vertical (44px ancho, icono naranja + label rotado `writing-mode:vertical-rl` + chevron). En mobile (<1024px) el comportamiento conserva el modal (`ChartModal`). **Fix H1**: `gridCols='1fr'` cuando `isMobile===true` para no sobreescribir `@media` con inline style. **Fix H2**: `useEffect(()=>{ if(isMobile) setExpanded(null) }, [isMobile])` resetea expanded al pasar a mobile. `aria-pressed` en botón toggle + `prefers-reduced-motion` desactiva la transición del grid. Notify Plotly de resize tras 450ms (post-transición). `TendenciaEbitdaChart` (Plotly): 3 series (EBITDA/Bl línea oscura + Aceite-Cum naranja + EBITDA-Cum verde) en 2 ejes Y, zonas de fondo verde/amarillo/rojo con interpolación KPI + zero-cross, línea KPI dashed, ejes monospace, sin markers. `RangeSlider` dual-thumb con paleta Ecopetrol `#004236`. `KpiStrip` (4 KPIs horizontales). `CardHeader` reutilizable. `WellConditionMap` con **4 traces por categoría**: ★ rentable (#2E8B47), ◆ marginal (#F4D124), ✚ no_rentable (#C5311E, cross-thin-open), ● otro (#6B7A8A) — agrupación por `categoria` con `CATEGORY_CONFIG` + `CATEGORY_ORDER`, paridad visual con `PredVsActualChart.tsx`. Chips de filtrado por categoría (`catChipOn/Off_<cls>`, 4 estados visuales, role switch + `aria-checked`). `ChartModal` (zoom modal mobile). Chart ocupa 100% altura disponible via `position:absolute;inset:0` + flex chain propagation + `:global()` overrides Plotly. `ebitdaRankMapper` + `ebitdaRankService` + `useEbitdaRankData`. Ruta `/ebitda-rank` activa. ⏳ PENDIENTE validación humana (V2-V10). |
| **Filtro UWI con lógica EBITDA (F6.1)** | `useHierarchyFilters.ts` envía `from/to_year/month + estado_pozo + produccion` al query `uwi`. El backend filtra pozos con EBITDA válido → 153 pozos (paridad V01). Formato delta KPIs: locale `es-CO`. |
| **KPI Ticker — EBITDA + Delta (F14)** | `KpiTicker` con 2 tipos de items: **`kpi`** (layout clásico: sparkline + val + delta) y **`delta`** (layout 3 filas: label+sparkline → valor delta grande → % + footer INICIO\|FIN con valores período). `KpiTickerEntry` extendido con `startVal`, `endVal`. `TickerItem.tsx` renderiza condicionalmente por `entry.type`. `KpiTickerOverride` extendido con `delta`, `neg`, `startVal`, `endVal`, `series`. `LayoutMain.tsx` consume `useKpisDelta()` de `detalle_ingresos` y pasa overrides reales a los 4 items delta. Ruta `/detalle-ingresos` muestra 8 items (4 KPI + 4 delta); resto de rutas solo 4 KPI. Formato locale español `es-CO`. ✅ Validado en navegador. |
| **Reports / EBITDA Seguimiento (F9)** | `ReportsPage`: layout sidebar (`AppliedFiltersPanel` desktop + `MobileAppliedFiltersSheet` <1024px) + `SoonPage` placeholder como contenido principal. KPI ticker con valores EBITDA reales vía `useEbitdaKpis` + `tickerOverrideStore`. Hook/service/mapper propios (aislamiento cross-feature). Ruta `/reports` activa con drawer + ticker. ⏳ PENDIENTE validación humana. |
| **Regresiones (F10)** | `RegresionesPage` con `PredVsActualChart` (Plotly scatter): 4 traces por categoría de condición de pozo (rentable/marginal/no_rentable/otro) con `CAT_STYLE` (star/diamond/cross-thin-open/circle). Backend `regression/services.py` integra `classify_well()` desde `shared/well_condition.py`. Ruta `/regresiones` activa. ⏳ PENDIENTE validación humana. |
| **Detalle Ingresos — Grid 4 Combo Charts + KPIs Delta (F11+F14)** | `DetalleIngresosPage` (`/detalle-ingresos`): layout sidebar (`AppliedFiltersPanel` desktop + `MobileAppliedFiltersSheet` mobile) + `ChartsGrid` 2×2 con 4 `ChartCard` (Ingreso KUSD vs Brent/DifOil/TRM/Producción). `ComboChart` reutilizable (Plotly bar+line, `createPlotlyComponent` + `useResizeHandler`). `ExpandToggleButton` zoom + tecla Esc para colapsar. Zustand `chartsStore` con `expandedId`. `useIngresosCombo` consume `GET /api/v1/detalle-ingresos/ingresos-combo`. `chart.config.ts` define labels/colores/unidades. Tokens `$ec-*` añadidos a `_tokens.scss`. **KPIs Delta en cinta:** 4 items delta (Δ BRENT, Δ DIF OIL, Δ PRODUCCIÓN, Δ TRM) integrados en el `KpiTicker` del `LayoutMain` exclusivamente para esta ruta. Datos reales del backend vía `useKpisDelta` → `GET /api/v1/kpis-delta/`. Layout delta: INICIO \| Δ valor + % \| FIN con sparkline. Hook/service/mapper/types propios en `detalle_ingresos/`. ✅ Validado en navegador. |
| **Detalle Costos — Costos y Gastos (F15)** | `DetalleCostosPage` (`/detalle-costos`): layout sidebar (`AppliedFiltersPanel` desktop + `MobileAppliedFiltersSheet` mobile) + `CostosGastosCard` (inspector layout: rail thumbnails izq + chart area der + botón Ampliar/Reducir). `StackedBarChart` (Plotly stacked bar, `createPlotlyComponent` + `useResizeHandler`). `StackedBarPreview` (SVG miniatura memo). **Custom tooltip HTML** fijo centrado superior del chart (no Plotly nativo — `onMouseMove` calcula mes por posición X del mouse, `hovermode: false`). Formato `$3.604,3` (es-CO). Zustand no involucrado en hover (R2 ✅). `useCostosFijosKpis` + `useCostosGastosMensual` hooks (TanStack Query). `costosFijosKpiService` (2 endpoints: ticker + gastos mensual). `costosFijosKpiMapper` (ensureTwoPoints + sort avg desc). Types `CostosGastosSerie` + `CostosGastosMensualData`. **KPI Ticker Costos:** 11 keys en `TICKER_KEYS_BY_ROUTE['/detalle-costos']` (costos-fijos, costos-fijos-bl, 7 deltas). `LayoutMain.tsx` consume `useCostosFijosKpis` condicional + pasa overrides. `kpiTickerData.ts` con 11 mocks costos. Ruta `/detalle-costos` activa. ✅ Validado parcialmente (chart OK, tooltip posición en ajuste). |
| **Detalle Costos — USD/Bl: denominador y serie mensual (2026-08-06)** | **Denominador corregido:** el USD/Bl de los 5 chips (Levantamiento, Energía, Mant. Subsuelo, Tratamiento, Gasto) se divide entre **producción bruta de crudo** (`OIL_COLUMN_MAP` × `days_in_month`), no entre barriles de mezcla (`total_bbl_blend`) como hacía antes. Trampa de naming: `production_oil_day_month` está en **BOPD**, hay que multiplicarla por los días del mes. El acumulado deja de ponderarse por días y pasa a `SUM ÷ SUM`, la convención del resto del proyecto. Paridad con el Excel del usuario: febrero **52,0608** y chip de Levantamiento a junio **61,93** (−13,3% frente a los valores anteriores). **Serie mensual nueva:** el `ComboChart` acepta `monthlyMarkerValues` y dibuja una tercera traza de **marcadores sueltos sin línea** (triángulo navy `#00214D`, 16px) con el USD/Bl **del mes**, para contrastarlo contra la curva acumulada; el backend lo expone en `usd_bl_mensual`, capturado antes de actualizar los acumuladores. **Tooltip custom:** línea punteada vertical + tarjeta arriba-derecha con las 3 series, replicando el patrón de `StackedBarChart` (§21) porque `createPlotlyComponent` no conecta el hover nativo de Plotly. Los props nuevos (`monthlyMarkerValues`/`monthlyMarkerColor`/`monthlyMarkerLabel`/`customTooltip`/`barUnit`) son **opcionales con default** → `detalle_ingresos` y `detalle_dilucion` no cambian. Rotulado: eyebrow "COSTO ACUMULADO · USD/BL" + chip "USD / BL (ACUM.)". ✅ Validado en navegador. |
| **Navegación — Hover Popover (F12+F16)** | `AppMenuPopover` con comportamiento hover: sub-tiles aparecen on `onMouseEnter` (sin click). Click en app → navega siempre. `handleAppHover` actualiza `activeAppId` + `activeSubId` (primer sub por defecto). Tecla Esc cierra popover. Fix ESLint `no-unnecessary-type-assertion` (eliminado `activeApp!.subs!`). **F16 (2026-06-10):** título cambiado a "Robustez · Panel de Navegación". Texto "APLICACIONES" (eyebrow) eliminado. Opción "Admin" removida de `nav.config.ts` (accesible solo desde AvatarPanel). 5 items: Inicio, Utilidad Neta, Predicción, EBITDA Rank, EBITDA Seg. (con subs: Ingresos, Costos, Dilución). |
| **Reporte Excel del período — tile "Excel Periodo + End" (2026-08-06)** | Tercer tile del popover **Reporte** de `/ebitda-rank` (`ReporteWaffle`), debajo de "Reporte Excel". Descarga el reporte del período que ahora trae **4 hojas** en vez de 3: portada por Activo, `Periodo-<año>` (ranking), `FC-Periodo` (flujo de caja, universo = unión de todos los meses) y la nueva **`Periodo End`** (pestaña durazno `FFE0B2`), con el mismo agregado del período pero solo con los pozos presentes en el **mes final** del rango. Mismo endpoint (`/export-periodo`) y misma función (`downloadReportePeriodo`) — solo cambian el contenido del .xlsx y el rótulo. El label se acortó a "Excel Periodo + End" porque el nombre completo (~203px) no cabía en los ~172px del tile y se truncaba con "…". ⏳ PENDIENTE validación humana (abrir el Excel real). |
| **Seguimiento — barras de EBITDA por signo (2026-08-06)** | `EbitdaChart` de `/seguimiento` pasa `marker.color` como **array por barra** en vez de un color fijo: los meses con EBITDA negativo salen en rojo **`#ED5F52`** ("Tomate vivo") y los positivos conservan el lima `#CCD32A`. Sin cambios de layout ni de tooltip. |
| **Modales de detalle de pozos — producción de crudo y agua (2026-08-11)** | Los **dos** modales de detalle muestran caudales. (1) `PozosDetalleModal` (**shared**, lo consumen EBITDA Rank y EBITDA Costos): 2 columnas nuevas **tras UWI** — `Prod. Crudo (BOPD)` / `Prod. Agua (BWPD)` — con el **promedio del período ponderado por días producidos**, no la suma (`production_oil_day_month` está en BOPD pese al nombre). Ancho del diálogo 920 → **1012px** y columnas numéricas **centradas con su encabezado**: `.table thead th` (especificidad 0,1,2) le ganaba a la clase de alineación (0,1,0) y dejaba los títulos a la izquierda con los valores a la derecha; se añade `thead th.num` y la clase pasa de `.right` a `.num`. (2) `CondicionPozosModal` (`ebitda_rank`, acordeón): 2 columnas en la tabla mensual con el caudal **de cada mes** + el promedio ponderado en la fila `ACUMULADO`, rotuladas `Prod. crudo (BOPD)` / `Prod. agua (BWPD)`. Verificado contra PostgreSQL: SFRA0046 da **2,34 BOPD** en ambos modales y sus meses coinciden con `flow_rates`. ⏳ PENDIENTE validación humana. |
| **Curva de tendencia — trío por criterio + paleta (2026-08-11)** | Al cambiar el criterio en el waffle **EBITDA / U. Operativa / U. Neta**, las curvas visibles se reajustan solas a su trío: la curva **/Bl del criterio + su acumulado + Aceite-Cum** (referencia de producción común a los tres). Siempre **3/7**, también en la carga inicial — antes arrancaba con las 7 encendidas. La selección manual se descarta en cada cambio, igual que ya hacía la página con las categorías del mapa. Los tríos viven en `curvesDef.ts` junto a la definición de las curvas (`CURVAS_DEFECTO_POR_CRITERIO`), y el reajuste lo hace el propio `useVisibleCurves(criterio)` sin `useEffect` adicional en la página. **"Ninguna"** pasa a dejar la /Bl del criterio activo (`CURVA_BL_POR_CRITERIO`) en vez de EBITDA/Bl fija, que bajo U. Neta dejaba en pantalla una curva ajena. **Paleta:** Aceite-Cum **verde `#2E8B47`** (en los tres criterios), EBITDA-Cum **café `#8B5E34`** continuo, Utilidad Neta-Cum **café punteado**, Utilidad Neta/Bl **negro `#111827` punteado`**. Los colores son constantes exportadas y compartidas entre el chip del tile y la línea del chart, para que el waffle no deje de servir como leyenda. ⏳ PENDIENTE validación humana. |
| **Reporte Excel "Periodo End V02" — 4.º tile (2026-08-11)** | Cuarto tile del popover **Reporte** de `/ebitda-rank`: *"Excel Periodo End V02 — Solo FC-Periodo, crudo y agua en Bl"*. Descarga `GET /export-periodo-end-v02` vía `downloadReportePeriodoEndV02`. Genera **3 hojas**: portada por Activo (gráficos + consolidados) + `FC-Periodo` + `Periodo End`; **omite** el ranking `Periodo-<año>`. Las dos hojas de datos estrenan el **layout de 31 columnas**. ⏳ PENDIENTE validación humana (abrir el .xlsx). |
| **Reportes redistribuidos V02/V03/V04 — dónde viven (2026-08-11)** | Los 4 reportes de redistribución (`Redistribuido`, `V02`, `V03`, `V04`) se descargan desde el **AvatarPanel** del Header, **no** desde el waffle "Reporte" de `/ebitda-rank` — ese waffle tiene los 4 tiles de exportación de datos (Resumen · Excel · Periodo+End · Periodo End V02). `reportService.ts` expone las **8 descargas** en total. Cada tile del AvatarPanel lleva su propio flag de carga independiente, para que descargar uno no bloquee los demás. |
| **Filtro por defecto de la app (2026-08-11)** | La app arranca en **campo TIBU** (sin acotar el activo; antes activo SAN FRANCISCO) y período **Enero–Junio 2026** (antes Ene–May). Well Config ya estaba en Productor / Crudo / Activos / Real. Cambiado en `_defaultApplied` **y** `_defaultDraft` de `filtersStore` y `periodoStore`, para que "Limpiar todo" vuelva al mismo estado. ⚠️ Junio es un valor **fijo**, no un "último mes disponible": tras la próxima ingesta hay que actualizarlo aquí. |
| **Zonas verde/roja por criterio activo (2026-08-11)** | La frontera de `/ebitda-rank` cae **exactamente sobre el cruce por cero** de la curva (interpolación entre los dos puntos que lo rodean), no en un porcentaje derivado del conteo de rentables. Y **sigue al criterio del waffle "Condición"**: EBITDA/Bl, UO/Bl o UN/Bl — antes las tres compartían la frontera del EBITDA aunque cruzan cero en índices distintos. La línea KPI punteada solo se dibuja con criterio EBITDA (es el único con `kpi_ebitda_bl` definido en la API; mostrarlo junto a UO/Bl o UN/Bl mezclaría unidades). Lógica extraída a `zoneShapes.ts` con **17 tests**, endurecida para series **no monótonas** — verificado contra la BD que UO/Bl y UN/Bl lo son en 6 campos — NaN intercalados y series degeneradas. ✅ Validado en navegador. |
| **Ejes de fecha y tooltips coherentes (2026-08-11)** | **Etiquetas únicas:** con período que cruza año, `Ene-2025` y `Ene-2026` daban la misma etiqueta y Plotly (eje **categórico**) las **superponía** — 18 meses se veían como 12 barras y los valores de 2026 se leían bajo etiquetas de 2025. El sufijo de año se agrega solo cuando el rango cruza año. Formato: **7,5px, horizontal, negrilla**, `tickmode: linear` para no saltarse categorías. **Línea punteada alineada:** se posiciona con la geometría real del eje (`xaxis._offset + xaxis.d2p`) en vez de una fórmula a mano que fallaba hasta 2 barras — Plotly expande márgenes al rotular en negrilla y deja medio espacio de padding en cada extremo del eje categórico. `p2d()` devuelve **NaN** en este entorno, así que el paso se deriva de dos puntos. **Tooltip:** cada fila lleva la **forma** de su serie (cuadrado/triángulo/rombo vía `clip-path`), la **paleta** se unifica con el apilado (antes 4 de 5 métricas cambiaban de color entre vistas y tres compartían el mismo navy) y las filas dicen `"<Métrica> mes"` / `"<Métrica> acum."` en vez de solo la unidad. ✅ Validado en navegador. |
| **EBITDA Rank — cuadre curva vs. cinta, parcial (2026-08-12)** | Tres arreglos independientes en la curva de `/ebitda-rank`. **(1) Aceite-Cum:** ver DT-19 en §17 — escalado temporal al KPI Qo Total (`AJUSTE_CURVA_A_KPI`). **(2) Ejes Y1/Y2** (`TendenciaEbitdaChart.tsx`) se dimensionan solo con las series `visible`: antes combinaban las 7 curvas aunque no se dibujaran, así que con criterio U.Neta el eje derecho llegaba a 503.611 KUSD fijado por EBITDA-Cum **oculto**, mientras la curva visible (UN-Cum) remataba en 151.116 — 68,5% de eje desperdiciado, 0% de efecto con criterio EBITDA (por eso pasó inadvertido). `visible` entra en las deps del `useMemo` que construye `data`/`layout` de Plotly — no contradice R2/DT-14: es selección de **series**, no de puntos/hover. **(3) RangeSlider por defecto** (`EbitdaRankPage.tsx`) deja de recortar a ±10% del mejor pozo (`-maxPositive * 1.1`) — ⚠️ **superado el 2026-08-13**, ver la fila «EBITDA Rank — RangeSlider» más abajo: el pulgar vuelve a arrancar encuadrado, pero como **posición**, no como recorte de límites: antes la curva dibujaba 46 de 69 pozos en TIBU y su acumulado cerraba en 1.225 KUSD mientras el KPI EBITDA sumaba −397,25 (los 23 pozos recortados aportaban −1.622,54 KUSD que el KPI sí contaba); ahora dibuja los 69 y el último punto coincide con el KPI. Contrapartida aceptada: un pozo de −421 USD/Bl comprime visualmente el resto de la curva — para eso está el slider. **Se intentó además** alinear los 6 KPI de la cinta (EBITDA/UO/UN, KUSD y /Bl) al universo del ranking (69 pozos) en vez del global (567) vía `criterioStore` (nuevo, Zustand — el criterio pasa de `useState` a store porque `useEbitdaRankData` lo mete en su `queryKey`) + un bloque de overrides en `LayoutMain.tsx`. Funcionaba — cinta y curva coincidían en −397,25 — pero el usuario decidió **revertirlo**: prefiere el mismo KPI en todas las rutas antes que el cuadre visual en esta sola página. La diferencia de −4,21 KUSD (516 pozos no `ACT` + 2 con EBITDA=0 + 2 con mezcla=0, verificado al centavo) queda documentada en el código de `EbitdaRankPage.tsx`. `criterioStore.ts` y los campos backend `kpi_util_oper_bl`/`kpi_util_neta_bl` quedan creados pero **sin consumidor** tras el revert. |
| **Curva del reporte Excel = curva de la web (2026-08-11)** | El PNG de la portada replica el **estado por defecto** de `/ebitda-rank` (slider sin tocar, criterio EBITDA): misma **población truncada** (la web recorta outliers negativos a ±10% del mejor pozo → **46 de 69** pozos en TIBU Ene–Jun, no 69), **zonas verticales** por posición del cruce en vez de horizontales por signo, **línea KPI punteada**, los **3 colores** de la web (`#0A1F33` / `#2E8B47` / `#8B5E34`) y el **eje EBITDA-Cum alineado** al cero de EBITDA/Bl. El rango del eje combina **las 3 métricas /Bl** aunque solo se dibuje una, igual que la web: omitir UO/UN lo angosta un 28%. `_create_tendencia_chart` se alimenta de **`EbitdaRankService.get_ranking()`** — el mismo método que usa la web — en vez de reimplementar la fórmula, así las dos curvas no pueden divergir por construcción; el import es **local al loop** porque a nivel de módulo crearía un ciclo con `services.py`. Dos guards se apartan del código de la web a propósito (ver §17.6). `_create_scatter_chart` no cambia. ⏳ PENDIENTE validación humana. |
| **Curva de tendencia ordenada por el criterio activo (2026-08-12)** | El eje X de `/ebitda-rank` estaba fijo en **EBITDA/Bl DESC** sin importar el waffle "Condición". Ahora sigue la métrica del criterio: **UO/Bl** con `util_oper` y **UN/Bl** con `util_neta`. El helper **`utils/criterioMetric.ts`** (`getCriterioMetricBl`/`getCriterioMetricLabel`) queda como **única fuente de la regla** y reemplaza la ternaria que la duplicaba dentro del chart. Lo que ahora sigue al criterio: el **filtro del RangeSlider** y sus límites (`allCriterioBl`), el **filtrado del mapa** (`visibleUwis` → `filteredPoints`), el **título de ambos ejes** y el **label del slider** (dejan de decir "EBITDA/Bl" fijo), y las **bandas verde/roja** (`zoneShapes.ts`, parámetro `ebitdaBl` → `metricBl`). Con el `ORDER BY` siguiendo la misma métrica, la serie que llega a `findZeroCrossFraction` es **monótona por construcción** — el `findIndex` del primer rentable queda como salvaguarda defensiva, no por una no-monotonía esperada. **Se eliminan `EbitdaRankData.aceiteCum`/`ebitdaCum`**: no los consumía nadie (el chart recalcula los suyos sobre los pozos que pasan el slider) y con el reordenamiento habrían quedado acumulados en un orden distinto al dibujado — código muerto **engañoso**. Dos efectos son decisiones tomadas, no colaterales: **Aceite-Cum cambia de forma** entre criterios, y cambiar el waffle **dispara un refetch** al backend. ✅ Validado en navegador. |
| **EBITDA Rank — RangeSlider: encuadre y filtro (2026-08-13)** | **Encuadre:** el pulgar izquierdo arranca en **−maxPositivo** (−37,79 en TIBU), simétrico al positivo. 🔴 Es **posición del pulgar**, no recorte de límites: `defaultMin`/`defaultMax` siguen siendo los extremos reales de la población, así que el recorrido gris llega hasta −421,52 y el usuario puede arrastrar de vuelta para ver la cola completa y el cierre contra el KPI. Guardas: sin pozos rentables se conserva el rango completo (si no queda **invertido** y el gráfico sale vacío — 6 campos reales), y si el candidato cae bajo el mínimo real se devuelve `null`. **Borde `step=0.01`:** el slider mueve en múltiplos de 0,01 y la métrica de los pozos es un float **sin redondear** — el pozo que fija el mínimo queda **por debajo** del valor más bajo alcanzable y quedaba excluido: el eje X terminaba en el **penúltimo** pozo y el acumulado cerraba 82 KUSD por encima del KPI. El filtro lleva ahora **tolerancia de un `step`**, en la curva **y** en `visibleUwis` (el mapa), que compartían el defecto. **Reset entre poblaciones:** `rangeMin`/`rangeMax` guardan valores **absolutos** (USD/Bl), no fracciones, y no se reseteaban — al cambiar de campo el pulgar caía a media pista y, peor, el rango obsoleto **seguía filtrando pozos** del campo nuevo en silencio; se sueltan cuando cambia la escala, ajustando **durante el render**. **Series acumuladas:** las 4 (`EBITDA-Cum`, `Aceite-Cum`, `UO-Cum`, `UN-Cum`) pasan de `spline` a **línea recta** — un spline aproxima con Bézier en vez de pasar por los puntos; las **/Bl** conservan el suavizado. ⏳ PENDIENTE validación humana. |
| **EBITDA Rank — el slider ya no filtra el mapa (2026-08-13)** | El `RangeSlider` acota **solo la curva** de rentabilidad. Antes recortaba también los puntos del `WellConditionMap`: al cerrarlo, el mapa pasaba de ~70 puntos a ~11 y dejaba de servir como referencia geográfica justo cuando el usuario acotaba el eje. Se eliminan **`visibleUwis`, `rankedUwis` y `filteredPoints`** — sin consumidor tras el cambio (mismo criterio que `aceiteCum`/`ebitdaCum` el 2026-08-12), con un comentario que fecha la decisión para que no se lea como regresión. El mapa **conserva su propio filtro**, independiente: los chips de categoría (`activeCategories`). ⏳ PENDIENTE validación humana. |
| **Reporte Excel "Redistribuido V05" — descuento % sobre Costos Fijos (2026-08-12)** | Quinto reporte de redistribución, en el **AvatarPanel** junto a V03/V04. Es el **V04 con un único paso intercalado**: antes de iterar, el costo fijo de cada pozo de la línea base se rebaja el % que el usuario elige. **Primer tile de descarga del proyecto que pide un dato antes de bajar el archivo** — los otros 8 descargan directo. `DescuentoCfModal` (slider **0-100 con 1 decimal**, sobre el primitivo `Modal`) 🔴 **se monta en `Header.tsx`, NUNCA dentro de `AvatarPanel`**: ese panel se renderiza como `{avatarOpen && <AvatarPanel/>}` y **se desmonta al cerrarse**, llevándose el modal y su estado. Mismo patrón que ya usa `CostosFijosModal` (ver el comentario en `Header.tsx`). `AvatarPanel` solo recibe la prop `onOpenDescuentoV05Modal`; `Header` posee el estado y **dispara la descarga**, así que el .xlsx se genera aunque el usuario cierre el panel. El modal se cierra **antes** de descargar para no dejar un diálogo congelado. `downloadReport` gana un 3.er parámetro **opcional** `extraParams` (retrocompatible: las 8 llamadas existentes no cambian). ⏳ PENDIENTE validación humana. |

| **Reporte Excel "Redistribuido V06" (2026-08-25)** | Sexto reporte de redistribución, en el **AvatarPanel** debajo del V05. Comparte el componente `DescuentoCfModal` pero **con estado propio** (`descuentoV06ModalOpen` / `downloadingV06` en `Header.tsx`): abrir uno no interfiere con el otro y las dos descargas pueden convivir sin pisarse el indicador de progreso. Mismo patrón de montaje que el V05 — el modal vive en `Header`, `AvatarPanel` solo recibe `onOpenDescuentoV06Modal`. `downloadReporteRedistribuidoV06(descuentoCfPct)` en `reportService.ts` apunta a `/api/v1/ebitda-rank/export-redistribuido-v06`. |

### Funcionalidades incorporadas — Backend ✅

| Módulo | Componentes operativos |
|---|---|
| **Auth** | LDAP real `red.ecopetrol.com.co` + cookie firmada `itsdangerous` + `auth_events` instrumentada. `GET /api/v1/auth/session-timeout` (2026-08-11) — timeout de sesión vigente, solo lectura, requiere sesión válida (no admin); reusa `get_session_timeout_minutes()` de `shared/app_settings.py`, consumido por el modal de inactividad del frontend. |
| **Permissions** | RBAC con 4 tablas (`group_campo_permissions`, `group_section_permissions`, `user_campo_permissions`, `user_section_permissions`) + `PermissionService` |
| **Audit** | `auth_events` activa; `user_actions` lista sin instrumentación frontend (DT-7) |
| **Filters API** | `GET /filters/hierarchy/{level}` bidireccional con RBAC + `GET /filters/periods/years` + `GET /filters/periods/months/{year}`. Nivel `uwi` con EBITDA business logic (6 params extra: from/to year/month, estado_pozo, produccion) → 153 pozos paridad V01. |
| **KPIs Financieros** | `GET /api/v1/kpis-financieros/ebitda-summary` — retorna EBITDA KUSD + EBITDA/Bl (SUM÷SUM) con delta/pct/series mensuales. Columnas seleccionadas por (estado_pozo × produccion). `_sanitize_col` NULLIF PostgreSQL. Formato locale español. Incluye `waterfall_service` + `waterfall_schemas` para datos de cascada. |
| **KPIs Costos** | `GET /api/v1/kpis-costos/` — costos operacionales desglosados. 3 endpoints: (1) `costos-fijos-ticker` — 2 KPIs (Costos Fijos KUSD + USD/Bl) + 7 deltas (Δ costos, Δ costos/bl, Δ energía, Δ tratamiento, Δ M.subsuelo, Δ gasto, Δ costos levant). `CostosFijosTickerService` con `KUSD_COLUMN_MAP` × `BLS_COLUMN_MAP` por (produccion, estado). (2) `costos-gastos-mensual` — stacked bar data: `labels[]` (meses) + `series[]` (key, label, color, values). `CostosGastosMensualService` con 6 componentes (costos_fijos, gastos, tratamiento, m_subsuelo, energia + ingreso-costos calculado). JOIN operating_costs × flow_rates × wells_attributes (DISTINCT ON uwi). RBAC vía `_get_allowed_campos()`. (3) Endpoint base heredado. `services.py` (shared utils: `sanitize_col`, `build_where_and_params`, `KUSD_COLUMN_MAP`, `BLS_COLUMN_MAP`, `normalize_estado/produccion`, `safe_div`). Schemas: `schemas_costos_fijos.py` + `schemas_costos_gastos.py`. |
| **KPIs Producción** | `GET /api/v1/kpis-produccion/qo-qw` — retorna QO+QW+QG por mes. Filtros jerárquicos + well_status. 🔴 Valores inflados +46% por duplicados en `ops.wells_attributes` (causa raíz identificada, fix pendiente). |
| **EBITDA Rank** | `GET /api/v1/ebitda-rank/` — ranking de pozos por EBITDA/Bl descendente. `WellConditionService` integra `classify_well()` con `fin_alias="fr"` + LEFT JOIN `operating_costs`. Retorna `wells[]` + `well_count` + `kpi_ebitda_bl` + `summary` (rentable/marginal/no_rentable counts reales). API + services + schemas. |
| **Regression** | `GET /api/v1/regression/` — regresiones de producción. Integra `classify_well()` con `fin_alias="fin"` + LEFT JOIN `operating_costs`. Cada pozo clasificado por categoría de condición. API + services + schemas. |
| **Detalle Ingresos** | `GET /api/v1/detalle-ingresos/ingresos-combo` — series mensuales con 5 arrays: `ingreso_values` (KUSD) + `brent_values` (USD/bbl) + `difoil_values` (USD) + `trm_values` (COP/USD) + `prod_values` (BOPD). JOIN `financial_results × wells_attributes (DISTINCT ON uwi) × market_base_costs × flow_rates`. `INGRESO_COLUMN_MAP` + `PROD_COLUMN_MAP` por `(produccion, estado_pozo)`. `_sanitize_col()` NULLIF Infinity/NaN. RBAC vía `_get_allowed_campos()`. |
| **KPIs Delta (F14)** | `GET /api/v1/kpis-delta/` — 4 items: Δ BRENT (USD/bbl), Δ DIF OIL (USD/bbl), Δ PRODUCCIÓN (BOPD), Δ TRM (COP/USD). Cada item retorna `id`, `title`, `start`, `end`, `delta`, `pct`, `spark[]`, `unit`, `invert_tone`. BRENT y TRM son globales (sin filtro jerarquía). DIF OIL y PRODUCCIÓN filtran por RBAC + jerarquía. `PROD_COLUMN_MAP` por (produccion × estado_pozo). `_sanitize_col()` NULLIF Infinity/NaN. `DISTINCT ON (uwi)` para wells_attributes. Pydantic schemas `KpiDeltaItem` + `KpiDeltaResponse`. Query params con aliases (`vicePresidency`, `monthStart`, `monthEnd`, `estadoPozo`). |
| **Shared — Well Condition** | `src/shared/well_condition.py` — módulo compartido: `classify_well()` (rentable/marginal/no_rentable/otro), `resolve_columns()` (4 variantes estado×produccion, `fin_alias` parametrizable), `build_condition_select_columns()` (SQL sanitizado Infinity/NaN). Consumido por `ebitda_rank` y `regression`. 21 tests unitarios. |
| **KPIs Costos — USD/Bl (2026-08-06)** | `GET /api/v1/kpis/costos/costos-usdbl-mensual` — `labels` + `oil_values`/`water_values` (BOPD, alimentan las barras) + 5 componentes, cada uno con **`usd_bl_acumulado` y `usd_bl_mensual`**. **Denominador = producción bruta de crudo**, NO barriles de mezcla: `OIL_COLUMN_MAP[(produccion, estado)]` × `periods.days_in_month` (la columna `production_oil_day_month` está en BOPD pese al nombre). Acumulado = `SUM_acum(costo_usd) / SUM_acum(oil_bopd × días)` — sin ponderación por días, alineado con la convención `SUM ÷ SUM` del resto del proyecto. `usd_bl_mensual` = `costo_usd_mes / (oil_bopd_mes × días_mes)`, capturado **antes** de actualizar los acumuladores. `safe_div` cubre el caso de producción 0 (verificado: ningún campo-mes de 2026 tiene costo con producción nula). |
| **Reporte Excel del período — hoja "Periodo End" (2026-08-06)** | `generate_periodo_report` emite **4 hojas** (antes 3): la nueva `Periodo End` suma los mismos meses que `FC-Periodo` pero restringe el universo a los pozos presentes en el **mes final** del rango (TIBU Ene–Jun: 71→**65** activos, 116→**105** A+I). `_filtrar_fc_mes_final()` es una función **pura que no muta su entrada** — la misma lista cruda alimenta `FC-Periodo`, que se escribe antes — e identifica el mes final por el índice compuesto `anio*100+mes` (cross-year safe). `_fetch_fc_detail` gana `fr.year AS anio` en el SELECT, el `GROUP BY` y el diccionario de salida, cerrando de paso un bug latente que colapsaba el mismo mes de dos años distintos. Reusa el detalle crudo ya traído para `FC-Periodo` → **cero queries adicionales**. Verificado: `FC-Periodo` idéntico celda por celda contra el baseline (187 filas, 0 diferencias). |
| **EBITDA Rank — caudales en el detalle de pozos (2026-08-11)** | `get_pozos_detalle` (`services.py`) y `CondicionPozosService` devuelven **QO/QW** por pozo. `PozoDetalleRow` gana `qo_bopd`/`qw_bwpd`; `CondicionMesRow` y `CondicionPozoRow` los llevan por mes **y** en el acumulado. Variante de columna según el filtro aplicado (`ACEITE_COLUMN_MAP`/`WATER_COLUMN_MAP` por producción × estado), igual que las columnas monetarias de la fila. **Agregación en dos pasos** (CTEs `caudal_mes` → `caudal`): un pozo puede tener varias filas por mes (una por zona: **11,7%** de los pozo-mes del dataset, hasta 6) y entre zonas el caudal **SE SUMA** — dos zonas de 10 y 15 BOPD son 25, no 12,5. Solo después se promedian los meses, ponderando por `MAX(production_days)` (2 zonas de 30 días no son 60). Medido: **CUPI0026S pasa de 226,8 a 453,6 BOPD**; los pozos de una sola zona no cambian. |
| **Reporte Excel "Periodo End V02" (2026-08-11)** | `GET /api/v1/ebitda-rank/export-periodo-end-v02` → `Periodo_End_V02_<ts>.xlsx`. Se implementa como flag **`solo_fc`** sobre `generate_periodo_report` y **no** como generador aparte, para que los dos reportes compartan una sola versión de la portada, de `FC-Periodo` y de `Periodo End` y no puedan divergir. **Layout de 31 columnas** (`FC_HEADERS_PERIODO31`): incorpora Costos Levant., Breakeven, EBITDA/Bl, EBITDA_Var y EBITDA_Var/Bl — que solo existían en el reporte de línea base —, **suprime ON-OFF** y **no oculta ninguna columna**. Las 5 nuevas las adjunta `_adjuntar_linea_base` emparejando por UWI contra el ranking ya colapsado: verificado que ambas fuentes comparten universo exacto (**71/71** en real, **70/70** en tasa) y coinciden en EBITDA → cruce 1:1, **cero consultas extra**. **Unidades:** producción (4-5) en **Bl del período** (BOPD × días producidos, convertido dentro de cada mes) y **siempre desde la variante Tasa** vaya el resto en Real o Tasa; costos (7-14) en **USD/Bl** sobre los mismos barriles de mezcla que Breakeven y EBITDA/Bl; Ingresos, EBITDA, EBITDA_Var y utilidades **en KUSD** (decisión del usuario: masa monetaria en KUSD, costos unitarios en USD/Bl). `fc_layout_base(headers)` deriva totales, ocultas y arranque del bloque 2 **por nombre**, nunca por índice: al insertar columnas en medio los índices se corren y el bloque A+I caía dentro del merge del primero. Verificado (TIBU Ene–Jun): FC-Periodo **71** pozos, Periodo End **65**, End ⊂ FC, un pozo común idéntico en ambas. `Excel Periodo + End` **no cambia**: 4 hojas, 27 columnas, producción en BOPD apilado. |
| **Hoja "Periodo End" — regla de pozos sin crudo (2026-08-11)** | `_ajustar_pozos_sin_crudo` corre **al final** de la cadena que arma la hoja (necesita el caudal del mes final ya asignado). Dos casos sobre ese caudal: **(1)** crudo **y** agua en cero → la fila se **omite**; **(2)** agua > 0 con crudo 0 → **1 BOPD** y recálculo de los 8 costos USD/Bl, EBITDA/Bl y EBITDA_Var/Bl con **barriles = 1 BOPD × días producidos**. El **Breakeven no** se recalcula: llega precargado desde `financial_results.breakeven_a_usd_bbl`, ya en USD/Bl, y su fórmula vive fuera del repo. Función **pura**, no muta su entrada. Solo aplica a `Periodo End`: `FC-Periodo` conserva su universo completo, de modo que el mismo archivo lleva **dos criterios** a propósito. TIBU Ene–Jun: **65 → 64** pozos. |
| **Redistribuido V04 — su línea base ES la hoja "Periodo End" (2026-08-11)** | `generate_periodo_end_rdt_report` repite la **misma cadena** que el V02 (`_filtrar_fc_mes_final` → `_agregar_fc_periodo` → `_adjuntar_linea_base` → `_adjuntar_caudal_mes_final` → `_ajustar_pozos_sin_crudo`), y el último paso es el que garantiza que los dos reportes corran sobre el **mismo universo**. Sin él, el bucle iteraba sobre 65 pozos mientras el V02 mostraba 64. Efecto de conectarlo: base del ejercicio /Bl **−2,7288 → −2,0232** USD/Bl (TIBU0300K aportaba −119,89 KUSD de numerador y **cero** barriles al `SUM÷SUM`), iteraciones **5 → 4**, corte **TIBU0152K → TIBU0520ST**, y desaparecen las dos filas `sin barriles`. |
| **Scripts — despliegue puntual sin git (`RRDC.py`, 2026-08-11)** | `scripts/RRDC.py` parchea un `report_service.py` **ya desplegado** en el servidor productivo, que **no tiene git** y donde un ciclo migra+deploy es desproporcionado para un cambio de 80 líneas. Inserta `_ajustar_pozos_sin_crudo` y sus 3 llamadas mediante **anclas de texto únicas**. `--verificar` (por defecto, no escribe) · `--aplicar` · `--revertir` · `--ruta`. Idempotente, respaldo con marca de tiempo, `py_compile` **antes** de escribir, aborta si algún ancla no es única (señal de que el archivo del servidor difiere), preserva el fin de línea y restaura solo si la verificación final falla. Verificado: salida **byte a byte idéntica** al repo (214.892 caracteres). Tras aplicar hay que **reiniciar el backend**. |
| **EBITDA Rank — `ORDER BY` por criterio (2026-08-12)** | `EbitdaRankService.get_ranking()` gana el parámetro **`criterio`** (default `"ebitda"`) y el `ORDER BY` deja de estar hardcodeado: resuelve a `util_oper_bl`, `util_neta_bl` o `ebitda_bl` mediante un **dict acotado a 3 literales fijos** — `criterio` **nunca se interpola en SQL**, solo se usa como clave, así que no hay superficie de inyección. `GET /ranking` lo expone con la misma validación que ya usaban los otros 3 endpoints del archivo (`if criterio not in (...)`). Los **2 callers de `report_service.py`** pasan `criterio="ebitda"` **explícito**: el PNG de la portada del Excel debe seguir replicando la curva EBITDA (paridad `F-TENDENCIA-PARIDAD`), sin depender de un default que alguien pueda cambiar. Con `criterio="ebitda"` el comportamiento es **idéntico** al anterior. |
| **EBITDA Rank — orden del bucle del V05 (2026-08-13)** | `_optimizar_mes_v03` gana el parámetro **keyword-only `orden`** (default `"ebitda"`, el histórico). Dos valores: `"ebitda"` (menor EBITDA — **V03 y V04**, sin cambios) y `"ebitda_cfg"` (menor `EBITDA + costos_fijos + gasto` — **solo el V05**). El motivo: apagar el pozo *p* cambia el total en **`−(EBITDA_p + CF_p)`**, porque se pierde su EBITDA **y además** su costo fijo se reparte entre los supervivientes; ordenar por `ebitda` y decidir por otra cosa dejaba baches en la trayectoria y el `break` al primer retroceso caía en un **óptimo local**. Con el orden alineado el criterio de parada vuelve a ser exacto (TIBU: para en la iteración 21, máximo real también en la 21). La función de orden se resuelve **una sola vez fuera del `while`**, y con `"ebitda"` es literalmente la expresión anterior → V03/V04 byte a byte iguales. Valida el argumento con `ValueError` (2 literales fijos, nunca interpolado). **`_METRICA_EBITDA_CFG`** deriva de `_METRICA_EBITDA` con `dataclasses.replace` cambiando **solo** el texto de la regla, que se muestra en la hoja: el V05 dice "menor EBITDA + Costos Fijos + Gasto" y V03/V04 conservan el suyo. **`_optimizar_mes_v03_bl` no se toca** — maximiza `SUM÷SUM` y su delta no es `−(EBITDA + CF)`. TIBU al 60%: **148,65 → 279,06 KUSD** (11 → 22 iteraciones), superando los **257,10** de la hoja /Bl. |
| **Reporte "Redistribuido V05" — descuento sobre Costos Fijos (2026-08-12)** | `GET /api/v1/ebitda-rank/export-redistribuido-v05` (con `require_admin` como sus hermanos) → `generate_periodo_end_rdt_v05_report`. Repite la **misma cadena de 6 llamadas** del V04 y añade un único paso: **`_aplicar_descuento_costos_fijos(filas, pct)`**, función **pura** que rebaja **`costos_fijos` (KUSD) Y `costos_fijos_bl` (USD/Bl)**. Se tocan las **dos claves a propósito**: son la misma cifra en dos unidades y cada una alimenta un consumidor distinto — la **columna L** de la hoja (`costos_fijos_bl = costos_fijos × 1000 / total_bls`) y la **masa que reparte el bucle** (`costos_fijos`); descontar solo una dejaría la hoja y el bucle mirando números distintos. 🔴 Corre **DESPUÉS de `_ajustar_pozos_sin_crudo`**, que rederiva `costos_fijos_bl` para los pozos sin crudo — aplicarlo antes lo pisaría. **El V04 no se toca**: el V05 es una función hermana en paralelo, no un refactor compartido. Con **0%** ambos reportes son idénticos. ⚠️ **SUPERADO el 2026-08-20** en lo que respecta al EBITDA: el ahorro **SÍ se acredita** ahora (`ebitda`, `ebitda_var_kusd`, sus `/Bl` y `cond_ebitda` — ver `V05-EBITDA-ACREDITADO` en §19); lo que sigue vigente de esta fila es todo lo demás, incluido que el **Breakeven no cambia** (llega precargado de BD en USD/Bl) y que el **Gasto queda intacto**. `pct` se acota a `[0,100]` en la función además de validarse en el endpoint (`ge=0, le=100`). El % queda en el encabezado de las 3 hojas como **"Escenario:"** y en el nombre del archivo (`V05_desc50-0_<ts>.xlsx`). **6 tests nuevos** (342 → **348**). Medido (TIBU Ene–Jun, 60%): masa de CF **8.620,02 → 3.448,01 KUSD**; iteraciones **2 → 11** (hoja EBITDA) y **4 → 19** (hoja EBITDA/Bl). |
| **EBITDA Rank — selector determinista de la hoja EBITDA/Bl del V05 (2026-08-13)** | `_elegir_mejor_bl` corre los **dos** métodos del bucle /Bl y se queda con el que deje más **EBITDA en KUSD** entre los supervivientes (árbitro decidido por el negocio; **no** el /Bl agregado, que es lo que el bucle maximiza internamente). `_optimizar_mes_v03_bl` gana el parámetro **keyword-only `orden`**: `"ebitda_bl"` (default histórico, **V03 y V04 sin cambios**) y `"efecto_bl"` = `(EBITDA + CF + Gasto) / barriles`, el delta real de apagar el pozo. Es determinista —mismos datos, mismo método— y **sin tabla de campos**, que envejecería con cada recarga de `ops`. Hace falta porque `efecto_bl` mejora el /Bl en los 56 campos medidos pero **empeora el KUSD en 79 de 224 escenarios**, hasta −205.055,66 KUSD en CAÑO SUR ESTE al 100%. `_METRICA_EBITDA_BL_EFECTO` (derivada con `dataclasses.replace`) hace que **la regla impresa en la hoja describa el método que realmente corrió**; el método elegido va al **log de structlog**, no a la hoja. |
| **Reporte "Redistribuido V06" — copia del V05 en paralelo (2026-08-25)** | `GET /api/v1/ebitda-rank/export-redistribuido-v06` (con `require_admin`) → `generate_periodo_end_rdt_v06_report`. **Copia el cuerpo del V05**, no lo reusa: mismo motivo por el que el V05 no reusó el del V04 — en cuanto una versión diverge, compartir implementación obliga a meter condicionales por versión dentro de la cadena ya validada. **El V05 no se toca.** Verificado con openpyxl sobre la BD (TIBU, 30%): desactivando la conversión, el V06 sale **idéntico al V05 celda por celda** (6.537 celdas, 0 diferencias salvo la etiqueta de versión en los títulos). Archivo `V06_desc<pct>_<ts>.xlsx`. |
| **V06 — línea base en KUSD en vez de USD/Bl (2026-08-25)** | `escribir_bloque_fc` gana el flag keyword-only **`costos_en_kusd`** (default `False`, retrocompatible: los 12 llamantes existentes no cambian). Con `True` + `prod_en_bl=True` convierte las **9 columnas de `_V06_COLS_A_KUSD`** —los 7 costos del puente de caja, Costos Levant. y Breakeven— multiplicando por los **barriles de mezcla del período** (`total_bls`), el mismo denominador con el que el V05 las divide; reescribe su encabezado a `(KUSD)` sobre la **copia local** de `headers`, así ninguna otra hoja se entera. La conversión se hace **sobre los valores ya construidos**, sin tocar `_fc_periodo31_row_to_excel`, que comparten las demás hojas. 🔴 **`EBITDA/Bl` y `EBITDA_Var/Bl` NO se convierten**: multiplicarlas por los barriles daría `EBITDA` y `EBITDA_Var`, que ya tienen su propia columna en KUSD en la misma fila. `_anotar_conversion_kusd` anota cada celda con el USD/Bl de origen, los barriles y la fórmula; **Costos Fijos y Gasto conservan su nota previa** (descuento) porque Excel admite un solo comentario por celda y esa importa más — y ya incluían los barriles. Los **dos bucles siguen corriendo sobre los USD/Bl**: el cambio es de presentación, las hojas RDT no cambian. |
| **V06 — hojas de ordenamiento del criterio de apagado (2026-08-25)** | Dos hojas **de lectura** que no intervienen en el cálculo, insertadas entre la línea base y las hojas RDT. **`Ordenamiento RDT -Ebitda`**: la línea base con `EBITDA + CF + Gasto` por pozo de **menor a mayor**, el mismo valor de `_optimizar_mes_v03(orden="ebitda_cfg")`; el 1.º de la lista es el 1.er pozo que apaga el bucle (verificado: TIBU0397). **`Ordenamiento RDT -Ebitda-Bl`**: el criterio de `_optimizar_mes_v05_agua` **no es un único valor ordenable** sino dos pasos —de los `_VENTANA_AGUA`=2 pozos de menor EBITDA/Bl se apaga el de mayor agua—, así que ordena por **EBITDA/Bl ascendente** y **marca las 2 filas de la ventana** resaltando cuál gana por agua (`APAGA (más agua)`). 🔴 **Sin esa marca la hoja mentiría**: medido en TIBU al 61%, el pozo que se apaga (TIBU0568, 26.560 Bl) es el **2.º por EBITDA/Bl**. Los pozos sin barriles dan `EBITDA/Bl = −∞` (no escribible en Excel): celda vacía y van primero, como los trata el bucle. ⚠️ Ambas son la **foto del ARRANQUE**, no la secuencia de apagados —el bucle recalcula en cada vuelta tras repartir el CF+Gasto—; queda advertido en la nota de celda del pozo elegido. |
| **Middleware stack** | correlation_id + auth + request_logger (structlog JSON UTC) |
| **Core** | config + logger + secrets + exceptions |
| **EBITDA Rank — KPIs /Bl por componente (2026-08-12)** | `EbitdaRankResponse` (`schemas.py`) gana `kpi_util_oper_bl` y `kpi_util_neta_bl`, `SUM/SUM` sobre el **mismo** universo y el **mismo** denominador que `kpi_ebitda_bl` — misma query `sql_kpi` de `get_ranking()` (`services.py:860-910`), cero consultas adicionales. Verificado contra PostgreSQL (TIBU, 2026 Ene–Jun): −6,3695 y −13,0536 USD/Bl. Se implementó para que la cinta de `/ebitda-rank` reflejara el universo del ranking (69 pozos) en vez del global (567) — ver fila hermana en Frontend; el consumidor del frontend se revirtió por decisión del usuario, así que los dos campos viajan en la respuesta **sin consumidor actual**. |
| **Scripts — restaurar dump de `ops` sin `psql` (2026-08-06)** | `scripts/restaurar_ops_dump.py` — aplica un `.sql` de `pg_dump` en máquinas **sin las herramientas cliente de PostgreSQL** (el servidor de pruebas no tiene `psql.exe` y la BD es remota). Lee el dump **en streaming** y lo ejecuta con `psycopg2` desde el venv del backend, alimentando los bloques `COPY ... FROM stdin` con `copy_expert()`. Todo en **una transacción**: si algo falla, `ROLLBACK` y la BD queda intacta. Valida conteos por tabla y la suma de control de EBITDA antes del commit. Probado contra `ops_20260806.sql`: 95 sentencias + 7 bloques COPY en 25s, 7/7 tablas OK, `SUM(ebitda_a_kusd)=7.163.924,81` exacto. Los dumps de la raíz (`.sql`/`.dump`/`.zip`) quedan gitignoreados — son artefactos operativos de 300+ MB. |

### Datos

| BD | Tipo | Estado |
|---|---|---|
| `robustez_v02_auth.db` | SQLite | 8 tablas DDL v0.2 + 1745 filas migradas de V01 |
| `bitacora.db` | SQLite | 5 tablas + 119 entradas (cambios diarios desde 4-may hasta 2026-08-12) |
| `robustez_v02.db` | SQLite operacional | Esquema estrella (~127 MB), datos sin cargar |
| PostgreSQL `ops.*` | PostgreSQL 18.4 — `10.100.26.139:5432/robustez_v02` | **7 tablas** (6 del esquema estrella + `field_polygons`). Dataset **re-export 2026-08-11** (corrección de datos, menos filas que el re-export 2026-07-17) cargado el 2026-08-11 en dev y replicado al 139: `periods` 18 · `wells_attributes` **40.130** · `market_base_costs`/`flow_rates`/`operating_costs`/`financial_results` **309.842 c/u** · `field_polygons` 943 (15 campos). Rango sin cambios: **2025-01 .. 2026-06**. `well_status`: ACT 15.829 / ABA 12.341 / INACT 8.640 / SUS 3.320. Suma de control `SUM(ebitda_a_kusd)` = **7.144.252,11** (era 7.163.924,81) |
| `data/Tablas Nuevo Esquema 2026-07-17/` | 6 CSV `;` | ~366 MB — fuente del dataset actual. Gitignoreada (`data/Tablas Nuevo Esquema*/`) |
| `data/seeds/*.csv` | CSVs | ~215 MB |

### Tests

- **Backend:** **359 passed** (`pytest tests/unit -q --no-cov`, 2026-08-20). ⚠️ **La suite crashea de forma INTERMITENTE** con `Windows fatal exception: access violation` desde el 2026-08-20 — no es un test que falle, es el proceso que muere; reintentar suele bastar. Es hardware, no código (ver `INCIDENTE-PERMISOS-DEPS` en §19). **+1 sobre los 358**: el test que fijaba "el descuento del V05 NO toca el EBITDA" se reescribió al criterio nuevo —el ahorro **sí** se acredita— conservando lo que sigue vigente (Breakeven y demás costos intactos) y dejando el criterio anterior como **caso negativo**; se añadió `test_descuento_cf_cero_no_toca_el_ebitda`, que blinda que el V05 al 0% siga coincidiendo con el V04 (ver `V05-EBITDA-ACREDITADO` en §19). **Sin tests nuevos** para las notas de celda de `016a2be`: se verificaron sobre los .xlsx reales (256 notas, 0 errores aritméticos) — mismo patrón que `_create_tendencia_chart`, y deuda pendiente. Antes (2026-08-19): los 3 tests de caudal de `test_reporte_periodo.py` se actualizaron al criterio nuevo de `FC-Periodo` (días calendario del período, variante del filtro) conservando lo que ya bloqueaban y añadiendo el criterio anterior como **caso negativo**; el helper `_fila_fc` emite ahora `prod_*_cal_bl` y `days_in_month` (ver `F-CAUDAL-FC` en §19). **Sin tests nuevos** para `_optimizar_mes_v05_agua` ni para `comparacion_service.py`: ambos se verificaron generando los .xlsx reales y contrastando contra PostgreSQL — corolario de DT-15/R3, y deuda pendiente. Antes (2026-08-13): **+6** por el selector de la hoja EBITDA/Bl del V05 (`_elegir_mejor_bl`): orden por efecto real, default histórico que blinda V03/V04, `ValueError` con orden inválido, el selector elige por KUSD, el empate conserva el histórico y el selector nunca empeora frente al histórico. `tests/conftest.py` estrena un **fixture `autouse`** que aísla `structlog` por test — sin él, 3 de esos 6 fallan con `I/O operation on closed file` solo al correr la suite completa (ver `V05-SELECTOR-BL` en §19). **+1 sobre los 351 del mismo día**: `test_v04_toma_el_caudal_de_qo_mes_final_no_lo_recalcula` blinda el fix de `_fc_v04_comunes` (ver bitácora `F-CAUDAL-RDT`) — fija que las columnas Prod. Aceite/Agua de las hojas RDT-EBITDA/RDT-EBITDA-Bl lean `qo_mes_final`/`qw_mes_final` tal cual, no un promedio del período con `prod_aceite_tasa_bl`/`prod_days`. **+3 sobre los 348 del 2026-08-12**: `test_redistribuido_v03.py` cubre el parámetro `orden` de `_optimizar_mes_v03` — (1) con `"ebitda_cfg"` se apaga el pozo cuyo apagado **sí** mejora el total, mientras el orden histórico corta sin apagar a nadie; (2) **sin pasar el parámetro** el resultado es idéntico a `orden="ebitda"` (blinda a V03/V04); (3) un valor fuera de los 2 admitidos lanza `ValueError`. Antes: **+6 sobre los 342 del 2026-08-11** por la función de descuento % del reporte V05 (commit `6dbca90`). Incluye `test_well_condition.py` (21 tests: classify_well + resolve_columns + build_condition_select_columns) + `test_filters_service.py` (15 tests F6.1) + `test_reporte_periodo.py` (colapso del período por UWI y por campo; 5 de `_filtrar_fc_mes_final`: exclusión del pozo ausente en el último mes, conservación de todos los meses del pozo, índice compuesto cross-year, lista vacía y no-mutación de la entrada; conversión BOPD→Bl con meses de distinta duración —bloquea el error de sumar-primero-multiplicar-después— y layout de 31 columnas —posiciones 14-16 y 19-20, ausencia de ON-OFF, pureza de `_adjuntar_linea_base`; 5 de `_ajustar_pozos_sin_crudo`: omisión del pozo sin crudo ni agua, barril asignado con recálculo de las columnas /Bl, escalado por días producidos, identidad sobre el pozo que sí produce y no-mutación de la entrada; **2026-08-12**: descuento % sobre Costos Fijos antes de iterar) + `test_redistribuido_v03.py` (**33** — bucle V03/V04 por EBITDA y por EBITDA/Bl, encabezado, 2 de `_texto_delta`: decimales adaptativos hasta que aparece cifra significativa y ruido de punto flotante tratado como cero, y **3 del parámetro `orden`** del V05). Coverage ~60% (DT-9, threshold 75%). **`--no-cov` obligatorio** al correr la suite.
- **Frontend:** tests por feature (`HierarchyPills`, `PeriodoControls`, `WellConfigControls`, primitivos). Vitest jsdom + RTL + jest-dom + mock global de `ResizeObserver`. Coverage threshold global 80%.

### Decisiones técnicas adoptadas (paneles de filtro)

Stack único para los 3 paneles (Jerarquía, Período, Well Config):
- **Sass módulos** + **Lucide React** + **Zustand 5** + **Zod 3.24** + patrón **draft/applied**.
- **Paleta Ecopetrol estricta**: verde `#004236` + amarillo `#F7DB17` + variantes (`#059669`, `#d97706`, `#fff8dc`).
- **NO** Bootstrap, **NO** date-fns, **NO** react-hook-form en paneles.

### Pendiente inmediato

- **🔴 DECISIÓN DE NEGOCIO (2026-08-20) — el V05 pasa de apagar 21 pozos a 4** (commit `020519d`): al acreditar el ahorro al EBITDA, en TIBU al 60% la hoja RDT-EBITDA cae de **22 iteraciones / 21 apagados a 5 / 4**, y la /Bl de **17 a 2**. Es la consecuencia correcta de la regla que el usuario definió, pero **cambia la conclusión del reporte**: si el V05 existe para identificar pozos a apagar, con descuentos altos casi todos se salvan. Confirmar que es el comportamiento buscado antes de desplegarlo.
- **⏳ Validación humana (2026-08-20) — reporte V05: notas y EBITDA acreditado** (commits `016a2be`, `020519d`): las cifras **ya están verificadas** con openpyxl sobre .xlsx reales (256 notas con 0 errores aritméticos; V05 al 0% idéntico al V04 en 2.046 celdas; 0 notas al 0%). Falta **solo lo visual**: descargar el V05 al 60% y confirmar que **(1)** Excel **no pide reparación** —es el **primer uso de comentarios de celda** del proyecto—; **(2)** la pestaña se llama **`Periodo End 60,0% CF`**; **(3)** al pasar el cursor aparecen notas en **Costos Fijos, EBITDA, EBITDA/Bl, EBITDA_Var y EBITDA_Var/Bl**, y en **Condición EBITDA solo en los pozos que cambiaron de rótulo** (18 de 64 en TIBU); **(4)** el **Gasto sigue intacto** (13,37 USD/Bl en TIBU0397, igual con y sin descuento). ⚠️ Es **solo backend**: sirve el patrón de parcheo puntual (`RRDC.py`/`ajuste_Q.py`) + **reiniciar el backend**.
- **⏳ Validación humana (2026-08-19) — módulo `/comparacion-modelos`** (commit `6508524`): abrir la ruta y confirmar que **(1)** las 4 tarjetas caben en el viewport sin scroll de página; **(2)** al mover el slider de descuento el gráfico se recalcula **al soltarlo**, no mientras se arrastra; **(3)** el slider «Rango del eje» recorta los campos y el chart se encoge en vez de dejar un vacío; **(4)** al cambiar de período los pulgares del rango vuelven a su posición inicial; **(5)** F12 sin errores. Con 60% de descuento la tabla derecha debe mostrar **Base → Método 2 (agua)** con **0 campos desmejorando**.
- **⏳ Validación humana (2026-08-19) — reporte V05 con el criterio de agua** (commit `482f142`): las cifras **ya están verificadas** con openpyxl sobre el .xlsx que el usuario descargó (RDT-EBITDA **278,82** / 21 apag / 43 vivos; RDT-EBITDA-Bl **249,25** / 17 / 47). Falta **solo lo visual**: abrir el archivo en Excel y confirmar que **no pide reparación** y que la regla impresa en la hoja `RDT-EBITDA-Bl` dice *«de los 2 pozos de menor EBITDA/Bl se elimina el de MAYOR producción de agua…»*.
- **⏳ Validación humana (2026-08-19) — caudal de `FC-Periodo`** (commit `3cb901f`): descargar el **Excel Periodo End V02** con RUBIALES / 2026 Ene–Jun / Activos / Real y confirmar que la SUM de las columnas 4 y 5 de `FC-Periodo` da **95.064,18 BOPD** y **4.527.415,59 BWPD** — los mismos valores del ticker QO/QW de la cinta. ⚠️ La hoja `Periodo End` **debe seguir mostrando el caudal del mes final**, distinto por diseño.
- **🔴 Deuda abierta (2026-08-19) — sin cobertura de tests:** `_optimizar_mes_v05_agua` (report_service.py) y `comparacion_service.py` completo. Ambos se verificaron generando los .xlsx reales y contrastando contra PostgreSQL, pero **ningún test los cubre**: la suite pasa idéntica con y sin ellos. Mismo patrón que `_create_tendencia_chart` (ver §17.6).
- **🔴 Hardware — diagnóstico abierto (2026-08-12, reincidente 2026-08-19):** la estación de desarrollo acumuló **10 pantallas azules** con `BugCheck 0x1A (MEMORY_MANAGEMENT)` entre el 4 y el 11 de agosto, y el 2026-08-19 apareció un **objeto Git corrupto** de un commit del 11 de agosto que bloqueó los commits (resuelto sin pérdida, ver §19). Son dos manifestaciones del mismo cuadro. Acciones recomendadas, en orden: **(1)** desactivar **D.O.C.P./XMP** en BIOS y observar 2-3 días; **(2)** `chkdsk` en C: por el pagefile; **(3)** **MemTest86** desde USB, ≥4 pasadas. Los minidumps no se están guardando, así que no hay análisis de driver posible sin resolver antes por qué.

- **⏳ Validación humana (2026-08-18) — login: transición cinematográfica a Main** (F-LOGIN-CINE, sin commit): en `/login`, login con credenciales válidas → los 4 pasos LDAP deben verse marcar **uno a uno** (con timing perceptible, no de golpe) → botón "Autenticado" verde → página se atenúa → cortina de 2 hojas cierra → sello con 3 anillos dorados en pulso + "ROBUSTEZ" + "ACCESO CONCEDIDO" + correo → cortina abre sobre el preview del Main → aterriza en `/` con el Main real, sin parpadeo. Caso de error: credenciales inválidas → vuelve a "Iniciar sesión" con toast rojo, **la cortina nunca debe aparecer**. Confirmar también `prefers-reduced-motion` (secuencia ~250ms) y F12 Console sin errores/warnings de Strict Mode. Ya se corrigió en sesión un defecto detectado por el propio usuario (la revelación de los pasos colapsaba a "todo listo" con un backend rápido) — falta la confirmación visual final.
- **⏳ Validación humana (2026-08-13) — selector de la hoja EBITDA/Bl del V05** (commit `5589ab0`): descargar el V05 al **60%** para **TIBU** y para **CAÑO SUR ESTE** y abrir ambos en Excel. Confirmar que **ninguno pide reparación** y que la hoja `Periodo End (RDT-EBITDA-Bl)` muestra: en **TIBU** la regla nueva (*"menor (EBITDA + Costos Fijos + Gasto) por barril"*), **22 iteraciones / 21 apagados / 43 vivos**; en **CAÑO SUR ESTE** la regla histórica (*"menor EBITDA/Bl"*), **19 / 18 / 209**. Las cifras ya están verificadas con `openpyxl` sobre los .xlsx generados por el mismo camino que la app — falta solo lo visual. ⚠️ En TIBU las hojas H1 y H2 dan **el mismo número (279,06)**: no es un error, el selector eligió `efecto_bl` y ese método converge al mismo conjunto de 43 pozos que la hoja EBITDA.
- **⏳ Validación humana (2026-08-13) — el mapa ya no se vacía con el slider** (commit `04fd997`): abrir `/ebitda-rank` con **TIBU / 2026 Ene–Jun / Productor / Crudo / Activos / Real** y arrastrar el pulgar derecho hacia la izquierda. El **mapa debe conservar sus ~70 puntos** mientras la curva se recorta (antes bajaba a ~11). Los chips Rentable/Marginal/No rentable deben seguir filtrando el mapa con normalidad. ⚠️ Requiere **rebuild** del frontend (`MIGRA.bat` + `DEPLOY.bat`): un `git pull` en el servidor no basta.
- **⏳ Validación humana (2026-08-13) — reporte V05 con el orden nuevo** (commit `ab7539c`): las cifras **ya están verificadas** con `openpyxl` sobre el .xlsx que el usuario descargó de la app (hoja EBITDA 22 iter / 21 apag / 43 vivos / **SUM col S = 279,06**; hoja /Bl **19 / 18 / 46 / 257,10** sin cambios; regla nueva presente). Falta **solo lo visual**: abrir en Excel el **V05 al 60%** y el **V04** y confirmar que **ninguno pide reparación** y que el formato de las 3 hojas se ve bien. El V04 debe seguir en **2 iteraciones / 1 apagado** en TIBU (⚠️ **no** 11/10 — ese número del plan correspondía al V05 al 60% con el orden viejo; el V04 no lleva descuento de costos fijos, así que su comportamiento es estructuralmente distinto).
- **⏳ Validación humana (2026-08-13) — RangeSlider de `/ebitda-rank`** (commits `5a625c7`, `af9854b`, `cbd3573`; ninguno visto en pantalla): con **TIBU / 2026 Ene–Jun / Productor / Crudo / Activos / Real** confirmar que **(1)** al cargar, el pulgar izquierdo arranca en **−37,79** con la barra gris llegando hasta **−421,52** (si los extremos no dicen −421,52 el bundle es viejo); **(2)** arrastrando ese pulgar al tope izquierdo el eje X llega hasta **TIBU0091K** — no TIBU0568 — y el acumulado café cierra en **−399,44 KUSD**, igual que el KPI de la cinta; **(3)** cambiando a **CAÑO SUR ESTE** los extremos del slider se actualizan al rango de ese campo (mínimo **positivo**, ≈ +16) y los pulgares vuelven a su posición inicial, en vez de conservar los de TIBU. ⚠️ **Ojo con el despliegue:** el frontend se sirve compilado, así que un `git pull` en el servidor **no basta** — hace falta rebuild (`deploy_zip.py`) para que los cambios aparezcan.
- **⏳ Validación humana (2026-08-11) — modal de sesión inactiva**: abrir la app, bajar temporalmente el timeout a 5 min desde el panel Admin (`Configuración → Timeout de sesión`) para no esperar el valor real, dejar de mover el mouse/teclado y confirmar: (1) el modal aparece con el icono mano circular amarillo, título "Sesión inactiva" y el texto con los minutos correctos; (2) mientras el modal está abierto, seguir sin tocar nada NO lo hace desaparecer solo (el timer debe estar pausado); (3) click en "Entendido" cierra sesión y redirige a `/login`; (4) si en cambio se mueve el mouse ANTES de que aparezca el modal, el timer se resetea y el modal no aparece. Restaurar el timeout original al terminar la prueba.
- **⏳ Validación humana (2026-08-11) — regla de pozos sin crudo**: abrir el .xlsx de **"Excel Periodo End V02"** con TIBU / 2026 Ene–Jun / Productor / Crudo / Activos / Real y confirmar en la hoja `Periodo End`: (1) **TIBU0300K no aparece**; (2) **TIBU0248** va con `Prod. Aceite = 1,00` BOPD, `Prod. Agua = 53,09` y **EBITDA/Bl = −766,82**; (3) la hoja tiene **64 pozos** (antes 65); (4) `FC-Periodo` **sin cambios**, con sus 71 y los dos pozos presentes; (5) el Breakeven de TIBU0248 sigue en **0** — es esperado, llega precargado de BD.
- **⏳ Validación humana (2026-08-11) — Redistribuido V04**: confirmar que su hoja `Periodo End` es **idéntica** a la del V02 (64 pozos), que la tabla "Detalle de las iteraciones" muestra **bordes, contenido centrado, el EBITDA del pozo y el reparto en prosa**, que dice **"iteraciones"** y no "vueltas" (también en el gráfico y su eje X), que el título dice **V04**, y que el **gráfico de trayectoria dibuja una línea continua** (si sale partido en tramos, alguna celda de *Total después* volvió a ser texto). En el ejercicio /Bl: base **−2,0232**, 4 iteraciones, corte en **TIBU0520ST**.
- **⏳ Validación humana (2026-08-11) — `/detalle-costos` en navegador**: tras unificar el denominador a barriles de mezcla, confirmar los 5 chips y la curva. El chip **Levantamiento** debe marcar **71,38** USD/Bl (antes 61,93) — el cambio es deliberado, prioriza la coherencia con Utilidad Neta sobre el ajuste del 2026-08-06.
- **✅ Despliegue completado (2026-08-11)**: `scripts/RRDC.py --aplicar` aplicado en el servidor productivo y backend reiniciado.
- **⏳ Validación humana (2026-08-11) — PNG del reporte = curva de la web (H-V1..H-V9)**: abrir `/ebitda-rank` con **TIBU / 2026 Ene–Jun / Productor / Crudo / Activos / Real**, anotar la curva, descargar el Excel del popover **Reporte** y comparar la portada. Confirmar: (1) misma forma general, incluido el "codo" del final; (2) eje EBITDA/Bl de **≈ −46 a +38** — ni −416 (rango completo viejo) ni −40 (si se ignorara UO/UN); (3) zona verde/roja cruzando en una posición comparable a la web (**55,0%** del ancho, no el 50% ni pegada a un extremo); (4) línea punteada gris **"KPI: -2,95 USD/Bl"**; (5) curva EBITDA/Bl **azul marino** (no café), Aceite-Cum verde, EBITDA-Cum **café** (no naranja); (6) el **scatter de condición no cambió**; (7) hojas de ranking / `FC-Periodo` / `Periodo End` **sin cambios**; (8) el Excel abre **sin aviso de reparación**; (9) la curva dibuja **visiblemente menos pozos** (≈46 en vez de 69) — sin la cola que se desplomaba a −416.
- **⏳ Validación humana (2026-08-11)**: reporte **"Excel Periodo End V02"** (4.º tile) — abrir el .xlsx y confirmar: (1) **3 hojas** (portada SOT · FC-Periodo · Periodo End) sin el ranking `Periodo-<año>`, (2) abre **sin aviso de reparación**, (3) **31 columnas** en el orden acordado, ON-OFF ausente y **ninguna oculta**, (4) cabeceras con sufijo `(USD/Bl)` de la 7 a la 16 y `Tasa Prod. … (Bl)` en 4-5, (5) el label del tile no se trunca, (6) `Periodo End` es subconjunto de `FC-Periodo` (65 vs 71 en TIBU Ene–Jun).
- **⏳ Validación humana (2026-08-11)**: **modales de detalle de pozos** — columnas QO/QW en `PozosDetalleModal` (¿caben las 9 columnas en 1012px?) y en la tabla mensual de `CondicionPozosModal` (6 columnas con `table-layout: fixed` sobre 840px). Y **curva de tendencia**: cambiar entre los 3 criterios y confirmar 3/7 + la paleta nueva.
- **🟡 Pendiente menor (2026-08-11)**: `PozosDetalleModal` muestra **doble símbolo `$`** en las 4 columnas monetarias — el JSX antepone `"$ "` y `formatKusdCell` ya devuelve el `$`. Defecto previo, señalado y sin corregir a la espera de decisión.
- **🔴 Pendiente de decisión (2026-08-06, parcialmente resuelto)**: la columna **Prod. Aceite / Prod. Agua** suma los BOPD de los meses, que no es una magnitud física. **Resuelto solo en `FC-Periodo` y `Periodo End` del reporte V02** (2026-08-11): volumen = `Σ(BOPD_mes × production_days_mes)`, anclado a la variante Tasa. **Sigue pendiente** en el resto: hojas `FC-<mes>`, consolidado por campo, hojas de `Excel Periodo + End` y las 4 tablas de línea base.
- **🔴 Bloqueado por definición (2026-08-11)**: *"al breakeven se le quitan los impuestos"*. El breakeven **no se calcula en este repositorio** — llega precargado desde `financial_results.csv` (columna 19), es `DOUBLE PRECISION` plana (`is_generated=NEVER`, sin triggers) y el ETL lo copia sin transformar; su fórmula vive fuera del repo, así que no se puede verificar si los impuestos ya están dentro. Además: `imp_cosgas` viene **positivo** en BD e `imp_renta` **negativo** (signos opuestos, ver `waterfall_utilidades_service.py:9-10`) y ambos están en **KUSD** mientras el breakeven está en **USD/Bl**. Falta que el usuario defina qué conceptos descontar y en qué reportes.
- **🔴 `CLAUDE.md` perdió la bitácora de julio y agosto** — el stash `diagnostic2` lo pisó con una versión del 2026-06-10 y, al no estar en git, no hay copia recuperable. Faltan ~40 entradas (F42, panel Admin, Matriz Multivariable, Redistribuido V02/V03, sesión expirada, timeout de sesión configurable, ingesta 2026-07-17, etc.). Considerar rescatarlas del último `pnpm backup` en `E:\APLICACIONES\Robustez\back_robustez_2.0` o de un zip de `migra.py`.
- **⚠️ Stash ajeno en la pila**: `stash@{0}: On master: diagnostic2` — contenido de antes del deploy de junio (revierte el puerto a `8765`, quita el `sessionInterceptor`, resucita `crear_schema_postgres.py`). **No aplicarlo tal cual.**
- **🔴 CRÍTICO**: multiplicación de filas al unir contra `ops.wells_attributes` — causa raíz de KPI QO/QW inflados +46%. Con DISTINCT ON: QO=37,982 vs V01=38,120 (-0.4%). Dos opciones: (a) DELETE duplicados en BD, (b) DISTINCT ON en query. Decisión del usuario pendiente. **Re-medido sobre el dataset 2026-07-17 (2026-08-06):** 40.157 filas para 13.482 UWIs distintos, pero eso ya **no es duplicación pura** — la PK del esquema v11 incluye `zone`, así que un pozo con varias zonas tiene varias filas legítimamente. Lo que sí persiste: uniendo por la PK completa (`uwi+pend_id_cc+zone+well_status`), **49.071** combinaciones `(uwi, año, mes)` de `flow_rates` siguen multiplicándose. Los hechos, en cambio, están limpios: **0** PKs duplicadas en `flow_rates`. El `DISTINCT ON (uwi)` que ya aplican los servicios sigue siendo necesario.
- **⏳ Validación humana**: `EbitdaRankPage` inline expand desktop (F8-inline-expand) — implementado 2026-05-27, pendiente confirmación V2-V10: carga grid 1.55fr/1fr (V2), Ampliar curva → 1fr 44px + CollapsedTab derecha (V3), Reducir restaura (V4), click CollapsedTab restaura (V5), Ampliar mapa → 44px 1fr + CollapsedTab izquierda (V6), resize a mobile resetea expanded (V7), Ampliar en mobile abre modal (V8), `prefers-reduced-motion` desactiva transición (V9), Plotly resize tras 450ms (V10).
- **⏳ Validación humana**: `WellConditionMap` (ebitda_rank) — 4 traces por categoría implementados 2026-05-27, pendiente confirmación usuario en navegador (V3-V5).
- **⏳ Validación humana**: `TendenciaEbitdaChart` (ebitda_rank) — ajustes visuales aplicados 2026-05-26, pendiente confirmación usuario en navegador.
- **⏳ Validación humana**: `PredVsActualChart` (regresiones) — categorías de condición implementadas, validado parcialmente por usuario.
- **⏳ Validación humana**: KPI ticker EBITDA KUSD + EBITDA/Bl (valores en pantalla, formato 1.234,56).
- Decidir destino de `tests/unit/auth/` untracked (residuos S5 W1 con tests rotos — ver DT-8).
- Resolver OOM de coverage en suite completa (ver DT-9).
- Commit masivo de archivos pre-existentes modificados (CLAUDE.md, scripts, pnpm-lock.yaml, etc.).
- **⏳ Validación humana**: `DetalleCostosPage` — chart stacked bar operativo, custom tooltip HTML (posición centrada superior en ajuste), KPI ticker costos con 11 items reales.
- **Próximo:** ajuste fino posición tooltip costos, `DetalleDilucionPage` (mismo patrón stacked bar), reporte Excel ebitda_rank, regresiones completo, refinamiento waterfall en `EbitdaInspectorCard`.

> Historial completo de tareas: `git log` + `bitacora.db`.

---

## 9. Convenciones de código

### Naming entre back y front (Interceptores 1 y 2)

| Lugar | Convención | Ejemplo |
|-------|-----------|---------|
| Python (back) | `snake_case` | `ebitda_kusd` |
| TypeScript (front) | `camelCase` | `ebitdaKusd` |
| Contrato JSON heredado V01 | español literal con tildes | `"EBITDA (KUSD)"` |

- **Interceptor 1** — `backend/src/features/<f>/schemas.py`: Pydantic `alias` traduce `snake_case ↔ "EBITDA (KUSD)"`.
- **Interceptor 2** — `frontend/src/features/<f>/mappers/`: funciones puras `to<Entity>UI(api)` traducen `"EBITDA (KUSD)" ↔ camelCase`.

### Patrón Repository–Service–Route (backend)

- `repositories.py` — único punto autorizado para SQL
- `services.py` — lógica de negocio
- `api.py` — endpoints FastAPI (Router)
- `models.py` — entidades de dominio
- `schemas.py` — Pydantic con alias (Interceptor 1)

### Patrón feature frontend

- `pages/` — componentes de pantalla completa
- `components/` — UI específica del dominio
- `hooks/` — TanStack Query hooks (consumen mappers)
- `mappers/` — Interceptor 2
- `services/` — cliente HTTP tipado (openapi-fetch)

---

## 10. Estrategia responsive

> Detalle completo: [`robustez_v02_frontend/docs/RESPONSIVE_STRATEGY.md`](./robustez_v02_frontend/docs/RESPONSIVE_STRATEGY.md)

| Aspecto | Decisión |
|---------|----------|
| Target | Desktop/laptop + mobile básico (M1 bottom sheet) |
| Resolución crítica desktop | 1245×642 @ 100% zoom |
| Rango soportado | **360px → 1920px** (D12 actualizada en F6) |
| Breakpoint mobile | <1024px → layout M1 bottom sheet |
| Viewport <360px | No soportado (sin bloqueo activo) |
| Técnica primaria desktop | `clamp()` en tipografía y espaciados |
| Layout vars | CSS custom properties en `:root` (7 vars) |
| Adaptación a sidebar | Container queries + media queries |
| Validación obligatoria | Chrome DevTools 1245×642 + 1920×1080 + Samsung S8+ 360×740 |

### Identidad visual Ecopetrol
- Verde primario: `#004236` | Verde brillante: `#6CD300` | Amarillo: `#F7DB17` | Naranja: `#FF5F00`
- Neutros: `#f8f9fa / #ffffff / #1a1a2e / #e5e7eb / #111827 / #6b7280 / #9ca3af`
- Semánticos: `#059669 / #dc2626 / #d97706` con fondos pastel

---

## 11. Comandos clave

```bash
# Setup (raíz)
pnpm setup            # pnpm install + uv sync --extra dev + init:bitacora

# Orquestadores raíz
pnpm dev              # back :8000 + front :5173 con concurrently
pnpm lint             # back + front en paralelo
pnpm format           # autofix back + front
pnpm gen:types        # regenera tipos desde OpenAPI

# Backend (puerto 8000)
cd robustez_v02_backend
alembic upgrade head
uv run uvicorn src.main:app --reload --port 8000
uv run pytest tests/

# Frontend (puerto 5173)
cd robustez_v02_frontend
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
```

> **NUNCA** ejecutar `pre-commit install` — husky orquesta el hook desde `.husky/pre-commit`.

---

## 11.5 🔴 Despliegue — `migra.py` + `deploy_zip.py` (LEER ANTES DE OPINAR)

> **Directiva para Claude Code:** cuando el usuario diga "deploy", "migra" o
> "desplegar", los comandos son **estos dos y nada más**. NO inventar pasos
> extra, NO mandar a copiar archivos, NO diagnosticar avisos que son normales.
> El 2026-08-13 se perdió **una hora** haciendo exactamente eso.

### Los 2 comandos — es todo

```powershell
# 1) Empaquetar (en la máquina de desarrollo, desde la RAÍZ del proyecto)
cd C:\APLICACIONES\Robustez\robustez-v02
python robustez_v02_backend\scripts\migra.py
# -> genera migra_<fecha>_<hora>.zip en la carpeta desde donde se ejecuta

# 2) Desplegar (en el servidor, parado DENTRO de la carpeta ya descomprimida)
cd E:\APLICACIONES\Robustez\migra_<fecha>_<hora>
python robustez_v02_backend\scripts\deploy_zip.py
# -> pnpm install + uv sync + alembic upgrade head + levanta :6024 y :6023
```

También existen **`MIGRA.bat`** y **`DEPLOY.bat`** en la raíz (creados 2026-08-13):
doble clic y listo. Se posicionan solos en la raíz — resuelven el error de
ejecutarlos desde `scripts/`.

### 🔴 Regla de oro del `cd`

Ambos scripts exigen estar parado en **la RAÍZ** (la carpeta que contiene
`robustez_v02_backend/` y `robustez_v02_frontend/`), **NUNCA dentro de
`scripts/`**. El script se invoca por su ruta, el `cd` va a la raíz. Ese fue
el error repetido: `cd ...\scripts` + `python deploy_zip.py` →
*"el directorio actual no parece la raíz del proyecto"*.

### ✅ Avisos NORMALES — NO son errores, NO actuar sobre ellos

| Aviso | Por qué aparece |
|---|---|
| `AVISO: no se encontro frontend .env` | **El frontend NO necesita `.env` en el servidor.** El `.env` local es una copia del `.env.example` con `localhost:8765` — puro placeholder. `deploy_zip.py` solo informa; **el deploy funciona igual**. 🔴 NO mandar a copiarlo de otro deploy. |
| `AVISO: bitacora.db no existe` | Es **esperado**, no crítico (`EXPECTED_RELATIVE` en `migra.py`). Vive en la máquina de desarrollo; el servidor nunca la tuvo. `Artefactos criticos: 2/2` = el zip es válido. |
| `.git can't be found` (husky) | El zip excluye `.git` a propósito. Inofensivo. |
| `Ignored build scripts: esbuild...` | pnpm no corre scripts post-install por seguridad. No afecta. |
| `Failed to hardlink files` (uv) | Cache y destino en filesystems distintos (C: vs E:). Solo velocidad. |
| `data/seeds/ y robustez_v02.db excluidos` | Intencional, documentado en `MIGRA_MANIFEST.md`. |
| `el schema ops.* no viaja en el zip` | Intencional. Va aparte con `pg_dump -n ops` + `restaurar_ops_dump.py`. |

### Qué SÍ incluye el zip

- **`robustez_v02_backend/.env`** ← CRÍTICO, sí viaja (`CRITICAL_RELATIVE` en `migra.py:44`)
- `robustez_v02_auth.db` ← CRÍTICO
- Todo el código de back y front
- Si falta alguno de los 2 críticos, **el zip se descarta** y `migra.py` falla

### Qué NO incluye (y no hace falta)

`node_modules`, `.venv`, `.git`, caches, `dist/`, `data/seeds/`,
`robustez_v02.db` (legado), el schema PostgreSQL `ops.*`, y el **`.env` del
frontend** (que no se usa en el servidor).

### ⚠️ Dos copias de trabajo en paralelo

| Carpeta | Uso |
|---|---|
| `C:\APLICACIONES\Robustez\robustez-v02` | **La que usa el usuario** para desarrollar y empaquetar |
| `C:\APLICACIONES\Robustez\Des_robustez_2.0` | Copia paralela (la que ve Claude Code en su sesión) |

Ambas apuntan al mismo remote `https://github.com/jaguez40-star/robustez-v02.git`
y se sincronizan por `git pull`. **Antes de empaquetar, verificar que la copia
tiene los commits esperados** (`git log --oneline -3`) — el 2026-08-13 se generó
un zip desde la copia sin los cambios del día.

> ⚠️ `CLAUDE.md` §4 D2 dice "sin Azure DevOps" y §0.4 menciona que no hay remote
> configurado: **desactualizado**, el remote de GitHub existe y está en uso.

### Frontend compilado

El frontend se sirve **compilado**. Un `git pull` en el servidor **NO** basta
para cambios de `.tsx` — hace falta el ciclo `migra.py` + `deploy_zip.py`
completo. Para cambios solo de backend existe el patrón de parcheo puntual
(`RRDC.py`, `ajuste_Q.py`: `--verificar` / `--aplicar` / `--revertir`).

---

## 12. Documentos fuente

| Documento | Propósito |
|-----------|-----------|
| [`Migracion/Plan_Migracion_Robustez_V06.docx`](./Migracion/Plan_Migracion_Robustez_V06.docx) | Plan estratégico de migración v0.6 |
| [`Migracion/DDL.md`](./Migracion/DDL.md) v0.2 | DDL aprobado `robustez_v02_auth.db` (8 tablas) |
| [`Migracion/db_new.md`](./Migracion/db_new.md) | Resumen BD operacional v10 |
| [`Migracion/schema_v02_operacional_v10.sql`](./Migracion/schema_v02_operacional_v10.sql) | DDL operacional |
| [`Migracion/Gantt_S5_W1_para_ClaudeCode.md`](./Migracion/Gantt_S5_W1_para_ClaudeCode.md) | Vista operativa S5 W1 (referencia histórica) |
| [`docs/decisions/`](./docs/decisions/) | ADRs del proyecto |
| [`docs/claude/bd_operacional_v10.md`](./docs/claude/bd_operacional_v10.md) | Detalle BD operacional (6 tablas, columnas, PRAGMAs) |
| [`docs/claude/design_system.md`](./docs/claude/design_system.md) | Plotly + elevación + movimiento + espaciado |
| [`docs/claude/bitacora_guia.md`](./docs/claude/bitacora_guia.md) | Guía completa bitácora (cómo alimentar y consultar) |
| [`docs/claude/flujo_6_pasos.md`](./docs/claude/flujo_6_pasos.md) | Flujo profesional de ejecución detallado |

### Referencia V01 (`../Des_Robustez/`)
- `app/login/auth_service.py` — LDAP V01
- `app/login/permissions_service.py` — RBAC V01
- `Data/ROBUSTEZ.db` — BD V01 fuente del migrate script

---

## 13. Glosario rápido

| Término | Definición |
|---------|-----------|
| **V01** | WebApp Robustez en producción (Flask + Vanilla JS), `Des_Robustez/` |
| **V2.0** | Nueva versión FastAPI + React 19 + TS, este monorepo |
| **MV1** | Mínimo Verificable 1 — flujo E2E login→home ✅ |
| **Feature** | Carpeta autocontenida con todo lo necesario para una capacidad funcional |
| **Interceptor 1** | Pydantic alias en `schemas.py` — snake_case ↔ JSON heredado |
| **Interceptor 2** | Mapper en `mappers/` — JSON heredado ↔ camelCase TS |
| **Audit nivel MEDIO** | Solo `auth_events` instrumentada; `user_actions` lista pero sin dispatcher |
| **3 niveles design system** | Primitivos → Compuestos → Estructurales |

---

## 14. BD Operacional v10 — `robustez_v02.db`

Esquema estrella: 2 dimensiones (`wells_attributes`, `periods`) + 4 hechos (`market_base_costs`, `flow_rates`, `operating_costs`, `financial_results`). PK compuesta `(UWI, AÑO, MES, ESTADO POZO)`. 83 columnas, 8 FKs, 9 índices.

**Estado:** BD SQLite creada (152 KB), PRAGMAs aplicados — **sin datos y sin uso**. La app lee de **PostgreSQL** (`ops.*` en `10.100.26.139:5432`), cuya versión vigente es el **DDL v11** (`Migracion/schema_v02_operacional_postgres_v11.sql`, versionado en git desde 2026-08-05). Diferencia clave de v11 sobre v10: la PK de los hechos es de **6 columnas** — `(uwi, year, month, well_status, pend_id_cc, zone)`. Ver §8 "Datos" para los conteos actuales.

**Decisión crítica:** `ESTADO POZO IN ('ACT', 'INACT', 'ABA')` — 3 valores, NO 4. `A+I` es variante de cálculo, no fila.

**Nombres de columna:** legacy V01 preservado literalmente (tildes, espacios, mayúsculas, slashes).

> 📘 Detalle completo: [`docs/claude/bd_operacional_v10.md`](./docs/claude/bd_operacional_v10.md)

---

## 15. Skill: Flujo Profesional de Ejecución (6 pasos)

Antes de cualquier tarea no trivial: **Mapeo → Auditoría → Diagnóstico → Propuesta → Aplicación → Verificación**. No saltear pasos. Propuesta completa antes de aplicar. Si un hallazgo afecta D1–D14, detener y escalar.

> 📘 Detalle: [`docs/claude/flujo_6_pasos.md`](./docs/claude/flujo_6_pasos.md)

---

## 16. Skill: Frontend Design Guidelines

**Tono:** industrial-corporativo refinado. **Espaciado base 4px** (4/8/12/16/24). **Elevación 3 niveles** (base / card / modal). **Transiciones ≤ 300ms** con `cubic-bezier(0.4, 0, 0.2, 1)`. Respetar `prefers-reduced-motion`.

**Identidad Ecopetrol:** verde primario `#004236`, verde brillante `#6CD300`, amarillo `#F7DB17`, naranja `#FF5F00`. Tipografía Inter con `tabular-nums` en KPIs.

**Reglas:** variables CSS para colores, `tabular-nums` en KPIs, código production-grade. Nunca cambiar fuente Inter ni paletas corporativas.

> 📘 Detalle: [`docs/claude/design_system.md`](./docs/claude/design_system.md)

---

## 17. Deuda técnica conocida

| # | Item | Resolver en | Detalle breve |
|---|------|-------------|---------------|
| ~~DT-1~~ | ~~`--allow-empty-input` en `lint:style`~~ | ✅ Resuelta | Hay múltiples `.scss` reales (HierarchyPills, PeriodoControls, WellConfigControls). Quitar flag en próxima limpieza. |
| ~~DT-2~~ | ~~`--no-error-on-unmatched-pattern` en `lint:eslint`~~ | ✅ Resuelta | `src/**` ya tiene `.ts/.tsx` reales. Quitar flag en próxima limpieza. |
| ~~DT-3~~ | ~~typescript-eslint syntactic~~ | ✅ Resuelta | `recommendedTypeChecked` activo en `eslint.config.js` (verificado en F3). |
| ~~DT-4~~ | ~~`vitest.config.ts` sin `jsdom`~~ | ✅ Resuelta | `environment: 'jsdom'` + `@vitejs/plugin-react` configurados. |
| ~~DT-5~~ | ~~`setupFiles` no referenciado~~ | ✅ Resuelta | `tests/setup/vitest.setup.ts` activo con `jest-dom/vitest` + mock `ResizeObserver`. |
| DT-6 | `make` no instalado en Windows | A criterio | Alternativa: `uv run ruff check . && uv run black --check . && uv run mypy src` |
| DT-7 | `user_actions` sin instrumentación frontend | S6+ | Activar dispatcher con debounce 30s + dedupe server-side al arrancar KPIs |
| **DT-8** | **`tests/unit/auth/` untracked con tests rotos** | **Inmediato (antes de S6)** | Residuos de S5 W1 nunca commiteados. `LoginPage.test.tsx` (placeholder obsoleto) y `useCurrentUser.test.tsx` (falta wrapper `<Router>`). Decisión pendiente: borrar (recomendado), arreglar y commitear, o mantener como DT. Excluidos en F3 con `--exclude 'tests/unit/auth/**'`. |
| **DT-9** | **OOM al ejecutar `pnpm test:coverage` sobre suite completa** | **S6 inicio** | `singleFork: true` (mitigación OOM de tests normales, fix 6-may) + instrumentación v8 de coverage acumulan jsdom en un solo heap → `JavaScript heap out of memory`. Probar `pool: 'threads'` o `isolate: true` en `vitest.config.ts`. Detectado en cierre F3. |
| **DT-10** | **Inconsistencia puerto backend dev: `dev:back` en `:8000` vs proxy Vite a `:8765`** | **A criterio (rápido)** | `package.json` `dev:back` arranca uvicorn en 8000, pero `vite.config.ts` proxy `/api` apunta a 8765. Alinear ambos a 8765 (o agregar `--port 8765` al script). Detectado al verificar login post-F3. |
| **DT-11** | **`matchMedia` no mockeado en `tests/setup/vitest.setup.ts`** | **Antes de testear F6** | El hook `useIsMobile` usa `window.matchMedia` que no existe en jsdom. Componentes que lo consuman fallan en tests. Solución: añadir mock global en `vitest.setup.ts`. Detectado en auditoría F6. |
| **🔴 DT-13** | **`node-linker=hoisted` rompe shims de binarios del frontend (`tsc`, `vite`, `eslint`, `prettier`, `vitest`, `stylelint`)** | **🔴 PRIORIDAD MÁXIMA — antes de cualquier `pnpm install` futuro** | Con `node-linker=hoisted` en `.npmrc` (raíz + frontend), pnpm instala TODAS las devDependencies en `Des_robustez_2.0/node_modules/` pero genera shims en `robustez_v02_frontend/node_modules/.bin/` apuntando a `..\<pkg>` (ruta inexistente). Resultado: `pnpm build`, `pnpm lint`, `pnpm test` fallan con `Cannot find module '.../robustez_v02_frontend/node_modules/typescript/bin/tsc'`. **Síntoma diagnóstico:** `ls frontend/node_modules/` muestra solo 1-2 paquetes. **`pnpm dev` SÍ funciona** porque Vite carga desde root vía resolución Node.js — esto enmascara el problema hasta que se necesita build/lint/test. **Causa raíz:** decisión `node-linker=hoisted` tomada por executor F7 sin ADR para resolver instalación de Plotly. **Riesgo si vuelve a pasar:** 1-3 horas perdidas diagnosticando. **Solución definitiva (sesión dedicada):** (a) revertir `.npmrc` a config estándar pnpm (quitar `node-linker=hoisted`), (b) borrar `node_modules/` de root + frontend con dev server PARADO, (c) `pnpm install` limpio desde root, (d) validar que Plotly carga sin warnings en :5173, (e) si Plotly falla, abrir ADR documentando por qué necesita hoisted + parchar shims manualmente como workaround documentado. **Parche temporal aplicado 2026-05-22:** shim `frontend/node_modules/.bin/tsc.CMD` editado manualmente a `..\..\..\node_modules\typescript\bin\tsc` — frágil, se rompe en próximo install. **Backups:** `.npmrc.bak_F7` en root y frontend. Detectado al intentar `pnpm build` post-F7. Ver §17.5 R1. |
| **🔴 DT-14** | **Plotly `data` array no debe depender de `selectedKey`/`hoveredKey` ni incluir `selectedpoints` reactivo** | **🔴 Cuando se retome el waterfall (S6)** | Plan F7 (abortado) incluyó `selectedKey` en deps del `useMemo` que construye el `data` array del waterfall, y `selectedpoints: [selectedIdx]` en el trace. Resultado: cada click/hover reconstruye el `data` → `react-plotly.js` llama `Plotly.react()` → re-anima barras desde 0 → si el usuario mueve el mouse mientras anima, animaciones se interrumpen y barras quedan COLAPSADAS visualmente (todas pegadas al eje cero salvo la última bajo el cursor). **Causa raíz arquitectural:** acoplar UI state interactivo con la fuente de verdad del chart. **Patrón correcto:** `useMemo` deps = `[steps, unitMode]` solamente. Selección visual se gestiona en sidebar/overlay externo o vía `Plotly.restyle()` imperativo. Sin `selectedpoints` en el trace. Sin estado global mutado en `onHover`. Detectado en F7 tras 4 fixes reactivos fallidos. Ver §17.5 R2. |
| **🔴 DT-15** | **"Build verde + lint verde + tests verde" ≠ "feature verificada" cuando hay interacción visual** | **🔴 Cualquier feature visual futura** | Executor F7 reportó ✅ TypeScript, ✅ ESLint, ✅ Prettier, ✅ Tests, ✅ `vite build` — y la feature estaba rota en runtime (gráfico colapsa al hover). Yo (Claude Code planner) cerré el ciclo basándome en el reporte del executor sin abrir el navegador a validar interacciones. **Causa raíz procesal:** el flujo 6 pasos §15 verifica artefactos estáticos (tipos, lint, build, tests automatizados), no comportamiento de runtime visual. **Protocolo correcto:** antes de declarar una feature visual "completada", el planner abre `http://localhost:5173/<ruta>`, prueba golden path + edge cases con interacción humana, revisa F12 Console (0 errores, 0 warnings Strict Mode). Si no puede abrir navegador → estado correcto es "PENDIENTE de validación humana", NO "verificado". El único que marca ✅ completada una feature visual es el usuario. Ver §17.5 R3. |
| **🔴 DT-16** | **Eliminar componentes "huérfanos" sin grep por path relativo lleva a romper typecheck horas después** | **🔴 Cualquier eliminación futura de carpeta/componente** | Plan F4.7 eliminó `src/shared/components/Breadcrumb/` declarándola huérfana porque el grep usó solo `"shared/components/Breadcrumb"`. `SoonPage.tsx` la importaba con path relativo `'../Breadcrumb'` y NO fue detectado. Typecheck pasó en F4.7 (cache de `.tsbuildinfo` o working tree distinto) pero falló al primer reintento en F4.8. **Regla obligatoria antes de eliminar `src/<dir>/<componente>/`:** correr 4 greps — `"<dir>/<componente>"`, `"./<componente>"`, `"../<componente>"`, `"@/<dir>/<componente>"` (si hay alias). Si CUALQUIERA devuelve match, NO eliminar. **Acción correctiva ejecutada:** carpeta restaurada en F4.8 con `Breadcrumb.tsx` (named export `Breadcrumb`, prop `items: { label, path? }[]`), `Breadcrumb.module.scss`, `index.ts`. Restauración inferida del uso real en `SoonPage.tsx:23`. |
| **🔴 DT-17** | **Barrel re-exports (`hooks/index.ts`) anulan tree-shaking en Vite dev mode** | **🔴 Cualquier import en página crítica de performance** | `LoginPage.tsx` importaba `useLogin` desde `'../hooks'` (barrel que re-exporta `useLogin` + `useLogout` + `useCurrentUser`). En `pnpm dev`, Vite descarga los 3 hooks aunque solo se use uno → `useLogout.ts` (2.4 KB) y `useCurrentUser.ts` (3.9 KB) viajaban en la carga de `/login` sin necesidad. **Solución aplicada en F4.9:** `import { useLogin } from '../hooks/useLogin'` (path directo al archivo, bypass del barrel). **Regla para futuras páginas críticas:** en `LoginPage`, `HomePage` y otras de carga inicial, importar siempre con path completo al archivo, NUNCA desde `index.ts` barrel. Aceptable para páginas internas no críticas. |
| **DT-18** | **`kpis_produccion/services.py` y `filters/services.py` no sanitizan Infinity/NaN** | **Cuando se retome kpis_produccion** | Si `flow_rates` o `financial_results` tienen valores Infinity/NaN (heredados del Excel V01), los KPIs QO/QW y el filtro UWI-EBITDA se corrompen. Solución: mover `_sanitize_col()` de `kpis_financieros/services.py` a `src/shared/utils.py` y reutilizar en todos los módulos que lean columnas numéricas de `ops.*`. |
| **🔴 DT-19** | **Curva "Aceite-Cum" de `/ebitda-rank` escalada cosméticamente para cuadrar con el KPI "Qo Total"** | **Cuando haya ventana para el arreglo real** | Ajuste TEMPORAL aplicado 2026-08-12 (`AJUSTE_CURVA_A_KPI` en `TendenciaEbitdaChart.tsx`). La curva se multiplica por un factor para que su último punto sea el KPI. **Consecuencia: los puntos intermedios NO son el acumulado real.** Revertir = poner la constante en `false`. **Los 3 arreglos reales pendientes:** (1) **Unidad** — la curva SUMA BOPD de los N meses (factor 6,000 exacto en 6 meses); debe dividirse entre los días del período para dar el promedio ponderado, igual que el KPI. Requiere que el backend devuelva `dias_periodo` en la respuesta de `/ebitda-rank` (o derivarlo del `periodoStore`). (2) **Universo (689 BOPD, 1,4%)** — el KPI no filtra por estado de pozo (405 pozos) y la curva sí (`well_status='ACT'`, 272). Son 54 pozos INACT que producen y tienen EBITDA. Verificado: **no existe ningún pozo con aceite y sin EBITDA**. Cerrarlo exige decidir si el KPI debe respetar el selector Activos/A+I del Well Config — hoy lo ignora por paridad V01 (`kpis_produccion/services.py:120-121`), y es global del ticker, así que cambiarlo mueve su valor en `/reports`, `/detalle-ingresos` y demás rutas. (3) **Bug de columna en modo A+I** — `ACEITE_COLUMN_MAP` (`ebitda_rank/services.py:65-70`) debería leer `production_oil_day_month_ai` en A+I, pero la curva lee la columna Real y solo amplía las filas: en A+I da 50.510 en vez de 59.089 (medido). Es un defecto propio, independiente del cuadre. **Mediciones de referencia** (CAÑO SUR ESTE, 2026 Ene–Jun, Activos/Real): curva cruda `298.939`, curva ÷181 días `49.821`, KPI `50.510`. |

**Regla:** cualquier `// TODO[Sx]:` en código → entrada espejo aquí. Al cerrar, eliminar de tabla + referenciar commit.

---

## 🔴 17.5 Lecciones críticas del F7 abortado (2026-05-22)

> **Contexto:** F7 (EBITDA Waterfall Inspector) costó **5+ horas perdidas** entre planificación, implementación, debugging y reverso completo. Resultado neto: 0 progreso, regresión al estado pre-F7 (SoonPage). Estas son las 3 reglas que evitan que esto se repita.

### 🔴 Regla R1 — NO MODIFICAR `.npmrc` sin ADR aprobado por el usuario

Cambiar `node-linker`, `store-dir`, `shamefully-hoist`, `public-hoist-pattern` o cualquier flag de pnpm afecta TODA la estructura de `node_modules/` del monorepo y rompe binarios silenciosamente.

**Si una librería nueva falla en `pnpm install`:**
- ❌ NUNCA activar `node-linker=hoisted` como atajo.
- ❌ NUNCA mover `store-dir` para "evitar permisos".
- ✅ Diagnosticar peer deps específicas con `pnpm why <pkg>`.
- ✅ Instalar con `--strict-peer-dependencies=false` puntual.
- ✅ Si no se resuelve en 15 min → DETENER, escalar al usuario con ADR.

**Verificación obligatoria pre-`pnpm install`:** ejecutar `cat .npmrc` (root + frontend) y avisar al usuario si aparece `hoisted` — el install puede regenerar shims rotos.

**Detalle:** [[DT-13]] en tabla §17.

---

### 🔴 Regla R2 — Charts Plotly: el `data` memoizado NUNCA depende de selección/hover

Plotly + `react-plotly.js` re-anima desde altura cero cada vez que recibe un `data` array con referencia nueva. Si las animaciones se interrumpen (porque el usuario mueve el mouse mientras anima), las barras quedan colapsadas visualmente.

**❌ Patrón PROHIBIDO:**

```tsx
const { data } = useMemo(() => {
  const selectedIdx = steps.findIndex((s) => s.key === selectedKey);
  return { data: [{ ...trace, selectedpoints: [selectedIdx] }] };
}, [steps, unitMode, selectedKey]); //  selectedKey EN DEPS = BUG GARANTIZADO
```

**✅ Patrón OBLIGATORIO:**

```tsx
// data solo depende de DATOS CRUDOS, jamás de UI state interactivo
const { data } = useMemo(() => {
  return { data: [trace] }; // sin selectedpoints
}, [steps, unitMode]); // ← selectedKey FUERA DE DEPS

// Selección visual se gestiona FUERA del data:
// - Sidebar/overlay externo que lee selectedKey del store
// - O `Plotly.restyle()` imperativo si se necesita resaltar barra
```

**Reglas duras:**
- Props `selectedKey`/`hoveredKey`/`activeIndex` NUNCA en deps de `useMemo` que construye `data` de Plotly.
- `onHover` de Plotly NUNCA debe mutar estado global (Zustand). Usar estado local efímero (`useState`) o no usar hover.
- Si el sidebar necesita reflejar hover, pasar el `hoveredKey` LOCAL al sidebar; el chart no se entera.
- `selectedpoints` en el trace = bandera roja. Re-evaluar antes de incluirlo.

**Detalle del bug:** [[DT-14]] en tabla §17.

---

### 🔴 Regla R3 — "Build verde" NO es "feature verificada" en componentes con interacción visual

El executor puede reportar:
- ✅ TypeScript exit 0
- ✅ ESLint exit 0
- ✅ Prettier exit 0
- ✅ Tests exit 0
- ✅ `vite build` exit 0

…y la feature **estar rota en runtime**. El executor no tiene navegador, no puede hacer hover, no puede ver el chart pintándose.

**Categorías de bug que NO detecta ninguna herramienta automática:**
- Animaciones interrumpidas / re-renders innecesarios de Plotly/D3/Chart.js.
- Layout colapsado por flex/grid en viewport real.
- Eventos de mouse mal cableados (hover roto, click duplicado).
- Race conditions en `useEffect` con Suspense + lazy import.
- Suspense que nunca resuelve por error en algún proveedor.

**Protocolo obligatorio antes de declarar "F* completada":**

1. El planner (yo, Claude Code) DEBE abrir `http://localhost:5173/<ruta-feature>` y validar:
   - Carga inicial sin errores en F12 Console.
   - Interacciones golden path: hover, click, teclado, toggle, filtros.
   - Persistencia de estado al navegar fuera/dentro.
   - 0 warnings de React Strict Mode en consola.
2. Si NO se puede abrir el navegador (sin acceso, dev server caído), declarar el estado como **"PENDIENTE de validación humana"**, NO como "verificado".
3. El usuario es el único que puede marcar una feature visual como ✅ completada.

**Reformulación del Paso 6 del flujo profesional (§15 + `docs/claude/flujo_6_pasos.md`):**

> **Verificación = build verde + lint verde + tests verde + INTERACCIÓN HUMANA EN NAVEGADOR.** Sin lo último, el estado correcto es "implementado pendiente de validación", no "completado".

**Detalle:** [[DT-15]] en tabla §17.

---

### Apéndice — Reglas de procedimiento de Claude Code derivadas

| # | Regla | Aplicación |
|---|-------|------------|
| P1 | Antes de cualquier `pnpm install`/`add`/`update` futuro: leer `.npmrc` y avisar al usuario si tiene flags no estándar. | Cada sesión |
| P2 | Plan que incluya Plotly/D3/Chart.js debe documentar EXPLÍCITAMENTE que `data` memoizado no depende de UI state interactivo. Si depende, el plan está mal y se rechaza. | Modo Planner |
| P3 | Reporte final del executor que diga "✅ completado" sin sección "Validación visual humana ⏳ PENDIENTE" → el planner debe rechazar el cierre y abrir navegador antes de declarar éxito. | Verificación post-executor |
| P4 | Si un fix reactivo (parche tras parche) se acumula >2 iteraciones sin resolver el bug, DETENER y revertir al estado anterior conocido bueno. No seguir parchando. | Debugging |
| P5 | "Atajo" en infraestructura compartida (`.npmrc`, lockfiles, `vite.config`, `tsconfig`) está PROHIBIDO sin ADR. Cualquier cambio debe estar justificado por escrito antes de aplicarse. | Modo Planner + Executor |

---

## 🔴 17.6 Portar lógica de TypeScript a Python — reglas (2026-08-11)

> **Contexto:** al replicar en el reporte Excel (matplotlib/Python) la curva que
> `/ebitda-rank` dibuja en el navegador (Plotly/TypeScript), una traducción
> literal del código habría roto la generación del Excel en producción. Estas
> reglas salen de esa tarea.

### 🔴 Regla R4 — Traducir código de JS a Python NO es copiar la fórmula

JavaScript y Python difieren en **semántica de errores aritméticos**, y esa
diferencia no se ve leyendo el código:

| Operación | JavaScript | Python |
|---|---|---|
| `1 / 0` | `Infinity` (silencioso) | `ZeroDivisionError` |
| `-1 / 0` | `-Infinity` (silencioso) | `ZeroDivisionError` |
| `0 / 0` | `NaN` (silencioso) | `ZeroDivisionError` |

**Caso real:** `alignCumAxis` en `TendenciaEbitdaChart.tsx` calcula
`-(t / (1 - t)) * cumMax`. Cuando **todos** los pozos tienen /Bl negativo,
`t === 1` y el denominador es 0. En el navegador da `-Infinity`, Plotly lo
ignora y autorangea — nadie se entera. En Python la misma línea **lanza
excepción y aborta la generación del Excel entero**.

**Regla:** antes de portar una expresión aritmética desde TS, listar los
valores que hacen 0 cada denominador y probarlos explícitamente. Si el
original "funciona" con esos valores, es probable que esté produciendo
`Infinity`/`NaN` en silencio.

### 🔴 Regla R5 — Replicar un comportamiento incluye replicar sus bugs: decidir cuáles NO

Buscar paridad visual con otra vista no obliga a heredar sus defectos.

**Caso real:** el recorte de outliers de `EbitdaRankPage.tsx` calcula
`defaultMin = max(min, -maxPositive*1.1)` y `defaultMax = min(max,
maxPositive*1.1)`. Sin ningún pozo rentable, `maxPositive` cae al fallback `1`
y el rango queda **invertido** (`defaultMin` −1,1 **por encima** de
`defaultMax` −10,0): no incluye a nadie. La web dibuja un chart vacío. Medido
sobre la BD, **6 campos reales** lo activan (CHURUYACO, **CUSIANA con 10
pozos**, GIBRALTAR, HORMIGA, MANSOYA, SUCIO) — en el Excel habrían **perdido
su gráfica** sin ningún aviso.

**Regla:** cuando un guard se aparta del original, el comentario del código
debe decir **explícitamente** que la desviación es deliberada y por qué; de lo
contrario, la próxima persona que compare ambos archivos "corregirá" el guard
para que vuelvan a coincidir.

### 🔴 Regla R6 — Los casos borde se prueban con datos reales, no solo sintéticos

Los 2 bugs anteriores **no los detectó** ningún test ni el toolchain
(ruff/black/mypy/pytest los daba todos en verde). Aparecieron al construir una
batería de 8 casos borde (lista vacía, un solo pozo, todos positivos, todos
negativos, todos exactamente 0, cruce exacto en 0, valor enorme) **y luego
contrastarla contra la BD** para ver cuáles ocurren de verdad.

Y el segundo bug **solo se destapó después de arreglar el primero** — antes
quedaba enmascarado por el `return None`. **Regla:** tras corregir un caso
borde, volver a correr la batería completa; arreglar uno puede revelar otro
que estaba oculto detrás.

### Nota sobre cobertura

`_create_tendencia_chart` genera un PNG con matplotlib y **ningún test la
cubre**: `pytest` pasa idéntico con y sin el cambio. La verificación real fue
generar el PNG contra PostgreSQL, validar población/rangos/extremos contra un
cálculo independiente, y generar los 2 Excel completos reabriéndolos con
`openpyxl`. Corolario de [[DT-15]] / R3: **build verde ≠ feature verificada**.

---

## 18. Bitácora de cambios (`bitacora.db`)

BD SQLite en `robustez_v02_backend/data/bitacora.db` (no versionada). Registra cambios diarios con narrativa técnica, artefactos no-código y contexto de impacto.

**5 tablas:** `semanas` | `cambios_diarios` | `archivos_afectados` | `detalles_tecnicos` | `artefactos`

```bash
# Inicialización
pnpm setup              # automático (omitir con SKIP_BITACORA=1)
pnpm init:bitacora      # manual

# Helper CLI
uv run python scripts/log_bitacora.py add-day --semana N --fecha FECHA --dia "Lunes" --resumen "..." --tareas W1.X --personas J C
uv run python scripts/log_bitacora.py list-changes --semana N

# Consulta rápida
sqlite3 data/bitacora.db "SELECT fecha, substr(resumen,1,80) FROM cambios_diarios ORDER BY fecha DESC LIMIT 5;"
```

**Regla de oro:** NUNCA UPDATE/DELETE. Solo INSERT. Si hay error pasado, agregar entrada correctiva nueva.

> 📘 Guía completa: [`docs/claude/bitacora_guia.md`](./docs/claude/bitacora_guia.md)

---

## 19. Bitácora de sesiones — changelog Claude Code

| Fecha | ID | Descripción del cambio | Archivos principales | Commits |
|-------|----|------------------------|----------------------|---------|
| 2026-05-04 al 09 | S5-W1 | Backend completo: auth LDAP + cookie firmada + RBAC 4 tablas + audit + middleware stack + core. Alembic 0001. BDs SQLite. ETL V01→V02 (1745 filas). 7 unit + 3 integration tests. | `src/main.py`, `features/auth/`, `features/permissions/`, `features/audit/`, `middleware/`, `alembic/versions/0001_initial_auth.py` | 862573b, 314f638 |
| 2026-05-09 al 16 | S5-W1 (post) | Frontend scaffold: LoginPage + splash + BetaBanner + DashboardPreview. Header + Footer + DrawerStrip + Drawer 340px. KpiTicker. HomePage + Carousel. ProtectedRoute + SessionExpiryBanner. 8 primitivos UI. ResolutionGuard. apiClient openapi-fetch. vitest jsdom + RTL + setup. | `app/layouts/`, `features/auth/`, `features/home/`, `shared/components/primitives/`, `shared/components/Drawer/`, `app/store/` | 5a32385, a35974c |
| 2026-05-17 al 18 | F1 | Filtro Jerarquía completo: `HierarchyPills` acordeón 6 niveles + búsqueda >8 opciones + navegación teclado + auto-cleanup cascada + `filtersStore` draft/applied + paleta Ecopetrol. Filters API backend. | `shared/components/filters/HierarchyPills/`, `app/store/filtersStore.ts`, `features/filters/` (backend) | — |
| 2026-05-18 al 19 | F2 | Filtro Período: `PeriodoControls` MiniCalendar + YearMonthSelect + PeriodoSummary + RangeWarningBanner. `periodoStore` draft/applied + `_isInitialized`. Bootstrap YTD fix (`yearsForBulk` incluye año más reciente mientras `!isInitialized`). Drawer wiring Período. SCSS cleanup. Lint fixes mocks `async→Promise.resolve`. | `shared/components/filters/PeriodoControls/`, `panels/PeriodoPanel.tsx`, `Drawer.tsx`, `Drawer.module.scss`, `app/store/periodoStore.ts` | faa2534, b067285, f80f2e8, 32be7e0 |
| 2026-05-19 al 20 | F3 | Filtro Well Config rediseño completo: `wellConfigSchema.ts` (Zod 4 uniones), `wellConfigStore` draft/applied + `countDraftFromDefault()`, `OptionTile<T>` + `BinarySelector<T>` genéricos sin casts, `WellConfigPanel` tiles icon-leading + badge dinámico + subtítulo live. Drawer wiring wellconfig. SCSS cleanup huérfanos. 11/13 validaciones ✅ (V7/V9 OOM — DT-9). | `features/filters/schemas/wellConfigSchema.ts`, `app/store/wellConfigStore.ts`, `shared/components/filters/WellConfigControls/`, `panels/WellConfigPanel.tsx`, `Drawer.tsx`, `Drawer.module.scss` | 9a5aa6b, 9028420, 96e9ce4, a55a343, bc6f36a, 0143b8f |
| 2026-05-23 | F4.7 | Optimización carga `/login` — sesión 1: lazy-load del `Drawer` desde `LayoutMain.tsx` con `React.lazy()` + `Suspense fallback={null}`. Eliminación errónea de carpeta `src/shared/components/Breadcrumb/` (revertida en F4.8 — ver DT-16). Análisis HAR `Costos_Diap.har` (baseline 9.80s `onContentLoad`). Plan en `Planes/plan_F4.7_lazy_drawer_2026-05-23.md`. | `src/app/layouts/LayoutMain.tsx` | sin commit (acumulado con F4.8) |
| 2026-05-23 | F4.7b | Pre-condición para F4.8: añadir `ProtectedRoute` envolviendo `<LayoutMain />` en `router.tsx` + rutas `/forbidden` y catch-all `*` con sus respectivos lazy components + limpieza comentarios obsoletos. | `src/app/router.tsx` | fcf967e |
| 2026-05-23 | F4.8 | Optimización carga `/login` — sesión 2: `LayoutMain` pasa a `React.lazy()` desde `router.tsx`, envuelto en `Suspense fallback={<PageLoader />}` dentro del `ProtectedRoute`. Restauración carpeta `src/shared/components/Breadcrumb/` (revierte error de F4.7 — ver DT-16). Plan v2 reformulado tras flujo profesional §15 CLAUDE.md (13 hallazgos integrados, ver `Planes/plan_F4.8_lazy_layoutmain_2026-05-23.md` §12). Impacto medido: `DOMContentLoaded` 9.80s → 9.20s (-600ms), transfer 4.1 MB → 3.9 MB (-200 KB), requests 50 → 57. | `src/app/router.tsx`, `src/shared/components/Breadcrumb/Breadcrumb.tsx`, `src/shared/components/Breadcrumb/Breadcrumb.module.scss`, `src/shared/components/Breadcrumb/index.ts` | pendiente |
| 2026-05-23 | F4.9 | Optimización carga `/login` — sesión 3: bypass del barrel `features/auth/hooks/index.ts` desde `LoginPage.tsx` (`from '../hooks'` → `from '../hooks/useLogin'`) para evitar descargar `useLogout.ts` + `useCurrentUser.ts` en `/login` (DT-17). `ProtectedRoute` pasa también a `React.lazy()` desde `router.tsx` — saca `ProtectedRoute.tsx` + `Spinner.tsx` + `Spinner.module.scss` del waterfall de `/login`. Validación funcional: `pnpm typecheck` ✅. Sin tests ni navegador (decisión del usuario — feature de login validada previamente, no se quiso re-validar). | `src/features/auth/pages/LoginPage.tsx`, `src/app/router.tsx` | pendiente |
| 2026-05-25 | F5.0 | `EbitdaInspectorCard` shell: `UnitToggle<UnitMode>` (USD/BI \| KUSD) genérico + sidebar 7 filas mock (Ingresos, M.Subsuelo, Dilución, Tratamiento, Energía, Transporte, Costos Fijos) con `formatInspectorValue` + `formatRevenuePct` + `formatRowValue`. ChartPlaceholder dashed. Layout grid 2col desktop / 1col mobile. `EbitdaCostosPage` reemplaza `SoonPage`. Spec waterfall futura: `robustez_v02_frontend/docs/Graf.md`. Directiva §0.2 CLAUDE.md formalizada (audit-first antes de cualquier plan). DT-16 + DT-17 documentados. Plan: `Planes/plan_F5.0_ebitda_inspector_card_2026-05-23.md`. | `EbitdaInspectorCard/`, `UnitToggle/`, `formatInspectorValue.ts`, `EbitdaCostosPage.tsx`, `docs/Graf.md`, `CLAUDE.md` | pendiente |
| 2026-05-25 | F5.0b | Fix cadena flex rota — card no llenaba altura vertical. Diagnóstico: 4 links rotos: `.layout` tenía `align-items:flex-start` + faltaba `flex:1`; `.main` faltaba `display:flex + flex-direction:column`; `.chartPlaceholder` tenía `clamp()` que capeaba altura. Fixes en 2 archivos SCSS: `EbitdaCostosPage.module.scss` (align-items:stretch, flex:1, display:flex) + `EbitdaInspectorCard.module.scss` (min-height fijo). `EbitdaInspectorCard` ocupa 100% de la altura disponible en viewport. | `EbitdaCostosPage.module.scss`, `EbitdaInspectorCard.module.scss` | pendiente |
| 2026-05-25 | F6.1-pozos | Paridad conteo pozos: V01 muestra 153, V02 mostraba 213 (raw wells_attributes). Implementado `FilterService._get_uwi_options_ebitda()`: JOIN flow_rates×wells_attributes×financial_results + HAVING EBITDA≠0 AND BLS≠0 AND EBITDA/Bl≠0. `filters/api.py` extendido con 6 query params (from/to_year/month, estado_pozo, produccion). Frontend: `useHierarchyFilters.ts` envía periodo applied + wellconfig applied al query uwi; `filtersService.ts` extiende `HierarchyParams` + fix URLSearchParams para números. Resultado: 153 pozos = paridad exacta V01. | `filters/services.py`, `filters/api.py`, `useHierarchyFilters.ts`, `filtersService.ts` | pendiente |
| 2026-05-25 | F6.1-diagnostico | Causa raíz KPI QO/QW inflados +46% identificada: `ops.wells_attributes` contiene UWIs duplicados (2-4 copias por UWI, ej. CHIC0002 ×4). JOIN `flow_rates × wells_attributes` multiplica silenciosamente cada fila de hechos ×N → QO V02=55.873 vs V01=38.120. Con `DISTINCT ON (uwi,year,month,well_status,pend_id_cc)`: QO=37.982 (-0.4% de V01). Documentado en CLAUDE.md §20 paso 5 sub-check (b). Fix pendiente: deduplicar `ops.wells_attributes` (decisión usuario). | `CLAUDE.md §20` | pendiente |
| 2026-05-25 | F5.2-fix | Fix formato numérico + sanitización PostgreSQL. `_sanitize_col()` → `NULLIF(NULLIF(NULLIF(col,'Infinity'::float8),'-Infinity'::float8),'NaN'::float8)` (idiomático). `_format_currency`/`_format_decimal` → locale español 1.234,56 (reemplazo `.replace(",","_").replace(".",",").replace("_",".")`). `formatDelta` mapper frontend → `'es-CO'` (paridad V01). DT-18 documentado. Validaciones: ruff ✅ mypy ✅ typecheck ✅ eslint ✅ 76/79 tests ✅. | `kpis_financieros/services.py`, `ebitdaKpiMapper.ts`, `CLAUDE.md §17` | pendiente |
| 2026-05-26 | F8-visual | Ajustes visuales `TendenciaEbitdaChart` para paridad con diseño `predict.md` §8.4: (1) Líneas sin markers (`mode:'lines'`), colores spec (`#0A1F33`, `#E08226`, `#2E8B47`), anchos 2/1.8/1.8. (2) Eje Y2 unificado para ambas series cumulativas (eliminado y3). (3) X-axis: labels ocultos, título "Pozos (ordenados por EBITDA/Bl)", índices numéricos en vez de UWI. (4) Fonts monospace en ticks/annotations. (5) Zonas opacidad 0.55/0.60 (era 0.35), KPI line `#6B7A8A` dashed. (6) Márgenes `{l:50,r:50,t:24,b:40}`, fondo blanco, Inter font. (7) Fix altura chart: `position:absolute;inset:0` + flex chain (`.chartSlot` → `.container` → `.chartArea` → `.chart`) + `:global()` overrides Plotly internals. (8) `RangeSlider` paleta Ecopetrol: fill `#004236`, thumb border `#004236`, label monospace uppercase. | `TendenciaEbitdaChart.tsx`, `TendenciaEbitdaChart.module.scss`, `RangeSlider.module.scss`, `EbitdaRankPage.module.scss` | pendiente |
| 2026-05-26 | F9-reports | `ReportsPage` (`/reports` — EBITDA Seguimiento): integración `AppliedFiltersPanel` sidebar desktop + `MobileAppliedFiltersSheet` mobile + KPI ticker con datos EBITDA reales. Creados `useEbitdaKpis`, `ebitdaKpiService`, `ebitdaKpiMapper` propios del feature (aislamiento cross-feature). `LayoutMain.tsx`: añadido `/reports` a `TICKER_KEYS_BY_ROUTE`. Fix previo sesión: Sparkline crash con `data.length < 2` guard + KPI ticker mismatch entre páginas (duplicación hook en `ebitda_rank`). Typecheck ✅. | `features/reports/pages/ReportsPage.tsx`, `features/reports/hooks/useEbitdaKpis.ts`, `features/reports/mappers/ebitdaKpiMapper.ts`, `features/reports/services/ebitdaKpiService.ts`, `features/reports/pages/ReportsPage.module.scss`, `app/layouts/LayoutMain.tsx` | pendiente |
| 2026-05-27 | F10-well-condition-backend | Módulo compartido `well_condition.py`: `classify_well()` (4 categorías: rentable/marginal/no_rentable/otro), `resolve_columns()` (4 variantes estado×produccion, `fin_alias` parametrizable para reutilizar entre features), `build_condition_select_columns()` (SQL con sanitización NULLIF Infinity/NaN). Integrado en `ebitda_rank/services.py` (`fin_alias="fr"`, LEFT JOIN oc) y `regression/services.py` (`fin_alias="fin"`, LEFT JOIN oc). 21 tests unitarios (`test_well_condition.py`): classify_well (11), resolve_columns (6), build_condition_select_columns (4). Fix import order ruff I001. Backend 127 tests passed. | `src/shared/well_condition.py`, `features/ebitda_rank/services.py`, `features/regression/services.py`, `tests/unit/test_well_condition.py` | pendiente |
| 2026-05-27 | F10-well-condition-map-frontend | `WellConditionMap.tsx` reemplazado: de 1 trace hardcoded (todos ★ verdes "Rentable") a 4 traces por categoría con `CATEGORY_CONFIG` + `CATEGORY_ORDER`. Símbolos: ★ star rentable (#2E8B47), ◆ diamond marginal (#F4D124), ✚ cross-thin-open no_rentable (#C5311E), ● circle otro (#6B7A8A). Paridad visual con `PredVsActualChart.tsx` (H1). Prop opcional `activeCategories?: ReadonlySet<string>` para filtrado de categorías desde el padre. `useMemo` deps = `[points, activeCategories]`. Agrupación `Map<string, WellPointUI[]>` con fallback a 'otro'. Plan: `Planes/plan_WELLCONDITIONMAP_traces_por_categoria_2026-05-27.md`. Typecheck ✅. Lint ✅. ⏳ PENDIENTE validación humana (V3-V5). | `features/ebitda_rank/components/WellConditionMap/WellConditionMap.tsx` | pendiente |
| 2026-05-27 | F11-detalle-ingresos-grid | Grid 2×2 de 4 combo charts (Ingreso KUSD vs Brent/DifOil/TRM/Producción) en `DetalleIngresosPage` reemplaza placeholder "En construcción". **Backend nuevo:** feature `detalle_ingresos/` con `api.py` + `services.py` + `schemas.py` + `__init__.py`. Endpoint `GET /api/v1/detalle-ingresos/ingresos-combo` con `INGRESO_COLUMN_MAP` + `PROD_COLUMN_MAP` por `(produccion, estado_pozo)`, JOIN financial_results×wells_attributes(DISTINCT ON uwi)×market_base_costs×flow_rates, `_sanitize_col()` Infinity/NaN, RBAC vía `_get_allowed_campos()`. Router montado en `main.py`. **Frontend nuevo:** primitivo `shared/components/charts/ComboChart/` (Plotly bar+line con `createPlotlyComponent(Plotly)` desde `plotly.js-dist-min` + `useResizeHandler` prop — patrón obligatorio del proyecto). Feature `detalle_ingresos/` con `pages/DetalleIngresosPage` (sidebar + grid), `charts/ChartsGrid` (2×2 con Esc collapse), `charts/ChartCard` (header + ComboChart + toggle), `charts/ExpandToggleButton` (Maximize2/Minimize2 Lucide), `charts/chart.config.ts`, `state/chartsStore.ts` (Zustand `expandedId`), `hooks/useIngresosCombo.ts` (TanStack Query, lee filtersStore FLAT + periodoStore.applied + wellConfigStore.applied con `.toLowerCase()`), `services/ingresosComboService.ts` (fetch + mapper snake_case→camelCase), `types.ts`. **Tokens:** 19 alias `$ec-*` añadidos a `_tokens.scss` (verde-soft, lime, amber, red, orange, yellow, ink, navy, body, muted, line, panel, off, white). **Regla R2:** `data` useMemo deps = `[labels, barValues, lineValues, lineColor, secondaryUnit]` solamente — sin UI state. Validaciones: TypeScript ✅, ESLint ✅, ruff ✅, mypy ✅, stylelint archivos nuevos ✅. Plan: `Planes/plan_DETALLE_INGRESOS_4graficas_2026-05-27.md`. ⏳ PENDIENTE validación humana en navegador. | `backend/src/features/detalle_ingresos/` (api/services/schemas), `backend/src/main.py`, `shared/components/charts/ComboChart/`, `features/detalle_ingresos/` (pages/charts/hooks/services/state/types), `styles/_tokens.scss` | pendiente |
| 2026-05-27 | F12-app-menu-hover | `AppMenuPopover.tsx` cambia comportamiento de click a hover: `handleAppHover` (on `onMouseEnter`) actualiza `activeAppId` + `activeSubId` (primer sub por defecto si existe). Click en app sigue navegando. Tecla Esc cierra. Fix ESLint `@typescript-eslint/no-unnecessary-type-assertion`: `activeApp!.subs!` → `hasSubs && activeApp?.subs ? activeApp.subs : []`. | `shared/components/navigation/AppMenuPopover.tsx` | pendiente |
| 2026-05-27 | F8-inline-expand | `EbitdaRankPage` reemplaza modal por **expand inline en desktop (≥1024px)**: botón "Ampliar"/"Reducir" alterna `gridTemplateColumns` (`1fr 44px` / `44px 1fr` / `1.55fr 1fr`) con `transition cubic-bezier(0.7,0,0.3,1) 0.4s`; el panel no-ampliado colapsa a `CollapsedTab` vertical (44px ancho, icono naranja + label rotado `writing-mode:vertical-rl` + chevron). Mobile (<1024px) conserva `ChartModal`. **Fix H1 (CRÍTICO):** `gridCols='1fr'` cuando `isMobile===true` para no sobreescribir `@media` con inline style. **Fix H2 (ALTO):** `useEffect(()=>{ if(isMobile) setExpanded(null) }, [isMobile])` resetea expanded al pasar a mobile. Nuevo componente `CollapsedTab` (props: `side`, `label`, `icon: 'trend'\|'map'`, `onClick`) con `Maximize2`/`Minimize2`/`TrendingUp`/`MapPin`/`ChevronLeft`/`ChevronRight` (lucide, sin nuevas deps). Nueva clase `.iconBtnActive` (amber `#d97706`, background `#fff8dc`). `aria-pressed` en botón toggle. `prefers-reduced-motion` desactiva transición. Notify Plotly de resize tras 450ms (post-transición). R2/R3 cumplidas. Plan: `Planes/plan_EBITDARANK_ampliar_inline_expand_2026-05-27.md`. Typecheck ✅. ⏳ PENDIENTE validación humana (V2-V10). | `features/ebitda_rank/components/CollapsedTab/CollapsedTab.tsx`, `CollapsedTab.module.scss`, `index.ts`, `features/ebitda_rank/pages/EbitdaRankPage.tsx`, `EbitdaRankPage.module.scss` | pendiente |
| 2026-05-28 | F13-skill-install | Instalado skill `emil-design-eng` (Emil Kowalski — UI polish, component design, animation decisions, invisible details). Comando: `npx skills add emilkowalski/skill`. Archivo `SKILL.md` (679 líneas) con framework de decisiones de animación, formato de review Before/After/Why, principios Sonner, reglas clip-path, prefers-reduced-motion, etc. Instalado con symlink a Claude Code + universal para 56 agentes (Codex/Gemini/Copilot/OpenCode +9 más). | `.agents/skills/emil-design-eng/SKILL.md` | sin commit |
| 2026-05-28 | F13-inspector-plan-v2 | Plan auditado (flujo profesional §15 CLAUDE.md) para transiciones del EBITDA Inspector. **v1** propuesto inicialmente sin auditoría; **v2** reformulado tras auditoría con 15 hallazgos integrados: H1 (regla global `prefers-reduced-motion` en `styles/index.scss` ya cubre — no añadir local), H2 (curva del proyecto `cubic-bezier(0.4, 0, 0.2, 1)` para cohesión vs curva Emil del skill `0.23, 1, 0.32, 1`), H3 (nombre del paquete `robustez-v02-frontend` con guiones, no underscores — v1 tenía comandos rotos), H6 (`stylelint-config-standard-scss@14` puede no reconocer `@starting-style` → usar `@keyframes` CSS universal), H7-H8 (`key={activeUnit}` en div INTERIOR al `<Suspense>` para NO remontar el lazy chunk del WaterfallChart → evita flash del Spinner), H9 (no incluir `pnpm build` en validaciones — innecesario para 3 archivos cosméticos). Plan v2 con 13 secciones, 3 archivos a modificar, 4 validaciones automáticas (typecheck + eslint + stylelint + prettier — sin build), prompt executor literal copy-paste. | `Planes/plan_EBITDA_INSPECTOR_transiciones_2026-05-27.md` | sin commit |
| 2026-05-28 | F13-inspector-impl | Executor ejecutó plan, pero NO respetó §3 (Decisiones técnicas) ni §9 (Reglas R7/R8/R9) del v2 — implementó patrón del v1 (con `@starting-style` + `@media (prefers-reduced-motion)` local + curva del skill + `key=` en wrapper externo `.chartArea`). Tras verificación, Claude aplicó correcciones para alinear con v2: (a) clase nueva `.chartCanvas` con `@keyframes chart-canvas-in` (kebab-case obligatorio por stylelint `keyframes-name-pattern`), (b) `key={activeUnit}` movido a div INTERIOR al `<Suspense>` envolviendo solo `<WaterfallChart>` → Suspense estable, sin remount del lazy chunk, sin flash del Spinner, (c) curva `cubic-bezier(0.4, 0, 0.2, 1)` del proyecto en TODAS las transitions, (d) `@media (prefers-reduced-motion)` local eliminado (global en `styles/index.scss:52-59` ya cubre con `!important`), (e) `transition: all` reemplazado por 4 props específicas (background/border-color/box-shadow/transform) en `.thumb` + `:active scale(0.97)` press feedback, (f) transition opacity en `.preview`, transition background+color en `.icon`. Validaciones: V1 typecheck ✅, V2 ESLint ✅ (max-warnings 0 limpio), V3 stylelint ✅ archivos modificados, V4 prettier ✅ (auto-fix aplicado). | `EbitdaInspectorCard.module.scss`, `EbitdaInspectorCard.tsx`, `InspectorThumbnail.module.scss` | sin commit |
| 2026-05-28 | F13-transition-iter | Iteración de 5 patrones de transición sobre `.chartCanvas` aplicando skill `emil-design-eng` — todos respetando R2/DT-14 (sin tocar Plotly), `key={activeUnit}` en div interior, curva del proyecto. **Iter 1** crossfade + blur: `opacity 0→1` + `filter: blur(2px)→blur(0)` 200ms. **Iter 2** wipe reveal: `clip-path: inset(0 100% 0 0)→inset(0 0 0 0)` 290ms→400ms (direccional izquierda→derecha). **Iter 3** ripple reveal: `clip-path: circle(0% at 50% 50%)→circle(150% at 50% 50%)` 400ms (concéntrico desde el centro). **Iter 4** morph collapse: `transform: scaleY(0.7)→scaleY(1)` + `opacity` con `transform-origin: bottom center` 400ms (barras crecen del piso). **Iter 5 — ESTADO FINAL**: liquid morph 500ms. 3 props animadas en paralelo: `clip-path: inset(12% 18% 12% 18% round 80px) → inset(0 0 0 0 round 0)` (blob asentándose), `transform: scale(0.92)→scale(1)`, `opacity: 0→1`. Efecto orgánico de "gota líquida que se asienta en el contenedor". ⏳ PENDIENTE validación humana en navegador. | `EbitdaInspectorCard.module.scss` | sin commit |
| 2026-05-28 | F14-kpis-delta-backend | **Backend nuevo:** feature `kpis_delta/` con `api.py` + `services.py` + `schemas.py`. Endpoint `GET /api/v1/kpis-delta/` retorna 4 items (Δ BRENT, Δ DIF OIL, Δ PRODUCCIÓN, Δ TRM) con `start`, `end`, `delta`, `pct`, `spark[]`, `unit`, `invert_tone`. BRENT y TRM globales (sin jerarquía); DIF OIL y PRODUCCIÓN con RBAC + jerarquía. `PROD_COLUMN_MAP` por (produccion × estado_pozo). `_sanitize_col()` NULLIF Infinity/NaN. `DISTINCT ON (uwi)` para wells_attributes. Router montado en `main.py`. Plan v2 auditado con 8 hallazgos críticos (H1-H8): H1 filtersStore plano, H2 periodoStore fromYear/fromMonth, H3 wellConfig toLowerCase(), H4 fetch+URL (no apiClient), H5 imports relativos, H6 start=spark[0] end=spark[-1], H7 _sanitize_col en todas las columnas, H8 ensureTwoPoints guard. | `backend/src/features/kpis_delta/` (api/services/schemas/__init__), `backend/src/main.py` | pendiente |
| 2026-05-28 | F14-kpis-delta-frontend | **Frontend:** hook `useKpisDelta` + service `kpisDeltaService` + mapper `kpisDeltaMapper` + types `deltaKpi.ts` creados dentro de `features/detalle_ingresos/` (no en seguimiento — KPIs delta son exclusivos de `/detalle-ingresos`). `SeguimientoPage` revertido a usar `MOCK_KPI_CARDS` (sin dependencia de backend delta). Componente `DeltaKpiStrip` creado como standalone (no usado actualmente — KPIs van en cinta). | `features/detalle_ingresos/hooks/useKpisDelta.ts`, `features/detalle_ingresos/services/kpisDeltaService.ts`, `features/detalle_ingresos/mappers/kpisDeltaMapper.ts`, `features/detalle_ingresos/types/deltaKpi.ts`, `features/detalle_ingresos/components/DeltaKpiStrip/`, `features/seguimiento/pages/SeguimientoPage.tsx` | pendiente |
| 2026-05-28 | F14-kpis-delta-ticker | **Integración en KpiTicker del LayoutMain:** `TICKER_KEYS_BY_ROUTE['/detalle-ingresos']` extendido con 4 keys delta (`delta-brent`, `delta-dif-oil`, `delta-produccion`, `delta-trm`). `LayoutMain.tsx` importa `useKpisDelta` de `detalle_ingresos` y pasa overrides reales (val, unit, delta, neg, startVal, endVal, series) a los items del ticker. `KpiTickerEntry` extendido con campos opcionales `startVal`, `endVal`. `KpiTickerOverride` extendido con `delta`, `neg`, `startVal`, `endVal`, `series`. `TickerItem.tsx` renderiza layout delta 3 filas: fila 1 (label + sparkline), fila 2 (valor delta grande), fila 3 (%), footer (INICIO valor+unit \| FIN valor+unit) separado con border-top. Estilos `.deltaLayout`, `.deltaHead`, `.deltaCenterVal`, `.deltaCenterPct`, `.deltaFooter`, `.deltaCol`, `.deltaColLabel`, `.deltaColVal`, `.deltaColUnit` en `KpiTicker.module.scss`. `kpiTickerData.ts` actualizado con `startVal`/`endVal` en datos mock delta. Solo visible en `/detalle-ingresos`. ✅ Validado en navegador. | `app/layouts/LayoutMain.tsx`, `shared/components/KpiTicker/TickerItem.tsx`, `shared/components/KpiTicker/KpiTicker.tsx`, `shared/components/KpiTicker/KpiTicker.module.scss`, `shared/components/KpiTicker/kpiTickerData.ts` | pendiente |
| 2026-06-04/05 | F15-detalle-costos-backend | **Backend nuevo:** 2 servicios adicionales en `kpis_costos/`: (1) `CostosFijosTickerService` (`services_costos_fijos.py`) — 2 KPIs (Costos Fijos KUSD + USD/Bl) + 7 deltas (Δ costos, Δ costos/bl, Δ energía, Δ tratamiento, Δ M.subsuelo, Δ gasto, Δ costos levant). `DELTA_COMPONENTS` configurable. JOIN operating_costs × flow_rates × wells_attributes (DISTINCT ON uwi). (2) `CostosGastosMensualService` (`services_costos_gastos.py`) — labels[] + series[] (6 componentes: costos_fijos, gastos, tratamiento, m_subsuelo, energia, ingreso-costos). RBAC + `_get_allowed_campos()`. Schemas: `schemas_costos_fijos.py` (CostosFijosKpiItem + CostosFijosDeltaItem + CostosFijosTickerResponse) + `schemas_costos_gastos.py` (CostosSerieItem + CostosGastosMensualResponse). Endpoint `GET /api/v1/kpis-costos/costos-gastos-mensual` montado en `api.py`. | `backend/src/features/kpis_costos/` (services_costos_fijos.py, services_costos_gastos.py, schemas_costos_fijos.py, schemas_costos_gastos.py, api.py) | pendiente |
| 2026-06-04/05 | F15-detalle-costos-frontend | **Frontend completo:** `DetalleCostosPage` reemplaza stub por layout sidebar + `CostosGastosCard`. `CostosGastosCard`: inspector layout con rail de thumbnails (izq) + chart area (der) + botón Ampliar/Reducir (Maximize2/Minimize2). `StackedBarChart` (Plotly stacked bar via `createPlotlyComponent` + `useResizeHandler`). `StackedBarPreview` (SVG miniatura memo). **Custom tooltip HTML** centrado superior del chart — NO usa Plotly hover nativo (prob. de compatibilidad con `createPlotlyComponent`), calcula mes por posición X del mouse vía `onMouseMove` nativo (`hovermode: false`). Formato `$3.604,3` (es-CO `fmtKusd`). Estado hover local `useState` — R2 cumplida (no Zustand, data deps = `[labels, series]`). `useCostosFijosKpis` + `useCostosGastosMensual` hooks. `costosFijosKpiService` (2 fetch). `costosFijosKpiMapper` (ensureTwoPoints, sort avg desc). Types `CostosGastosSerie` + 4 API interfaces. **KPI Ticker:** 11 keys en `TICKER_KEYS_BY_ROUTE['/detalle-costos']`. `LayoutMain.tsx` consume `useCostosFijosKpis` condicional (`hasCostosKeys`). `kpiTickerData.ts` con 11 mocks. ⏳ Tooltip posición centrada superior en ajuste final. | `features/detalle_costos/` (pages, components/CostosGastosCard, components/StackedBarChart, components/StackedBarPreview, hooks, mappers, services, types), `app/layouts/LayoutMain.tsx`, `shared/components/KpiTicker/kpiTickerData.ts` | pendiente |
| 2026-06-04/05 | F15-tooltip-custom | **Investigación tooltip Plotly:** `onHover` prop de `react-plotly.js` con `createPlotlyComponent(Plotly)` NO dispara callbacks (probado: `hoverinfo:'skip'`, `'none'`, `hovertemplate:'<extra></extra>'`, addEventListener `plotly_hover`, MutationObserver, `el.on('plotly_hover')`, `onAfterPlot`). Ninguno funcionó. **Solución final:** `onMouseMove` nativo en div contenedor + cálculo posición X del mouse vs márgenes Plotly (`MARGIN_LEFT=52, MARGIN_RIGHT=16`) + `Math.floor(x / barWidth)` para obtener índice del mes. `hovermode: false` desactiva hover nativo de Plotly. Tooltip es `position:absolute; top:0; left:50%; transform:translateX(-50%)` con `pointer-events:none` + `z-index:100`. **Lección aprendida:** `createPlotlyComponent` no conecta event handlers de react-plotly.js. Para hover custom en charts futuros, usar `onMouseMove` nativo, NO confiar en props de Plotly. | `StackedBarChart.tsx`, `StackedBarChart.module.scss` | pendiente |
| 2026-06-05 | FIX-postgres-credentials | **Fix credenciales PostgreSQL:** Nueva instancia **PostgreSQL 18.4** en `10.100.26.139:5432` con usuario `robustez`. Problema: app lanzaba `connection refused` aunque el `.env` tenía las credenciales correctas. Causa raíz: `config.py` tenía el valor `postgres:GET_DCA_db_2524@localhost:5432` hardcodeado como default Pydantic — si pydantic-settings fallaba al parsear el carácter `£` del `.env`, usaba el default antiguo. Fix: (1) `.env` → `postgresql://robustez:***@10.100.26.139:5432/robustez_v02`, (2) `.env.example` → placeholder con usuario/host correcto, (3) `config.py` → default cambiado a `robustez:changeme@10.100.26.139:5432`. Verificación: `get_settings().ops_database_url` lee el `.env` correcto; SQLAlchemy conecta: `wells_attributes` 13,450 filas, `financial_results` 216,641 filas. | `robustez_v02_backend/.env`, `robustez_v02_backend/.env.example`, `robustez_v02_backend/src/core/config.py` | sin commit (.env no se versiona) |
| 2026-06-10 | FIX-node-modules | **Reinstalación node_modules:** `pnpm install` desde frontend resolvió `Cannot find module vite/bin/vite.js` — directorio `node_modules/vite/` existía pero vacío (corrupción). pnpm eliminó y recreó `node_modules/` from scratch. 860 paquetes resueltos (860 reused, 0 downloaded). Sin `.npmrc` problemático (DT-13 resuelta previamente). | `robustez_v02_frontend/node_modules/` (regenerado), `pnpm-lock.yaml` | sin commit (node_modules no versionado) |
| 2026-06-10 | F16-avatar-panel-redesign | **Rediseño AvatarPanel estilo tarjeta:** Panel de usuario cambiado de lista vertical simple a tarjeta con grid de iconos. (1) Avatar 48px + nombre completo (`fullName` del store) + badge "ADMIN" pill verde `#004236` + email con text-overflow. (2) Grid 3 columnas: Admin (ShieldCheck verde), Configuración (Settings gris), Ayuda (HelpCircle violeta) — iconos 24px sin fondo, borde sutil `rgb(0 0 0 / 6%)`. (3) "Cerrar sesión" centrado rojo. (4) Tarjeta 300px, border-radius 16px, shadow más pronunciada. Props añadidas: `fullName: string | null`, `isAdmin: boolean` propagadas desde `LayoutMain → Header → AvatarPanel`. 3 iteraciones visuales con el usuario: v1 fondos coloreados (rechazado), v2 sin fondos + iconos más grandes, v3 bordes sutiles + padding ampliado. | `AvatarPanel.tsx`, `Header.tsx`, `Header.module.scss`, `LayoutMain.tsx` | pendiente |
| 2026-06-10 | F16-nav-cleanup | **Limpieza panel de navegación:** (1) Texto "APLICACIONES" (eyebrow) eliminado de `AppMenuPopover`. (2) Título cambiado de "Robustez · Navegar" a "Robustez · Panel de Navegación". (3) Opción "Admin" removida de `nav.config.ts` — Admin ahora solo accesible desde el AvatarPanel del usuario. Import `Settings` limpiado. 5 items de navegación: Inicio, Utilidad Neta, Predicción, EBITDA Rank, EBITDA Seg. (con subs). | `AppMenuPopover.tsx`, `nav.config.ts` | pendiente |
| 2026-08-06 | FIX-usdbl-denominador | **El USD/Bl de `/detalle-costos` pasa a dividirse entre crudo bruto, no entre barriles de mezcla.** El usuario contrastó la tarjeta contra su Excel: la app dividía el costo entre `total_bbl_blend` (mezcla crudo+diluyente) cuando el denominador correcto es la producción bruta de crudo. `OIL_COLUMN_MAP` ya existía en el archivo y `oil_col` ya se seleccionaba en el SQL (solo alimentaba las barras), así que el cambio fue **quitar** el denominador viejo (`BLS_COLUMN_MAP`/`bls_col`/`s_bls`) y reindexar el desempaque de la tupla — el punto de mayor riesgo: quitar una columna del `SELECT` corre todos los índices posteriores y devuelve números incorrectos **sin lanzar excepción**. Trampa de naming confirmada: `production_oil_day_month` está en **BOPD**, no en barriles del mes, hay que multiplicarla por `days_in_month`. Además se elimina la ponderación por días del acumulado, que pasa a `SUM ÷ SUM` (la convención de los otros 13 módulos, documentada en `kpis_costos/services.py:4`). Verificado contra el Excel del usuario al céntimo: acumulado a febrero **52,0608** (antes 59,898) y chip de Levantamiento a junio **61,93** (antes 71,44), −13,3%. Hallazgo colateral: `total_bbl_blend_rate_ai` es **idéntica** a `total_bbl_blend_ai` en el 86,5% de las filas de 2026 (la variante "tasa A+I" de mezcla no existe en el dato fuente), por eso esa combinación se mueve −27,6%, el doble que las otras tres — el cambio la corrige. | `kpis_costos/services_costos_usdbl.py`, `schemas_costos_usdbl.py`, `api.py`, `detalle_costos/types/costosFijosKpi.ts`, `services/costosUsdBlService.ts`, `CostosGastosCard.tsx` | ed5f7a2 |
| 2026-08-06 | F-marcador-mensual-tooltip | **Tercera serie "USD/Bl del mes" + tooltip custom en el `ComboChart`.** La curva mostraba solo el acumulado y nada en la UI lo decía: el tooltip marcaba `Jun, 71.44` cuando junio costó 82,24. Se añade una serie de **marcadores sueltos sin línea** (el valor mensual, no acumulado) para comparar de un vistazo "cuánto costó ESTE mes" contra "cuánto llevamos"; el backend expone `usd_bl_mensual` capturando el ratio **antes** de actualizar los acumuladores. El tooltip nativo de Plotly no funciona con `createPlotlyComponent` (bug documentado en §21), así que se replica el patrón del `StackedBarChart`: `onMouseMove` sobre un div contenedor + línea punteada y tarjeta por overlay DOM. Los 6 props nuevos son **opcionales con default**, de modo que `detalle_ingresos` y `detalle_dilucion` (los otros 2 consumidores) no cambian de comportamiento. Rotulado: eyebrow → "COSTO ACUMULADO · USD/BL" y chip → "USD / BL (ACUM.)". El eje Y2 se expande 1,76×–2,84× al entrar la serie mensual y aplana visualmente la curva acumulada — es esperado, no una regresión. R2/DT-14 respetada: el `data` memoizado nunca depende del estado de hover. | `ComboChart.tsx`, `ComboChart.module.scss`, `CostosGastosCard.tsx`, `services_costos_usdbl.py`, `schemas_costos_usdbl.py`, `costosUsdBlService.ts`, `costosFijosKpi.ts` | ed5f7a2 |
| 2026-08-06 | style-marcador-ebitda | **Iteración visual sobre el marcador mensual y las barras de EBITDA.** Marcador mensual: rojo círculo 8px → navy `#00214D` rombo 16px → **triángulo** 16px (3 rondas con el usuario). El navy elegido **coincide a propósito** con el color de línea de Levantamiento y Mant. Subsuelo — se advirtió la colisión y el usuario confirmó que la distinción la dan tamaño y forma, no el color. Barras de EBITDA en `/seguimiento`: `marker.color` pasa de string fijo a **array por barra** según el signo, de modo que los meses negativos salgan en rojo; tono final `#ED5F52` ("Tomate vivo", indicado por el usuario con un swatch) tras pasar por `#C5311E`. | `ComboChart.tsx`, `seguimiento/components/charts/EbitdaChart/EbitdaChart.tsx` | 0668db7, 12ce5cd, ae9d17c |
| 2026-08-06 | F-periodo-end | **Hoja "Periodo End" en el reporte Excel del período (4.ª hoja).** Suma los mismos meses que `FC-Periodo` pero restringe el universo a los pozos presentes en el **mes final** del rango: en TIBU Ene–Jun 2026 pasa de 71 a **65** pozos (activos) y de 116 a **105** (A+I) — los 6 que salen tuvieron EBITDA≠0 en algún mes previo pero no en junio. Los costos siguen siendo la suma de **todos** los meses; lo único que cambia es qué pozos entran. `_fetch_fc_detail` no devolvía el año, así que el mes final se identifica por el índice compuesto `anio*100+mes` (cross-year safe: con Dic-2025→Feb-2026 el mes final es febrero, no diciembre) y el `GROUP BY` gana `fr.year`, cerrando de paso un bug latente que colapsaba el mismo mes de dos años distintos. `_filtrar_fc_mes_final` es **pura y no muta su entrada**: la misma lista cruda alimenta la hoja `FC-Periodo`, que se escribe antes. Reusa el detalle ya traído para esa hoja → **cero queries adicionales** (los planes v1/v2 pedían 2 de más). El tile del popover pasa a "Excel Periodo + End": el nombre completo ocupaba ~203px contra ~172px disponibles y se truncaba. Verificado celda por celda contra el baseline: `FC-Periodo` **idéntico, 0 diferencias en 187 filas**. 5 tests nuevos (326 en total). ⏳ PENDIENTE validación humana en el Excel real. | `ebitda_rank/report_service.py`, `ebitda_rank/api.py`, `tests/unit/test_reporte_periodo.py`, `ReporteWaffle.tsx` | c2e2663 |
| 2026-08-06 | INCIDENTE-stash-diagnostic2 | 🔴 **Un `git stash pop` sacó un stash ajeno y dejó 37 archivos en conflicto.** Al capturar el baseline de no-regresión con `git stash push`/`pop`, el `pop` aplicó `stash@{0}: On master: diagnostic2` — un stash viejísimo que no era de esta sesión. Dejó **marcadores de conflicto sin resolver** (`<<<<<<< Updated upstream`) en 37 archivos ajenos, con contenido de antes del deploy de junio: revertía el puerto del backend a `8765`, quitaba el `sessionInterceptor` y resucitaba `crear_schema_postgres.py`, borrado a propósito en `cb858ec`. **Se detuvo el commit**, se respaldaron los 4 archivos del trabajo real, se reseteó el índice y se descartaron los 37 ajenos con `git checkout HEAD --` (excluyendo los nuestros), revalidando el toolchain completo desde cero antes de commitear. El stash `diagnostic2` **sigue en la pila sin tocar** — no es de este trabajo; si se aplica tal cual revierte cosas ya corregidas. **Lección:** `git checkout HEAD --` solo restaura archivos **rastreados**; los untracked (como `CLAUDE.md`) quedan como los dejó el stash y `git status` no los reporta como modificados. | working tree (37 archivos ajenos descartados), `robustez_v02_backend/scripts/crear_schema_postgres.py` (reeliminado) | — |
| 2026-08-06 | ops-restaurar-dump | **Script para restaurar un dump de `ops` sin `psql`.** El servidor de pruebas no tiene las herramientas cliente de PostgreSQL instaladas y la BD es remota, así que no había forma de aplicar un `pg_dump` allí. `restaurar_ops_dump.py` lee el `.sql` **en streaming** y lo ejecuta con `psycopg2` desde el venv del backend, alimentando los bloques `COPY ... FROM stdin` con `copy_expert()`. Todo va en **una transacción**: si algo falla, `ROLLBACK` y la BD queda intacta. Valida conteos por tabla y la suma de control de EBITDA antes del commit. Probado en dev contra `ops_20260806.sql`: 95 sentencias + 7 bloques COPY en 25s, 7/7 tablas OK, `SUM(ebitda_a_kusd)=7.163.924,81` exacto. `.gitignore` excluye los dumps de la raíz (`.sql`/`.dump`/`.zip`) — son artefactos operativos de 300+ MB. | `robustez_v02_backend/scripts/restaurar_ops_dump.py`, `.gitignore` | 7ca4889, 75791a5 |
| 2026-08-11 | F-ZONAS-CRITERIO | **La frontera verde/roja cae en el cruce por cero del criterio activo.** La línea que separa la zona verde de la roja en `/ebitda-rank` se calculaba por **conteo** de pozos rentables, así que no coincidía con el punto donde la curva corta el eje X. Ahora se interpola entre los dos puntos que rodean el cruce. Además la zona **sigue al criterio del waffle "Condición"** (EBITDA/Bl, UO/Bl o UN/Bl): las tres curvas cruzan cero en índices distintos y antes las tres compartían la frontera del EBITDA. La línea KPI punteada solo se dibuja con criterio EBITDA — es el único para el que ese KPI está definido (`kpi_ebitda_bl` es un SUM/SUM; no hay equivalente para UO ni UN en la API). La lógica sale a `zoneShapes.ts` con **17 tests**, endurecida para series **no monótonas** (UO/Bl y UN/Bl lo son en 6 campos verificados contra la BD: TIBU, CHICHIMENE, CASTILLA, APIAY, CUPIAGUA, CUSIANA), NaN intercalados, y series sin ningún rentable / sin ningún no-rentable. | `TendenciaEbitdaChart/zoneShapes.ts` (nuevo), `zoneShapes.test.ts` (nuevo), `TendenciaEbitdaChart.tsx`, `EbitdaRankPage.tsx` | dcbc908 |
| 2026-08-11 | F-EJE-FECHAS | **Etiquetas mes-año únicas: 18 barras que se veían como 12.** Con un período que cruza año, Ene-2025 y Ene-2026 generaban la **misma** etiqueta `"Ene"`. El eje X de Plotly es **categórico**: ambas caían en la misma categoría y los valores del segundo año se **superponían** sobre los del primero (no se sumaban — verificado en `calcdata`, que conservaba `[100,200,500]`). En `/detalle-costos` un filtro de 18 meses se veía como 12 barras y **los valores de 2026 se leían bajo etiquetas de 2025**. El sufijo de año hace la etiqueta única, y solo se agrega cuando el rango cruza año para no ensuciar el eje en el caso normal. Formato ajustado con el usuario en 3 iteraciones: **7,5px** (−25%), **horizontal** (0°) y **negrilla** (700); `tickmode: linear` fuerza a Plotly a rotular todas las categorías en vez de saltarse algunas. | `detalle_ingresos/services.py`, `kpis_costos/services_costos_gastos.py`, `services_costos_usdbl.py`, `ChartCard.tsx`, `ComboChart.tsx`, `StackedBarChart.tsx` | 9fa436c |
| 2026-08-11 | F-TOOLTIP-GEOMETRIA | **La línea punteada se posiciona con la geometría real del eje.** El tooltip decía "Feb-26" mientras la línea caía cerca de Dic-25: hasta **2 barras de desfase**. El cálculo asumía margen izquierdo constante y que la categoría *i* estaba en `(i+0,5)·ancho/n`. Dos cosas lo rompen: al rotular todas las categorías en negrilla **Plotly expande los márgenes**, y en un eje categórico **deja medio espacio de padding en cada extremo**, así que el centro de la categoría no cae donde esa fórmula dice. Ahora la posición se lee del propio Plotly: `xaxis._offset + xaxis.d2p(v)`. El paso entre categorías se deriva de dos puntos (`d2p(1) − d2p(0)`) porque **`p2d()` devuelve NaN en este entorno**. Si la geometría aún no está disponible el handler no hace nada, en vez de dibujar en el lugar equivocado. Verificado en **216/216 puntos** de muestra sobre 5 escenarios. | `ComboChart.tsx`, `StackedBarChart.tsx` | 60deba3 |
| 2026-08-11 | F-TOOLTIP-COHERENCIA | **Forma, color y nombre de métrica coherentes con el gráfico.** Tres ajustes sobre el tooltip personalizado de las tarjetas de costos: **(1) Formas** — los indicadores eran todos círculos aunque el gráfico dibuja cuadrados (barras), triángulos (marcador mensual) y rombos (curva acumulada); ahora cada fila lleva la forma de su serie vía `clip-path`. En el apilado las 5 series son barras, así que ahí el indicador es cuadrado para todas. **(2) Colores** — las 5 gráficas individuales adoptan la paleta del apilado, para que una métrica conserve su color en las dos vistas: antes **4 de las 5 cambiaban de color** al cambiar de vista y **tres compartían el mismo navy** `#00214D`, con lo cual no se distinguían entre sí. Levantamiento hereda el gris de Costos Fijos — son métricas distintas pero no coexisten en ninguna vista, así que ese color queda libre. **(3) Rótulos** — las 2 filas de la métrica se nombraban solo por su unidad (`"USD/Bl mes"` / `"USD/BL"`), idénticas en las 5 vistas: con un valor a la vista no se sabía si era Levantamiento o Tratamiento. Ahora dicen `"<Métrica> mes"` y `"<Métrica> acum."`. | `ComboChart.tsx`, `ComboChart.module.scss`, `StackedBarChart.module.scss`, `CostosGastosCard.tsx`, `services_costos_usdbl.py` | 4463ade |
| 2026-08-11 | F-TENDENCIA-ORDEN | **La curva del reporte se ordena por EBITDA/Bl como la web.** El PNG de la portada ordenaba el eje X por **EBITDA_Var/Bl** mientras `/ebitda-rank` lo ordena por **EBITDA/Bl**. Mismos pozos y mismos valores, pero **63 de 69 posiciones** caían en distinto lugar con TIBU Ene–Jun 2026, así que las dos gráficas resultaban irreconocibles entre sí. El pozo que encabezaba el orden viejo (TIBU0152K, EBITDA_Var/Bl 89,20) tiene EBITDA/Bl **−132,16**: abría la curva con una caída vertical que en la web no existe; ahora queda en la posición **65 de 69**. Las hojas de ranking conservan EBITDA_Var/Bl, heredado de V01 — el archivo tiene **5 ocurrencias** del mismo `sort` y solo se cambió la de la curva. | `ebitda_rank/report_service.py` | af747f1 |
| 2026-08-11 | F-TENDENCIA-PARIDAD | **El PNG del Excel replica la vista por defecto de la web.** Más allá del orden quedaban 6 diferencias: **población** (la web recorta outliers negativos a ±10% del mejor pozo → dibuja **46 de 69** pozos, no 69), zonas **horizontales por signo** vs **verticales por posición del cruce**, sin línea KPI, 3 colores distintos, eje EBITDA-Cum sin alinear al cero de EBITDA/Bl, y un rango de eje que la web calcula **combinando las 3 métricas /Bl** aunque solo dibuje una (omitir UO/UN angosta el eje un 28%: −35,75 vs −45,84). `_create_tendencia_chart` pasa a alimentarse de **`EbitdaRankService.get_ranking()`** — el mismo método que usa la web — en vez de reimplementar la fórmula: evita **por construcción** que las dos curvas vuelvan a divergir. El import es local al loop; a nivel de módulo crearía un ciclo porque `services.py` ya importa `MONTH_NAMES` de este archivo. **Dos guards se apartan a propósito del código de la web**, porque replicarlo al pie de la letra habría propagado sus defectos — ver §17.6. `_create_scatter_chart` no cambia: sigue en `primary_grafico`, que trae `lon`/`lat`/`condicion` que `WellRankEntry` no tiene. Coste medido: +4,3s con 118 campos (1 consulta por campo). ⏳ PENDIENTE validación humana (H-V1..H-V9). | `ebitda_rank/report_service.py` (+210/−50) | 2ebeaec |
| 2026-08-06 | ops-recarga-2026-07-17 | **Re-export 2026-07-17 recargado en dev y replicado a la BD del 139.** Los 6 CSV fueron reemplazados por un re-export nuevo. La auditoría previa dio estructura **idéntica** al DDL v11 (columnas 3/13/12/20/42/58), conteos tras dedup por PK **iguales** a los `EXPECTED` del loader, **0** PKs nuevas o faltantes y los mismos 36.877 nulos — es decir, todos los indicadores de forma decían "no cambió nada". Pero el **contenido sí cambió**: 93.357 de 310.104 filas (**30%**) traen distinto `ebitda_a_kusd`, repartidas **uniformemente** en los 18 meses (~30% en cada uno), o sea un re-cálculo del ETL de origen sobre toda la serie, no un mes agregado. Impacto agregado: `SUM(ebitda_a_kusd)` **6.914.567,71 → 7.163.924,81 (+3,6%)**; el usuario confirmó que el re-cálculo es intencional. Dev: `cargar_ops_v11.py --reset`, COMMIT OK en 97,7s, 6/6 validaciones verdes. Se verificó que `ops.field_polygons` **sobrevive** al `--reset` porque el DDL v11 solo dropea las 6 tablas del esquema estrella y no hay FK hacia ella. Replicación al 139 con `restaurar_ops_dump.py --confirmar` sobre `ops_20260806.sql`: 95 sentencias + 7 bloques COPY en 40,2s, **COMMIT OK en 41,5s**, 7/7 tablas exactas y suma de control idéntica a dev. **Lección:** conteos iguales **no** prueban datos iguales — para comparar dos cargas hay que contrastar un **agregado numérico** (`SUM`), no `COUNT(*)`; por eso la suma de control quedó incorporada como validación automática del script. | `ops.*` (dev `localhost:5432` y servidor `10.100.26.139:5432`), `data/Tablas Nuevo Esquema 2026-07-17/` (6 CSV), `scripts/cargar_ops_v11.py` (ejecución), `scripts/restaurar_ops_dump.py` (ejecución) | — (solo datos; bitácora `cambios_diarios` id 113) |
| 2026-08-11 | F-prod-modales | **Producción de crudo y agua en los 2 modales de detalle de pozos.** `PozosDetalleModal` (shared) gana `Prod. Crudo (BOPD)` / `Prod. Agua (BWPD)` tras UWI, y `CondicionPozosModal` las gana en su tabla mensual con el caudal de **cada mes** más el promedio en la fila `ACUMULADO`. `production_oil_day_month` está en **BOPD** pese al nombre, así que el agregado del período es el **promedio ponderado por días producidos**, no la suma. **Corrección multi-zona:** un pozo puede tener varias filas por mes (una por zona: **11,7%** de los pozo-mes, hasta 6, 1.597 pozos) y entre zonas el caudal **se suma** — el cálculo inicial agregaba de una sola vez y las promediaba, dejando `CUPI0026S` en 226,8 BOPD en vez de **453,6**. Ahora se agrega en dos pasos (CTEs `caudal_mes` → `caudal`) con `MAX(production_days)` como ponderador, porque 2 zonas de 30 días no son 60. Verificado: SFRA0046 da **2,34 BOPD** en ambos modales y sus meses coinciden con `flow_rates`. Ajustes visuales: diálogo 920 → **1012px** y columnas numéricas centradas — `.table thead th` (0,1,2) le ganaba en especificidad a la clase de alineación (0,1,0) y dejaba los títulos a la izquierda con los valores a la derecha. ⏳ PENDIENTE validación humana. | `ebitda_rank/services.py`, `ebitda_rank/schemas.py`, `ebitda_rank/condicion_pozos_service.py`, `condicion_pozos_schemas.py`, `shared/components/PozosDetalleModal/*`, `CondicionPozosModal.tsx`, `condicionPozosService.ts`, `types/condicionPozos.ts` | e1a5b2a |
| 2026-08-11 | F-curvas-default | **Trío de curvas por criterio + paleta nueva en la curva de tendencia.** Al cambiar el criterio (EBITDA / U.Operativa / U.Neta) las curvas visibles se reajustan a la **/Bl del criterio + su acumulado + Aceite-Cum**; siempre **3/7**, también en la carga inicial (antes arrancaba con las 7). La selección manual se descarta en cada cambio, igual que ya hacía la página con las categorías del mapa. Los tríos viven en `curvesDef.ts` (`CURVAS_DEFECTO_POR_CRITERIO`) y el reajuste lo hace el propio `useVisibleCurves(criterio)`, sin `useEffect` en la página. **"Ninguna"** deja la /Bl del criterio activo en vez de EBITDA/Bl fija, que bajo U.Neta dejaba una curva ajena en pantalla. Paleta: Aceite-Cum **verde `#2E8B47`**, EBITDA-Cum **café `#8B5E34`** continuo, Utilidad Neta-Cum **café punteado**, Utilidad Neta/Bl **negro `#111827` punteado**. Colores como constantes compartidas entre el chip del tile y la línea del chart, para que el waffle siga sirviendo de leyenda. ⏳ PENDIENTE validación humana. | `CurvasWaffle/curvesDef.ts`, `CurvasWaffle/useVisibleCurves.ts`, `TendenciaEbitdaChart.tsx`, `EbitdaRankPage.tsx` | 7b1f26f |
| 2026-08-11 | F-periodo-end-v02 | **Nuevo reporte "Excel Periodo End V02" con layout de 31 columnas.** Cuarto tile del popover Reporte. Portadas + `FC-Periodo` + `Periodo End`, sin el ranking `Periodo-<año>`. Se implementa como flag **`solo_fc`** sobre `generate_periodo_report` y **no** como generador aparte, para que ambos reportes compartan una sola versión de cada hoja. El layout añade **Costos Levant., Breakeven, EBITDA/Bl, EBITDA_Var y EBITDA_Var/Bl** desde el reporte de línea base (`_adjuntar_linea_base` empareja por UWI: universos idénticos 71/71 y 70/70, mismo EBITDA → cruce 1:1, **cero consultas extra**), **suprime ON-OFF** y no oculta ninguna columna. **Unidades:** producción (4-5) en **Bl del período** (`BOPD × production_days` convertido dentro de cada mes) y **siempre desde la variante Tasa**; costos (7-14) en **USD/Bl** sobre los mismos barriles de mezcla que Breakeven y EBITDA/Bl; ingresos, EBITDA y utilidades **en KUSD** (masa monetaria en KUSD, costos unitarios en USD/Bl). **Dos trampas resueltas:** `fc_layout_base` derivaba totales/ocultas/bloque-2 por **índice** sobre `FC_HEADERS` — al insertar columnas en medio esos índices se corren y el bloque A+I caía dentro del merge del primero (`MergedCell read-only`); ahora recibe los headers y resuelve por **nombre**. Y ya existían `_fc_v02_row_to_excel` y `FC_V02_HEADERS` del **redistribuido V02**: los símbolos nuevos se llamaron igual y la segunda definición sobrescribía a la primera en silencio (`KeyError 'cf_ajustado'`), de ahí el renombre a `*_PERIODO31`. Verificado (TIBU Ene–Jun): FC-Periodo **71** pozos, Periodo End **65**, End ⊂ FC, pozo común idéntico en ambas; `Excel Periodo + End` **sin cambios** (4 hojas, 27 columnas, BOPD apilado). 2 tests nuevos (**328**). ⏳ PENDIENTE validación humana. | `ebitda_rank/report_service.py`, `ebitda_rank/api.py`, `tests/unit/test_reporte_periodo.py`, `reportService.ts`, `ReporteWaffle.tsx` | 71fe152 |
| 2026-08-11 | F-filtros-default | **La app arranca en campo TIBU, Enero–Junio 2026.** El filtro por defecto pasa de activo *SAN FRANCISCO* a **campo TIBU** (sin acotar el activo) y el mes fin de Mayo a **Junio**, el último mes con datos del dataset actual. Well Config ya estaba en Productor / Crudo / Activos / Real. Cambiado en `_defaultApplied` **y** `_defaultDraft` para que "Limpiar todo" devuelva al mismo estado. ⚠️ Junio es un valor **fijo**, no un "último mes disponible": tras la próxima ingesta hay que actualizarlo aquí. | `app/store/filtersStore.ts`, `app/store/periodoStore.ts` | 828e0b4 |
| 2026-08-11 | AUDIT-reportes-breakeven | **Auditoría de la lógica de cálculo de los reportes Excel (sin cambios de código).** Documentada columna por columna la composición del reporte de priorización y del reporte del período, con las 4 variantes y el tratamiento al agregar (suma / recálculo sobre barriles agregados / ponderación por barriles / reclasificación de la condición). **Hallazgos:** (1) el título de las hojas de ranking dice *"Ordenado por EBITDA/Bl"* pero el `sort` real es por **EBITDA_Var/Bl** descendente; (2) las hojas **mensuales** del reporte de priorización repiten los pozos multi-zona porque `_fetch_variant_data` no agrupa por UWI (CUPIAGUA mayo: **52 filas para 26 UWIs**) — las hojas de período sí agrupan; (3) el **breakeven no se calcula en este repositorio**: llega precargado desde `financial_results.csv` (columna 19), es `DOUBLE PRECISION` plana (`is_generated=NEVER`, cero triggers en `ops`) y el ETL lo copia sin transformar. **Identidad verificada:** `EBITDA/Bl + Breakeven` = precio realizado del crudo, **constante** para todos los pozos de un campo-mes (TIBU jun-2026 = **79,1563** en 63/65; may-2026 = **97,0427** en 62/62). Sobre un período multi-mes deja de ser constante y pasa a ser el promedio de los precios mensuales **ponderado por los barriles de cada pozo** (combinación convexa acotada entre el mínimo y el máximo; error máx. 3,67e-07 en 64 pozos). Las excepciones son pozos con `total_bbl_blend = 0`. | — (solo análisis; bitácora `cambios_diarios` id 114) | — |
| 2026-08-11 | F-usdbl-mezcla | **El USD/Bl de `/detalle-costos` vuelve a dividirse entre barriles de mezcla.** El usuario detectó que el gasto acumulado de *Seguimiento* no coincidía con el de *Utilidad Neta*. Diagnóstico: **mismo numerador, distinto denominador** — el ratio 13,94/12,09 = **1,1528** es exactamente crudo/mezcla. Se unifica a `total_bbl_blend`. ⚠️ Esto **revierte a propósito** el ajuste del 2026-08-06, que el propio usuario había validado contra su Excel; se le advirtió el efecto (chip Levantamiento **61,93 → 71,38**) y confirmó explícitamente que prioriza la coherencia entre vistas. Al quitar `days_in_month` del SELECT desaparece también el `JOIN ops.periods` y **se corren los índices** del desempaque de la tupla — el fallo silencioso ya documentado para este archivo. Verificado con valores reales, no solo con que compile. | `kpis_costos/services_costos_usdbl.py` | dea075b |
| 2026-08-11 | F-orden-rdt | **Las hojas RDT se ordenan por su métrica redistribuida.** `_colapsar_fc` entrega las filas alfabéticas por (campo, UWI) y el bucle conserva ese orden, así que las 4 hojas de escenario salían ordenadas por UWI: el mejor y el peor pozo quedaban mezclados. `_orden_hoja_rdt` ordena de mayor a menor por `ebitda_redist` o `ebitda_bl_redist` según la hoja — la métrica **ya redistribuida**, que es el resultado del escenario y no el punto de partida. Los pozos sin barriles traen la métrica en `None` (indefinido, no cero) y van al final: compararlos contra un float reventaría y ponerlos arriba fingiría que son los mejores. La closure que escribía la hoja se extrajo a `_escribir_hoja_rdt` a nivel de módulo, compartida por las 4 hojas del V03 y del V04. No-regresión: **61.548 celdas comparadas, 0 diferencias**. | `ebitda_rank/report_service.py`, `tests/unit/test_reporte_periodo.py` | 4f4d094 |
| 2026-08-11 | F-detalle-iteraciones | **La tabla "Detalle de las iteraciones" se reformula para que se entienda sin leer el código.** Gana la columna **EBITDA/EBITDA-Bl del pozo** evaluado —así se ve que el bucle ataca siempre al peor pozo vivo— y una columna **"Reparto"** en prosa (*"114,81 entre 64 pozos"*), que explica de dónde sale el descuento antes de mostrar el número suelto. Contenido **centrado**, rejilla con **bordes** y anchos por columna aplicados como `max()` contra los de la tabla de datos, que ocupa las mismas columnas de Excel más abajo. Se retira la columna **Δ duplicada** (el número ya va dentro del veredicto) y las dos líneas *"Costos fijos / EBITDA de los que quedan"*, que se medían sobre los **supervivientes** y no cuadraban contra ninguna otra cifra del bloque — se leían como una contradicción. **"Vueltas" → "iteraciones"** en los 6 textos visibles, incluidos el título del gráfico y su eje X. Título del V04 corregido: decía **V03**. | `ebitda_rank/report_service.py`, `tests/unit/test_redistribuido_v03.py` | 4b0387f, 1f037d3 |
| 2026-08-11 | F-precision-delta | **Precisión adaptativa en el detalle del ejercicio por EBITDA/Bl.** El agregado se mueve en centésimas y las primeras iteraciones lo cambian en **diezmilésimas**, así que con 2 decimales la tabla mostraba `mejora +0,00` y repetía `-2,729` en *Total después*: se leía como que el bucle no hacía nada. El delta arranca en el mínimo de la métrica (2 para KUSD, 4 para USD/Bl) y **agrega decimales hasta que aparece cifra significativa**; *Total después* ajusta su formato fila por fila. Los pozos sin barriles, que dejaban la celda vacía, muestran **`sin barriles`**: su ratio es indefinido, no un dato faltante. **Caso límite:** una iteración con delta **8,9e-16** —ruido de punto flotante, no un cambio del negocio: apagar un pozo sin barriles no mueve el `SUM÷SUM`— se informa en notación científica en *Resultado*. 🔴 **La celda *Total después* debe seguir siendo NUMÉRICA**: el gráfico de trayectoria la lee con `Reference` y una cadena le parte la serie en tramos sueltos. Se descubrió rompiéndolo — lo detectó el usuario en el Excel, no el toolchain (corolario de DT-15/R3). | `ebitda_rank/report_service.py`, `tests/unit/test_redistribuido_v03.py` | 9046a6f, c6c2c63, 8863e7c |
| 2026-08-11 | F-pozos-sin-crudo | **Regla de pozos sin crudo en la hoja "Periodo End" + enlace con el V04.** Sobre el caudal del **mes final**: (1) crudo **y** agua en cero → la fila se **omite**; (2) agua > 0 con crudo 0 → se asigna **1 BOPD** y se recalculan las columnas por barril con ese caudal (**barriles = 1 BOPD × días producidos**, no 1 fijo, para que el denominador guarde relación con el tiempo que el pozo estuvo abierto). Sin esto, TIBU0248 salía con Breakeven, EBITDA/Bl y los 8 costos USD/Bl **todos en 0** porque `total_bbl_blend` es 0 y `_safe_div` protege la división. Verificado contra BD: TIBU0248 **no produjo crudo en ninguno de los 18 meses** de 2025-2026 y solo movió agua 2 días; TIBU0300K estuvo **ACT los 6 meses completos** produciendo cero de todo. TIBU Ene–Jun: **65 → 64 pozos**. `FC-Periodo` **no se toca** (decisión del usuario): conserva sus 71, así que el archivo lleva a propósito **dos criterios de universo**. La **línea base del V04** pasa a ser literalmente esta hoja — antes corría sobre 65 mientras el V02 mostraba 64. Efecto: la base del ejercicio /Bl salta de **−2,7288 a −2,0232** USD/Bl (TIBU0300K aportaba −119,89 KUSD al numerador y **cero** barriles al denominador), las iteraciones bajan de 5 a 4 y el corte se mueve de TIBU0152K a **TIBU0520ST**. ⚠️ El **Breakeven sigue en 0**: llega precargado de BD ya en USD/Bl y no se deriva del denominador aquí. 5 tests nuevos (**342**). ⏳ PENDIENTE validación humana. | `ebitda_rank/report_service.py`, `tests/unit/test_reporte_periodo.py` | be02fdb |
| 2026-08-11 | F-RRDC-script | **`RRDC.py` — desplegar un cambio puntual sin git ni migra.** El servidor productivo **no tiene git** y este cambio no justifica un ciclo migra+deploy. El script parchea el `report_service.py` **ya desplegado**: inserta `_ajustar_pozos_sin_crudo` y sus 3 llamadas. Modos `--verificar` / `--aplicar` / `--revertir`, con autodetección de ruta (o `--ruta`). **Salvaguardas:** idempotente (si ya está aplicado, avisa y no toca nada), respaldo con marca de tiempo, valida con `py_compile` **antes** de escribir, exige que **cada punto de inserción sea único** —si el archivo del servidor difiere, aborta sin tocar nada— y preserva el fin de línea original; si la comprobación final falla, restaura el respaldo solo. Probado sobre una copia de la versión anterior al cambio: la salida es **byte a byte idéntica** al repositorio (214.892 caracteres) y genera el reporte correcto contra PostgreSQL. Durante las pruebas un guard detectó un error propio (contaba la línea `def` como llamada) y revirtió sin dejar el archivo a medias. Requiere **reiniciar el backend** tras aplicar. | `robustez_v02_backend/scripts/RRDC.py` (nuevo, 421 líneas) | be02fdb |
| 2026-08-11 | RRDC-desplegado-productivo | **`RRDC.py --aplicar` ejecutado en el servidor productivo y backend reiniciado.** Cierra el pendiente de despliegue de la fila anterior: la regla de pozos sin crudo (`_ajustar_pozos_sin_crudo`) ya corre en el `report_service.py` en caliente del servidor, no solo en el repo. | `report_service.py` (parcheado en el servidor, sin commit — no versionado ahí) | — |
| 2026-08-11 | ops-recarga-2026-08-11 | **Segunda recarga del dataset operacional en el mismo día: re-export con corrección de datos, menos filas que el re-export 2026-07-17.** El usuario reemplazó los 6 CSV de `data/Tablas Nuevo Esquema 2026-07-17/` con una versión corregida (mismo nombre de carpeta, mismo rango 2025-01..2026-06). Auditoría previa a cargar (dedup por PK real, no conteo crudo de líneas): `wells_attributes` 40.157→**40.130** (−27), los 4 hechos 310.104→**309.842 c/u** (−262), los 4 hechos siguen cruzando **1:1** entre sí, `periods` sin cambios (18, mismo rango). `SUM(ebitda_a_kusd)` 7.163.924,81→**7.144.252,11** (−0,27%). El diccionario `EXPECTED` de `cargar_ops_v11.py` (hardcodeado contra el dataset anterior) se actualizó a los conteos nuevos **antes** de cargar — si no, la propia validación del script habría fallado tras una carga correcta. `--reset` en dev: 6/6 validaciones OK, 98,1s. **Replicación al 139:** `pg_dump -n ops --no-owner --no-privileges` **sin** `--clean` generó un dump sin las sentencias `DROP SCHEMA/TABLE/INDEX IF EXISTS` (por defecto `pg_dump` no las emite) → `restaurar_ops_dump.py` chocó con `schema "ops" already exists` y **hizo ROLLBACK limpio** (la BD del servidor quedó intacta, tal como está diseñado). Se regeneró el dump con `--clean --if-exists` y se reintentó: **COMMIT OK en 117s**, 7/7 tablas + suma de control exactas. **Trampa aparte:** `restaurar_ops_dump.py` tiene su propio `EXPECTED`/`SUMA_EBITDA_ESPERADA` hardcodeados, independientes de los de `cargar_ops_v11.py` — quedaron desactualizados en el primer intento de restauración (que sí cargó bien los datos) y el script hizo ROLLBACK de una carga correcta por comparar contra el número viejo. Corregidos en el mismo commit. **Lección para la próxima recarga:** hay que actualizar `EXPECTED` en **2 scripts distintos** (`cargar_ops_v11.py` y `restaurar_ops_dump.py`), no solo uno. **Encoding de contraseña:** la password de `OPS_DATABASE_URL` trae el carácter `£`, que se corrompe si se pasa como argumento de shell a `pg_dump.exe` (mojibake de codepage de Windows) — se resolvió escribiendo un `.pgpass` temporal con `psycopg2`/`get_settings()` (que sí lee el `.env` bien) y pasándoselo a `pg_dump` vía `PGPASSFILE`, en vez de construir la URI a mano. | `data/Tablas Nuevo Esquema 2026-07-17/*.csv` (reemplazados por el usuario), `scripts/cargar_ops_v11.py`, `scripts/restaurar_ops_dump.py`, `ops_20260811.sql` (dump, gitignoreado) | 9a6fd9b (solo el fix de conteos; la carga/restauración es operación de datos sin commit propio) |
| 2026-08-11 | F-INACTIVITY-MODAL | **Modal "Sesión inactiva" por detección REAL de inactividad del usuario.** Hasta ahora el único mecanismo de aviso de expiración (`SessionExpiryBanner` + `sessionInterceptor.ts`) medía **ausencia de requests HTTP**, no inactividad de interacción humana — si había polling o navegación de fondo, la sesión se renovaba aunque el usuario no tocara nada (gap documentado en auditoría previa de esta misma sesión). El pedido del usuario fue un modal (icono mano circular amarillo + "No hemos detectado actividad en los últimos N minutos, por seguridad cerraremos tu sesión" + botón "Entendido") que sí reaccione a mouse/teclado reales. **Backend:** nuevo `GET /api/v1/auth/session-timeout` (schema `SessionTimeoutOut`) — de solo lectura, requiere sesión válida pero **no** rol admin, porque el endpoint existente `GET /admin/settings/session-timeout` está bajo `require_admin` y un usuario normal no podía leerlo. Reusa `get_session_timeout_minutes(db)` de `shared/app_settings.py`, la misma fuente que ya usa el login para el `max_age` de la cookie — así el modal espera exactamente el timeout configurado en el panel Admin (5-240 min), sin un segundo valor desincronizado. **Frontend:** `useIdleTimer` (nuevo) escucha `mousemove`/`keydown`/`scroll`/`click`/`touchstart` con throttle de 1s y resetea un `setTimeout`; se limpia correctamente en unmount. `useSessionTimeoutMinutes` (TanStack Query, `enabled: isAuthenticated`) trae el minuto configurado. `useInactivityLogout` orquesta ambos: al vencer abre el modal y **pausa** el idle timer (`paused: isModalOpen`) para que no se resetee solo con la actividad de cerrar el modal; en "Entendido" hace `useLogout().mutate()` y redirige a `/login`. `InactivitySessionModal` es un componente propio (no reutiliza el primitivo `Modal` genérico — el layout centrado con icono circular grande no encajaba en ese primitivo) montado en `LayoutMain.tsx`. Decisiones cerradas con el usuario antes de implementar: actividad = interacción real (no red), "Entendido" = logout + redirect (el modal es un aviso de cierre ya consumado, no una oferta de extensión), timeout = el configurable existente (no uno nuevo hardcoded). Validaciones: TypeScript ✅, ruff ✅, mypy strict ✅. ⏳ PENDIENTE validación humana en navegador (abrir sesión, esperar el timeout o bajarlo temporalmente vía Admin, confirmar que el modal aparece igual que el diseño de referencia y que "Entendido" cierra sesión). | `backend/src/features/auth/api.py`, `backend/src/features/auth/schemas.py`, `frontend/src/features/auth/services/sessionTimeoutService.ts`, `frontend/src/features/auth/hooks/useSessionTimeoutMinutes.ts`, `frontend/src/features/auth/hooks/useIdleTimer.ts`, `frontend/src/features/auth/hooks/useInactivityLogout.ts`, `frontend/src/features/auth/components/InactivitySessionModal/`, `app/layouts/LayoutMain.tsx` | 1a21a23 |
| 2026-08-12 | AUDIT-bsod-maquina-dev | **Auditoría del reinicio forzado de la máquina de desarrollo (SKYNET) — sin cambios de código, sin relación con el proyecto.** El equipo se reinició solo el **11/08 a las 22:42:32**; volvió a las 23:18. **No fue corte de luz: fue pantalla azul.** `Kernel-Power 41` (cierre no limpio) + `EventLog 6008` (cierre inesperado) + `WER-SystemErrorReporting 1001` con **`BugCheck 0x0000001A` (MEMORY_MANAGEMENT), subcódigo `0x3F`** — corrupción en las estructuras de gestión de memoria del kernel. **Lo relevante no es esa caída suelta sino el patrón: 10 BSOD desde el 4 de agosto, TODOS con el mismo `0x1A / 0x3F`** — 04/08 ×4 (07:19, 07:30, 12:00, 12:10), 06/08 ×3 (11:08, 12:10, 16:27), 10/08 ×1 (14:21), 11/08 ×2 (20:38, 22:42). El **segundo parámetro varía** en cada caída (`0x162994`, `0x17c671`, `0x1bd9c4`, `0x15e53a`…): es un número de página, o sea que la corrupción cae en direcciones distintas cada vez. **Hardware:** un **único** módulo Kingston HyperX Fury `KHX3200C16D4/8GX`, 8 GB, ranura ChannelB-DIMM2 (BANK 3), serie E19878B2, corriendo a **3200 MHz** sobre placa ASUS. Los 3200 son perfil **XMP/D.O.C.P.** (el JEDEC de DDR4 es 2133/2400), es decir un overclock de fábrica activo. ⚠️ **Con un solo módulo instalado, "página distinta cada vez" pierde fuerza como indicio de barra defectuosa** — toda la memoria pasa por ahí igual. Sigue siendo compatible con RAM mala, pero también con inestabilidad por XMP, con un driver que corrompe memoria de kernel, o con el archivo de paginación sobre disco con errores (con solo 8 GB y Postgres + 2 dev servers + VS Code, el pagefile se usa mucho). 🔴 **Los minidumps NO existen** — comprobado **con elevación** (`ADMIN=True`, `LECTURA=OK`, `COUNT=0`) y `C:\WINDOWS\MEMORY.DMP` tampoco está, pese a que los 10 eventos 1001 declaran haberlos escrito (`081126-27765-01.dmp` el más reciente). El registro está configurado para generarlos (`CrashDumpEnabled=3`, `MinidumpsCount=5`). El primer sondeo **sin** elevación devolvió lista vacía por `UnauthorizedAccessException`, indistinguible de "no hay archivos" — de ahí que la confirmación exigiera UAC. **Sin dump no se puede señalar driver culpable**, así que el análisis quedó ahí. **Para retomar:** (1) desactivar **D.O.C.P./XMP** en BIOS y observar 2-3 días — prueba más barata y sospecha principal; (2) `chkdsk` en C: por el pagefile; (3) **MemTest86** desde USB, ≥4 pasadas, de noche; (4) si se quiere análisis de dump, primero averiguar **por qué no se están guardando** (limpieza de disco, antivirus o pagefile insuficiente al inicio del arranque) y luego `winget install Microsoft.WinDbg` (winget disponible en el equipo). C: tiene 591,9 GB libres, así que no es falta de espacio. | — (solo diagnóstico; ningún archivo del proyecto tocado) | — |
| 2026-08-12 | F-EBITDA-RANK-CUADRE | **Diagnóstico y cuadre parcial de `/ebitda-rank`: curva vs. cinta de KPIs.** Punto de partida: el usuario señaló que el tooltip "Aceite Acum" de la curva no coincidía con el KPI "Qo Total" de la cinta (298.930 vs. 50.510). Diagnosticado con SQL directo contra PostgreSQL: la curva **sumaba** BOPD de los N meses en vez de promediarlos (factor 6× exacto), y además filtraba por `well_status='ACT'` mientras el KPI no filtraba por estado. **Aplicado (DT-19, temporal):** `AJUSTE_CURVA_A_KPI` escala la serie Aceite-Cum para que su último punto sea el KPI — reversible con la constante en `false`, documentado con los 3 arreglos reales pendientes. **Aplicado (permanente):** los ejes Y1/Y2 del chart se dimensionan solo con las series `visible` (antes combinaban las 7 aunque no se dibujaran — con criterio U.Neta desperdiciaba 68,5% del eje). **Aplicado (permanente):** el RangeSlider por defecto deja de recortar a ±10% del mejor pozo — la curva pasa de dibujar 46 de 69 pozos a los 69, y su último punto ya coincide con el KPI EBITDA sin necesidad de escalado. **Intentado y revertido:** alinear los 6 KPI de la cinta (EBITDA/UO/UN) con el universo del ranking vía `criterioStore` + overrides en `LayoutMain`; funcionaba, pero el usuario prefirió mantener el mismo KPI global en todas las rutas y documentar la diferencia (−4,21 KUSD, 520 pozos excluidos) en vez de cuadrarla. **Lección de proceso:** 2 planes para el executor fallaron en su primer intento por auditorías incompletas — el primero por leer el archivo objetivo en fragmentos en vez de completo, el segundo por anclar un prerequisito a un hash de commit en vez de al contenido; corregidos en v3 y ejecutados con éxito (memoria `planes-anclas-por-contenido-no-por-hash`). También se ejecutó un **ensayo completo del plan v3** (aplicar → typecheck/lint/prettier reales → revertir) antes de entregarlo, que destapó un import huérfano (`TS6133`) que la sola lectura del plan no había visto. | `TendenciaEbitdaChart.tsx`, `EbitdaRankPage.tsx` (RangeSlider + `criterioStore`), `useKpiQoQw.ts` + `kpiProductionService.ts` (nuevos, `ebitda_rank`), `criterioStore.ts` (nuevo), `LayoutMain.tsx` (tocado y revertido a idéntico), `ebitda_rank/schemas.py` + `services.py` (backend, 2 campos `/Bl` sin consumidor tras el revert), `CLAUDE.md` (DT-19 + esta fila) | b7c5cbb, ad8cc19, ba4cf10 (revertido), d4af249 (revertido), 444b883, 2c04c1c |
| 2026-08-12 | F-ORDEN-CRITERIO | **La curva de tendencia se ordena por la métrica del criterio activo.** El eje X de `/ebitda-rank` estaba fijo en **EBITDA/Bl DESC** sin importar el waffle "Condición": las 3 curvas compartían el orden del EBITDA. Ahora el `ORDER BY` sigue al criterio (**UO/Bl** con `util_oper`, **UN/Bl** con `util_neta`), resuelto por un **dict acotado a 3 literales fijos** — `criterio` nunca se interpola en SQL. El endpoint `/ranking` lo expone con la misma validación que ya usaban los otros 3 del archivo. **El fetch real también lo envía**: `useEbitdaRankData(criterio)` lo mete en la `queryKey`, así que cambiar el waffle dispara un refetch — sin ese paso el backend habría quedado con la capacidad de reordenar y la página pidiendo siempre el default (hallazgo detectado auditando el propio plan, antes de entregarlo). El helper **`criterioMetric.ts`** queda como única fuente de la regla y **reemplaza la ternaria que la duplicaba** dentro del chart. Siguen al criterio: filtro y límites del RangeSlider, filtrado del mapa, títulos de ambos ejes, label del slider y las bandas verde/roja (`zoneShapes.ts`: `ebitdaBl` → `metricBl`; la serie llega **monótona por construcción**, el `findIndex` queda como salvaguarda). **Se eliminan `EbitdaRankData.aceiteCum`/`ebitdaCum`** — 0 consumidores (verificado por grep + typecheck); hoy inofensivos, tras el reordenamiento habrían acumulado en un orden distinto al dibujado sin ningún error que lo delatara. Los 17 tests de `zoneShapes.test.ts` pasan **sin modificar el archivo**. | `ebitda_rank/services.py`, `api.py`, `report_service.py` (2 callers con `criterio="ebitda"` explícito), `utils/criterioMetric.ts` (nuevo), `ebitdaRankService.ts`, `useEbitdaRankData.ts`, `RangeSlider.tsx`, `zoneShapes.ts`, `TendenciaEbitdaChart.tsx`, `rankingTypes.ts`, `ebitdaRankMapper.ts`, `EbitdaRankPage.tsx` | 7f5b1b3 |
| 2026-08-12 | F-REPORTE-V05 | **Nuevo reporte Excel "Redistribuido V05": descuento % sobre Costos Fijos antes de iterar.** Quinto reporte de redistribución, en el AvatarPanel junto a V03/V04. Es el **V04 con un único paso intercalado**: antes de correr las iteraciones, el costo fijo de cada pozo de la línea base se rebaja el % que el usuario elige. Esa línea base ya rebajada es la que se ve en la hoja `Periodo End` **y** la que alimenta los dos bucles, **sin tocar una sola línea de su lógica**. `_aplicar_descuento_costos_fijos` es **pura** y rebaja **2 claves**: `costos_fijos` (KUSD, la masa que reparte el bucle y decide el ON/OFF) y `costos_fijos_bl` (USD/Bl, la columna L que el usuario señaló) — son la misma cifra en dos unidades y descontar solo una dejaría la hoja y el bucle mirando números distintos. 🔴 Corre **DESPUÉS de `_ajustar_pozos_sin_crudo`**, que rederiva `costos_fijos_bl` para los pozos sin crudo. **El V04 no se toca**: función hermana en paralelo, no refactor compartido; con **0%** ambos son idénticos. El **EBITDA no cambia** (el ahorro no se acredita al pozo — decisión del usuario) ni el **Breakeven** (precargado de BD en USD/Bl). **Frontend:** `DescuentoCfModal` (slider 0-100, 1 decimal) es el **primer tile de descarga que pide un dato antes de bajar el archivo**; se monta en **`Header.tsx`, NUNCA en `AvatarPanel`** — ese panel se desmonta al cerrarse y se llevaría el modal consigo (mismo patrón que `CostosFijosModal`; la v1 del plan lo montaba mal y se corrigió en la 2.ª auditoría). `Header` posee el estado **y dispara la descarga**, así que el .xlsx se genera aunque el panel esté cerrado. El % va en el encabezado de las 3 hojas como **"Escenario:"** y en el nombre del archivo. 6 tests nuevos (**342 → 348**). ⏳ PENDIENTE validación humana (en especial: abrir el modal, cerrar el panel y confirmar que el modal sobrevive). | `ebitda_rank/report_service.py`, `api.py`, `tests/unit/test_reporte_periodo.py`, `DescuentoCfModal/` (3 archivos nuevos), `reportService.ts`, `AvatarPanel.tsx`, `Header.tsx` | 6dbca90 |
| 2026-08-13 | F-ALINEACION-EBITDA | **El mismo EBITDA daba tres números distintos según la vista; ahora los cuatro comparten universo.** El usuario notó que el último punto de la curva café de `/ebitda-rank` (−397,25) no coincidía con el KPI EBITDA de la cinta (−401,46). Diagnóstico con SQL directo: no era un error de acumulación sino **tres poblaciones distintas** — KPI **−401,4585** (sólo jerarquía+período), reporte de línea base **−399,4392** (+`well_status='ACT'`), curva **−397,2494** (+`total_bbl_blend<>0`). Dos causas independientes: (1) el KPI **no filtraba por estado de pozo** y sumaba INACT — **−13.503 KUSD globales (−0,47%)**, 18 campos; (2) la curva exigía **mezcla ≠ 0** en un `INNER JOIN` y descartaba EBITDA real de pozos que produjeron sin registrar mezcla — **250 filas / 121 pozos / +6.822 KUSD**. Los 3 pozos del descuadre en TIBU: **TIBU0129** (INACT los 6 meses), **TIBU0568** (ACT+INACT, sólo faltaba su porción INACT) y **TIBU0248** (ACT, mezcla y crudo **0**, sólo 58 Bl de agua en 2 días). **Decisión del usuario:** alinear al **universo del reporte** (respetar el selector Activos/A+I) y **no** al KPI, que habría dejado el selector sin efecto. La mezcla pasa a ser sólo **denominador** del EBITDA/Bl, ya protegido por el `CASE WHEN SUM(bls)=0`. **Alcance ampliado en auditoría (H-1):** los **2 servicios de waterfall** de `/ebitda-costos` tenían el mismo defecto — sin incluirlos, su barra EBITDA habría marcado −401,46 junto a una cinta en −399,44 **en la misma pantalla**, creando la incoherencia que el plan corregía. **Trampa que casi rompe algo (H-8):** el patrón de 3 líneas `FROM fr_f fr / JOIN ops.flow_rates flr / ON flr.uwi = fr.uwi` aparece **4 veces byte-idénticas**; la 4.ª está en **`_aggregate_metric`**, que alimenta la redistribución de costos fijos y **no lo cubre ni V6 ni los tests** (ejercitan la lógica pura, no el SQL) — un `replace_all` lo habría roto **en silencio**. Se añadió un check bloqueante post-edición: INNER debe quedar en **1** y LEFT en **9**. Efecto colateral **correcto**: 2 pozos cambian de `/Bl` porque recuperan meses que el `INNER JOIN` borraba — **SURI0058** pasa de −13,51 a **−34,65** USD/Bl al recuperar −59,22 KUSD de mayo y junio. Verificado en **2 campos × 4 variantes** (Real/Tasa × Activos/A+I) con los 5 servicios reales, y el PNG del reporte (sin cobertura de tests, reglas R4-R6 §17.6) generado sin excepción en **8 campos** incluidos los casos borde (SARDINATA: 2 de 5 pozos con `/Bl`=0). ✅ **Validado en navegador por el usuario: los tres puntos coinciden.** | `kpis_financieros/services.py`, `utilidades_service.py`, `waterfall_service.py`, `waterfall_utilidades_service.py`, `ebitda_rank/services.py` | 31c5e2c (era `137394b`; otro agente reescribió el commit con `--amend` — árbol y mensaje verificados idénticos, sólo cambió el hash) |
| 2026-08-13 | F-SLIDER-RANK | **Encuadre del RangeSlider y tres defectos del filtro de la curva.** **(1) Encuadre simétrico (`5a625c7`):** el pulgar izquierdo arranca en **−maxPositivo** (−37,79 en TIBU), simétrico al extremo positivo, para que el outlier de −421,52 USD/Bl no aplaste la zona útil. 🔴 Es la **posición del pulgar**, NO el límite del slider — `defaultMin` sigue siendo el mínimo real, así que el recorrido gris llega hasta −421,52 y el usuario puede arrastrar de vuelta. Un primer intento recortó `defaultMin` y dejó al usuario **sin forma de volver al rango completo**; fue rechazado y revertido. Dos guardas: sin ningún pozo rentable se conserva el rango completo (si no, el rango queda **invertido** y el gráfico sale vacío — 6 campos reales: CHURUYACO, CUSIANA, GIBRALTAR, HORMIGA, MANSOYA, SUCIO), y si −maxPositivo cae bajo el mínimo real se devuelve `null`. **(2) Borde del slider (`663d557` insuficiente → `af9854b`):** el `RangeSlider` tiene **`step={0.01}`** y la métrica de los pozos es un **float sin redondear**. TIBU0091K vale **−421,5246972605784** y el valor más bajo que el pulgar puede tomar es **−421,52**, que es **MAYOR**: la comparación cruda lo excluía, el eje X terminaba en el **penúltimo** pozo (TIBU0568) y el acumulado cerraba en **−317** en vez de −399,44 KUSD. El primer fix usó comparación **exacta** (`effectiveMin <= defaultMin`) y por eso **no arregló nada**; el segundo añade **tolerancia de un `step`**, en la curva **y** en el filtro del mapa, que compartían el defecto. Además las **4 series acumuladas** pasan de `spline` (smoothing 1.2) a **línea recta**: un spline aproxima con Bézier en vez de pasar por los puntos y redondeaba la caída final — son las cifras que se contrastan contra la cinta, así que deben tocar su punto; las series **/Bl** conservan el suavizado. **(3) Reset entre poblaciones (`cbd3573`):** `rangeMin`/`rangeMax` **nunca se reseteaban**. Sus valores son **absolutos** (USD/Bl), no fracciones del recorrido, así que al pasar de TIBU a CAÑO SUR ESTE el slider seguía mostrando −421,52/+37,79 y el pulgar derecho caía a media pista. **Más grave que el defecto visual:** ese rango obsoleto seguía **filtrando pozos** del campo nuevo sin que nada lo delatara. Se sueltan los pulgares cuando cambia la escala (`defaultMin|defaultMax`), **ajustando durante el render** en vez de `useEffect` para no dibujar un frame con el rango viejo — mismo espíritu que `activeCategories`, que ya se reseteaba al cambiar de criterio. **Lección (corolario DT-15/R3):** `663d557` se reportó como resuelto **sin abrirlo en navegador** y no arreglaba nada; lo que desbloqueó el diagnóstico fue un dato concreto del usuario (*«el eje X termina en TIBU0568»*), que convirtió el problema de «no se dibuja bien» a «falta un elemento en el array». ⏳ PENDIENTE validación humana de los 3 arreglos. | `EbitdaRankPage.tsx`, `TendenciaEbitdaChart.tsx` | 5a625c7, 663d557, af9854b, cbd3573 |
| 2026-08-12 | AUDIT-CRITERIO-PARADA | **El criterio de parada del bucle de redistribución se detiene en un óptimo local — medido, sin cambios de código.** Simulando el V05 al 60% en TIBU, el usuario notó que la hoja EBITDA/Bl reportaba un número mayor que la de EBITDA y preguntó por qué. **(1) Los dos bucles no tienen por qué converger:** uno maximiza una **suma** (EBITDA total) y el otro una **fracción** (EBITDA/Bl agregado). Quitar un pozo con EBITDA positivo pero bajo rendimiento por barril **sube el promedio y baja la suma**, así que la hoja /Bl apaga más pozos (18 contra 10) — ya documentado en el docstring de `_optimizar_mes_v03_bl` como consecuencia aceptada por el negocio. ⚠️ Además `ResumenV03.ebitda_despues` está en **KUSD** en una hoja y en **USD/Bl** en la otra: compararlos lado a lado induce a error (lo hice y lo corregí). Medidos ambos en KUSD: **810,60** (EBITDA) vs **959,38** (/Bl). **(2) El bucle de EBITDA es codicioso y para al PRIMER retroceso, pero la curva NO es monótona:** para en la iteración 11 con **138,78 KUSD** mientras el máximo real está en la 15 con **193,42** — deja **54,64 KUSD** sobre la mesa. La causa: el bucle **ordena por EBITDA** pero el delta de cada apagado depende de **dos** variables (`−EBITDA_pozo − CF_pozo`), y los costos fijos entran desordenados. TIBU0396 (iter 11) no tiene nada anómalo: le tocaron CF de 95,20 contra un EBITDA de −85,33. Se midieron 5 criterios de orden; ordenar por **`EBITDA + CF`** —que es exactamente el delta real— da **279,06 KUSD** y **elimina los baches** (para en iter 22, su máximo está en la 21), devolviéndole validez al criterio de parada por cambio de pendiente. **NO SE TOCÓ NADA**: el orden por EBITDA es la regla del negocio, con nota explícita en el código de que no se corrige ahí. Medido solo en TIBU al 60% — antes de generalizar habría que barrer más campos y porcentajes. Queda como insumo para decisión del negocio. | — (solo análisis; bitácora `cambios_diarios` id 122) | — |
| 2026-08-13 | V05-ORDEN-CFG | **El bucle EBITDA del reporte V05 elimina por `EBITDA + Costos Fijos + Gasto`, no por EBITDA solo.** Cierra la advertencia medida el 2026-08-12 ([[AUDIT-CRITERIO-PARADA]]): apagar un pozo cuesta su EBITDA **y además** su costo fijo, que se reparte entre los supervivientes — el delta real es `−(EBITDA_p + CF_p)`. Al ordenar por una variable y decidir por otra, la trayectoria del total tenía baches y el corte al primer retroceso caía en un **óptimo local**. Con el orden alineado la trayectoria deja de tenerlos: en TIBU para en la iteración 21 y su **máximo real está también en la 21**, así que el criterio de parada vuelve a ser exacto. Medido en TIBU (2026 Ene–Jun, real, activos, 60%): **148,65 → 279,06 KUSD**, 11 → 22 iteraciones, y la hoja EBITDA pasa a **superar a la hoja EBITDA/Bl (257,10)** — el objetivo del usuario. **Barrido de 58 campos:** con el orden nuevo H1 ≥ H2 en los **56 campos con datos** (50 mayor, 6 empate exacto, **0 derrotas**); el cambio solo mueve el resultado en **16 de 56** (en el resto el bucle no llegaba a desalinearse), efecto agregado **+1.121,86 KUSD**. En **CAÑO SUR ESTE** no cambia nada (449.259,80): el bucle no itera, así que el orden es irrelevante — confirma que es inocuo donde no debe actuar. 🔴 **Alcance:** `_optimizar_mes_v03` la comparten **3 reportes** (V03 línea 5338, V04 línea 5487, V05 línea 5619), así que el cambio viaja en un parámetro **keyword-only `orden="ebitda"` por defecto** y solo el V05 pasa `"ebitda_cfg"` — **V03 y V04 no cambian** (verificado con `git stash` contra el código original: el V04 daba 2 iteraciones / 1 apagado antes y después). La hoja **EBITDA/Bl NO se toca**: maximiza una fracción (`SUM÷SUM`) y al apagar un pozo también salen sus barriles del denominador, así que su delta **no** es `−(EBITDA + CF)`; medido, aplicárselo la **empeora en 11 de 24 casos** (CUSIANA al 80% cae −60,20 USD/Bl). El texto de la regla vive en una constante compartida, así que el V05 estrena **`_METRICA_EBITDA_CFG`** derivada con `dataclasses.replace` — `_METRICA_EBITDA` conserva el suyo para V03/V04. **Se descartó** una regla por campo o un selector automático: los resultados dependen también del **%** (el desalineamiento va de 3,4% a 0% hasta 19,0% a 80%), del período y de la variante, y una tabla fija envejecería en silencio con cada recarga de `ops`. ⚠️ **Efecto colateral aceptado:** con descuento **0%** el V05 ya **no** es idéntico al V04 (el orden nuevo también actúa ahí). 3 tests nuevos (**348 → 351**). ✅ Verificado sobre el .xlsx descargado de la app: 22 iter / 21 apag / 43 vivos / **SUM col S = 279,06**; hoja /Bl intacta en 19 / 18 / **257,10**. ⏳ PENDIENTE validación humana (abrir V05 y V04 en Excel, confirmar que no piden reparación). | `ebitda_rank/report_service.py`, `tests/unit/test_redistribuido_v03.py`, `Planes/plan_V05_orden_ebitda_cfg_2026-08-13.md` | ab7539c |
| 2026-08-13 | F-CAUDAL-RDT | **Prod. Aceite/Agua de las hojas RDT-EBITDA y RDT-EBITDA-Bl (V04/V05) vuelve a coincidir con la hoja base "Periodo End".** El usuario detectó en el Excel que un mismo pozo (TIBU0002K) mostraba dos caudales distintos en el mismo archivo: **22,18/3,38** BOPD/BWPD en "Periodo End" contra **21,67/2,99** en las dos hojas RDT (idénticas entre sí, distintas de la base). Diagnóstico: `_fc_v04_comunes` — la función que arma esas 2 columnas en las 4 hojas de escenario, ya que V04 y V05 comparten el código — promediaba **todo el período** con `prod_aceite_tasa_bl`/`prod_days` en vez de leer `qo_mes_final`/`qw_mes_final`, que la fila ya trae calculado por `_adjuntar_caudal_mes_final` **antes** de llegar al bucle de redistribución. La redistribución de costos fijos nunca tocó la producción: era un bug de lectura en la función que arma la hoja, no un efecto del bucle. **Auditoría adicional** (a pedido del usuario) sobre el resto de columnas de esas 4 hojas: ninguna otra recalcula con una fuente distinta a la línea base. El único caso parecido — `EBITDA/Bl` "antes", recalculado dentro de `_optimizar_mes_v03_bl` — usa los MISMOS `ebitda`/`total_bls` que ya trae la fila (no una fuente física distinta como el promedio vs. el mes final), es una redundancia inofensiva y ya está cubierta por un test existente (`test_bl_fila_excel_21_columnas_y_ratio_consistente`): no es el mismo defecto. Test nuevo blinda la regresión con dos fuentes deliberadamente distintas en la misma fila sintética. | `ebitda_rank/report_service.py`, `tests/unit/test_redistribuido_v03.py` | 3b276f9 |
| 2026-08-13 | ajuste_Q-script | **`ajuste_Q.py`: despliega el fix anterior en el servidor productivo sin git ni migra.** Mismo patrón que `RRDC.py` (ver `scripts/` en §3): reemplaza el bloque exacto de `_fc_v04_comunes` sobre un `report_service.py` YA desplegado. `--verificar`/`--aplicar`/`--revertir`, idempotente (marca `_num(row.get("qo_mes_final")),`, exclusiva de la versión corregida), respaldo con marca de tiempo antes de escribir, valida con `py_compile` antes de tocar el archivo. Probado contra una copia pre-fix del archivo: el resultado es **byte a byte idéntico** al del repositorio, reaplicar no toca nada (idempotencia confirmada) y `--revertir` restaura el original exacto desde el respaldo. **Aplicado en el servidor productivo** por el usuario (`--aplicar` ✅, respaldo `report_service.py.bak_20260813_124148`, verificado "APLICADO correctamente"). ⏳ Pendiente confirmar que se reinició el backend de ese servidor — el proceso en memoria conserva el módulo viejo hasta el reinicio. | `robustez_v02_backend/scripts/ajuste_Q.py` | ef938b7 |
| 2026-08-13 | V05-SELECTOR-BL | **Capa determinista: la hoja EBITDA/Bl del V05 corre los DOS métodos del bucle y se queda con el que deje más EBITDA en KUSD.** El usuario pidió replicar en esta hoja la optimización aplicada por la mañana a la hoja EBITDA, y evaluar si el **agua** servía como criterio. **El agua NO sirve, medido:** correlación con el criterio óptimo **−0,038**; ordenar por mayor agua corta en la iteración 1 dejando el campo **peor que la línea base** (−2,5758 vs −1,3183 USD/Bl) y por WOR tampoco. El agua ya está dentro del EBITDA vía tratamiento y levantamiento — volver a usarla la cuenta dos veces y sin el ingreso. El criterio correcto se **derivó algebraicamente**: apagar el pozo *p* deja el agregado en `1000·(E − e_p − cfg_p)/(B − b_p)`, así que sube si y solo si **`(EBITDA + CF + Gasto) / barriles`** del pozo es menor que el agregado — el análogo exacto del `ebitda_cfg` de la hoja EBITDA, dividido entre barriles porque aquí la métrica es una fracción. La hoja /Bl tenía el mismo defecto que tenía la de EBITDA: corta en la iteración 19 con 1,6215 USD/Bl cuando su máximo real está en la 24 con 1,7808. 🔴 **Pero el método nuevo no se aplica a secas:** mejora o iguala el EBITDA/Bl en los 56 campos medidos y **empeora el EBITDA KUSD en 79 de 224 escenarios**, hasta **−205.055,66 KUSD** en CAÑO SUR ESTE al 100% — en campos rentables, optimizar mejor el promedio por barril significa apagar más pozos que sí ganan plata. De ahí `_elegir_mejor_bl`, que corre ambos y elige por **KUSD** (árbitro decidido por el negocio). Determinista, sin parámetros ni tabla de campos —que envejecería con cada recarga de `ops`, porque el método que conviene depende del campo, del %, del período y de la variante—. Al 60%: **Metodo01 gana en 23 campos, empate en 32, Metodo02 en 1** (TIBU, +21,96 KUSD). El valor no es esa ganancia sino haber hecho **seguro** habilitar el método nuevo: evita ~217.000 KUSD de destrucción. Alcance **solo V05** (parámetro keyword-only con default histórico → V03/V04 intactos); la hoja **no menciona** el selector, el rastro va al log de structlog, y la regla impresa **acompaña al método que corrió**. 🔴 **El plan falló en su primera ejecución por 3 defectos propios:** (1) crítico — no previó que el `logger.info` de `_elegir_mejor_bl` sería la **primera llamada real a logging de `ebitda_rank` ejercitada por un test unitario**; `structlog.configure()` es singleton por proceso y `PrintLoggerFactory` captura `sys.stdout` **por valor**, así que los 4 tests de `test_logger.py` que llaman `setup_logging()` dejaban el logger global apuntando a un stream que pytest ya había cerrado → 3 tests reventaban con `I/O operation on closed file` **solo en la suite completa** (colección alfabética: `test_logger` < `test_redistribuido`). Producción nunca estuvo en riesgo (`main.py:60` usa el stdout real). Fix: **fixture `autouse` en `conftest.py`** con `ReturnLoggerFactory`; se descartó el `try/except` que sugirió el executor porque escondería fallos reales de logging. (2) el ancla del Paso 6 era **byte a byte idéntica en V04 y V05** — hubo que anclarla por el título de la hoja. (3) conteos mal calculados (3 vs 4 ocurrencias, 357 vs 358 tests). 6 tests nuevos (**352 → 358**). ⏳ PENDIENTE validación humana. | `ebitda_rank/report_service.py`, `tests/conftest.py`, `tests/unit/test_redistribuido_v03.py` | 5589ab0 |
| 2026-08-13 | F-SLIDER-MAPA | **El slider de `/ebitda-rank` deja de filtrar los pozos del mapa.** El `RangeSlider` recortaba a la vez la **curva** de rentabilidad y los puntos del **scatter de condición**: al cerrarlo, el mapa pasaba de ~70 puntos a ~11 y dejaba de servir como referencia geográfica justo cuando el usuario estaba acotando el eje de la curva. Ahora el slider acota **solo la curva**; el mapa dibuja siempre la población completa de `useWellConditionData`. Se eliminan **`visibleUwis`, `rankedUwis` y `filteredPoints`** — sin consumidor tras el cambio, mismo criterio que con `aceiteCum`/`ebitdaCum` el 2026-08-12: código muerto en una página crítica, recuperable desde git. Queda un comentario con la decisión y su fecha para que no se lea como regresión al comparar contra el historial. **El mapa conserva su propio filtro**, independiente del slider: los chips de categoría (`activeCategories`). ⏳ PENDIENTE validación humana. | `ebitda_rank/pages/EbitdaRankPage.tsx` | 04fd997 |
| 2026-08-13 | DEPLOY-BAT | **`MIGRA.bat` y `DEPLOY.bat` en la raíz + §11.5 de despliegue en este archivo.** `migra.py` y `deploy_zip.py` exigen estar parado en la **raíz** del proyecto, pero es natural ejecutarlos desde `scripts/`, donde viven, y ahí fallan con *"el directorio actual no parece la raíz"*. Los `.bat` hacen `cd /d "%~dp0"` y funcionan desde cualquier lado; `DEPLOY.bat` toma el zip **más reciente**, pide confirmación S/N y copia los `.env` al terminar. 🔴 **Incidente de proceso (~1 hora perdida):** traté el `AVISO: no se encontro frontend .env` de `deploy_zip.py` como un **error** y mandé al usuario a copiar ese archivo de otros deploys, que tampoco lo tenían. Es **informativo**: el frontend **no necesita `.env` en el servidor** — el local es copia del `.env.example` con `localhost:8765` — y los deploys anteriores mostraron el mismo aviso y funcionaron. El usuario insistió en que siempre había funcionado y no lo escuché. Se documenta en **§11.5** una tabla con los **7 avisos normales** que no requieren acción, la regla del `cd` a la raíz, qué incluye y qué no el zip, y las **2 copias de trabajo en paralelo** (`robustez-v02` la del usuario, `Des_robustez_2.0` la de Claude Code, mismo remote). | `MIGRA.bat`, `DEPLOY.bat`, `CLAUDE.md §11.5`, `reporte_v05_ebitda_por_campo_2026-08-13.csv` | 5fc3b57 |
| 2026-08-18 | F-LOGIN-CINE | **Login dinámico + transición cinematográfica a Main: viabilidad → 3 decisiones → plan auditado → ejecución → fix post-implementación.** Se evaluó la viabilidad de un documento de diseño externo (`tran_opc01.md`, propuesta "Bootstrap + paleta `$au-*` nueva") contra el codebase real vía un agente Explore, que confirmó que el proyecto **no usa Bootstrap en ningún lado** (Sass Modules + lucide-react) y que la paleta propuesta no coincide con los tokens Ecopetrol vigentes. Se cerraron **3 decisiones** con el usuario antes de planear (formuladas con `AskUserQuestion`, todas con la opción recomendada): **(1)** Sass Modules + lucide-react, cero Bootstrap; **(2)** paleta Ecopetrol vigente remapeada 1:1, no los tokens nuevos del doc; **(3)** "vista aproximada + navigate al final" (`MainPreview` estático) en vez de montar el `LayoutMain` real dentro de `/login`. El plan v1 se auditó con el flujo profesional §15 leyendo los archivos reales (`authTypes.ts`, `authService.ts`, `authStore.ts`, `useLogin.ts`, `package.json`, `eslint.config.js`, `.stylelintrc.json`, `vitest.config.ts`, `ProtectedRoute.tsx`) y arrojó **8 hallazgos** integrados en un plan v2: el más crítico, que `useLogin.onSuccess` fija `isAuthenticated=true` de forma **síncrona** — sin gatear el `<Navigate>` con `cine.phase==='idle'`, el redirect habría matado la animación en el primer re-render; también que los comandos de validación del v1 estaban **inventados** (no existe `pnpm lint:eslint <target>` ni `pnpm test -- --run`) y que los toasts (`z-index 10001`) se dibujarían encima de la cortina (`10000`) sin gatearlos a `phase==='idle'`. Ejecutado como EXECUTOR: **9 archivos nuevos** (`useCinematicLogin.ts` + `AuthSteps`/`SubmitButton`/`Curtain`/`MainPreview` con sus `.module.scss`) y **2 modificados** (`LoginPage.tsx`, `LoginPage.module.scss`); typecheck y lint en verde (1 fix de `stylelint no-descending-specificity` en `SubmitButton.module.scss` — orden de `.btn:hover:not(:disabled)` vs `.btn:disabled`/`.btn:focus-visible`). **Fix post-validación visual:** el usuario detectó que la secuencia "iba muy rápido" — diagnóstico: `succeed()` forzaba los 4 checks LDAP de inmediato en cuanto el backend respondía, así que con un LDAP real rápido (<1s) el teatro de pasos nunca llegaba a animarse, saltando directo a "todo listo". Corregido desacoplando la revelación del tiempo de respuesta real (`performance.now()` desde `start()`; `succeed()` espera lo que falte del recorrido mínimo `UNIT × 4` en vez de forzarlo) y ampliando timings (`UNIT` 540→650ms, `DUR_DONE` 520→650ms). `pnpm test` completo se omitió a pedido del usuario (sin tests nuevos en el alcance, `--passWithNoTests`). ⏳ PENDIENTE validación humana en navegador — ver "Pendiente inmediato" en §8. | `robustez_v02_frontend/src/features/auth/hooks/useCinematicLogin.ts`, `components/AuthSteps.tsx`(+`.scss`), `components/SubmitButton.tsx`(+`.scss`), `components/Curtain.tsx`(+`.scss`), `components/MainPreview.tsx`(+`.scss`), `pages/LoginPage.tsx`, `pages/LoginPage.module.scss`, `Planes/plan_F-LOGIN-CINE_2026-08-18.md` | sin commit |
| 2026-08-19 | F-RESCATE-INACT | **`well_status` deja de ser el único criterio de «pozo activo»: se rescatan los INACT con días de producción reales.** El usuario reportó que **RUBI1638HST** daba −7,29 KUSD en la app contra **+21,68** de su Excel. Diagnóstico con SQL directo: en marzo el pozo está tageado `INACT` pero produjo **29,59 de ~31 días** y generó +28,98 KUSD; la app lo descartaba. No es un caso aislado — medido sobre Ene–Jun 2026: **476 filas INACT con `production_days > 0`** (423 con EBITDA≠0) y, a la inversa, **523 filas ACT con cero producción**. Se adopta la opción **menos invasiva (OR)**: se conserva `well_status` como señal primaria y se rescatan los INACT con producción real, sin tocar el valor de la columna ni las claves de JOIN de 6 columnas. `production_days` va **sanitizado** con `_sanitize_col` porque en PostgreSQL **`NaN > 0` evalúa TRUE** (verificado) y `COALESCE` no protege contra NaN (DT-18). Como esa columna vive solo en `ops.flow_rates`, **7 de los 8 sitios** necesitan además un `LEFT JOIN` nuevo **dentro del CTE** — LEFT y no INNER, para no descartar filas de `financial_results` sin pareja. **El alcance creció dos veces por hallazgos de auditoría, no por improvisación:** (1) `condicion_pozos_service.py` estaba clasificado fuera de alcance, pero `test_condicion_pozos.py` lo ata por paridad al mapa — sin él la tarjeta decía 13 marginales y el modal 12, con 2 tests en rojo; (2) `ResumenService` y los 9 reportes Excel comparten **solo 2 funciones de datos** (`_fetch_variant_data`, `_fetch_fc_detail`), así que no eran separables: tocar V05 sin tocar el resto exigía duplicarlas. Cifras verificadas (RUBIALES): ticker **704.116,44 → 711.278,45 KUSD**, curva y summary **788 → 805 pozos**. ⚠️ El rescate **no es uniformemente favorable**: 8 campos suben pero **10 bajan** (SARDINATA −125,82, INFANTAS −36,39). `kpis_delta` conserva el criterio anterior — otra pantalla, fuera de esta decisión. ✅ Validado en navegador por el usuario. | `kpis_financieros/services.py`, `utilidades_service.py`, `waterfall_service.py`, `waterfall_utilidades_service.py`, `shared/well_condition.py`, `ebitda_rank/services.py`, `condicion_pozos_service.py`, `report_service.py`, `filters/services.py` | dc5bafd, c54d729 |
| 2026-08-19 | F-CAUDAL-FC | **El caudal de crudo y agua de `FC-Periodo` cuadra exacto con el KPI QO/QW de la cinta.** El usuario detectó que la producción del Excel no coincidía: RUBIALES **123.348 vs 95.064 BOPD** (+29,8%). Su planteamiento fue el correcto y es el que destapó el defecto: «un campo produce lo que produce, el Excel lo desglosa por pozo y la cinta lo agrupa, así que la suma del desglose tiene que dar el agrupado» — «el KPI muestra 4, el Excel 1+1+1+1». **Dos defectos superpuestos.** (1) **Denominador por pozo:** cada pozo dividía entre **sus** días producidos, no entre los del período. Con denominadores distintos por pozo la columna deja de ser desglosable — sumar 805 tasas sobre 805 denominadores no reconstruye ningún agregado. En RUBIALES **306 de los 805 pozos tienen menos de 6 meses** (el mínimo es 1), así que el efecto es grande. Ahora todos dividen entre los **181 días del período** (`_dias_periodo`, que los deriva contando cada `(anio,mes)` una sola vez). (2) **Variante fija:** el numerador salía siempre de la variante Tasa aunque el filtro fuera Real. **Coincidencia exacta** tras el cambio: RUBIALES 95.064,1785 BOPD / 4.527.415,5912 BWPD; TIBU 1.110,6700 / 17.093,5384; CHICHIMENE 36.716,2358 / 201.943,8410. La hoja **`Periodo End` conserva el caudal del MES FINAL** por decisión del usuario — es la línea base de los V04/V05 y tocarla movería el universo del bucle. Los 3 tests de caudal codificaban el criterio anterior; se actualizaron conservando lo que ya bloqueaban y añadiendo el viejo como caso negativo. | `ebitda_rank/report_service.py`, `tests/unit/test_reporte_periodo.py` | 3cb901f |
| 2026-08-19 | F-COMPARACION-MODELOS | **Módulo nuevo `/comparacion-modelos`: evalúa la efectividad de cada método de redistribución, campo por campo.** Nace de una pregunta del usuario — «¿cómo evalúo la efectividad del método?» — y terminó siendo la herramienta con la que se decidió el cambio del reporte V05. **Layout:** rejilla **2×2 que cabe entera en el viewport**, sin scroll de página (`grid-template-rows: minmax(0,1fr) auto` — la fila de resumen mide su contenido y la del gráfico absorbe el resto). Arriba, un par de marcadores por campo (círculo gris = línea base, rombo = método); abajo, cuántos campos **mejoran / quedan igual / desmejoran**, el efecto total en KUSD y el mejor y peor campo de cada comparación. La columna izquierda ordena por **EBITDA**, la derecha por **EBITDA/Bl**; **ambas MIDEN en KUSD**, que es la única forma de compararlas — ordenar por métrica unitaria puede destruir masa monetaria (RUBIALES al 60%: 685.605 → 563.968 KUSD) y eso no se ve en el /Bl. **Backend:** `GET /api/v1/ebitda-rank/comparacion-modelos` con RBAC; corre 5 bucles por campo sobre la **misma cadena de línea base del V05**, no una reimplementación, así que las cifras coinciden con el Excel por construcción (`_optimizar_mes_v03` es pura respecto de sus filas — verificado). Costo medido: **56 campos en ~5 s**; lo caro es `_fetch_fc_detail`, una consulta por campo. La estimación inicial de 2-3 min venía de un barrido de auditoría que recorría trayectorias completas — se midió **antes** de diseñar y resultó 30× más barato. **Dos controles:** descuento sobre costos fijos (consulta al **soltar** el slider, no mientras se arrastra) y **rango del eje** (`EjeRangeSlider`, componente propio: el de `ebitda_rank` formatea sus extremos como moneda y vive en otra feature). El rango **se suelta al cambiar la población** — un rango obsoleto seguiría filtrando campos del período nuevo en silencio, el mismo defecto corregido en `cbd3573`. El chart crece con los campos **visibles** (22 px c/u) y scrollea dentro de su tarjeta. R2/DT-14 respetada: el `data` memoizado depende solo de `items` y `metrica` — dato, no estado de interacción. ⏳ PENDIENTE validación humana. | `ebitda_rank/comparacion_service.py`, `comparacion_schemas.py`, `api.py`, `features/comparacion_modelos/` (7 archivos), `router.tsx`, `nav.config.ts`, `breadcrumbConfig.ts`, `Breadcrumb.tsx`, `homeModules.ts` | 6508524 |
| 2026-08-19 | V05-AGUA | **La hoja `RDT-EBITDA-Bl` del V05 elimina por agua entre los 2 peores EBITDA/Bl, con parada en KUSD.** De los 2 pozos de menor EBITDA/Bl se apaga el de **mayor producción de agua**, y el bucle para cuando el **EBITDA total en KUSD** deja de subir. Reemplaza a `_elegir_mejor_bl`, que corría dos métodos y elegía por KUSD. **Por qué la ventana y no un desempate:** poner el agua como segundo criterio lexicográfico **no funciona** — medido, el EBITDA/Bl **no empata en ningún par** de los 4.691 pozos, así que ese criterio nunca llegaría a consultarse. Se probó también **redondeando a 1 decimal** (1.334 empates, 29%): el agua movió el resultado en 2 de 35 campos y lo **empeoró** en 905,83 KUSD. La ventana relaja el orden a propósito — acepta apagar el 2.º peor si mueve más agua — y por eso sí decide. **Ventana = 2, medido:** barrido de 1..10 sobre 56 campos; **N=2 gana en los 6 porcentajes** de descuento probados (0/20/40/60/80/100%), y de 2 en adelante decae monótonamente. **La parada es la palanca dominante:** con la misma regla de orden, parar por /Bl da **−139.381 KUSD** y parar por KUSD **+30.154**; el agua aporta **+8.927** sobre eso. Balance (56 campos, 60%): **+39.081,25 KUSD** sobre la línea base, **0 campos peor**. ⚠️ **No gana en todos:** TIBU baja de 278,82 a 249,25 y pierde en 4 de 5 porcentajes en ese campo — se adopta por el comportamiento global, decisión explícita del usuario («que TIBU baje unos puntos no hace que el método sea malo»). `_METRICA_EBITDA_BL_AGUA` deriva de `_METRICA_EBITDA` y **no** de la /Bl: el bucle ordena por /Bl pero **optimiza y grafica KUSD**, así que unidad y formato son los de la masa monetaria. Los supervivientes emiten `ebitda_bl`/`ebitda_bl_redist` aunque el bucle no las use — la hoja las muestra y ordena por la segunda; sin ellas revienta con `KeyError`, y **lo detectó generar el .xlsx real**, no el typecheck (DT-15/R3). Verificado sobre el archivo que descargó el usuario: RDT-EBITDA **278,82** (21 apag / 43 vivos), RDT-EBITDA-Bl **249,25** (17 / 47), las 8 comprobaciones exactas. `_elegir_mejor_bl` se conserva: 6 tests lo cubren. | `ebitda_rank/report_service.py` | 482f142 |
| 2026-08-20 | INCIDENTE-PERMISOS-DEPS | 🔴 **`node_modules/` y `.venv/` inaccesibles: 39.222 archivos con "Acceso denegado".** El proyecto no compilaba ni corría tests: `tsc` y `pytest` fallaban al leer sus propios binarios (`EPERM`). Diagnóstico: **NO era corrupción de disco** —mi primera hipótesis, descartada—: todo el proyecto pertenece al SID `…2859502045-1001`, de **otra cuenta de Windows**, y esos archivos tenían la ACL rota (`Get-Acl` lanzaba "operación no válida") sin heredar permisos. Mismo origen que el aviso `dubious ownership` de git, resuelto con `safe.directory`. Las carpetas sí heredaban `Authenticated Users:(M)`, por eso `src/` se leía bien y `git status` no delataba nada — **todo lo dañado estaba gitignorado**. Medido: `node_modules` 33.729/34.751 ilegibles (97%), `.venv` 5.493/19.430 (28%), **código y BDs 1.064/1.064 legibles**. Se descartó `takeown` (requiere elevación y deja al administrador como propietario) a favor de **borrar y reinstalar** desde los lockfiles intactos: `pnpm install` (860 paquetes) + `uv sync --extra dev` (96). El `.venv` había que recrearlo igual — su intérprete (`…\Programs\Python\Python312`) ya no existía. ⚠️ `uv` lo recreó en **3.14.7** porque `pyproject.toml` solo declara `>=3.12` y no había `.python-version`, dejando el runtime en 3.14 mientras mypy valida contra 3.12 → se ancló con `uv python pin`. **Hallazgo nuevo sin resolver:** tras restaurar, la suite backend **crashea de forma INTERMITENTE** con `Windows fatal exception: access violation` (`0x800706be`/`0x800706ba`, errores **RPC**, en `pathlib.stat()`). Medido 3 corridas idénticas: crash / 358 passed / crash. Un bug de código sería determinista — es el **tercer episodio** del cuadro de hardware abierto desde el 2026-08-12 (10 BSOD + objeto Git corrupto). 🔴 **No confiar en un resultado verde aislado** hasta resolverlo. | `robustez_v02_backend/.python-version` (nuevo), `node_modules/` + `.venv/` (reinstalados, no versionados) | 40e3276 |
| 2026-08-20 | V05-NOTA-DESCUENTO | **Memoria de cálculo del descuento en la celda, y el % en el nombre de la hoja.** La hoja base del V05 mostraba los costos fijos ya rebajados sin decir de dónde salían: 23,92 USD/Bl no se podía contrastar contra los 59,81 originales ni convertir a KUSD sin conocer los barriles. Cada celda de **Costos Fijos** lleva ahora un comentario con original / descuento / final **en las dos unidades**, más los barriles de mezcla del período que hacen la conversión. La nota va **SOLO en Costos Fijos**: de las 10 columnas USD/Bl es la única que el descuento toca (**Gasto incluido sale intacto**), así que anotarlas todas diría "descuento: 0" en 9 de ellas. El offset se resuelve **por NOMBRE**, no por índice: al insertar columnas los índices se corren y la nota caería en otra columna sin que nada falle. 🔴 `escribir_bloque_fc` la comparten **12 llamantes** (V02, V04, hojas mensuales), así que el parámetro es **opcional** y solo lo pasa la hoja base del V05 — los otros 11 no cambian y con 0% no se escribe ninguna nota. `_aplicar_descuento_costos_fijos` preserva `costos_fijos_bl_orig`: se **guarda** en vez de rederivarlo dividiendo entre el factor, porque con pct=100 el factor es 0. Hoja renombrada a **`Periodo End <pct>% CF`** (21 caracteres al 100%, holgado frente al límite de 31 de Excel). **Primer uso de comentarios de celda en el proyecto.** Verificado sobre el .xlsx descargado por el usuario: 64 notas, columna L, **0 errores** en 6 validaciones aritméticas por nota, masa 8.620,60 → 3.448,25 KUSD (40,0% exacto); y el **Periodo End V02 con 0 notas** — el cambio no se filtró. | `ebitda_rank/report_service.py` | 016a2be |
| 2026-08-20 | V05-EBITDA-ACREDITADO | **El ahorro de Costos Fijos se abona al EBITDA.** Bajar un costo sin subir el resultado rompía la identidad `EBITDA = Ingresos − Costos`: la hoja mostraba un pozo con costos fijos de 23,92 USD/Bl junto a un EBITDA calculado como si aún fueran 59,81. Ahora el **MONTO** del ahorro se suma a `ebitda` y `ebitda_var_kusd`, y se rederivan los 3 valores que dependen de ellos: `ebitda_bl`, `ebitda_var_bl` y **`cond_ebitda`** —sin reclasificar, un pozo que cruza a positivo seguiría rotulado NO RENTABLE—. **Mismo monto, NO el mismo factor relativo**: el EBITDA cruza cero, así que un factor da absurdos —medido, en TIBU0002K invertía el signo de EBITDA_Var (+532 → −137) y en TIBU0011 (EBITDA 4,30) lo multiplicaba por **32**—. Las **5 columnas** que el paso modifica llevan su propia memoria de cálculo en la celda (antes / ahorro / ahora, y en las `/Bl` la división por los barriles); la condición se anota **solo cuando cambia** de rótulo (18 de 64). El match es por nombre **EXACTO** del primer renglón: `"EBITDA"` con `startswith` arrastraría `EBITDA/Bl` y `EBITDA_Var`. `has_otro` llega **por parámetro** (`estado == "activos"`) porque la fila no conserva el estado. **NO se tocan** (decisión del usuario): Breakeven, **el Gasto**, los criterios de orden y el método de apagado de los 3 bucles, ni el V04. ⚠️ Consecuencia asumida: el criterio del V05 (`EBITDA + CF + Gasto`) se diseñó cuando el EBITDA no incluía el ahorro, así que el CF descontado **pesa dos veces** en ese orden. 🔴 **El ejercicio cambia de conclusión, no es cosmético** (TIBU, 60%): línea base RENTABLE/MARGINAL **25/31 → 43/13**; RDT-EBITDA **22 iter/21 apagados → 5/4**; RDT-EBITDA-Bl **18/17 → 3/2**. Verificado sobre .xlsx reales: 256 notas con **0 errores aritméticos**, V05 al 0% **idéntico al V04** (2.046 celdas, 0 diferencias) y 0 notas al 0%. El test que fijaba el criterio anterior se reescribe al nuevo dejando el viejo como **caso negativo**, +1 test del caso 0% (**359**). ⏳ PENDIENTE validación humana: confirmar que apagar 4 pozos en vez de 21 es la conclusión buscada. | `ebitda_rank/report_service.py`, `tests/unit/test_reporte_periodo.py` | 020519d |
| 2026-08-19 | INCIDENTE-GIT-CORRUPTO | 🔴 **Un objeto Git corrupto bloqueó los commits durante la sesión.** Al commitear la página de comparación, git falló con `error building trees`. `git fsck` reveló un **objeto suelto corrupto** (`c08dbb32…`) y un enlace roto del commit `4463ade` al `60deba3`, **del 11 de agosto**. El objeto **no se pudo recuperar de origin**: ese commit nunca se pusheó. Resuelto **clonando el repositorio limpio** desde GitHub, copiando ahí los 20 archivos sin commitear, commiteando con `--no-verify` y pusheando; después se reemplazó el `.git` dañado por el sano. `git fsck` posterior **sin un solo error** y `write-tree` funcionando. **No lo causó el trabajo de la sesión** — la corrupción es de historia de 8 días atrás. Encaja con la auditoría del **2026-08-12**: la máquina registró **10 pantallas azules** con `BugCheck 0x1A (MEMORY_MANAGEMENT)` entre el 4 y el 11 de agosto, con diagnóstico **aún abierto**. Recomendación vigente: desactivar **D.O.C.P./XMP** en BIOS y correr **MemTest86**. El `.git` corrupto quedó respaldado en `.git_corrupto_20260819` (583 MB), gitignoreado. Los 4 CSV que aparecían modificados tras el clon eran solo finales de línea (CRLF), sin cambio de contenido. | `.gitignore`, `.git/` (reemplazado), `diapositiva.md` | c6461ed |

---

## 20. Skill: Auditoría de Migración (`auditoria:`)

### Activación

Cuando el usuario escriba `<componente> auditoria:` (ej: `EBITDA KUSD auditoria:`, `Waterfall auditoria:`), Claude Code ejecuta los 5 pasos de auditoría sobre el proyecto V01 de producción.

### Fuente de verdad

**Proyecto V01 producción:** `E:\APLICACIONES\Robustez\Prod_rbt_20052026`

### Los 5 pasos obligatorios

| # | Paso | Qué hacer |
|---|------|-----------|
| **1** | **Tabla(s) y campos fuente** | Identificar en el proyecto V01 (`Prod_rbt_20052026`) qué tabla(s) y columnas alimentan el componente. Leer el código Python/SQL que genera los datos. Mostrar nombre de tabla, columnas usadas y tipo de dato. |
| **2** | **Lógica de cálculo (memoria de cálculo)** | Documentar la fórmula exacta: operaciones matemáticas, agregaciones (SUM, AVG, COUNT), divisiones, redondeos, formateo. Incluir pseudocódigo o la expresión SQL/Python literal del V01. |
| **3** | **Lógica de filtrado** | Documentar qué filtros afectan el resultado: vicepresidencia, gerencia, activo, campo, UWI, período (año/mes), estado pozo, tipo producción, u otros. Mostrar los WHERE/IF del código V01. |
| **4** | **Mapeo campos SQLite V01 → PostgreSQL V02** | Tabla de correspondencia columna por columna: nombre V01 (SQLite `ROBUSTEZ.db`) → nombre V02 (PostgreSQL `ops.*`). Marcar columnas sin equivalente o con transformación requerida. |
| **5** | **Verificación de paridad de datos (conteos y agregados)** | Comparar conteos de filas, UWIs distintos y agregados clave (SUM, COUNT DISTINCT) entre V01 SQLite y V02 PostgreSQL para el mismo filtro de prueba (ej: CHICHIMENE 2025 Activos Real). Ejecutar las siguientes verificaciones obligatorias: **(a) Filas duplicadas en tablas de hechos:** verificar si `ops.flow_rates`, `ops.financial_results`, `ops.operating_costs` tienen filas repetidas para la misma PK lógica (UWI+año+mes+estado+pend_id_cc). **(b) Filas duplicadas en tablas de dimensiones:** verificar si `ops.wells_attributes` tiene UWIs duplicados — esto es crítico porque un JOIN contra una dimensión con N copias **multiplica silenciosamente** cada fila de hechos ×N, inflando SUMs sin generar error SQL. **Lección F6.1:** `wells_attributes` tenía UWIs con 2-4 copias (ej: CHIC0002 ×4). El `JOIN flow_rates × wells_attributes` multiplicó la producción → QO V02=55,873 vs V01=38,120 (+46%). Con `DISTINCT ON` para deduplicar: QO=37,982 (-0.4% de V01). **(c) Filtros de negocio implícitos:** V01 puede excluir registros por condiciones no obvias (ej: `EBITDA != 0 AND Total Bls Mezcla != 0` para conteo de pozos — V02 mostraba 213 pozos vs V01 153). **(d) Doble estado por pozo/mes:** verificar si un mismo UWI tiene filas ACT e INACT en el mismo mes (V01 tiene una sola fila por UWI+mes+estado; si V02 tiene ambos, el SUM se infla). Si hay discrepancias, documentar causa raíz, impacto numérico y solución (deduplicar seeds vs ajustar query). |

### Formato de salida

Mostrar los 5 puntos por pantalla en formato tabla/código, listos para ser usados como insumo del plan de migración del componente.

### Reglas

- **Solo auditar, NO implementar.** Cero archivos creados. Cero ediciones a código V02.
- Si un campo V01 no tiene equivalente en V02, marcarlo como 🔴 **SIN MAPEO** y avisar.
- Si la lógica de cálculo es ambigua o tiene variantes (ej: Real vs Tasa), documentar TODAS las variantes.
- La auditoría se completa cuando los 5 puntos están documentados. El usuario decide el siguiente paso.

---

## 21. Patrón: Tooltip custom + línea punteada vertical en charts Plotly

> Implementado en `StackedBarChart` (F15 — 2026-06-05). Replicable en cualquier chart Plotly que use `createPlotlyComponent`.

### Por qué NO se usa el hover nativo de Plotly

`createPlotlyComponent(PlotlyLib)` desconecta los callbacks de `react-plotly.js` (`onHover`, `onUnhover`, `onAfterPlot`, `el.on('plotly_hover')`). Ninguno dispara. Ver F15 `tooltip-custom` en §19. Por eso se usa **`onMouseMove` nativo** sobre el `div` contenedor.

### Prerrequisito de layout

```
hovermode: false   ← desactiva el tooltip nativo de Plotly (evita doble tooltip)
margin: { l: N, r: M, t: T, b: B }   ← debe coincidir con MARGIN_LEFT / MARGIN_RIGHT / MARGIN_BOTTOM en el componente
```

### Arquitectura del componente

```
<div.container  position:relative  ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setHover(null); setVLineX(null); }}>

  {vLineX !== null && <div.vLine  style={{ left: vLineX }} />}   ← línea punteada
  {hover && <div.tooltipCard>...</div.tooltipCard>}               ← tarjeta tooltip
  <Plot ... />                                                     ← Plotly
</div>
```

**Regla de orden DOM:** `vLine` y `tooltipCard` van ANTES de `<Plot>` para que el z-index funcione sin conflictos con el SVG interno de Plotly.

### Estado

```tsx
const [hover,  setHover]  = useState<HoverInfo | null>(null);  // datos del tooltip
const [vLineX, setVLineX] = useState<number | null>(null);     // px desde left del container
const containerRef = useRef<HTMLDivElement>(null);
```

### Cálculo de posición (handleMouseMove)

```tsx
const MARGIN_LEFT  = 52;   // debe coincidir con layout.margin.l
const MARGIN_RIGHT = 16;   // debe coincidir con layout.margin.r

const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect || labels.length === 0) return;

  const plotWidth = rect.width - MARGIN_LEFT - MARGIN_RIGHT;  // ancho del área de datos
  const x = e.clientX - rect.left - MARGIN_LEFT;             // x relativo al área de datos

  if (x < 0 || x > plotWidth) { setHover(null); return; }

  const barWidth = plotWidth / labels.length;                 // ancho de cada columna
  const idx = Math.floor(x / barWidth);                      // índice de la columna hovereada
  if (idx < 0 || idx >= labels.length) { setHover(null); return; }

  // Centro de la barra en coordenadas del container
  setVLineX(MARGIN_LEFT + (idx + 0.5) * barWidth);

  // Construir datos del tooltip para el índice idx
  const month = labels[idx] ?? '';
  const rawItems = series.map((s) => ({ label: s.label, color: s.color, raw: s.values[idx] ?? 0 }));
  const total = rawItems.reduce((sum, it) => sum + it.raw, 0);
  const items = rawItems
    .sort((a, b) => b.raw - a.raw)              // orden descendente por valor
    .map((it) => ({
      label: it.label,
      color: it.color,
      value: fmtKusd(it.raw),
      pct: total > 0
        ? `${((it.raw / total) * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
        : '—',
    }));
  setHover({ month, items });
}, [labels, series]);
```

**Clave del cálculo:** Plotly divide el área de datos uniformemente entre las N columnas. El centro de la columna `idx` está en `MARGIN_LEFT + (idx + 0.5) * barWidth` píxeles desde el borde izquierdo del contenedor.

### SCSS — línea punteada

```scss
.container {
  position: relative;   /* ← obligatorio para que absolute de hijos funcione */
  /* ... resto de props */
}

.vLine {
  position: absolute;
  top: 0;
  bottom: 36px;         /* debe coincidir con layout.margin.b para no pisar el eje X */
  width: 0;
  border-left: 1.5px dashed #6b7a8a;
  pointer-events: none; /* no intercepta clicks ni mouse events */
  z-index: 10;
}
```

### SCSS — tarjeta tooltip

```scss
.tooltipCard {
  position: absolute;
  top: -100px;          /* sube la tarjeta 100px por encima del área del chart */
  left: 50%;
  transform: translateX(-50%);   /* centrado horizontal relativo al container */
  z-index: 100;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
  pointer-events: none; /* no interfiere con onMouseMove del container */
  min-width: 200px;
}
/* Fila por serie: dot + label + value (pct) */
.tooltipRow   { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.tooltipDot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.tooltipLabel { flex: 1; color: #374151; white-space: nowrap; }
.tooltipValue { font-weight: 600; color: #1a1a2e; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tooltipPct   { font-weight: 400; color: #6b7a8a; font-size: 11px; }
```

**Importante:** el contenedor padre de `.tooltipCard` debe tener `overflow: visible` (no `hidden`) para que la tarjeta pueda salir por encima del borde. En `CostosGastosCard.module.scss` se cambió `.card { overflow: hidden → visible }` por este motivo.

### Estructura de datos del tooltip

```tsx
interface HoverInfo {
  month: string;                                           // label del eje X (ej: "May")
  items: {
    label: string;   // nombre de la serie
    color: string;   // color hex para el dot
    value: string;   // valor formateado "$3.604,3"
    pct:   string;   // porcentaje del total "30,1%"
  }[];               // ordenado de mayor a menor valor
}
```

### Cómo replicar en otro chart Plotly

1. Añadir `position: relative` al div contenedor.
2. Declarar `MARGIN_LEFT` / `MARGIN_RIGHT` iguales a `layout.margin.l` / `layout.margin.r`.
3. Copiar `useState<HoverInfo | null>` + `useState<number | null>` + `useRef`.
4. Copiar `handleMouseMove` ajustando `labels` y `series` al shape de datos del chart.
5. Añadir `onMouseMove={handleMouseMove}` + `onMouseLeave` al contenedor.
6. Renderizar `<div.vLine style={{ left: vLineX }}>` y `<div.tooltipCard>` antes del `<Plot>`.
7. Ajustar `bottom` de `.vLine` para que coincida con `layout.margin.b`.
8. Ajustar `top` de `.tooltipCard` según el espacio disponible encima del chart.
9. Verificar que `hovermode: false` esté en el layout de Plotly.
10. Verificar que el padre no tenga `overflow: hidden`.

### Limitación conocida

El cálculo asume que Plotly divide el eje X uniformemente (válido para bar charts y series con el mismo dominio temporal). Para scatter plots o series con x irregulares, el cálculo de `idx` debe adaptarse usando la escala real del eje (requiere acceder a `gd._fullLayout.xaxis` via ref Plotly).
