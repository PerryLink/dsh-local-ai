<div align="center">

# 🤖 dsh-local-ai
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-local-ai` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण।**

*स्थानीय मॉडल खोजें, खींचें, हटाएँ और जाँचें; कार्य-प्रकार या कीवर्ड के आधार पर अनुरोधों को स्थानीय मॉडल पर रूट करें और विफलता पर स्वतः क्लाउड पर वापस लौटें; `/ollama` से एक-झटके में स्थिति सारांश पाएँ।*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-local-ai?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-local-ai?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-local-ai
```


</div>

---

**📖 इकोसिस्टम नॉलेज बेस** — मापे गए आँकड़े, मार्केटिंग नहीं: [डेवलपमेंट गाइड · चयन डेटा · रखरखाव मानदंड](https://perrylink.github.io/dsh-plugin-guide/)।

<!-- star-cta -->
## Install & uninstall

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add github:PerryLink/dsh-local-ai` — `prepare` स्क्रिप्ट केवल उत्पादन निर्भरताओं से बनाती है।
- **npm चैनल** (प्रकाशित संस्करण): `dsh plugin --profile web add dsh-local-ai`।
- **tarball चैनल**: इस रिपो में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-local-ai-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-local-ai` (या प्रोफ़ाइल पैच से पंक्ति हटाएँ)।

> यदि pnpm इस पैकेज के लिए `ERR_PNPM_IGNORED_BUILDS` दिखाए, तो अपने `pnpm-workspace.yaml` में `allowBuilds: { esbuild: true }` जोड़ें — `dsh` CLI सटीक स्निपेट प्रिंट करता है।

## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (95 प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा नहीं खुलती, पर अगला व्यक्ति इसे खोज में आसानी से पा सकेगा।

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-local-ai?

DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण।

स्थानीय मॉडल खोजें, खींचें, हटाएँ और जाँचें; कार्य-प्रकार या कीवर्ड के आधार पर अनुरोधों को स्थानीय मॉडल पर रूट करें और विफलता पर स्वतः क्लाउड पर वापस लौटें; `/ollama` से एक-झटके में स्थिति सारांश पाएँ।

![dsh-local-ai का टर्मिनल डेमो: dsh-local-ai — install, then route by keyword to Ollama](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-hero.png)

![Animated terminal demo of dsh-local-ai](https://raw.githubusercontent.com/PerryLink/dsh-local-ai/main/docs/assets/dsh-local-ai-demo.gif)

*वही रन, एनिमेटेड।*

## Compatibility

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1` (2026-10-04 को सत्यापित: तीन typecheck (इंस्टॉल, CI, checkout) + 142 टेस्ट + self-contained/artifacts गेट; `0.1.7` का content-block union अनुकूलित है — टूल परिणाम अब प्रथम-श्रेणी का `tool` रोल संदेश है, और `0.1.7` से पहले का `tool-result` आवरण पुराने लॉग के लिए अब भी पढ़ा जाता है)। peer रेंज सभी समर्थित लाइनों को स्वीकार करती है: `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0 \|\| >=0.2.0-0 <0.3.0 \|\| >=0.2.1-0 <0.3.0`; dev/test पिन `0.2.0-rc.2` हैं। |
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
dsh plugin --profile web add github:PerryLink/dsh-local-ai
```

```sh
# 1. अपने प्रोफ़ाइल में बंडल इंस्टॉल करें
dsh plugin --profile web add github:PerryLink/dsh-local-ai

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
| `visionCacheTtlMs` | `30000` | `/api/show` क्षमता जाँच कितने मिलीसेकंड कैश रहे (`0` = कैश बंद; pull/remove उस मॉडल को अमान्य करता है) |
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
- **विफलता ज़ोरदार, विफलता सीमित** — अमान्य कॉन्फ़िग माउंट को विफल करता है; सामग्री बनाने से पहले विफल स्थानीय रूट क्लाउड पर वापस लौटता है (`next()`), इसलिए बंद Ollama कभी बातचीत को अटकाता नहीं। **एकमात्र अपवाद:** `IMAGE_OFFLOAD_REQUIRED` वाली विफलता क्लाउड पर दोबारा नहीं भेजी जाती बल्कि पुनः थ्रो होती है — यह कोड आधिकारिक इमेज-ऑफ़लोड सर्किट है जो इसी स्थानीय रूट से रखी गई छवियाँ हटाने को कहता है, और फ़ॉलबैक सर्किट को छोड़कर केवल-स्थानीय अनुरोध चुपचाप दूरस्थ प्रदाता को भेज देता।
- **मॉडल-दृश्य ⟺ लॉग** — रूटिंग केवल यह बदलती है कि कौन-सा प्रदाता अनुरोध सेवा करता है (assistant संदेश अपनी `ollama` उत्पत्ति के साथ लॉग होता है); कोई नया मॉडल-दृश्य इनपुट नहीं गढ़ा जाता।

## Known limitations

- **npm 0.2.0-rc.2** — `@deepseek-ai/dsh@0.2.0-rc.2` के विरुद्ध विकसित व परीक्षित; नए harness बेसलाइन काम करने की अपेक्षा है, पर मासिक compat workflow उन्हें सत्यापित करता है।
- **मॉडल द्वारा vision रिपोर्ट करने पर विज़न** — जिन मॉडलों की `/api/show` capabilities में `vision` है, वे `inputModalities: ["text","image"]` घोषित करते हैं और उपयोगकर्ता संदेशों पर base64 छवि पेलोड ले जाते हैं (`vision: false` से बंद करें); केवल-टेक्स्ट मॉडल अब भी छवि सामग्री अस्वीकार करते हैं (`UNSUPPORTED_CONTENT`)।
- **मध्य-स्ट्रीम वापसी** — एक बार स्थानीय रूट सामग्री बनाना शुरू कर दे, तो बाद की विफलता आगे भेजी जाती है (वापस नहीं ली जाती); केवल पहले टोकन से पहले की विफलता क्लाउड पर लौटती है।

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + परीक्षण, प्रकाशित 0.2.0-rc.2 प्रकारों के विरुद्ध
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

## Interoperability with other DSH plugins

**DSH `0.2.0-rc.2`** (वह रनटाइम जिसके लिए यह README प्रकाशित है) और 2026-10-05 को सर्वे किए गए उच्च-स्टार प्लगइन सेट के विरुद्ध सत्यापित।

यह प्लगइन अन्य प्लगइनों में **हस्तक्षेप नहीं करता**, उन उच्च-स्टार प्लगइनों सहित जो व्यापक रूप से इंस्टॉल हैं:

- **कोई टूल-नाम टकराव नहीं।** सभी टूल नेमस्पेस युक्त हैं; कोई भी ऐसा नंगा नाम नहीं लेता जो पहले से किसी अंतर्निहित टूल या अन्य प्लगइन का हो।
- **कोई सर्विस-की टकराव नहीं।** यह कोई सर्विस key प्रदान नहीं करता, इसलिए टकराव संभव नहीं।
- **कोई स्लॉट टकराव नहीं।** यह कोई क्लाइंट slot key पंजीकृत नहीं करता, इसलिए `shadows-shipped-ui` सीट के लिए प्रतिस्पर्धा नहीं करता।
- **कोई HTTP रूट टकराव नहीं।** यह कोई `webServer` प्रीफ़िक्स पंजीकृत नहीं करता।
- **कोई patch-लेयर टकराव नहीं।** बंडल patch केवल अपनी पंक्ति `insert` करता है; कभी किसी अंतर्निहित पंक्ति का `config` ओवरराइड नहीं करता।
- **कोई वैश्विक परिवर्तन नहीं।** यह प्रोटोटाइप नहीं बदलता, `process.env` नहीं लिखता, और वैश्विक fetch dispatcher प्रतिस्थापित नहीं करता।

**साझा ईवेंट लिसनर रचना से ही अहस्तक्षेपी हैं।** यह क्रम-संवेदनशील ईवेंट `llm/stream` को `ctx.on()` से देखता है — Cordis का **ब्रॉडकास्ट** पंजीकरण, जहाँ हर लिसनर चलता है और कोई किसी दूसरे को वंचित नहीं कर सकता। **यहाँ प्रत्येक लिसनर `next()` से डेलिगेट करता है**, इसलिए श्रृंखला कभी शॉर्ट-सर्किट नहीं होती:
  - `llm/stream` — also used by `dsh-routing-suite` (7000★).

स्थैतिक प्रमाण: इस रिपॉज़िटरी पर `dsh-plugin-doctor` के K10–K13 सभी `pass` हैं।

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `ollama`, `local-llm`, `local-models`, `offline`, `privacy`, `model-routing`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — निर्माता व अनुरक्षक: एडाप्टर, रूटिंग, टूल, स्वास्थ्य जाँच, सैनिटाइज़ेशन और पाँच-भाषा दस्तावेज़।
- [@LABEST-IA](https://github.com/LABEST-IA) — टूल-कॉल CallId सुधार (PR #2), तथा टूल-कॉल स्लॉट व विज़न-समर्थन रिपोर्टें (issues #1, #3, #5)।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) के **87 सक्रिय रूप से अनुरक्षित** DeepSeek Harness प्लगइन में से एक है। पूरा परिवार **95** प्लगइन है — **5 फ़्रोज़न**, **3 सेवानिवृत्त** — और नीचे संक्षिप्त रखा गया है ताकि हर README की पहली स्क्रीन छोटी रहे। हर पंक्ति देखने के लिए इसे खोलें; कारण स्थिति कॉलम में है।

<details>
<summary>सभी 95 प्लगइन खोलें</summary>

| प्लगइन | एक पंक्ति | स्थिति |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-local-ai contributors

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।
