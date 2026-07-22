"""Add mrcCode/mrcNom to existing municipalities.geojson from cached shapefile."""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "municipalities.geojson"
LIST_OUT = ROOT / "public" / "data" / "municipalities-list.json"
SHP = Path(__file__).resolve().parent / "_bdat100k" / "Bdat" / "SHP" / "munic_s.shp"


def main() -> None:
    if not SHP.is_file():
        raise SystemExit(f"Missing shapefile: {SHP}")

    gdf = gpd.read_file(SHP)
    dissolved = gdf.dissolve(
        by="MUS_CO_GEO",
        aggfunc={"MUS_CO_MRC": "first", "MUS_NM_MRC": "first"},
    )
    by_code = {
        str(code): {
            "mrcCode": str(row["MUS_CO_MRC"]),
            "mrcNom": str(row["MUS_NM_MRC"]),
        }
        for code, row in dissolved.iterrows()
    }

    geojson = json.loads(OUT.read_text(encoding="utf-8"))
    for feature in geojson["features"]:
        code = str(feature["properties"]["code"])
        mrc = by_code.get(code)
        if mrc:
            feature["properties"].update(mrc)
    OUT.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Patched {len(geojson['features'])} features in {OUT}")

    if LIST_OUT.is_file():
        list_fc = json.loads(LIST_OUT.read_text(encoding="utf-8"))
        for feature in list_fc["features"]:
            code = str(feature["properties"]["code"])
            mrc = by_code.get(code)
            if mrc:
                feature["properties"].update(mrc)
        LIST_OUT.write_text(
            json.dumps(list_fc, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"Patched list {LIST_OUT}")


if __name__ == "__main__":
    main()
