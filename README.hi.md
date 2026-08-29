<div align="center">

# 🤖 dsh-local-ai
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-local-ai` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण।**

*स्थानीय मॉडल खोजें, खींचें, हटाएँ और जाँचें; कार्य-प्रकार या कीवर्ड के आधार पर अनुरोधों को स्थानीय मॉडल पर रूट करें और विफलता पर स्वतः क्लाउड पर वापस लौटें; `/ollama` से एक-झटके में स्थिति सारांश पाएँ।*

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

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Backend | [Ollama](https://ollama.com) (स्थानीय HTTP API + CLI जाँच) |
| Model | केवल-पाठ रूट (`inputModalities: ['text']`); टूल कॉल व परिणाम समर्थित हैं |

## What you get

`dsh-local-ai` Ollama को DeepSeek Harness में एक प्रथम-श्रेणी स्थानीय प्रदाता बनाता है:

- **खोज व प्रबंधन** — `ollama_list` (इंस्टॉल किए मॉडल, चालू मॉडल, डिस्क उपयोग), `ollama_show` (पैरामीटर आकार, क्वांटाइज़ेशन, संदर्भ लंबाई), `ollama_pull`, और `ollama_remove`।
- **स्वास्थ्य जाँच** — प्रक्रिया की सक्रियता (`ollama` CLI के ज़रिए) और API प्रतिक्रिया (`/api/version` के ज़रिए), दो स्वतंत्र संकेतों के रूप में।
- **आधिकारिक एडाप्टर** — `ollama` प्रदाता रूट `ctx.llm.registerAdapter` (`LlmAdapter`) से पंजीकृत होता है, जिसमें कॉन्फ़िगर करने योग्य मॉडल मैपिंग और temperature / max-tokens / stop अनुवाद होता है।
- **स्थानीय रूटिंग** — `model_route` नियम कार्य-प्रकार (`purpose`), केस-असंवेदी कीवर्ड, या `always` के आधार पर अनुरोधों को स्थानीय मॉडल पर रूट करते हैं, और स्थानीय रूट सामग्री बनाने से पहले विफल होने पर स्वतः क्लाउड पर वापस लौटते हैं।
- **`/ollama` कमांड** — एक-झटके में स्थिति सारांश: मॉडल, डिस्क उपयोग, स्वास्थ्य और सुझाव।
- **शून्य निर्भरता, HTTP पहले** — सब कुछ Ollama की HTTP API से बात करता है (CLI केवल प्रक्रिया जाँच के लिए); कोई मॉडल फ़ाइल बंडल नहीं की जाती।

```text
request (loop)
   │ llm/stream जलप्रपात
   ├─ नियम मेल? ──▶ ollama पर रूट ──▶ Ollama /api/chat (NDJSON स्ट्रीम)
   │                        └─ पहले विफल ─▶ क्लाउड पर वापस (next())
   └─ कोई मेल नहीं ──▶ क्लाउड प्रदाता
tools ──▶ /api/tags · /api/ps · /api/show · /api/pull · /api/delete
health ──▶ /api/version (API) + ollama list (प्रक्रिया)
```

## Quick start

```sh
# 1. अपने प्रोफ़ाइल में बंडल इंस्टॉल करें
dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"

# या npm से (प्रकाशित संस्करण)
dsh plugin --profile web add dsh-local-ai

# 2. अपने प्रोफ़ाइल पैच (cordis.yml) में रूटिंग कॉन्फ़िगर करें और पुनः आरंभ करें
dsh --profile web
```

न्यूनतम रूटिंग कॉन्फ़िगरेशन (नियम `cordis.patch.yml` में टिप्पणी के रूप में होता है):

```yaml
- insert:
    - id: dsh-local-ai
      name: dsh-local-ai
      config:
        route:
          - model: llama3.2
            keywords: ["confidential", "offline"]
