#!/usr/bin/env python3
# HW App emoji font (1.7.0, Michael, Oct 18, 2026: "nešlo by nahrať nejaký balík obrázkov namiesto emoji", chose 3D).
#
# Every emoji the app itself shows (in src/App.jsx and the texts in src/i18n/) is drawn from Microsoft's Fluent Emoji
# 3D set (MIT licence, see LICENSE-fluent-emoji.txt) instead of the phone's own emoji, so they look the same on
# every phone and PC. They go into one small colour-bitmap font (CBDT/CBLC tables, the format of Android's own emoji
# font) that the app lists right after its text fonts: only these characters come from it, everything else (chat
# messages people type, the emoji picker) stays the phone's emoji.
#
# Run it again when an emoji is added to the app:
#   npm pack @lobehub/fluent-emoji-3d@1.1.0 && tar xzf lobehub-fluent-emoji-3d-1.1.0.tgz -C /tmp/fe3d
#   python3 tools/emoji/build_font.py /tmp/fe3d/package/assets
# It writes assets/hw-emoji.ttf and assets/hw-emoji.json (the code points, for the CSS unicode-range);
# npm run build copies them into fonts/ and index.html.
# Needs: Python 3, fontTools, Pillow. emoji_builder.py + png.py are Google's (Apache 2.0, LICENSE-apache-2.0.txt).
import glob, io, json, os, re, subprocess, sys, tempfile
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fe3d/package/assets"
SIZE = 96            # pixels per emoji in the font (shown at up to ~40 px, crisp on 2-3x screens)
UPEM, ADV = 1000, 1200  # the emoji is 1.2 em wide, like the system emoji fonts
ASC, DESC = 950, -250

# 1) every emoji in the app's code and texts (no chat data), kept only if the 3D set has it
EMO = re.compile(r"[©®‼⁉™ℹ↔-↪⌚-⏿Ⓜ▪-➿⤴⤵⬅-⭕〰〽㊗㊙\U0001F000-\U0001FAFF]️?")
files = [os.path.join(ROOT, "src", "App.jsx")] + sorted(glob.glob(os.path.join(ROOT, "src", "i18n", "*.js")))
found = set()
for f in files:
    for m in EMO.finditer(open(f, encoding="utf8").read()):
        found.add(m.group(0).replace("️", ""))
def asset(ch):
    hexes = "-".join("%x" % ord(c) for c in ch)
    for name in (hexes, hexes + "-fe0f"):
        p = os.path.join(SRC, name + ".webp")
        if os.path.exists(p):
            return p
    return None
chars = sorted(c for c in found if len(c) == 1 and asset(c))
missing = sorted(c for c in found if not asset(c))
print(f"{len(chars)} emoji from Fluent 3D; not in the set (stay the phone's): {' '.join(missing)}")

with tempfile.TemporaryDirectory() as tmp:
    # 2) PNG strikes: 96 px, reduced to 256 colours with transparency (a third of the size, no visible loss at this size)
    for ch in chars:
        im = Image.open(asset(ch)).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
        q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        q.save(os.path.join(tmp, "e%x.png" % ord(ch)), optimize=True)
    # 3) a template font: one empty glyph per emoji (the bitmaps are added by emoji_builder), U+FE0F as an invisible
    #    zero-width glyph so "❤️" (heart + variation selector) also takes the heart from this font
    order = [".notdef", "uniFE0F"] + ["e%x" % ord(c) for c in chars]
    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    cmap = {0xFE0F: "uniFE0F"}
    cmap.update({ord(c): "e%x" % ord(c) for c in chars})
    fb.setupCharacterMap(cmap)
    empty = TTGlyphPen(None).glyph()
    fb.setupGlyf({g: empty for g in order})
    fb.setupHorizontalMetrics({g: (0 if g == "uniFE0F" else ADV, 0) for g in order})
    fb.setupHorizontalHeader(ascent=ASC, descent=DESC)
    fb.setupNameTable({"familyName": "HW Emoji", "styleName": "Regular", "copyright": "Emoji: Fluent Emoji (c) Microsoft Corporation, MIT licence", "version": "Version 1.0"})
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, usWinAscent=ASC, usWinDescent=-DESC, fsType=0)
    fb.setupPost(keepGlyphNames=False)
    tpl = os.path.join(tmp, "tpl.ttf")
    fb.save(tpl)
    # 4) the colour bitmaps (CBDT/CBLC); -O keeps the empty outlines (web fonts must have them), -S small metrics
    out = os.path.join(ROOT, "assets", "hw-emoji.ttf")
    subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "emoji_builder.py"), "-O", "-S", tpl, out, os.path.join(tmp, "e")], check=True, stdout=subprocess.DEVNULL)
json.dump({"chars": "".join(chars), "size": SIZE}, open(os.path.join(ROOT, "assets", "hw-emoji.json"), "w", encoding="utf8"), ensure_ascii=False)
print(f"assets/hw-emoji.ttf: {os.path.getsize(out) // 1024} KB")
