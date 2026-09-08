#!/usr/bin/env bash
# Acknowledge a successful encrypted GitHub artifact upload and rotate only
# exported, verified snapshots older than 35 days. Never delete the latest copy.
set +x
set -Eeuo pipefail
umask 077
fail() { printf 'backup_export_receipt=FAIL\n' >&2; exit 1; }
[[ $# == 6 && $EUID == 0 ]] || fail
root="$1"; backup_id="$2"; artifact_id="$3"; artifact_digest="$4"; manifest_digest="$5"; run_id="$6"
[[ "$root" == /opt/phaeno.portal-green && "$backup_id" =~ ^snapshot-[0-9]{8}T[0-9]{6}Z-[0-9a-f-]{36}$ \
    && "$artifact_id" =~ ^[0-9]+$ && "$run_id" =~ ^[0-9]+$ \
    && "$artifact_digest" =~ ^[0-9a-f]{64}$ && "$manifest_digest" =~ ^[0-9a-f]{64}$ ]] || fail
backup_root=/var/backups/phaeno-portal-coordinated
target="$backup_root/$backup_id"
[[ -d "$target" && ! -L "$backup_root" && ! -L "$target" ]] || fail
exec 9>"$root/runtime/deploy.lock"
flock --exclusive --wait 600 9 || fail
[[ -f "$target/encrypted.sha256" && ! -L "$target/encrypted.sha256" \
    && "$(sha256sum "$target/encrypted.sha256" | cut -d ' ' -f 1)" == "$manifest_digest" ]] || fail
(cd "$target" && sha256sum --check --strict --status encrypted.sha256) || fail
grep -qx 'restore_verified=true' "$target/receipt.env" || fail
grep -qx 'cleanup_verified=true' "$target/receipt.env" || fail
[[ ! -L "$target/export.env" ]] || fail
if [[ -e "$target/export.env" ]]; then
    grep -qxF "snapshot_manifest_sha256=$manifest_digest" "$target/export.env" || fail
else
    (set -o noclobber
        printf 'format=phaeno-backup-export-v1\nsnapshot_manifest_sha256=%s\nartifact_id=%s\nartifact_digest=%s\nrun_id=%s\ncollected_epoch=%s\n' \
            "$manifest_digest" "$artifact_id" "$artifact_digest" "$run_id" "$(date -u +%s)" > "$target/export.env") || fail
fi
now="$(date -u +%s)"; pruned=0
newest="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'snapshot-*' -printf '%f\n' | sort -r | sed -n '1p')"
while IFS= read -r candidate; do
    [[ "$candidate" != "$newest" && "$candidate" != "$backup_id" \
        && "$candidate" =~ ^snapshot-[0-9]{8}T[0-9]{6}Z-[0-9a-f-]{36}$ ]] || continue
    directory="$backup_root/$candidate"
    [[ -d "$directory" && ! -L "$directory" ]] || continue
    safe=true
    for leaf in snapshot.tar.enc snapshot.key.enc encrypted.sha256 receipt.env export.env; do
        [[ -f "$directory/$leaf" && ! -L "$directory/$leaf" && "$(stat -c %h "$directory/$leaf")" == 1 ]] || safe=false
    done
    [[ "$safe" == true && "$(find "$directory" -mindepth 1 -maxdepth 1 -printf '. ' | wc -w)" == 5 ]] || continue
    grep -qx 'format=phaeno-coordinated-v1' "$directory/receipt.env" || continue
    grep -qx 'restore_verified=true' "$directory/receipt.env" || continue
    grep -qx 'cleanup_verified=true' "$directory/receipt.env" || continue
    grep -qx 'format=phaeno-backup-export-v1' "$directory/export.env" || continue
    digest="$(sha256sum "$directory/encrypted.sha256" | cut -d ' ' -f 1)"
    grep -qxF "snapshot_manifest_sha256=$digest" "$directory/export.env" || continue
    created="$(sed -n 's/^created_epoch=//p' "$directory/receipt.env")"
    [[ "$created" =~ ^[0-9]+$ ]] || continue
    (( now - created > 35 * 86400 )) || continue
    (cd "$directory" && sha256sum --check --strict --status encrypted.sha256) || continue
    # Exactly five owned encrypted/metadata files in a validated direct child.
    for leaf in snapshot.tar.enc snapshot.key.enc encrypted.sha256 receipt.env export.env; do rm -- "$directory/$leaf"; done
    rmdir -- "$directory"
    pruned=$((pruned + 1))
done < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'snapshot-*' -printf '%f\n')
printf 'backup_export_receipt=PASS\nbackup_expired_exported_snapshots_removed=%s\n' "$pruned"
