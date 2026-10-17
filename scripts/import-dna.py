"""Import the sanitized selection package; never alter official results. Usage: python3 scripts/import-dna.py /private/path/package.zip"""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
package = Path(sys.argv[1])
manifest = {"packageSha256": hashlib.sha256(package.read_bytes()).hexdigest(), "officialProjection": {}, "byYear": {}, "usernameCasingMappings": [], "unknownPositions": []}
def hash_value(value):
    # Match JSON number semantics used by JavaScript: 0.0 and 0 are the same score.
    if isinstance(value, float) and value.is_integer(): return int(value)
    if isinstance(value, list): return [hash_value(v) for v in value]
    if isinstance(value, dict): return {k: hash_value(v) for k, v in value.items()}
    return value
canonical_json = lambda value: json.dumps(hash_value(value), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
aliases = {}
with zipfile.ZipFile(package) as archive:
    for year in range(2019, 2026):
        path = root / f"data/seasons/{year}.json"
        season = json.loads(path.read_text())
        official = {**season, "lineups": []}
        manifest["officialProjection"][str(year)] = hashlib.sha256(canonical_json(official).encode()).hexdigest()
        members = {name.casefold(): name for name in season["members"]}
        assert len(members) == len(season["members"]), "Ambiguous username casing"
        scores = {(m["week"], r["manager"]): r["score"] for m in season["matchups"] for r in (m["home"], m["away"])}
        imported = json.loads(archive.read(f"lineups_{year}.json"))
        unresolved = json.loads(archive.read(f"unresolved_flex_{year}.json"))
        lineups = []
        for source in imported:
            manager = members[source["manager"].casefold()]
            if manager != source["manager"]:
                aliases[(source["manager"], manager)] = aliases.get((source["manager"], manager), 0) + 1
            assert scores[(source["week"], manager)] == source["official_score"], "Official score mismatch"
            assert len(source["selections"]) == 9
            # Preserve every actual source label and position, including null. Never generate IDs or enrichment.
            selections = [{"slot": p["slot"], "name": p["name"], "position": p["position"]} for p in source["selections"]]
            lineups.append({"week": source["week"], "manager": manager, "selections": selections,
                "provenance": {"sourceId": f"season_{year}", "sheet": source["source"]["sheet"], "cells": [f'F{source["source"]["row"]}']}})
        unknown = sorted((l["week"], l["manager"], p["name"]) for l in lineups for p in l["selections"] if p["position"] is None)
        expected = sorted((u["week"], members[u["manager"].casefold()], u["name"]) for u in unresolved)
        assert unknown == expected, "Unresolved FLEX records do not match the supplied selections"
        assert len({(l["week"], l["manager"]) for l in lineups}) == len(lineups)
        if season["lineups"]:
            assert season["lineups"] == lineups, "Refusing to overwrite unrelated lineup work"
        season["lineups"] = lineups
        assert {**season, "lineups": []} == official
        path.write_text(json.dumps(season, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n")
        manifest["byYear"][str(year)] = {"lineups": len(lineups), "officialScores": len(scores), "unknownFlex": len(unknown), "selections": len(lineups) * 9, "lineupsSha256": hashlib.sha256(canonical_json(lineups).encode()).hexdigest()}
        for item in unresolved:
            manifest["unknownPositions"].append({"year": year, "week": item["week"], "manager": members[item["manager"].casefold()], "name": item["name"], "observedPositions": item["possible_positions"]})
    manifest["usernameCasingMappings"] = [{"source": a, "canonical": b, "lineups": n} for (a,b),n in sorted(aliases.items())]
    (root / "docs/DNA_PACKAGE_README.md").write_bytes(archive.read("README.md"))
(root / "tests/fixtures/dna-import-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest["byYear"], indent=2))