```

फिर पुष्टि करें कि पंक्ति माउंट हुई:

```sh
dsh --profile web --dump-config | grep -A2 'id: dsh-local-ai'
```

## Install & uninstall

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add "github:PerryLink/dsh-local-ai#main"` — `prepare` स्क्रिप्ट केवल उत्पादन निर्भरताओं से बनाती है।
- **npm चैनल** (प्रकाशित संस्करण): `dsh plugin --profile web add dsh-local-ai`।
- **tarball चैनल**: इस रिपो में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-local-ai` (या प्रोफ़ाइल पैच से पंक्ति हटाएँ)।

> यदि pnpm इस पैकेज के लिए `ERR_PNPM_IGNORED_BUILDS` दिखाए, तो अपने `pnpm-workspace.yaml` में `allowBuilds: { esbuild: true }` जोड़ें — `dsh` CLI सटीक स्निपेट प्रिंट करता है।

## Configuration

सभी ट्यूनेबल Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदले जा सकते हैं)। id-लक्षित ओवरराइड पूरी पंक्ति को बदल देता है — जिन कुंजियों की ज़रूरत हो उन्हें दोबारा लिखें। `cordis.patch.yml` हर कुंजी को इनलाइन दस्तावेज़ करता है।

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:11434` | Ollama HTTP API आधार URL; `/api/*` पथ जोड़े जाते हैं |
| `requestTimeoutMs` | `30000` | प्रति-अनुरोध HTTP टाइमआउट (मिलीसेकंड) |
| `graceMs` | `15000` | स्वास्थ्य-जाँच CLI जाँच के लिए सबप्रोसेस समाप्ति की छूट |
| `defaultContextWindow` | `8192` | जब मॉडल का कोई सटीक मान न हो तो संदर्भ क्षमता |
| `maxTokens` | `4096` | जब मॉडल का कोई सटीक मान न हो तो प्रति-अनुरोध आउटपुट सीमा |
| `temperature` | *(none)* | डिफ़ॉल्ट सैंपलिंग तापमान (0..2); छोड़ने पर प्रदाता डिफ़ॉल्ट रहता है |
| `vision` | `true` | मॉडल द्वारा vision रिपोर्ट करने पर छवि समर्थन घोषित व सीरियलाइज़ करता है; `false` रूट को केवल-टेक्स्ट रखता है |
| `models` | `[]` | Harness-दृश्य नाम → Ollama मॉडल मैपिंग |
| `models[].name` | *(required)* | Harness-दृश्य मॉडल नाम (`GenerateOptions.model`) |
| `models[].model` | `= name` | Ollama मॉडल id |
| `models[].contextWindow` | *(none)* | प्रति-मॉडल संदर्भ क्षमता |
| `models[].maxTokens` | *(none)* | प्रति-मॉडल आउटपुट सीमा |
| `models[].temperature` | *(none)* | प्रति-मॉडल सैंपलिंग तापमान |
| `backends` | `[]` | OpenAI-संगत स्थानीय बैकएंड (LM Studio / vLLM / llama.cpp) |
| `backends[].name` | *(required)* | बैकएंड नाम; provider id `openai:<name>` पंजीकृत करता है |
| `backends[].baseURL` | *(required)* | बैकएंड base URL (`/v1` सहित), जैसे `http://127.0.0.1:1234/v1` |
| `backends[].apiKey` | *(none)* | वैकल्पिक bearer API key (अधिकांश स्थानीय सर्वर इसे खाली छोड़ते हैं) |
| `backends[].models` | `[]` | दृश्य नाम → बैकएंड मॉडल मैपिंग |
| `backends[].maxTokens` | `4096` | बिना सटीक मान वाले मॉडल के लिए प्रति-बैकएंड आउटपुट सीमा |
| `backends[].temperature` | *(none)* | प्रति-बैकएंड सैंपलिंग तापमान |
| `route` | `[]` | स्थानीय-मॉडल रूटिंग नियम (पहला मेल जीतता है) |
| `route[].model` | *(required)* | लक्ष्य स्थानीय मॉडल नाम |
| `route[].provider` | `ollama` | लक्ष्य प्रदाता id: `ollama` या `openai:<name>` |
| `route[].purpose` | *(none)* | कार्य-प्रकार मेल: `compaction` / `session-title` |
| `route[].keywords` | `[]` | केस-असंवेदी अनुरोध कीवर्ड |
| `route[].always` | `false` | हर पात्र अनुरोध को इस मॉडल पर रूट करें |

