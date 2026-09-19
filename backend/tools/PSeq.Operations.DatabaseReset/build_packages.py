"""Build reviewed reset manifests from protected snapshots; never connects to a database.

Usage: python build_packages.py ARTIFACT_DIRECTORY SELECTION_JSON
The selection explicitly chooses rows by immutable ID, never by a test-name heuristic.
"""
import copy
import hashlib
import json
import sys
from pathlib import Path


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def build(root, selection):
    snapshots = {name: load(root / f"{name}-snapshot.json") for name in ("local", "production", "baseline")}
    sources = {name: {t["key"]: t for t in doc["tables"]} for name, doc in snapshots.items()}
    base = sources["baseline"]
    owners = {}
    for source in ("local", "production"):
        matches = [r for r in sources[source]["commercial_ops.users"]["rows"] if r["normalized_email"].upper() == selection["localUserEmail"].upper()]
        if len(matches) != 1:
            raise ValueError(f"Expected exactly one verified reset owner in {source}")
        owners[source] = matches[0]["id"]

    for environment in ("local", "production"):
        selected = {key: [] for key in base}
        dispositions = {key: "discard" for key in base}
        # Fixed model reference rows are always kept; identity/operational rows are never inferred.
        for key, table in base.items():
            if table["rows"]:
                selected[key] = copy.deepcopy(table["rows"])
                dispositions[key] = "system"

        if environment == "production":
            for key in selection["productionPreserve"]:
                if key not in base:
                    raise ValueError(f"Unknown preservation table: {key}")
                selected[key] = copy.deepcopy(sources["production"].get(key, {"rows": []})["rows"])
                dispositions[key] = "preserve"
        else:
            local = sources["local"]
            person = owners["local"]
            selected["commercial_ops.users"] = [copy.deepcopy(r) for r in local["commercial_ops.users"]["rows"] if r["id"] == person]
            phaeno = {r["id"] for r in local["commercial_ops.organizations"]["rows"] if r["kind"] == "Phaeno"}
            memberships = [r for r in local["commercial_ops.organization_memberships"]["rows"] if r["user_id"] == person and r["organization_id"] in phaeno]
            if len(memberships) != 1 or not memberships[0]["is_organization_admin"]:
                raise ValueError("The retained local account must have its existing, verified Phaeno admin membership")
            orgs = {r["organization_id"] for r in memberships}
            membership_ids = {r["id"] for r in memberships}
            selected["commercial_ops.organizations"] = [copy.deepcopy(r) for r in local["commercial_ops.organizations"]["rows"] if r["id"] in orgs]
            selected["commercial_ops.organization_memberships"] = copy.deepcopy(memberships)
            selected["commercial_ops.organization_departments"] = [copy.deepcopy(r) for r in local["commercial_ops.organization_departments"]["rows"] if r["organization_id"] in orgs]
            selected["commercial_ops.organization_department_memberships"] = [copy.deepcopy(r) for r in local["commercial_ops.organization_department_memberships"]["rows"] if r["organization_membership_id"] in membership_ids]
            for key in ("commercial_ops.business_role_assignments", "lab_ops.lab_role_assignments", "commercial_ops.trial_approval_authorities"):
                selected[key] = [copy.deepcopy(r) for r in local.get(key, {"rows": []})["rows"] if r.get("user_id") == person]
            for key in selected:
                if selected[key] and dispositions[key] == "discard":
                    dispositions[key] = "preserve"

        transformations = []
        known_users = {r["id"] for r in selected["commercial_ops.users"]}
        for key, rule in selection["sharedConfiguration"].items():
            if key not in base or rule["source"] not in sources:
                raise ValueError(f"Invalid shared configuration selection: {key}")
            rows = sources[rule["source"]][key]["rows"]
            if "ids" in rule:
                ids = set(rule["ids"])
                rows = [r for r in rows if r["id"] in ids]
                if {r["id"] for r in rows} != ids:
                    raise ValueError(f"Selected rows missing: {key}")
            elif rule.get("all") is not True:
                raise ValueError(f"Explicit all/ids selection required: {key}")
            rows = copy.deepcopy(rows)
            for row in rows:
                for column, value in list(row.items()):
                    if not (column.endswith("_by_user_id") or column == "owner_user_id") or value is None:
                        continue
                    if rule["source"] in owners and value == owners[rule["source"]]:
                        if value != owners[environment]:
                            row[column] = owners[environment]
                            transformations.append({"table": key, "id": row["id"], "column": column, "reason": "Same verified owner, environment-specific internal identity"})
                    elif value not in known_users:
                        # Optional technical audit stamps may be unknown; approvals and authorship may not be invented.
                        if column not in ("created_by_user_id", "updated_by_user_id"):
                            raise ValueError(f"Unresolved configuration actor: {key}.{column}")
                        row[column] = None
                        transformations.append({"table": key, "id": row["id"], "column": column, "reason": "Source actor retained in protected snapshot, not imported as a local user"})
                for column, replacement in rule.get("set", {}).items():
                    if column not in row:
                        raise ValueError(f"Unknown reviewed override: {key}.{column}")
                    row[column] = replacement
                    transformations.append({"table": key, "id": row["id"], "column": column, "reason": rule.get("reason", "Reviewed configuration override")})
            selected[key] = rows
            dispositions[key] = "seed"

        for key, rows in selected.items():
            columns = {c["name"] for c in base[key]["columns"]}
            for row in rows:
                unknown = set(row) - columns
                if unknown:
                    raise ValueError(f"Would discard source columns: {key}: {sorted(unknown)}")
                missing = columns - set(row)
                if missing:
                    raise ValueError(f"Missing target values require an explicit mapping: {key}: {sorted(missing)}")
            rows.sort(key=lambda r: r["id"])

        # Check FK dependencies before any SQL, including source self-references.
        import re
        for fk in snapshots["baseline"]["foreignKeys"]:
            match = re.match(r'FOREIGN KEY \(([^)]+)\) REFERENCES [^(]+\(([^)]+)\)', fk["definition"])
            if not match:
                raise ValueError(f"Unsupported constraint syntax: {fk['name']}")
            columns = [c.strip().strip('"') for c in match[1].split(",")]
            targets = [c.strip().strip('"') for c in match[2].split(",")]
            target_keys = {tuple(r[c] for c in targets) for r in selected[fk["target"]]}
            for row in selected[fk["table"]]:
                values = tuple(row[c] for c in columns)
                if all(v is not None for v in values) and values not in target_keys:
                    raise ValueError(f"Preservation dependency missing: {fk['name']}")

        package = {
            "format": 1, "kind": "reviewed-reset-package", "sourceDatabase": selection.get("originalDatabases", {}).get(environment, snapshots[environment]["sourceDatabase"]),
            "targetDatabase": selection["targets"][environment], "baselineMigration": snapshots["baseline"]["migrations"][0],
            "activatedDatabase": selection.get("activatedDatabases", {}).get(environment, selection["targets"][environment]),
            "sourceSnapshotSha256": hashlib.sha256((root / f"{environment}-snapshot.json").read_bytes()).hexdigest(),
            "selectionSha256": hashlib.sha256(json.dumps(selection, sort_keys=True).encode()).hexdigest(),
            "dispositions": dispositions, "transformations": transformations,
            "expectedModelSeeds": {key: t["rows"] for key, t in base.items() if t["rows"]},
            "tables": [{"key": key, "columns": table["columns"], "rows": selected[key]} for key, table in base.items()],
        }
        output = root / f"{environment}-package.json"
        output.write_text(json.dumps(package, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
        report = {key: {"disposition": dispositions[key], "retained": len(rows), "source": len(sources[environment].get(key, {"rows": []})["rows"])} for key, rows in selected.items()}
        (root / f"{environment}-preservation-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"{environment}: {sum(len(rows) for rows in selected.values())} rows, {len(selected['commercial_ops.users'])} users; package_sha256={hashlib.sha256(output.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    build(Path(sys.argv[1]), load(sys.argv[2]))
