"""Build major-routes.geojson (autoroutes + routes with official numbers) from OpenStreetMap."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import LineString, mapping

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "major-routes.geojson"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

QUERY = """
[out:json][timeout:300];
area["ISO3166-2"="CA-QC"][admin_level=4]->.qc;
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link)$"](area.qc);
);
out geom;
"""

ROUTE_REF_PART = re.compile(r"^(?:A-?\d{1,3}|\d{1,3})$", re.I)


def is_autoroute(tags: dict) -> bool:
    hw = tags.get("highway", "")
    return hw in ("motorway", "motorway_link") or tags.get("motorway") == "yes"


def valid_route_ref(ref: str) -> bool:
    if not ref or not ref.strip():
        return False
    cleaned = ref.replace(" ", "").replace("–", "-")
    for part in cleaned.split(";"):
        if not ROUTE_REF_PART.match(part):
            return False
    return True


def main() -> None:
    print("Querying Overpass (Québec, ~1–3 min)…")
    url = OVERPASS_URL + "?" + urllib.parse.urlencode({"data": QUERY})
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "quebec-municipalities-quiz/1.0 (local fetch)"},
    )
    with urllib.request.urlopen(req, timeout=320) as resp:
        data = json.load(resp)

    features: list[dict] = []
    for el in data.get("elements", []):
        if el.get("type") != "way" or "geometry" not in el:
            continue
        tags = el.get("tags") or {}
        highway = tags.get("highway", "")
        ref = (tags.get("ref") or "").strip()
        autoroute = is_autoroute(tags)
        if autoroute:
            kind = "autoroute"
        elif valid_route_ref(ref):
            kind = "numbered"
        else:
            continue

        coords = [(pt["lon"], pt["lat"]) for pt in el["geometry"]]
        if len(coords) < 2:
            continue
        line = LineString(coords)
        if line.length < 1e-6:
            continue
        simplified = line.simplify(0.0015, preserve_topology=True)
        if simplified.is_empty:
            continue

        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": kind,
                    "ref": ref[:32] if ref else "",
                    "name": (tags.get("name") or "")[:80],
                },
                "geometry": mapping(simplified),
            }
        )

    features.sort(key=lambda f: (f["properties"]["kind"], f["properties"]["ref"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    mb = OUT.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(features)} segments to {OUT} ({mb:.2f} Mo)")


if __name__ == "__main__":
    main()
