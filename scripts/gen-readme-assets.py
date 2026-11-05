#!/usr/bin/env python3
"""Generate README image assets for dsh-local-ai (docs/assets/).

Outputs (idempotent overwrite):
  dsh-local-ai-flow-light.svg / dsh-local-ai-flow-dark.svg
      Hero routing diagram. Two hand-written SVG files (vector — never
      rasterized to webp). Text inside is command-surface tokens only
      (llm/stream, route, ollama, openai:<name>, /api/*, /ollama), so all
      five README languages share the same pair.
  No raster asset is produced: this plugin has no UI and ships no
  benchmark numbers, so there is no screenshot and no evidence chart.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow (pip install pillow) — used by the CJK font probe below.
"""
from __future__ import annotations

import os
import sys

from PIL import ImageFont  # noqa: F401  (kept so the Pillow dependency is real)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badge labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a", track="#eaeef2"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e", track="#21262d"),
}

# --- CJK font probe: Chinese must never render as tofu boxes ----------------
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",    # SimHei
    r"C:\Windows\Fonts\Deng.ttf",      # DengXian
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]
FONT_PATH = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
if FONT_PATH is None:
    sys.exit("FATAL: no CJK font found (looked for msyh.ttc, simhei.ttf, "
             "Deng.ttf, Noto Sans CJK, PingFang). Refusing to render Chinese "
             "as tofu boxes; install one of the probed fonts and re-run.")


# ---------------------------------------------------------------------------
# Hero routing SVG (light + dark)
# ---------------------------------------------------------------------------
# Every label is a command-surface token: event, provider id, config key,
# endpoint or tool name. No natural-language sentences, so the same pair is
# shared by all five README languages (only the <img alt> is localized).
FLOW_NODES = [
    ("request", "GenerateOptions.model"),
    ("llm/stream", "waterfall · next()"),
    ("route", "purpose · keywords · always"),
    ("provider", "ollama · openai:&lt;name&gt;"),
    ("cloud", "next() fallback"),
]
TOOLS_LINE_1 = ("ollama_list · ollama_show · ollama_pull · ollama_remove · "
                "ollama_health · /ollama")
TOOLS_LINE_2 = ("/api/tags · /api/ps · /api/show · /api/pull · /api/delete · "
                "/api/version · ollama list")


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 420
    nw, nh, gap = 182, 96, 42
    y0 = 150
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="dsh-local-ai routing '
        f'flow">',
        f'<title>dsh-local-ai routing flow</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="60" y="62" fill="{s["text"]}" font-family="ui-sans-serif,'
        f'system-ui,sans-serif" font-size="30" font-weight="700">dsh-local-ai'
        f'</text>',
        f'<text x="60" y="94" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="16">llm/stream · route · ollama · '
        f'openai:&lt;name&gt; · /ollama</text>',
        f'<line x1="60" y1="116" x2="1140" y2="116" stroke="{s["border"]}"/>',
    ]
    for i, (label, sub) in enumerate(FLOW_NODES):
        x = 60 + i * (nw + gap)
        accent = FAMILY if i in (2, 3) else (
            GREEN[skin] if i == 4 else s["border"])
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 40}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="16" font-weight="700">{label}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 68}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="11">{sub}</text>')
        if i < len(FLOW_NODES) - 1:
            ax = x + nw + 5
            ay = y0 + nh // 2
            dashed = ' stroke-dasharray="5 5"' if i == 3 else ''
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 11}" stroke="{s["sub"]}" '
                f'stroke-width="3"{dashed}/>')
            parts.append(
                f'<path d="M{ax + gap - 13} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')
            if i == 3:
                parts.append(
                    f'<text x="{ax + (gap - 11) // 2}" y="{ay - 12}" '
                    f'fill="{s["sub"]}" text-anchor="middle" '
                    f'font-family="ui-monospace,monospace" font-size="11">'
                    f'fail</text>')
    # tools + health band under the routing row
    bx, by, bw, bh = 60, 286, 1080, 66
    parts.append(
        f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="{bx + 24}" y="{by + 28}" fill="{s["text"]}" '
        f'font-family="ui-monospace,monospace" font-size="14" '
        f'font-weight="700">{TOOLS_LINE_1}</text>')
    parts.append(
        f'<text x="{bx + 24}" y="{by + 52}" fill="{s["sub"]}" '
        f'font-family="ui-monospace,monospace" font-size="12">'
        f'{TOOLS_LINE_2}</text>')
    parts.append(
        f'<text x="60" y="392" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="13">fail before first token → next() → cloud '
        f'· IMAGE_OFFLOAD_REQUIRED rethrown</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        with open(os.path.join(OUT, f"dsh-local-ai-flow-{skin}.svg"),
                  "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    print("wrote 2 SVG assets to docs/assets/")


if __name__ == "__main__":
    main()
