"""Build favicon assets from favicon-source.png (white outlines on black)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "favicon-source.png"
OUT_PNG = ROOT / "favicon.png"
OUT_APPLE = ROOT / "apple-touch-icon.png"
OUT_SVG = ROOT / "favicon.svg"

BLUE = (0, 51, 153, 255)
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def pixel_is_stroke(rgba: tuple[int, ...]) -> bool:
    r, g, b, a = rgba
    if max(r, g, b) > 165:
        return True
    return a > 48


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()

    stroke_l = Image.new("L", (w, h), 0)
    lpx = stroke_l.load()
    for y in range(h):
        for x in range(w):
            if pixel_is_stroke(px[x, y]):
                lpx[x, y] = 255

    # Close small gaps in outlines before flood-fill
    stroke_l = stroke_l.filter(ImageFilter.MaxFilter(3))
    stroke = [[lpx[x, y] > 128 for x in range(w)] for y in range(h)]

    outside = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []
    for x in range(w):
        for y in (0, h - 1):
            if not stroke[y][x] and not outside[y][x]:
                outside[y][x] = True
                stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not stroke[y][x] and not outside[y][x]:
                outside[y][x] = True
                stack.append((x, y))

    while stack:
        x, y = stack.pop()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not stroke[ny][nx] and not outside[ny][nx]:
                outside[ny][nx] = True
                stack.append((nx, ny))

    out = Image.new("RGBA", (w, h), TRANSPARENT)
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if stroke[y][x]:
                opx[x, y] = BLUE
            elif not outside[y][x]:
                opx[x, y] = WHITE

    out.save(OUT_PNG, format="PNG")
    resized = out.resize((180, 180), Image.Resampling.LANCZOS)
    resized.save(OUT_APPLE, format="PNG")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">
  <image width="{w}" height="{h}" href="favicon.png"/>
</svg>
"""
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote {OUT_PNG}, {OUT_APPLE}, {OUT_SVG}")


if __name__ == "__main__":
    main()
