"""Fusionner des paires MRNF « collées » et renommer certains homonymes."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "municipalities.geojson"
LIST_OUT = ROOT / "public" / "data" / "municipalities-list.json"

# keep = fiche conservée ; merge = fiches absorbées puis retirées
MERGE_GROUPS = [
    {"keep": "46035", "merge": ["46040"]},  # Bedford V + CT
    {"keep": "68010", "merge": ["68015"]},  # Hemmingford VL + CT
    {"keep": "50035", "merge": ["50030"]},  # Saint-Célestin M + VL
    {"keep": "49075", "merge": ["49080"]},  # Notre-Dame-du-Bon-Conseil VL + P
    {"keep": "31015", "merge": ["31020"]},  # Disraeli V + P
    {"keep": "42055", "merge": ["42060"]},  # Valcourt V + CT
    {"keep": "45043", "merge": ["45055"]},  # Hatley M + CT
    {"keep": "89040", "merge": ["89045"]},  # Senneterre V + P
    {"keep": "99040", "merge": ["99808"]},  # Nemaska VC + TC
    {"keep": "99820", "merge": ["99818"]},  # Oujé-Bougoumou VC + TC
    {"keep": "99065", "merge": ["97806"]},  # Kawawachikamach VK + TK
]

# code -> libellé affiché au quiz (homonymes distincts)
def marker_point(geom):
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda part: part.area)
    return geom.representative_point()


DISPLAY_NAME_OVERRIDES: dict[str, str] = {
    "45025": "Stanstead [municipalité de canton]",
    "92005": "Saint-Augustin",
    "98012": "Saint-Augustin",
}


def union_geometry(features_by_code: dict[str, dict], keep: str, merge_codes: list[str]) -> None:
    primary = features_by_code[keep]
    parts = []
    for code in [keep, *merge_codes]:
        feat = features_by_code.get(code)
        if not feat or not feat.get("geometry"):
            raise KeyError(f"Missing geometry for code {code}")
        geom = shape(feat["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        parts.append(geom)
    merged = unary_union(parts)
    if merged.is_empty:
        raise ValueError(f"Empty union for keep={keep}")
    merged = make_valid(merged)
    primary["geometry"] = mapping(merged)
    center = marker_point(merged)
    props = primary["properties"]
    props["centerLat"] = round(center.y, 6)
    props["centerLng"] = round(center.x, 6)
    props["mergedFrom"] = merge_codes


def discover_vc_tc_merge_groups(
    features_by_code: dict[str, dict],
) -> list[dict[str, list[str] | str]]:
    """Une paire VC + TC par nom identique → fusionner la TC dans la VC (réserves cri)."""
    by_nom: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for code, feat in features_by_code.items():
        props = feat["properties"]
        by_nom[props["nom"]].append((code, str(props.get("designation") or "")))

    groups: list[dict[str, list[str] | str]] = []
    for nom, items in by_nom.items():
        vcs = [c for c, des in items if des == "VC"]
        tcs = [c for c, des in items if des == "TC"]
        if len(vcs) == 1 and len(tcs) == 1:
            groups.append({"keep": vcs[0], "merge": [tcs[0]]})
        elif vcs and tcs:
            print(f"Warning: paire VC/TC ambiguë pour {nom!r}, fusion ignorée")
    return groups


def discover_vn_ti_merge_groups(
    features_by_code: dict[str, dict],
) -> list[dict[str, list[str] | str]]:
    """Une paire VN + TI par nom identique → fusionner la TI dans la VN."""
    by_nom: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for code, feat in features_by_code.items():
        props = feat["properties"]
        by_nom[props["nom"]].append((code, str(props.get("designation") or "")))

    groups: list[dict[str, list[str] | str]] = []
    for nom, items in by_nom.items():
        vns = [c for c, des in items if des == "VN"]
        tis = [c for c, des in items if des == "TI"]
        if len(vns) == 1 and len(tis) == 1:
            groups.append({"keep": vns[0], "merge": [tis[0]]})
        elif vns and tis:
            print(f"Warning: paire VN/TI ambiguë pour {nom!r}, fusion ignorée")
    return groups


def build_merge_plan(features_by_code: dict[str, dict]) -> list[dict]:
    seen: set[tuple[str, tuple[str, ...]]] = set()
    plan: list[dict] = []
    for group in [
        *MERGE_GROUPS,
        *discover_vc_tc_merge_groups(features_by_code),
        *discover_vn_ti_merge_groups(features_by_code),
    ]:
        keep = str(group["keep"])
        merge = [str(c) for c in group["merge"]]
        key = (keep, tuple(sorted(merge)))
        if key in seen:
            continue
        seen.add(key)
        plan.append({"keep": keep, "merge": merge})
    return plan


def merged_codes_from_plan(
    plan: list[dict], features_by_code: dict[str, dict]
) -> set[str]:
    """Codes retirés si la fusion est encore applicable."""
    removed: set[str] = set()
    for group in plan:
        keep = group["keep"]
        merge_codes = group["merge"]
        if keep not in features_by_code:
            continue
        if any(c not in features_by_code for c in merge_codes):
            continue
        removed.update(merge_codes)
    return removed


def apply_display_name_overrides(features_by_code: dict[str, dict]) -> None:
    for code, nom in DISPLAY_NAME_OVERRIDES.items():
        feat = features_by_code.get(code)
        if feat:
            feat["properties"]["nom"] = nom
        else:
            print(f"Warning: override code {code} not found")


def apply_to_collection(features: list[dict]) -> list[dict]:
    features_by_code = {str(f["properties"]["code"]): f for f in features}
    apply_display_name_overrides(features_by_code)

    remove_codes: set[str] = set()
    plan = build_merge_plan(features_by_code)
    for group in plan:
        keep = group["keep"]
        merge_codes = group["merge"]
        if keep not in features_by_code:
            print(f"Skip merge into {keep} (keep code missing)")
            continue
        if any(c not in features_by_code for c in merge_codes):
            print(f"Skip merge {merge_codes} into {keep} (already applied)")
            continue
        if all(f.get("geometry") for f in (features_by_code[keep],)):
            union_geometry(features_by_code, keep, merge_codes)
        remove_codes.update(merge_codes)
        print(
            f"Merged {merge_codes} into {keep} "
            f"({features_by_code[keep]['properties'].get('nom')})"
        )

    return [f for f in features if str(f["properties"]["code"]) not in remove_codes]


def main() -> None:
    geojson = json.loads(OUT.read_text(encoding="utf-8"))
    before = len(geojson["features"])
    geojson["features"] = apply_to_collection(geojson["features"])
    after = len(geojson["features"])
    OUT.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {OUT} ({before} -> {after} features)")

    if LIST_OUT.is_file():
        listing = json.loads(LIST_OUT.read_text(encoding="utf-8"))
        by = {str(f["properties"]["code"]): f for f in listing["features"]}
        apply_display_name_overrides(by)
        plan = build_merge_plan(by)
        remove_codes = merged_codes_from_plan(plan, by)
        listing["features"] = [
            f
            for f in listing["features"]
            if str(f["properties"]["code"]) not in remove_codes
        ]
        LIST_OUT.write_text(
            json.dumps(listing, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"Wrote {LIST_OUT}")


if __name__ == "__main__":
    main()
