"""Export the scoped DPS working change without staging, committing or changing either repository."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

BASE_COMMIT = "c68e584f29a0e8faa2a9a6537075d356de1929fc"
BASE_TREE = "e2f00ad3902da19e0d8dbe33ba5c3694a70dc03e"
root = Path(sys.argv[1]).resolve()
destination = Path(__file__).resolve().parent


def git(*args, codes=(0,)):
    result = subprocess.run(["git", "-C", str(root), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode not in codes:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


if git("rev-parse", "HEAD^{tree}").decode().strip() != BASE_TREE:
    raise RuntimeError("Expected the retained merged DPS base tree with uncommitted engineering changes.")
if json.loads((root/"apps/pseq_server/deploy/catalog.simulation-only.json").read_text(encoding="utf-8"))["scientific_profiles"] != []:
    raise RuntimeError("The shipped catalog must keep scientific execution held.")
patch = git("diff", "--binary", "HEAD", "--", "apps/pseq_server")
new_files = git("ls-files", "--others", "--exclude-standard", "--", "apps/pseq_server").decode().splitlines()
for path in new_files:
    patch += git("diff", "--no-index", "--binary", "--", os.devnull, path, codes=(0, 1))
patch = patch.replace(b"\r\n", b"\n")
target = destination / "real-assembly-engineering.patch"
target.write_bytes(patch)
git("apply", "--check", "--reverse", str(target))
files = sorted(set(git("diff", "--name-only", "HEAD", "--", "apps/pseq_server").decode().splitlines() + new_files))
receipt = {"base_commit": BASE_COMMIT, "base_tree": BASE_TREE, "patch_sha256": hashlib.sha256(patch).hexdigest(),
           "scientific_recipe_enabled": False, "hosted_activated": False,
           "files": [{"path": path, "sha256": hashlib.sha256((root/path).read_bytes()).hexdigest() if (root/path).exists() else None} for path in files]}
(destination/"source-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"files": len(files), "patch_sha256": receipt["patch_sha256"], "reverse_apply_check": "passed"}))
