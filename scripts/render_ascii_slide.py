#!/usr/bin/env python3
"""
Render an ASCII-art diagram to a PNG slide using PIL.
Used by examples/dev-intro to self-draw simple diagrams (no copyright risk).
"""
import sys
from PIL import Image, ImageDraw, ImageFont

def render(text: str, out_path: str, *, font_size: int = 18, padding: int = 32):
    lines = text.splitlines() or [""]
    # Try to load a monospace font; fall back to default
    for candidate in [
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Courier.dfont",
        "/Library/Fonts/Menlo.ttc",
    ]:
        try:
            font = ImageFont.truetype(candidate, font_size)
            break
        except OSError:
            continue
    else:
        font = ImageFont.load_default()

    # Measure
    img = Image.new("RGB", (10, 10), "white")
    draw = ImageDraw.Draw(img)
    widths = [draw.textlength(line, font=font) for line in lines]
    max_w = max(widths) if widths else 0
    ascent, descent = font.getmetrics()
    line_h = ascent + descent
    img_w = int(max_w + padding * 2)
    img_h = int(line_h * len(lines) + padding * 2)

    img = Image.new("RGB", (img_w, img_h), "#fdfdfb")
    draw = ImageDraw.Draw(img)
    y = padding
    for line, _w in zip(lines, widths):
        draw.text((padding, y), line, fill="#1f2937", font=font)
        y += line_h
    img.save(out_path)
    print(f"wrote {out_path} ({img_w}x{img_h})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: render_ascii_slide.py <input.txt> <output.png>", file=sys.stderr)
        sys.exit(2)
    text = open(sys.argv[1], encoding="utf-8").read()
    render(text, sys.argv[2])