## Tools & surfaces

| सतह | प्रकार | क्या करता है |
|---|---|---|
| `ollama_list` | टूल | इंस्टॉल किए मॉडल, चालू मॉडल और डिस्क उपयोग सूचीबद्ध करता है |
| `ollama_show` | टूल | पैरामीटर आकार, क्वांटाइज़ेशन, संदर्भ लंबाई, family, format दिखाता है |
| `ollama_pull` | टूल | मॉडल खींचता (डाउनलोड करता) है |
| `ollama_remove` | टूल | मॉडल हटाता है |
| `ollama_health` | टूल | प्रक्रिया सक्रियता + API प्रतिक्रिया |
| `/ollama` | कमांड | एक-झटके में स्थिति सारांश (मॉडल + स्वास्थ्य + सुझाव) |

**उपभोग करता है** सार्वजनिक host सेवाएँ `ctx.llm` (`registerAdapter`), `ctx.tools`, `ctx.subprocess` (CLI जाँच), और `ctx.commands`। यह डिफ़ॉल्ट रूप से `llm/stream` को शॉर्ट-सर्किट नहीं करता — रूटिंग श्रोता तब तक आगे बढ़ाता है (`next()`) जब तक कोई नियम मेल न खाए।

## Permissions & data

- **अनुमतियाँ**: आपके द्वारा कॉन्फ़िगर किए गए Ollama एंडपॉइंट के लिए `network:outbound`; कोई नेटिव कोड नहीं, कोई फ़ाइल-सिस्टम पहुँच नहीं, कोई स्टोरेज नहीं।
- **डेटा**: मॉडल या उपयोगकर्ता को दिखाई गई हर मॉडल सूची/विवरण, स्वास्थ्य तथ्य और त्रुटि संदेश दिखाने से पहले सैनिटाइज़ होते हैं (एंडपॉइंट userinfo व गुप्त क्वेरी पैरामीटर हटाए जाते हैं, नियंत्रण वर्ण हटाए जाते हैं, लंबाई सीमित होती है)। टूल व कमांड परिणाम harness के अपने tool/command तंत्र द्वारा लॉग होते हैं।
- **क्रेडेंशियल**: प्लगइन कोई क्रेडेंशियल संग्रहीत या पढ़ता नहीं है। यह केवल आपके कॉन्फ़िगर किए एंडपॉइंट पर HTTP अनुरोध भेजता है, साथ ही स्थानीय `ollama list` प्रक्रिया जाँच करता है।

## Security boundaries

- **डिफ़ॉल्ट रूप से कोई पुनः-रूटिंग नहीं** — `route` सूची तब तक खाली है जब तक आप सहमति न दें; अनुरोध स्थानीय मॉडल तक केवल किसी स्पष्ट नियम या `ollama` प्रदाता के स्पष्ट चयन से पहुँचता है।
- **दिखाने से पहले सैनिटाइज़** — एंडपॉइंट पते व स्थानीय पथ टूल आउटपुट, `/ollama` कमांड या त्रुटि संदेशों तक पहुँचने से पहले सैनिटाइज़ होते हैं।
- **शून्य बंडल मॉडल** — डाउनलोड व स्टोरेज Ollama की अपनी ज़िम्मेदारी है; पैकेज में कुछ नहीं भेजा जाता।
- **विफलता ज़ोरदार, विफलता सीमित** — अमान्य कॉन्फ़िग माउंट को विफल करता है; सामग्री बनाने से पहले विफल स्थानीय रूट क्लाउड पर वापस लौटता है (`next()`), इसलिए बंद Ollama कभी बातचीत को अटकाता नहीं।
- **मॉडल-दृश्य ⟺ लॉग** — रूटिंग केवल यह बदलती है कि कौन-सा प्रदाता अनुरोध सेवा करता है (assistant संदेश अपनी `ollama` उत्पत्ति के साथ लॉग होता है); कोई नया मॉडल-दृश्य इनपुट नहीं गढ़ा जाता।

## Known limitations

