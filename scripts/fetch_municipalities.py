"""Build municipalities.geojson from MRNF official 1/100 000 administrative boundaries."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import geopandas as gpd
from shapely.geometry import mapping
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "municipalities.geojson"
LIST_OUT = ROOT / "public" / "data" / "municipalities-list.json"

CACHE_DIR = Path(__file__).resolve().parent / "_bdat100k"
ZIP_PATH = Path(__file__).resolve().parent / "_bdat100k.zip"
SHP_PATH = CACHE_DIR / "Bdat" / "SHP" / "munic_s.shp"

BDAT_100K_ZIP = (
    "https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/"
    "Theme/Regional/SDA_100k/SHP/BDAT(adm)_SHP.zip"
)


def ensure_shapefile() -> Path:
    if SHP_PATH.is_file():
        return SHP_PATH
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if not ZIP_PATH.is_file():
        print(f"Downloading 1/100 000 boundaries (~83 Mo)…")
        urlretrieve(BDAT_100K_ZIP, ZIP_PATH)
    print("Extracting shapefile…")
    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        zf.extractall(CACHE_DIR)
    if not SHP_PATH.is_file():
        raise FileNotFoundError(f"Expected shapefile at {SHP_PATH}")
    return SHP_PATH


def vertex_count(geom) -> int:
    if geom is None or geom.is_empty:
        return 0
    if geom.geom_type == "Polygon":
        return len(geom.exterior.coords)
    if geom.geom_type == "MultiPolygon":
        return sum(len(p.exterior.coords) for p in geom.geoms)
    return 0


def clean_geometry(geom):
    if geom is None or geom.is_empty:
        return None
    geom = make_valid(geom)
    if geom.is_empty:
        return None
    # Only simplify extremely heavy polygons (northern territories); keep shared 100k topology otherwise.
    if vertex_count(geom) > 8_000:
        geom = geom.simplify(0.001, preserve_topology=True)
    return geom


def marker_point(geom):
    """Point d'affichage à l'intérieur de la plus grande composante."""
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda part: part.area)
    return geom.representative_point()


def main() -> None:
    shp = ensure_shapefile()
    print(f"Reading {shp}…")
    gdf = gpd.read_file(shp).to_crs(4326)

    # Placeholder / incomplete features create overlapping chaos in the dataset.
    name = gdf["MUS_NM_MUN"].astype(str)
    des = gdf["MUS_CO_DES"].astype(str)
    keep = (
        ~name.str.contains("Toponyme", case=False, na=False)
        & (des != "G")
        & (des != "NO")
        & ~name.str.contains("TNO aquatique", case=False, na=False)
    )
    gdf = gdf.loc[keep].copy()

    print(f"Merging polygon parts per municipality ({len(gdf)} rows)…")
    dissolved = gdf.dissolve(
        by="MUS_CO_GEO",
        aggfunc={
            "MUS_NM_MUN": "first",
            "MUS_CO_DES": "first",
            "MUS_CO_MRC": "first",
            "MUS_NM_MRC": "first",
        },
    )

    features: list[dict] = []
    for code, row in dissolved.iterrows():
        geom = clean_geometry(row.geometry)
        if geom is None:
            continue
        center = marker_point(geom)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "code": str(code),
                    "nom": row["MUS_NM_MUN"],
                    "designation": str(row["MUS_CO_DES"]),
                    "mrcCode": str(row["MUS_CO_MRC"]),
                    "mrcNom": str(row["MUS_NM_MRC"]),
                    "centerLat": round(center.y, 6),
                    "centerLng": round(center.x, 6),
                },
                "geometry": mapping(geom),
            }
        )

    features.sort(key=lambda f: f["properties"]["nom"])

    import merge_municipality_duplicates as mmd

    features = mmd.apply_to_collection(features)

    geojson = {"type": "FeatureCollection", "features": features}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {len(features)} municipalities to {OUT} ({OUT.stat().st_size // 1024 // 1024} Mo)")

    list_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {k: v for k, v in f["properties"].items() if k != "centerLat" and k != "centerLng"},
                "geometry": None,
            }
            for f in features
        ],
    }
    LIST_OUT.write_text(
        json.dumps(list_fc, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
