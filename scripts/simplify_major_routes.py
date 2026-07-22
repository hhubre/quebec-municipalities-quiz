"""Produce a lighter major-routes-lite.geojson for smooth map pan/zoom."""

from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "data" / "major-routes.geojson"
OUT = ROOT / "public" / "data" / "major-routes-lite.geojson"


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    out_features = []
    for f in data["features"]:
        geom = shape(f["geometry"])
        if geom.is_empty:
            continue
        simple = geom.simplify(0.028, preserve_topology=True)
        if simple.is_empty:
            continue
        out_features.append(
            {
                "type": "Feature",
                "properties": f["properties"],
                "geometry": mapping(simple),
            }
        )
    OUT.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": out_features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(out_features)} features, {OUT.stat().st_size // 1024} KiB")


if __name__ == "__main__":
    main()
