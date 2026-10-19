<div align="center">

# 🤖 dsh-local-ai
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-local-ai` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Integración de modelos locales (Ollama) para DeepSeek Harness.**

*Descubre, descarga, elimina e inspecciona modelos locales, enruta solicitudes hacia ellos por tipo de tarea o palabra clave con respaldo automático a la nube, y obtén un resumen de estado de un vistazo con `/ollama`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-local-ai)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-local-ai.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-local-ai/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-local-ai/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-local-ai?label=version)](https://github.com/PerryLink/dsh-local-ai/releases)
[![npm version](https://img.shields.io/npm/v/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![npm downloads](https://img.shields.io/npm/dm/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-local-ai?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-local-ai?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-local-ai
```


</div>

---

**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

- **canal git** (último `main`): `dsh plugin --profile web add github:PerryLink/dsh-local-ai` — el script `prepare` compila solo con dependencias de producción.
- **canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-local-ai`.
- **canal tarball**: `pnpm pack` en este repo y luego `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-local-ai` (o quita la fila del patch del perfil).

> Si pnpm informa `ERR_PNPM_IGNORED_BUILDS` para este paquete, añade `allowBuilds: { esbuild: true }` a tu `pnpm-workspace.yaml` — la CLI `dsh` imprime el fragmento exacto.

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-local-ai?

Integración de modelos locales (Ollama) para DeepSeek Harness.

Descubre, descarga, elimina e inspecciona modelos locales, enruta solicitudes hacia ellos por tipo de tarea o palabra clave con respaldo automático a la nube, y obtén un resumen de estado de un vistazo con `/ollama`.

![Demostración de terminal de dsh-local-ai: dsh-local-ai — install, then route by keyword to Ollama](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-hero.png)

![Animated terminal demo of dsh-local-ai](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-demo.gif)

*La misma ejecución, animada.*

## Compatibility

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1` (verificado el 2026-10-04: tres typecheck (instalado, CI, checkout) + 142 pruebas + puertas self-contained/artifacts; la unión de bloques de contenido de `0.1.7` está adaptada — un resultado de herramienta es ahora un mensaje de rol `tool` de primera clase, y un envoltorio `tool-result` anterior a `0.1.7` todavía se lee para registros antiguos). El rango de peers admite todas las líneas soportadas: `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0 \|\| >=0.2.0-0 <0.3.0 \|\| >=0.2.1-0 <0.3.0`; los pines dev/test son `0.2.0-rc.2`. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Backend | [Ollama](https://ollama.com) (API HTTP local + sonda CLI) |
| Modelo | Ruta solo texto (`inputModalities: ['text']`); se admiten llamadas y resultados de herramientas |

## What you get

`dsh-local-ai` convierte a Ollama en un proveedor local de primera clase en DeepSeek Harness:

- **Descubrimiento y gestión** — `ollama_list` (modelos instalados, en ejecución, uso de disco), `ollama_show` (tamaño de parámetros, cuantización, longitud de contexto), `ollama_pull` y `ollama_remove`.
- **Comprobación de estado** — vitalidad del proceso (vía la CLI `ollama`) y respuesta de la API (vía `/api/version`), como dos señales independientes.
- **Adaptador oficial** — la ruta del proveedor `ollama` se registra mediante `ctx.llm.registerAdapter` (`LlmAdapter`), con mapeo de modelos configurable y traducción de temperature / max-tokens / stop.
- **Enrutamiento local** — las reglas `model_route` enrutan solicitudes a un modelo local por tipo de tarea (`purpose`), palabra clave (sin distinguir mayúsculas) o `always`, con respaldo automático a la nube cuando la ruta local falla antes de producir contenido.
- **Comando `/ollama`** — resumen de estado de un vistazo: modelos, uso de disco, salud y sugerencias.
- **Cero dependencias, HTTP primero** — todo habla con la API HTTP de Ollama (la CLI solo se usa para la sonda de proceso); no se empaquetan archivos de modelo.

```text
request (loop)
   │ cascada llm/stream
   ├─ ¿coincide regla? ──▶ enrutar a ollama ──▶ Ollama /api/chat (flujo NDJSON)
   │                        └─ falla primero ─▶ respaldo a nube (next())
   └─ sin coincidencia ──▶ proveedor en la nube
tools ──▶ /api/tags · /api/ps · /api/show · /api/pull · /api/delete
health ──▶ /api/version (API) + ollama list (proceso)
```

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-local-ai
```

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add github:PerryLink/dsh-local-ai

# o desde npm (versiones publicadas)
dsh plugin --profile web add dsh-local-ai

# 2. configura el enrutamiento en tu patch de perfil (cordis.yml) y reinicia
dsh --profile web
```

Configuración mínima de enrutamiento (la regla viene comentada en `cordis.patch.yml`):

```yaml
- insert:
    - id: dsh-local-ai
      name: dsh-local-ai
      config:
        route:
          - model: llama3.2
            keywords: ["confidential", "offline"]
```

Luego verifica que la fila se monte:

```sh
dsh --profile web --dump-config | grep -A2 'id: dsh-local-ai'
```

## Configuration

Todos los ajustes son campos `Config` de Schemastery (modificables desde cordis.yml). Una sobrescritura por id reemplaza toda la fila — vuelve a indicar cada clave que necesites. `cordis.patch.yml` documenta cada clave en línea.

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:11434` | URL base de la API HTTP de Ollama; se añaden rutas `/api/*` |
| `requestTimeoutMs` | `30000` | Tiempo de espera HTTP por solicitud (milisegundos) |
| `graceMs` | `15000` | Gracia de terminación del subproceso para la sonda CLI de salud |
| `defaultContextWindow` | `8192` | Capacidad de contexto cuando un modelo no tiene valor exacto |
| `maxTokens` | `4096` | Límite de salida por solicitud cuando un modelo no tiene valor exacto |
| `temperature` | *(none)* | Temperatura de muestreo por defecto (0..2); omitir deja el valor del proveedor |
| `vision` | `true` | Declara y serializa el soporte de imágenes cuando el modelo informa vision; `false` mantiene la ruta solo texto |
| `visionCacheTtlMs` | `30000` | Milisegundos que se conserva en caché la sonda `/api/show` (`0` desactiva la caché; pull/remove invalida ese modelo) |
| `models` | `[]` | Mapeos de nombre visible → modelo Ollama |
| `models[].name` | *(required)* | Nombre de modelo visible en el harness (`GenerateOptions.model`) |
| `models[].model` | `= name` | Id del modelo Ollama |
| `models[].contextWindow` | *(none)* | Capacidad de contexto por modelo |
| `models[].maxTokens` | *(none)* | Límite de salida por modelo |
| `models[].temperature` | *(none)* | Temperatura de muestreo por modelo |
| `backends` | `[]` | Backends locales compatibles con OpenAI (LM Studio / vLLM / llama.cpp) |
| `backends[].name` | *(required)* | Nombre del backend; registra el id de proveedor `openai:<name>` |
| `backends[].baseURL` | *(required)* | URL base del backend (incluye `/v1`), p. ej. `http://127.0.0.1:1234/v1` |
| `backends[].apiKey` | *(none)* | Clave bearer opcional (la mayoría de servidores locales la dejan vacía) |
| `backends[].models` | `[]` | Mapeos de nombre visible → modelo del backend |
| `backends[].maxTokens` | `4096` | Límite de salida por backend cuando un modelo no tiene valor exacto |
| `backends[].temperature` | *(none)* | Temperatura de muestreo por backend |
| `route` | `[]` | Reglas de enrutamiento a modelos locales (primera coincidencia gana) |
| `route[].model` | *(required)* | Nombre del modelo local destino |
| `route[].provider` | `ollama` | Id del proveedor destino: `ollama` u `openai:<name>` |
| `route[].purpose` | *(none)* | Coincidencia de tipo de tarea: `compaction` / `session-title` |
| `route[].keywords` | `[]` | Palabras clave de solicitud (sin distinguir mayúsculas) |
| `route[].always` | `false` | Enruta toda solicitud elegible a este modelo |

## Tools & surfaces

| Superficie | Tipo | Qué hace |
|---|---|---|
| `ollama_list` | herramienta | Lista modelos instalados, en ejecución y uso de disco |
| `ollama_show` | herramienta | Muestra tamaño de parámetros, cuantización, longitud de contexto, familia, formato |
| `ollama_pull` | herramienta | Descarga un modelo |
| `ollama_remove` | herramienta | Elimina un modelo |
| `ollama_health` | herramienta | Vitalidad del proceso + respuesta de la API |
| `/ollama` | comando | Resumen de estado de un vistazo (modelos + salud + sugerencias) |

**Consume** los servicios host públicos `ctx.llm` (`registerAdapter`), `ctx.tools`, `ctx.subprocess` (sonda CLI) y `ctx.commands`. No cortocircuita `llm/stream` por defecto — el oyente de enrutamiento pasa (`next()`) salvo que una regla coincida.

## Permissions & data

- **Permisos**: `network:outbound` hacia el endpoint de Ollama que configures; sin código nativo, sin acceso al sistema de archivos, sin almacenamiento.
- **Datos**: toda lista/detalle de modelo, hecho de salud y mensaje de error mostrado al modelo o al usuario se desinfecta (se eliminan userinfo y parámetros de consulta secretos del endpoint, se quitan caracteres de control, se limitan longitudes) antes de mostrarse. Los resultados de herramientas y comandos los registran los mecanismos propios del harness.
- **Credenciales**: el plugin no almacena ni lee credenciales. Solo emite solicitudes HTTP al endpoint que configures, más la sonda de proceso local `ollama list`.

## Security boundaries

- **Sin re-enrutamiento por defecto** — la lista `route` está vacía salvo que optes por lo contrario; una solicitud llega a un modelo local solo por una regla explícita o una selección explícita del proveedor `ollama`.
- **Desinfección antes de mostrar** — las direcciones de endpoint y las rutas locales se desinfectan antes de llegar a la salida de herramientas, al comando `/ollama` o a los mensajes de error.
- **Cero modelos empaquetados** — descargas y almacenamiento son responsabilidad de Ollama; nada se envía en el paquete.
- **Fallo alto, fallo contenido** — la configuración inválida hace fallar el montaje; una ruta local que falla antes de producir contenido respalda a la nube (`next()`), de modo que un Ollama caído nunca bloquea una conversación. **Única excepción:** un fallo con `IMAGE_OFFLOAD_REQUIRED` se relanza en vez de reintentarse en la nube: ese código es el circuito oficial de descarga de imágenes pidiendo a esta misma ruta local que suelte imágenes retenidas, y el respaldo saltaría el circuito enviando en silencio una solicitud solo-local a un proveedor remoto.
- **Visible para el modelo ⟺ registrado** — el enrutamiento solo cambia qué proveedor sirve una solicitud (el mensaje del asistente se registra con su procedencia `ollama`); no se inventa entrada visible nueva.

## Known limitations

- **npm 0.2.0-rc.2** — desarrollado y probado contra `@deepseek-ai/dsh@0.2.0-rc.2`; se espera que baselines más nuevos funcionen, pero los verifica el workflow mensual de compat.
- **Vision cuando el modelo la informa** — los modelos cuyas capacidades de `/api/show` incluyen `vision` declaran `inputModalities: ["text","image"]` y llevan cargas de imagen base64 en los mensajes de usuario (exclusión con `vision: false`); los modelos solo texto siguen rechazando el contenido de imagen (`UNSUPPORTED_CONTENT`).
- **Respaldo a mitad de flujo** — una vez que una ruta local empezó a producir contenido, un fallo posterior se reenvía (no se retira); solo un fallo antes del primer token respalda a la nube.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra los tipos publicados 0.2.0-rc.2
pnpm run typecheck:ci  # tsc estricto contra los tipos publicados rc.2 (skipLibCheck off)
pnpm test           # vitest: costuras reales Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess
pnpm run test:coverage  # puerta de cobertura (90/80/90/90)
pnpm run build      # bundle tsdown + declaraciones tsc (lib/)
pnpm run verify:self-contained  # las especificaciones de dependencias resuelven desde el registry
pnpm run verify:artifacts       # cara ESM construida + bundle patch presentes
node scripts/check-readme-sync.mjs  # puerta de sincronización de README en cinco idiomas
node scripts/check-endpoints.mjs  # sonda de actividad M3 (Ollama /api/version)
pnpm pack           # el tarball publicado
```

## Interoperability with other DSH plugins

Verificado contra **DSH `0.2.0-rc.2`** (el runtime para el que se publica este README) y el conjunto de plugins con más estrellas sondeado el 2026-10-05.

Este plugin **no interfiere** con otros plugins, incluidos los de más estrellas:

- **Sin colisión de nombres de herramienta.** Todas las herramientas llevan espacio de nombres; ninguna ocupa un nombre desnudo ya perteneciente a una herramienta incluida u otro plugin.
- **Sin colisión de clave de servicio.** No provee ninguna clave de servicio, así que no puede colisionar en una.
- **Sin colisión de slot.** No registra ninguna clave de slot de cliente, así que no disputa un asiento `shadows-shipped-ui`.
- **Sin colisión de ruta HTTP.** No registra ningún prefijo `webServer`.
- **Sin colisión en la capa de patch.** El patch del bundle solo hace `insert` de su propia fila; nunca sobrescribe el `config` de una fila incluida.
- **Sin mutación global.** No parchea prototipos, ni reescribe `process.env`, ni reemplaza el dispatcher global de fetch.

**Los listeners de eventos compartidos no interfieren por construcción.** Observa los eventos sensibles al orden `llm/stream` con `ctx.on()` — el registro de difusión de Cordis, donde cada listener se ejecuta y ninguno puede dejar sin turno a otro. **Todos los listeners aquí delegan por `next()`**, así que la cadena nunca se cortocircuita:
  - `llm/stream` — also used by `dsh-routing-suite` (7000★).

Evidencia estática: `dsh-plugin-doctor` K10–K13 dan `pass` en todas las comprobaciones de este repositorio.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: adaptador, enrutamiento, herramientas, comprobación de estado, desinfección y documentación en cinco idiomas.
- [@LABEST-IA](https://github.com/LABEST-IA) — corrección del CallId de las llamadas a herramientas (PR #2), y los informes sobre la ranura de llamadas a herramientas y el soporte de visión (issues #1, #3, #5).

## Familia de plugins DSH de PerryLink

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
