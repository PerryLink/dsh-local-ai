<div align="center">

# 🤖 dsh-local-ai
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-local-ai` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Integración de modelos locales (Ollama) para DeepSeek Harness.**

*Descubre, descarga, elimina e inspecciona modelos locales, enruta solicitudes hacia ellos por tipo de tarea o palabra clave con respaldo automático a la nube, y obtén un resumen de estado de un vistazo con `/ollama`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-local-ai/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-local-ai/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-local-ai?label=version)](https://github.com/PerryLink/dsh-local-ai/releases)
[![npm version](https://img.shields.io/npm/v/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)
[![npm downloads](https://img.shields.io/npm/dm/dsh-local-ai)](https://www.npmjs.com/package/dsh-local-ai)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
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
# 1. instala el bundle en tu perfil
dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"

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

## Install & uninstall

- **canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"` — el script `prepare` compila solo con dependencias de producción.
- **canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-local-ai`.
- **canal tarball**: `pnpm pack` en este repo y luego `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-local-ai` (o quita la fila del patch del perfil).

> Si pnpm informa `ERR_PNPM_IGNORED_BUILDS` para este paquete, añade `allowBuilds: { esbuild: true }` a tu `pnpm-workspace.yaml` — la CLI `dsh` imprime el fragmento exacto.

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
- **Fallo alto, fallo contenido** — la configuración inválida hace fallar el montaje; una ruta local que falla antes de producir contenido respalda a la nube (`next()`), de modo que un Ollama caído nunca bloquea una conversación.
- **Visible para el modelo ⟺ registrado** — el enrutamiento solo cambia qué proveedor sirve una solicitud (el mensaje del asistente se registra con su procedencia `ollama`); no se inventa entrada visible nueva.

## Known limitations

- **Solo rc.2** — desarrollado y probado contra `@deepseek-ai/dsh@0.1.1-rc.2`; se espera que baselines más nuevos funcionen, pero los verifica el workflow mensual de compat.
- **Vision cuando el modelo la informa** — los modelos cuyas capacidades de `/api/show` incluyen `vision` declaran `inputModalities: ["text","image"]` y llevan cargas de imagen base64 en los mensajes de usuario (exclusión con `vision: false`); los modelos solo texto siguen rechazando el contenido de imagen (`UNSUPPORTED_CONTENT`).
- **Respaldo a mitad de flujo** — una vez que una ruta local empezó a producir contenido, un fallo posterior se reenvía (no se retira); solo un fallo antes del primer token respalda a la nube.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra los tipos publicados 0.1.1-rc.2
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

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: adaptador, enrutamiento, herramientas, comprobación de estado, desinfección y documentación en cinco idiomas.
- [@LABEST-IA](https://github.com/LABEST-IA) — corrección del CallId de las llamadas a herramientas (PR #2), y los informes sobre la ranura de llamadas a herramientas y el soporte de visión (issues #1, #3, #5).

## PerryLink DSH Plugin Family

Este proyecto es uno de los [29 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, los demás probablemente también:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Auto-revisión con segundo modelo en la cadena de aprobación, cerrado ante fallo por defecto |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes secundarios en segundo plano y duraderos con barra lateral Web, mensajería e interrupción |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones y restauración de una vez |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sesiones, memoria, skills y CLAUDE.md de Claude Code a DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Control de escritorio nativo multiplataforma para DeepSeek Harness — Windows primero. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guardia de disciplina de ingeniería: interrogatorio de requisitos, puertas de test, revisión adversaria |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de rendimiento de solo lectura para DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integración de PR/issues de GitHub para DSH, cada escritura con aprobación |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Base de conocimiento documental local para DeepSeek Harness. |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Integración de modelos locales (Ollama) para DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formato, completado, acciones y renombrado LSP vía servidores de lenguaje |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de enmascarado PII para DeepSeek Harness — anonimiza antes del modelo y restaura en la capa de visualización. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Panel MCP de solo lectura: comando /mcp + pestaña de ajustes con estado, herramientas y errores |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memoria entre sesiones con puerta de aprobación: seam ctx.memory + SQLite + herramienta memory |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Cambio de estilos en tiempo de ejecución equivalente a outputStyles de Claude Code |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Reglas declarativas allow/deny/ask estilo Claude Code con auditoría |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conocimiento de desarrollo de complementos como skill de agente bajo demanda |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Puntuación de calidad multidimensional para complementos de DeepSeek Harness. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Fija sesiones en la barra lateral Web con orden durable |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Paquete de skills de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Pruebas de instalación y arranque aisladas para complementos de DeepSeek Harness. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors
