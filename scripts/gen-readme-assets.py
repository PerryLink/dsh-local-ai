#!/usr/bin/env python3
"""README visuals for dsh-local-ai — derived from the shipped pipeline.

Two figures, both read off this repository rather than a generic template:

  hero 1440x576 (Pillow, 4 files: zh/en x light/dark)
      A provider patch panel. Three rails: `ollama` (native /api/chat NDJSON),
      `openai:<name>` (LM Studio / vLLM / llama.cpp over /v1/chat/completions
      SSE) and `cloud` as the dashed last rail. A vertical bus on the left is
      `ctx.llm.registerAdapter` — one registration per local backend. Under the
      rails sits the failure boundary that `src/route.ts` implements: fall back
      to `next()` before the first visible delta, rethrow `IMAGE_OFFLOAD_REQUIRED`
      instead of leaking a local-only request to the cloud.

      Wire ids come from src/index.ts (adapter registration), src/route.ts
      (fallback / carve-out), src/config.ts (route rule fields and
      `route: []` default) and cordis.patch.yml (the documented defaults).

  flow 1100x660 (hand-written SVG, 2 files: light/dark)
      A gate → fork → two lanes → one collector, plus a guard band: the
      routing waterfall reads provider/purpose/messages text, `route[]` is
      matched in order (first hit wins), a hit forks into exactly one of the
      two local adapters, and whichever lane runs is wrapped by the same
      `routeLocal` guard. The management surface (five tools + `/ollama`) is a
      separate channel below, next to the two independent health signals.

Text inside both figures is Chinese plus code-surface tokens, so a single
asset pair serves all five READMEs (only the <img alt> is localized).

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow + msyh.ttc / msyhbd.ttc / consola.ttf (Windows).
"""
from __future__ import annotations

import math
import os
from html import escape

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_MONO_BOLD = r"C:\Windows\Fonts\consolab.ttf"
for _p in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO, FONT_MONO_BOLD):
    if not os.path.exists(_p):
        raise SystemExit(f"FATAL: font missing: {_p}")

RADIUS = 22
SHADOW = 26

SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        card="#ffffff", card_edge="#e6e2ef",
        text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", accent2="#16a34a", warn="#b45309",
        pill="#ece7f9", band="#f5f2fb", grid="#e7e4f0",
        shadow=(32, 26, 64), glow="#7a68c9",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        card="#1b2231", card_edge="#2e374b",
        text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", accent2="#3fb950", warn="#d9a441",
        pill="#242d42", band="#202839", grid="#262f42",
        shadow=(0, 0, 0), glow="#8496f5",
    ),
}

FONT_FILES = {"cjk": FONT_CJK, "cjk_bold": FONT_CJK_BOLD,
              "mono": FONT_MONO, "mono_bold": FONT_MONO_BOLD}


def font(size: int, kind: str = "cjk_bold") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_FILES[kind], size)


def hx(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def gradient(w: int, h: int, c1: str, c2: str) -> Image.Image:
    base = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(base)
    a, b = hx(c1), hx(c2)
    for y in range(h):
        t = 0.15 * (y / h) + 0.85 * (y / h) ** 1.35
        d.line([(0, y), (w, y)],
               fill=tuple(int(p + (q - p) * t) for p, q in zip(a, b)))
    return base


def glow(img: Image.Image, cx: int, cy: int, r: int, color: tuple,
         alpha: int = 40) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(9, 0, -1):
        rr = r * i / 9
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=color + (int(alpha * (1 - i / 10)),))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def card(img: Image.Image, box: tuple, s: dict, radius: int = RADIUS,
         shadow: int = SHADOW, fill: str | None = None,
         edge: str | None = None) -> Image.Image:
    """A soft-shadowed rounded card on the gradient background."""
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(shadow, 0, -3):
        sd.rounded_rectangle([x0 - i // 5, y0 + i // 2, x1 + i // 5, y1 + i],
                             radius=radius + i // 5,
                             fill=s["shadow"] + (int(9 * (1 - i / shadow)),))
    base = Image.alpha_composite(img.convert("RGBA"),
                                 sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=hx(fill or s["card"]),
                        outline=hx(edge or s["card_edge"]), width=2)
    return base.convert("RGB")


_SCRATCH = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def measure(text: str, size: int, kind: str) -> float:
    return _SCRATCH.textlength(text, font=font(size, kind))


def require_w(text: str, size: int, kind: str, max_w: float, what: str) -> None:
    """Fail loudly instead of shipping a clipped label."""
    w = measure(text, size, kind)
    if w > max_w + 0.4:
        raise SystemExit(f"FATAL: {what} overflows: {text!r} needs {w:.1f}px > {max_w}px")


def fit(text: str, kind: str, max_w: float, start: int, minimum: int) -> int:
    size = start
    while size > minimum:
        if measure(text, size, kind) <= max_w:
            return size
        size -= 1
    raise SystemExit(f"FATAL: text does not fit {max_w}px at >= {minimum}px: {text!r}")


def fit_lines(lines: list[str], kind: str, max_w: float, start: int,
              minimum: int) -> int:
    return min(fit(t, kind, max_w, start, minimum) for t in lines)


def pill(img: Image.Image, xy: tuple[int, int], text: str, s: dict,
         size: int = 16, fg: str | None = None, bg: str | None = None,
         kind: str = "cjk_bold") -> int:
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    w = d.textlength(text, font=f)
    x, y = xy
    h = size + 20
    d.rounded_rectangle([x, y, x + w + 30, y + h], radius=h // 2,
                        fill=hx(bg or s["pill"]))
    d.text((x + 15, y + h / 2), text, font=f, fill=hx(fg or s["accent"]),
           anchor="lm")
    return int(x + w + 30)


def chip(img: Image.Image, x_right: int, y: int, text: str, fg: str, bg: str,
         size: int = 11, kind: str = "cjk_bold", padx: int = 10,
         height: int = 22) -> int:
    """A pill anchored on its right edge; returns its left edge."""
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    w = d.textlength(text, font=f)
    x = x_right - int(w) - padx * 2
    d.rounded_rectangle([x, y, x_right, y + height], radius=height // 2,
                        fill=hx(bg))
    d.text((x + padx, y + height / 2 + 0.5), text, font=f, fill=hx(fg),
           anchor="lm")
    return x


def dash_round_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int],
                    color: str, radius: int = 14, width: int = 2,
                    dash: int = 7, gap: int = 5) -> None:
    """A rounded rectangle whose straight edges are dashed and corners solid."""
    x0, y0, x1, y1 = box
    col = hx(color)

    def dline(a: tuple[int, int], b: tuple[int, int]) -> None:
        dist = math.hypot(b[0] - a[0], b[1] - a[1])
        steps = int(dist // (dash + gap)) + 1
        for i in range(steps):
            t0 = i * (dash + gap) / dist
            t1 = min((i * (dash + gap) + dash) / dist, 1.0)
            if t0 >= 1:
                break
            d.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0),
                    (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)],
                   fill=col, width=width)

    dline((x0 + radius, y0), (x1 - radius, y0))
    dline((x0 + radius, y1), (x1 - radius, y1))
    dline((x0, y0 + radius), (x0, y1 - radius))
    dline((x1, y0 + radius), (x1, y1 - radius))
    d.arc([x0, y0, x0 + 2 * radius, y0 + 2 * radius], 180, 270,
          fill=col, width=width)
    d.arc([x1 - 2 * radius, y0, x1, y0 + 2 * radius], 270, 360,
          fill=col, width=width)
    d.arc([x1 - 2 * radius, y1 - 2 * radius, x1, y1], 0, 90,
          fill=col, width=width)
    d.arc([x0, y1 - 2 * radius, x0 + 2 * radius, y1], 90, 180,
          fill=col, width=width)


def _ascii(text: str) -> bool:
    return all(ord(ch) < 128 for ch in text)


def wire_segments(wire: str) -> list[tuple[str, str]]:
    """Split a rail caption into mono (code tokens) and CJK (prose) runs."""
    segments: list[tuple[str, str]] = []
    for i, part in enumerate(wire.split(" · ")):
        if i > 0:
            segments.append((" · ", "cjk"))
        segments.append((part, "mono" if _ascii(part) else "cjk"))
    return segments


def wire_width(wire: str, size: int) -> float:
    return sum(measure(text, size, kind) for text, kind in wire_segments(wire))


def draw_wire(d: ImageDraw.ImageDraw, x: float, y: float, wire: str,
              size: int, color: str) -> None:
    cx = x
    for text, kind in wire_segments(wire):
        f = font(size, kind)
        d.text((cx, y), text, font=f, fill=hx(color))
        cx += d.textlength(text, font=f)


# --------------------------------------------------------------------------- hero
# Every literal below is part of the shipped surface: provider ids from
# src/index.ts, the rule fields from src/config.ts, the carve-out from
# src/route.ts, and the documented defaults from cordis.patch.yml.
HERO = {
    "zh": dict(
        kicker="DeepSeek Harness 插件 · 本地模型提供方",
        value=["按规则把请求交给本地模型", "首个 token 前失败就退回云端"],
        sub=["Ollama 是一等 provider：/api/chat 走 NDJSON 流；",
             "OpenAI 兼容后端走 /v1/chat/completions。"],
        meta="5 个工具 · /ollama 总览 · route 默认空 · 零捆绑模型",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        panel_title="providers · registerAdapter",
        panel_chip="1 + N 个后端",
        panel_sub="每个本地后端注册为一个 provider id；cloud 是瀑布的下一环",
        rails=[
            ("ollama", "llama3.2 · 3B · Q4_K_M · POST /api/chat", "NDJSON 流"),
            ("openai:lmstudio", "qwen2.5-7b · POST /v1/chat/completions", "SSE 流"),
            ("cloud", "next() · 只在首个可见 delta 之前", "兜底"),
        ],
        panel_note="route 默认 [] · 无规则命中 → 全部 next() 透传",
        bound_title="失败边界",
        bound=[
            ("首个可见 delta 之前失败", "yield* next() → cloud", "对话不会因 Ollama 宕机卡死"),
            ("IMAGE_OFFLOAD_REQUIRED", "抛回，不回退", "官方图像卸载回路的唯一例外"),
        ],
        bound_note="首个可见 delta 之后才失败 → 原样透传，无法回退",
    ),
    "en": dict(
        kicker="DeepSeek Harness plugin · local provider",
        value=["Rules pick the local model", "Fail early, fall back to cloud"],
        sub=["Ollama streams NDJSON from /api/chat; LM Studio, vLLM",
             "and llama.cpp stream SSE from /v1/chat/completions."],
        meta="5 tools · /ollama overview · route empty by default",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        panel_title="providers · registerAdapter",
        panel_chip="1 + N backends",
        panel_sub="Each local backend registers as its own provider id; cloud stays the next link",
        rails=[
            ("ollama", "llama3.2 · 3B · Q4_K_M · POST /api/chat", "NDJSON"),
            ("openai:lmstudio", "qwen2.5-7b · POST /v1/chat/completions", "SSE"),
            ("cloud", "next() · only before the first visible delta", "fallback"),
        ],
        panel_note="route defaults to [] · no rule hit → every request goes next()",
        bound_title="Failure boundary",
        bound=[
            ("Fail before first delta", "yield* next() → cloud", "a down Ollama never bricks a chat"),
            ("IMAGE_OFFLOAD_REQUIRED", "rethrow, no fallback", "the one carve-out of the offload circuit"),
        ],
        bound_note="Once local content has started it is forwarded — no retraction",
    ),
}


def hero(lang: str, skin: str) -> None:
    s = SKIN[skin]
    H = HERO[lang]
    W, HT = 1440, 576
    img = gradient(W, HT, s["bg_from"], s["bg_to"])
    img = glow(img, 1220, 20, 420, hx(s["glow"]),
               24 if skin == "light" else 38)
    img = glow(img, 80, 590, 300, hx(s["glow"]),
               10 if skin == "light" else 16)

    d = ImageDraw.Draw(img)
    m = 64
    col_w = 612

    # ---- left column: kicker / title / value / sub / meta / footer ----------
    pill(img, (m, 56), H["kicker"], s, size=17)
    d = ImageDraw.Draw(img)

    title_size = fit("dsh-local-ai", "mono_bold", col_w, 58, 48)
    d.text((m - 2, 118), "dsh-local-ai", font=font(title_size, "mono_bold"),
           fill=hx(s["text"]))

    vf = fit_lines(H["value"], "cjk_bold", col_w, 42, 34)
    for i, line in enumerate(H["value"]):
        require_w(line, vf, "cjk_bold", col_w, "hero value")
        d.text((m, 204 + i * 56), line, font=font(vf, "cjk_bold"),
               fill=hx(s["text"]))

    for i, line in enumerate(H["sub"]):
        require_w(line, 22, "cjk", col_w, "hero sub")
        d.text((m + 1, 334 + i * 34), line, font=font(22, "cjk"),
               fill=hx(s["sub"]))

    require_w(H["meta"], 19, "cjk", col_w, "hero meta")
    require_w(H["foot"], 16, "cjk", col_w, "hero footer")
    d.text((m + 1, 428), H["meta"], font=font(19, "cjk"), fill=hx(s["faint"]))
    d.line([m + 1, 480, m + col_w - 4, 480], fill=hx(s["grid"]), width=2)
    d.text((m + 1, 494), H["foot"], font=font(16, "cjk"), fill=hx(s["faint"]))

    # ---- right: provider patch panel ---------------------------------------
    img = card(img, (692, 40, 1376, 356), s, radius=RADIUS, shadow=SHADOW)
    d = ImageDraw.Draw(img)
    d.text((716, 56), H["panel_title"], font=font(16, "mono_bold"),
           fill=hx(s["accent"]))
    require_w(H["panel_title"], 16, "mono_bold", 420, "panel title")
    chip(img, 1352, 48, H["panel_chip"], s["accent"], s["pill"], size=11)
    d = ImageDraw.Draw(img)
    d.text((716, 90), H["panel_sub"], font=font(12, "cjk"), fill=hx(s["faint"]))
    require_w(H["panel_sub"], 12, "cjk", 630, "panel subtitle")

    # the registration bus on the left of the rails
    d.line([728, 138, 728, 272], fill=hx(s["grid"]), width=2)
    rail_y = [106, 172, 238]
    for idx, (pid, wire, proto) in enumerate(H["rails"]):
        y = rail_y[idx]
        dashed = idx == 2
        if dashed:
            d.rounded_rectangle([760, y, 1352, y + 60], radius=14,
                                fill=hx(s["card"]))
            dash_round_rect(d, (760, y, 1352, y + 60), s["card_edge"],
                            radius=14, width=2, dash=8, gap=5)
        else:
            d.rounded_rectangle([760, y, 1352, y + 60], radius=14,
                                fill=hx(s["band"]))
            d.rounded_rectangle([760, y, 1352, y + 60], radius=14,
                                outline=hx(s["card_edge"]), width=2)
            d.rounded_rectangle([770, y + 13, 774, y + 47], radius=2,
                                fill=hx(s["accent"]))
        fg = s["faint"] if dashed else s["text"]
        d.text((788, y + 10), pid, font=font(16, "mono_bold"), fill=hx(fg))
        draw_wire(d, 788, y + 35, wire, 12,
                  s["faint"] if dashed else s["sub"])
        if wire_width(wire, 12) > 398:
            raise SystemExit(f"FATAL: rail caption overflows: {wire!r} "
                             f"({wire_width(wire, 12):.1f}px > 398px)")
        chip(img, 1338, y + 19, proto,
             s["faint"] if dashed else s["accent"],
             s["card"] if not dashed else s["pill"], size=11,
             height=22)
        d = ImageDraw.Draw(img)
        # bus dot + cord into the rail
        d.ellipse([722, y + 26, 734, y + 38],
                  fill=hx(s["accent"] if not dashed else s["card_edge"]))
        d.line([734, y + 32, 758, y + 32],
               fill=hx(s["accent"] if not dashed else s["card_edge"]), width=2)

    d.text((716, 316), H["panel_note"], font=font(11.5, "cjk"),
           fill=hx(s["faint"]))
    require_w(H["panel_note"], 11.5, "cjk", 630, "panel note")

    # ---- right: the failure boundary strip ---------------------------------
    img = card(img, (692, 368, 1376, 536), s, radius=RADIUS, shadow=20)
    d = ImageDraw.Draw(img)
    d.text((716, 384), H["bound_title"], font=font(15, "cjk_bold"),
           fill=hx(s["accent"]))
    d.line([1032, 382, 1032, 470], fill=hx(s["grid"]), width=2)
    for col, (head, body, note) in enumerate(H["bound"]):
        x = 716 if col == 0 else 1052
        color = s["accent"] if col == 0 else s["warn"]
        d.text((x, 410), head, font=font(12.5, "mono_bold" if col == 1 else "cjk_bold"),
               fill=hx(s["text"]))
        require_w(head, 12.5, "mono_bold" if col == 1 else "cjk_bold",
                  300 if col == 0 else 300, f"boundary head {col}")
        d.text((x, 432), body, font=font(12.5, "cjk_bold"), fill=hx(color))
        require_w(body, 12.5, "cjk_bold", 300, f"boundary body {col}")
        d.text((x, 454), note, font=font(11.5, "cjk"), fill=hx(s["faint"]))
        require_w(note, 11.5, "cjk", 300, f"boundary note {col}")
    d.text((716, 496), H["bound_note"], font=font(11.5, "cjk"),
           fill=hx(s["faint"]))
    require_w(H["bound_note"], 11.5, "cjk", 630, "boundary footer")

    name = f"dsh-local-ai-hero-{lang}-{skin}.webp"
    img.save(os.path.join(OUT, name), "WEBP", quality=92, method=6)
    print(f"wrote {name} ({W}x{HT})")