- **केवल rc.2** — `@deepseek-ai/dsh@0.1.1-rc.2` के विरुद्ध विकसित व परीक्षित; नए harness बेसलाइन काम करने की अपेक्षा है, पर मासिक compat workflow उन्हें सत्यापित करता है।
- **मॉडल द्वारा vision रिपोर्ट करने पर विज़न** — जिन मॉडलों की `/api/show` capabilities में `vision` है, वे `inputModalities: ["text","image"]` घोषित करते हैं और उपयोगकर्ता संदेशों पर base64 छवि पेलोड ले जाते हैं (`vision: false` से बंद करें); केवल-टेक्स्ट मॉडल अब भी छवि सामग्री अस्वीकार करते हैं (`UNSUPPORTED_CONTENT`)।
- **मध्य-स्ट्रीम वापसी** — एक बार स्थानीय रूट सामग्री बनाना शुरू कर दे, तो बाद की विफलता आगे भेजी जाती है (वापस नहीं ली जाती); केवल पहले टोकन से पहले की विफलता क्लाउड पर लौटती है।

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + परीक्षण, प्रकाशित 0.1.1-rc.2 प्रकारों के विरुद्ध
pnpm run typecheck:ci  # सख्त tsc, प्रकाशित rc.2 प्रकारों के विरुद्ध (skipLibCheck बंद)
pnpm test           # vitest: वास्तविक Context/LlmRuntime/ToolRuntime/CommandRuntime/subprocess सीम
pnpm run test:coverage  # कवरेज द्वार (90/80/90/90)
pnpm run build      # tsdown बंडल + tsc घोषणाएँ (lib/)
pnpm run verify:self-contained  # निर्भरता विनिर्देश registry से हल होते हैं
pnpm run verify:artifacts       # निर्मित ESM फलक + बंडल पैच मौजूद
node scripts/check-readme-sync.mjs  # पाँच-भाषा README समन्वय द्वार
node scripts/check-endpoints.mjs  # M3 एंडपॉइंट-लाइवनेस प्रोब (Ollama /api/version)
pnpm pack           # प्रकाशित tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — निर्माता व अनुरक्षक: एडाप्टर, रूटिंग, टूल, स्वास्थ्य जाँच, सैनिटाइज़ेशन और पाँच-भाषा दस्तावेज़।
- [@LABEST-IA](https://github.com/LABEST-IA) — टूल-कॉल CallId सुधार (PR #2), तथा टूल-कॉल स्लॉट व विज़न-समर्थन रिपोर्टें (issues #1, #3, #5)।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [29 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | अनुमोदन श्रृंखला पर दूसरे मॉडल से स्वतः-समीक्षा, डिफ़ॉल्ट रूप से असफल-बंद |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Web UI साइडबार, संदेश और रुकावट के साथ स्थायी पृष्ठभूमि चाइल्ड एजेंट |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फोर्क, एक-बार पुनर्स्थापन |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Claude Code सत्र, स्मृति, skills और CLAUDE.md को DSH में स्थानांतरित करें |
| [dsh-click](https://github.com/PerryLink/dsh-click) | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | इंजीनियरिंग-अनुशासन गार्ड: आवश्यकताएँ पूछताछ, परीक्षण द्वार, विरोधी समीक्षा |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness के लिए केवल-पठन प्रदर्शन निदान। |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness के लिए PII मास्किंग मिडलवेयर — मॉडल तक पहुँचने से पहले व्यक्तिगत डेटा अनाम करता है, प्रदर्शन परत पर बहाल करता है। |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | केवल-पठन MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला सेटिंग टैब |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | अनुमोदन-द्वारित क्रॉस-सत्र स्मृति: ctx.memory seam + SQLite + memory टूल |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-समतुल्य रनटाइम शैली स्विचिंग |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम, ऑडिट के साथ |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | माँग-पर एजेंट स्किल के रूप में प्लगइन-विकास ज्ञानकोश |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness प्लगइनों के लिए बहु-आयामी गुणवत्ता स्कोरिंग। |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Web साइडबार में सत्र पिन करें, स्थायी क्रम के साथ |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | सुरक्षा-ऑडिट स्किल पैक: सीक्रेट स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness प्लगइनों के लिए पृथक इंस्टॉल-और-स्मोक परीक्षण। |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors
