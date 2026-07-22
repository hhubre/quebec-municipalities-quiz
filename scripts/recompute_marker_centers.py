"""Recalcule centerLat/centerLng (plus grande composante + point intérieur)."""

from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import shape

from merge_municipality_duplicates import marker_point

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "municipalities.geojson"


def main() -> None:
    geojson = json.loads(OUT.read_text(encoding="utf-8"))
    for feat in geojson["features"]:
        if not feat.get("geometry"):
            continue
        pt = marker_point(shape(feat["geometry"]))
        props = feat["properties"]
        props["centerLat"] = round(pt.y, 6)
        props["centerLng"] = round(pt.x, 6)
    OUT.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Updated marker centers for {len(geojson['features'])} features -> {OUT}")


if __name__ == "__main__":
    main()
