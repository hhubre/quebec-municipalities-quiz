"""Generate mode-card SVG dots: one centered dot per demo zone (viewBox 0 0 100 100)."""

from __future__ import annotations

import re
from pathlib import Path

from shapely.geometry import Point, Polygon

ROOT = Path(__file__).resolve().parents[1]
PATHS_FILE = ROOT / "public" / "assets" / "mode-demo-paths.inc.svg"
# Exclure l'exclave SVG minuscule (point visuellement « perdu » en bas à gauche).
MIN_ZONE_AREA = 50.0


def parse_subpath_polygons(d: str) -> list[Polygon]:
    chunks = re.split(r"\s+(?=M)", d.strip())
    polys: list[Polygon] = []
    for chunk in chunks:
        nums = [float(x) for x in re.findall(r"[-+]?(?:\d*\.\d+|\d+)", chunk)]
        if len(nums) < 6:
            continue
        pairs = list(zip(nums[0::2], nums[1::2]))
        if len(pairs) >= 3:
            polys.append(Polygon(pairs))
    return polys


def zone_label_point(poly: Polygon) -> tuple[float, float]:
    pt = poly.representative_point()
    if not poly.contains(pt):
        pt = poly.centroid
    return round(pt.x, 2), round(pt.y, 2)


def load_zones() -> tuple[list[Polygon], list[tuple[float, float]], tuple[float, float]]:
    text = PATHS_FILE.read_text(encoding="utf-8")
    zone_polys: list[Polygon] = []
    focus_poly: Polygon | None = None

    for line in text.splitlines():
        if 'class="mode-demo-boundary' not in line or ' d="' not in line:
            continue
        d = line.split(' d="', 1)[1].split('"', 1)[0]
        is_focus = "mode-demo-boundary--focus" in line
        for poly in parse_subpath_polygons(d):
            if is_focus:
                focus_poly = poly
            else:
                zone_polys.append(poly)

    if focus_poly is None:
        raise RuntimeError("Focus boundary path missing")

    zone_points = [zone_label_point(p) for p in zone_polys]
    focus_point = zone_label_point(focus_poly)
    return zone_polys, zone_points, focus_point


def main_zone_indices(zone_polys: list[Polygon]) -> list[int]:
    return [
        i
        for i, poly in enumerate(zone_polys)
        if poly.area >= MIN_ZONE_AREA
    ]


def shared_zone_dots(zone_polys: list[Polygon], zones: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Même ordre stable (index de zone) pour toutes les vignettes."""
    return [zones[i] for i in sorted(main_zone_indices(zone_polys))]


def circle(cx: float, cy: float, *, target: bool = False) -> str:
    cls = "mode-demo-muni-dot"
    if target:
        cls += " mode-demo-muni-dot--target"
    r = "1.5" if target else "1.35"
    return f'<circle class="{cls}" cx="{cx}" cy="{cy}" r="{r}"/>'


def main() -> None:
    zone_polys, zones, focus = load_zones()
    shared = shared_zone_dots(zone_polys, zones)

    print("<!-- SHARED (locate + ten + typemax): one dot per main zone, same order -->")
    for cx, cy in shared:
        print(circle(cx, cy))
    print(circle(focus[0], focus[1], target=True))

    print("\n<!-- TYPEMAX adds found marker on focus (same cx/cy as target) -->")
    print(
        f'<circle class="mode-demo-muni-dot mode-demo-muni-dot--found" cx="{focus[0]}" cy="{focus[1]}" r="1.35"/>'
    )


if __name__ == "__main__":
    main()
