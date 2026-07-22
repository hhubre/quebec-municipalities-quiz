import json
from collections import defaultdict
from math import atan2, cos, radians, sin, sqrt

path = "public/data/municipalities.geojson"


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371
    p1, p2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(p1) * cos(p2) * sin(dlng / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


def main():
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    by_nom = defaultdict(list)
    for feat in data["features"]:
        p = feat.get("properties") or {}
        nom = (p.get("nom") or "").strip()
        if not nom:
            continue
        by_nom[nom].append(
            {
                "code": p.get("code"),
                "des": p.get("designation"),
                "mrc": p.get("mrcNom"),
                "lat": p.get("centerLat"),
                "lng": p.get("centerLng"),
            }
        )

    dups = {k: v for k, v in by_nom.items() if len(v) > 1}
    print(f"Duplicate names: {len(dups)}")

    close = []
    mid = []
    far = []

    for nom, items in sorted(dups.items()):
        if any(i["lat"] is None or i["lng"] is None for i in items):
            far.append((nom, items, None))
            continue
        max_dist = 0.0
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                d = haversine_km(
                    items[i]["lat"],
                    items[i]["lng"],
                    items[j]["lat"],
                    items[j]["lng"],
                )
                max_dist = max(max_dist, d)
        bucket = (nom, items, max_dist)
        if max_dist < 3:
            close.append(bucket)
        elif max_dist < 15:
            mid.append(bucket)
        else:
            far.append(bucket)

    print("\n--- MERGE LIKELY (<3 km) ---")
    for nom, items, d in close:
        print(f"{nom} | max_dist={d:.2f}km")
        for i in items:
            print(
                f"  {i['code']} {i['des']} | {i['mrc']} | "
                f"({i['lat']:.5f}, {i['lng']:.5f})"
            )

    print("\n--- REVIEW (3-15 km) ---")
    for nom, items, d in mid:
        print(f"{nom} | max_dist={d:.2f}km")
        for i in items:
            print(f"  {i['code']} {i['des']} | {i['mrc']}")

    print("\n--- DISTINCT (>=15 km) ---")
    for nom, items, d in far:
        dist_s = f"{d:.2f}km" if d is not None else "n/a"
        print(f"{nom} | max_dist={dist_s}")
        for i in items:
            print(f"  {i['code']} {i['des']} | {i['mrc']}")


if __name__ == "__main__":
    main()
