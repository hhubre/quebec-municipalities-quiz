"""Download terrestrial (land-only) municipality areas from ISQ Code géographique (d001)."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "municipality-land-area-by-code.json"

D001_SIMPLIF_URL = (
    "https://www.donneesquebec.ca/recherche/dataset/"
    "4479a1d9-9eb6-4080-9b4b-f4ab4e3170b4/resource/"
    "e3dbf79f-7812-4ac5-95bf-1f1e39fe2940/download/d001_simplif.xml"
)


def _local_tag(tag: str) -> str:
    return tag.split("}")[-1]


def _child_text(node: ET.Element, name: str) -> str:
    for child in node:
        if _local_tag(child.tag) == name:
            return (child.text or "").strip()
    return ""


def parse_land_areas_km2(xml_bytes: bytes) -> dict[str, float]:
    root = ET.fromstring(xml_bytes)
    areas: dict[str, float] = {}
    for node in root.iter():
        if _local_tag(node.tag) != "Municipalite":
            continue
        code = _child_text(node, "Code_municipalite")
        land = _child_text(node, "Superficie_terre_km2")
        if not code or not land:
            continue
        areas[code] = round(float(land.replace(",", ".")), 3)
    return areas


def main() -> None:
    cache = Path(__file__).resolve().parent / "_d001_simplif.xml"
    if not cache.is_file():
        print(f"Downloading {D001_SIMPLIF_URL}…")
        urlretrieve(D001_SIMPLIF_URL, cache)
    areas = parse_land_areas_km2(cache.read_bytes())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(areas, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(f"Wrote {len(areas)} land areas to {OUT}")


if __name__ == "__main__":
    main()
