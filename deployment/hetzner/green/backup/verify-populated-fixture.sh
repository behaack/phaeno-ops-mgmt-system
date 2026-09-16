#!/usr/bin/env bash
# Nonempty recovery proof even when the actual production file store is empty.
# Runs only inside the network-isolated restore helper, on its private /tmp tmpfs.
set +x
set -Eeuo pipefail
umask 077
work="$(mktemp -d /tmp/phaeno-populated-backup.XXXXXX)"
[[ "$work" == /tmp/phaeno-populated-backup.* && -d "$work" && ! -L "$work" ]]
cleanup() {
    local status=$?
    trap - EXIT
    for tree in source restored; do
        for area in order-files provisioning-files; do
            [[ ! -f "$work/$tree/$area/acceptance.txt" ]] || rm -- "$work/$tree/$area/acceptance.txt"
            [[ ! -d "$work/$tree/$area" ]] || rmdir -- "$work/$tree/$area"
        done
        [[ ! -d "$work/$tree" ]] || rmdir -- "$work/$tree"
    done
    for leaf in files.tar files.tsv references.tsv; do [[ ! -f "$work/$leaf" ]] || rm -- "$work/$leaf"; done
    rmdir -- "$work"
    exit "$status"
}
trap cleanup EXIT
mkdir "$work/source" "$work/restored" "$work/source/order-files" "$work/source/provisioning-files"
printf 'Synthetic private order-file restoration proof\n' > "$work/source/order-files/acceptance.txt"
printf 'Synthetic private provisioning-file restoration proof\n' > "$work/source/provisioning-files/acceptance.txt"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bash "$script_dir/file-tree.sh" manifest "$work/source" > "$work/files.tsv"
awk '{print $0 "\trequired"}' "$work/files.tsv" > "$work/references.tsv"
tar --create --file "$work/files.tar" --directory "$work/source" .
bash "$script_dir/file-tree.sh" verify "$work/files.tar" "$work/files.tsv" "$work/references.tsv" "$work/restored"
for area in order-files provisioning-files; do cmp -- "$work/source/$area/acceptance.txt" "$work/restored/$area/acceptance.txt"; done
printf 'backup_populated_synthetic_restore=PASS\n'