# --------------------------------------------------------------------------- flow
FLOW = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        panel="#ffffff", edge="#e6e2ef", band="#f5f2fb",
        text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", accent2="#16a34a", warn="#b45309",
        rule="#ded9ea", chip="#ece7f9", shadow="0.10",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        panel="#1b2231", edge="#2e374b", band="#202839",
        text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", accent2="#3fb950", warn="#d9a441",
        rule="#2b3348", chip="#242d42", shadow="0.45",
    ),
}

FONT_CSS_CJK = ("'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',"
                "'Source Han Sans SC',sans-serif")
FONT_CSS_MONO = ("'Consolas','SFMono-Regular','Menlo',ui-monospace,monospace")


class Svg:
    """Tiny SVG writer that measures every label before it is emitted."""

    def __init__(self) -> None:
        self.parts: list[str] = []
        self.overflows: list[str] = []

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def text(self, x: float, y: float, content: str, size: float, fill: str, *,
             anchor: str = "start", weight: int | None = None,
             mono: bool = False, max_w: float | None = None,
             opacity: float | None = None) -> None:
        kind = ("mono" if mono else "cjk") + ("_bold" if weight else "")
        if mono and weight:
            kind = "mono_bold"
        if max_w is not None:
            w = measure(content, size, kind)
            if w > max_w + 0.4:
                self.overflows.append(f"{content!r} needs {w:.1f}px > {max_w}px")
        family = FONT_CSS_MONO if mono else FONT_CSS_CJK
        attrs = [f'x="{x}"', f'y="{y}"', f'fill="{fill}"',
                 f'font-family="{family}"', f'font-size="{size}"']
        if anchor != "start":
            attrs.append(f'text-anchor="{anchor}"')
        if weight:
            attrs.append(f'font-weight="{weight}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<text {" ".join(attrs)}>{escape(content)}</text>')

    def rect(self, x: float, y: float, w: float, h: float, *, fill: str,
             rx: float = 0, stroke: str | None = None, sw: float = 1.5,
             shadow: bool = False, dash: str | None = None,
             opacity: float | None = None) -> None:
        attrs = [f'x="{x}"', f'y="{y}"', f'width="{w}"', f'height="{h}"']
        if rx:
            attrs.append(f'rx="{rx}"')
        attrs.append(f'fill="{fill}"')
        if stroke:
            attrs.append(f'stroke="{stroke}"')
            attrs.append(f'stroke-width="{sw}"')
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        if shadow:
            attrs.append('filter="url(#soft)"')
        self.add(f'<rect {" ".join(attrs)}/>')

    def line(self, x1: float, y1: float, x2: float, y2: float, *, stroke: str,
             sw: float = 1.5, dash: str | None = None,
             marker: str | None = None, opacity: float | None = None) -> None:
        attrs = [f'x1="{x1}"', f'y1="{y1}"', f'x2="{x2}"', f'y2="{y2}"',
                 f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if marker:
            attrs.append(f'marker-end="url(#{marker})"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<line {" ".join(attrs)}/>')

    def path(self, d: str, *, stroke: str, sw: float = 1.5,
             marker: str | None = None, dash: str | None = None,
             fill: str = "none") -> None:
        attrs = [f'd="{d}"', f'fill="{fill}"', f'stroke="{stroke}"',
                 f'stroke-width="{sw}"', 'stroke-linecap="round"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if marker:
            attrs.append(f'marker-end="url(#{marker})"')
        self.add(f'<path {" ".join(attrs)}/>')

    def dot(self, x: float, y: float, r: float, fill: str,
            stroke: str | None = None, sw: float = 1.6) -> None:
        extra = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"{extra}/>')

    def chip(self, x: float, y: float, label: str, fg: str, bg: str, *,
             size: float = 11, pad: float = 9, height: float = 22,
             mono: bool = False, weight: int | None = None) -> float:
        """A pill anchored on its left edge; returns its right edge."""
        kind = ("mono" if mono else "cjk") + ("_bold" if weight else "")
        w = measure(label, size, kind) + pad * 2
        self.rect(x, y, w, height, fill=bg, rx=height / 2)
        self.text(x + pad, y + height / 2 + size * 0.34, label, size, fg,
                  weight=weight, mono=mono, max_w=w - pad * 2)
        return x + w

    def chip_r(self, x_right: float, y: float, label: str, fg: str, bg: str, *,
               size: float = 11, pad: float = 9, height: float = 22,
               mono: bool = False, weight: int | None = None) -> float:
        """A pill anchored on its right edge; returns its left edge."""
        kind = ("mono" if mono else "cjk") + ("_bold" if weight else "")
        w = measure(label, size, kind) + pad * 2
        x = x_right - w
        self.rect(x, y, w, height, fill=bg, rx=height / 2)
        self.text(x + pad, y + height / 2 + size * 0.34, label, size, fg,
                  weight=weight, mono=mono, max_w=w - pad * 2)
        return x

    def svg(self, w: int, h: int, label: str) -> str:
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" '
                f'height="{h}" viewBox="0 0 {w} {h}" role="img" '
                f'aria-label="{escape(label)}">')
        return "\n".join([head, *self.parts, "</svg>"]) + "\n"


FLOW_LABEL = ("dsh-local-ai 结构图：llm/stream 瀑布读出 provider、purpose 与消息文本，"
              "route[] 按顺序首个命中后分叉到 ollama 或 openai:<name> 两条适配器通道，"
              "汇入同一个 StreamChunk；首个可见 delta 前的失败经 routeLocal 守卫回到 cloud；"
              "五个工具与 /ollama 另走管理通道")


def flow_svg(skin: str) -> str:
    s = FLOW[skin]
    W, H = 1100, 660
    v = Svg()

    v.add("<defs>")
    v.add(f'<linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">'
          f'<stop offset="0" stop-color="{s["bg_from"]}"/>'
          f'<stop offset="1" stop-color="{s["bg_to"]}"/></linearGradient>')
    v.add(f'<filter id="soft" x="-30%" y="-30%" width="160%" height="170%">'
          f'<feDropShadow dx="0" dy="6" stdDeviation="8" '
          f'flood-color="#16122c" flood-opacity="{s["shadow"]}"/></filter>')
    v.add('<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" '
          'markerWidth="6.2" markerHeight="6.2" orient="auto-start-reverse">'
          f'<path d="M0 0 L10 5 L0 10 z" fill="{s["accent"]}"/></marker>')
    v.add(f'<marker id="arrdim" viewBox="0 0 10 10" refX="9" refY="5" '
          f'markerWidth="6.2" markerHeight="6.2" orient="auto-start-reverse">'
          f'<path d="M0 0 L10 5 L0 10 z" fill="{s["sub"]}"/></marker>')
    v.add("</defs>")
    v.add(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')

    # ---- header -------------------------------------------------------------
    v.text(44, 56, "dsh-local-ai", 28, s["text"], weight=700, mono=True,
           max_w=640)
    v.text(44, 84, "一个请求只走一条本地出口：规则闸门 → 两条适配器通道 → StreamChunk；"
                   "工具与 /ollama 另走管理通道。", 15, s["sub"], max_w=800)
    v.chip_r(1056, 32, "route 默认 [] · 不重路由", s["accent"], s["chip"],
             size=11.5, pad=12, height=24, weight=700)

    # ---- entry: llm/stream --------------------------------------------------
    v.rect(44, 116, 160, 180, fill=s["panel"], rx=20, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(60, 146, "llm/stream", 15, s["text"], weight=700, mono=True,
           max_w=132)
    v.text(60, 168, "广播瀑布", 11, s["faint"], max_w=132)
    v.text(60, 184, "每个监听器都运行", 11, s["faint"], max_w=132)
    v.text(60, 206, "只读三处", 11, s["sub"], max_w=132)
    for i, label in enumerate(("provider", "purpose", "messages[].text")):
        v.chip(60, 212 + i * 26, label, s["accent"], s["band"], size=11,
               pad=6, height=22, mono=True, weight=700)

    # short-circuit note (explicit local provider is never re-routed)
    v.rect(44, 312, 160, 52, fill=s["panel"], rx=14, stroke=s["edge"],
           sw=1.5, dash="6 4")
    v.text(60, 330, "已是本地 provider", 11, s["sub"], max_w=132)
    v.text(60, 346, "→ 不重路由", 11, s["sub"], max_w=132)
    v.text(60, 361, "直接 next()", 11, s["faint"], max_w=132)

    # entry -> gate
    v.line(204, 240, 224, 240, stroke=s["accent"], sw=1.8, marker="arr")

    # ---- gate: route[] ------------------------------------------------------
    v.rect(226, 116, 270, 248, fill=s["panel"], rx=20, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(248, 144, "route[]", 14.5, s["text"], weight=700, mono=True,
           max_w=120)
    v.text(248, 164, "首个命中生效 · 顺序即优先级", 11, s["faint"], max_w=238)
    gate_rows = (
        ("purpose", "compaction · session-title", 204, 224, 236),
        ("keywords", "不区分大小写 · system + text 块", 258, 278, 292),
        ("always", "true = 全部符合条件的请求", 314, 334, None),
    )
    for k, (key, value, ky, vy, sep) in enumerate(gate_rows):
        v.text(248, ky, key, 12.5, s["text"], weight=700, mono=True, max_w=238)
        v.text(248, vy, value, 11, s["sub"], max_w=238)
        v.dot(487, ky - 4, 3.4, s["accent"] if k == 0 else s["edge"])
        if sep is not None:
            v.line(248, sep, 480, sep, stroke=s["rule"], sw=1)
    v.text(248, 356, "route: []（默认）→ 全部 next() 透传", 11, s["faint"],
           max_w=238)

    # ---- the fork: a hit forks into exactly one local lane ------------------
    v.path("M496 240 H514 V174 H530", stroke=s["accent"], sw=1.8,
           marker="arr")
    v.path("M514 240 V306 H530", stroke=s["accent"], sw=1.8, marker="arr")

    # ---- lane A: Ollama adapter --------------------------------------------
    v.rect(532, 116, 292, 116, fill=s["panel"], rx=18, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(548, 142, "ollama", 16, s["text"], weight=700, mono=True, max_w=180)
    v.chip_r(808, 128, "NDJSON", s["accent"], s["chip"], size=10.5, pad=8,
             height=20, weight=700)
    v.text(548, 164, "POST /api/chat · idleWatchdog", 11.5, s["sub"], mono=True,
           max_w=260)
    v.rect(548, 176, 260, 26, fill=s["band"], rx=8)
    v.text(559, 194, "serialize.ts → translate.ts", 11.5, s["text"], mono=True,
           max_w=240)
    v.text(548, 222, "默认 ollama · tool 参数按公共前缀 diff", 11, s["faint"],
           max_w=260)

    # ---- lane B: OpenAI-compatible adapters --------------------------------
    v.rect(532, 248, 292, 116, fill=s["panel"], rx=18, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(548, 274, "openai:<name>", 16, s["text"], weight=700, mono=True,
           max_w=180)
    v.chip_r(808, 260, "SSE", s["accent"], s["chip"], size=10.5, pad=8,
             height=20, weight=700)
    v.text(548, 296, "POST /v1/chat/completions", 11.5, s["sub"], mono=True,
           max_w=260)
    v.rect(548, 308, 260, 26, fill=s["band"], rx=8)
    v.text(559, 326, "openai-serialize → translate", 11.5, s["text"], mono=True,
           max_w=240)
    v.text(548, 354, "同一 LlmAdapter seam · provider id", 11, s["faint"],
           max_w=260)

    # ---- collector: one StreamChunk ---------------------------------------
    v.rect(844, 116, 212, 248, fill=s["panel"], rx=20, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(860, 144, "StreamChunk", 14.5, s["text"], weight=700, mono=True,
           max_w=184)
    v.text(860, 164, "harness 可见增量", 11, s["faint"], max_w=180)
    for i, label in enumerate(("text-delta", "reasoning-delta",
                               "tool-call-delta")):
        y = 190 + i * 22
        v.dot(864, y - 4, 3, s["accent"])
        v.text(876, y, label, 11.5, s["text"], mono=True, max_w=168)
    v.line(860, 250, 1040, 250, stroke=s["rule"], sw=1)
    v.text(860, 274, "usage + finish", 11.5, s["sub"], mono=True, max_w=168)
    v.text(860, 292, "延后到 done", 11, s["faint"], max_w=168)
    v.rect(856, 304, 188, 30, fill=s["band"], rx=9)
    v.text(950, 323, "assistant 消息 · 来源记录", 11, s["accent"], weight=700,
           anchor="middle", max_w=176)
    v.text(860, 350, "来源 = provider id", 11, s["faint"], max_w=168)

    # lanes converge into the collector
    v.line(826, 174, 842, 174, stroke=s["accent"], sw=1.8, marker="arr")
    v.line(826, 306, 842, 306, stroke=s["accent"], sw=1.8, marker="arr")

    # ---- guard band: routeLocal + cloud ------------------------------------
    v.rect(56, 384, 720, 68, fill=s["panel"], rx=16, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(72, 404, "routeLocal · 首个可见 delta 之前", 12.5, s["accent"],
           weight=700, max_w=420)
    v.text(72, 426, "error / aborted → yield* next()：云端接手，对话继续", 11.5,
           s["text"], max_w=440)
    v.text(72, 444, "已出 content 之后才失败 → 原样透传，无法回退", 11.5,
           s["faint"], max_w=440)
    # mini timeline: the fallback window closes at the first visible delta
    v.text(668, 406, "首个 delta", 11, s["faint"], max_w=100)
    v.line(536, 414, 658, 414, stroke=s["sub"], sw=1.4, dash="4 4")
    v.line(662, 414, 744, 414, stroke=s["accent"], sw=1.4)
    v.line(660, 403, 660, 425, stroke=s["sub"], sw=1.6)
    v.text(536, 444, "回退窗口", 11, s["faint"], max_w=80)
    v.text(676, 444, "透传", 11, s["accent"], max_w=60)

    v.rect(792, 384, 264, 68, fill=s["panel"], rx=16, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(808, 404, "cloud · next()", 12.5, s["sub"], weight=700, mono=True,
           max_w=230)
    v.text(808, 426, "回退后由云端继续服务", 11.5, s["text"], max_w=232)
    v.text(808, 444, "例外：IMAGE_OFFLOAD_REQUIRED 抛回", 11.5, s["warn"],
           max_w=232)

    # lane B (the wrapped local stream) drops into the guard band
    v.line(680, 366, 680, 380, stroke=s["sub"], sw=1.5, dash="5 4",
           marker="arrdim")
    v.line(776, 418, 790, 418, stroke=s["sub"], sw=1.5, dash="5 4",
           marker="arrdim")

    # ---- management channel -------------------------------------------------
    v.rect(44, 466, 1012, 130, fill=s["panel"], rx=20, stroke=s["edge"],
           sw=1.5, shadow=True)
    v.text(62, 490, "管理通道 · 不经过路由（工具与命令）", 12.5, s["accent"],
           weight=700, max_w=600)
    v.text(62, 516, "ollama_list · ollama_show · ollama_pull · ollama_remove · "
                    "ollama_health", 12.5, s["text"], weight=700, mono=True,
           max_w=620)
    v.text(62, 538, "/api/tags · /api/ps · /api/show · /api/pull · /api/delete · "
                    "/api/version", 11.5, s["sub"], mono=True, max_w=620)
    v.text(62, 560, "/ollama → 健康 + 模型 + 磁盘 + 建议（一条命令的总览）", 11.5,
           s["sub"], max_w=620)
    v.text(62, 580, "展示前脱敏：endpoint userinfo、密钥查询参数、home 路径、"
                    "控制字符；超长截断", 11, s["faint"], max_w=620)

    v.rect(700, 480, 340, 108, fill=s["band"], rx=14, stroke=s["edge"],
           sw=1.2)
    v.text(716, 502, "健康检查 · 两个独立信号", 11.5, s["text"], weight=700,
           max_w=300)
    v.dot(720, 522, 3.6, s["accent2"])
    v.text(732, 526, "API：/api/version（HTTP）", 11.5, s["text"], max_w=290)
    v.dot(720, 546, 3.6, s["accent2"])
    v.text(732, 550, "进程：ollama list（subprocess）", 11.5, s["text"],
           max_w=290)
    v.text(716, 574, "任一失败只报告，不抛错", 11, s["faint"], max_w=300)

    # ---- footer -------------------------------------------------------------
    v.line(44, 616, 1056, 616, stroke=s["rule"], sw=1)
    v.text(44, 638, "route 默认空 = 不重路由 · 零依赖 HTTP 优先 · 不捆绑模型 · "
                    "不新增模型可见输入", 11.5, s["sub"], max_w=1000)

    if v.overflows:
        raise SystemExit("FATAL: SVG label overflow:\n  " +
                         "\n  ".join(v.overflows))
    return v.svg(W, H, FLOW_LABEL)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        for lang in ("zh", "en"):
            hero(lang, skin)
        name = f"dsh-local-ai-flow-v5-{skin}.svg"
        with open(os.path.join(OUT, name), "w", encoding="utf-8",
                  newline="\n") as fh:
            fh.write(flow_svg(skin))
        print(f"wrote {name} (1100x660)")


if __name__ == "__main__":
    main()
