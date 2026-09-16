#!/usr/bin/env bash
# Decrypt a trusted encrypted snapshot into a NEW private recovery directory.
# This does not connect to PostgreSQL, Docker, or any live file store.
set +x
set -Eeuo pipefail
umask 077
phase=arguments
fail() { printf 'backup_envelope_restore=FAIL phase=%s\n' "$phase" >&2; exit 1; }
[[ $# == 3 ]] || fail
source_dir="$1"; private_key="$2"; destination="$3"
for path in "$source_dir" "$private_key" "$destination"; do
    [[ "$path" == /* && "$path" != *$'\n'* && "$path" != *$'\r'* && ! -L "$path" ]] || fail
done
[[ -d "$source_dir" && -f "$private_key" && ! -e "$destination" ]] || fail
parent="$(dirname -- "$destination")"
[[ -d "$parent" && ! -L "$parent" ]] || fail
for path in "$parent" "$private_key"; do
    mode="$(stat -c %a -- "$path")"; (( (8#$mode & 077) == 0 )) || fail
done
phase=encrypted_manifest
[[ -f "$source_dir/encrypted.sha256" && ! -L "$source_dir/encrypted.sha256" ]] || fail
[[ "$(wc -l < "$source_dir/encrypted.sha256" | tr -d '[:space:]')" == 3 ]] || fail
for leaf in snapshot.tar.enc snapshot.key.enc receipt.env; do
    [[ -f "$source_dir/$leaf" && ! -L "$source_dir/$leaf" ]] || fail
    [[ "$(grep -Ec "^[0-9a-f]{64}  ${leaf//./\.}$" "$source_dir/encrypted.sha256")" == 1 ]] || fail
done
(cd "$source_dir" && sha256sum --check --strict --status encrypted.sha256) || fail
(( $(stat -c %s "$source_dir/snapshot.tar.enc") <= 6442450944 )) || fail
mkdir -m 700 -- "$destination"
complete=false
cleanup() {
    local status=$?
    trap - EXIT INT TERM
    for leaf in snapshot.pass snapshot.tar; do
        if [[ -f "$destination/$leaf" && ! -L "$destination/$leaf" ]]; then shred --remove -- "$destination/$leaf" >/dev/null 2>&1 || status=1; fi
    done
    if [[ "$complete" != true ]]; then
        for leaf in database.dump files.tar files.tsv references.tsv snapshot.env payload.sha256; do
            if [[ -f "$destination/$leaf" && ! -L "$destination/$leaf" ]]; then shred --remove -- "$destination/$leaf" >/dev/null 2>&1 || status=1; fi
        done
        rmdir -- "$destination" 2>/dev/null || status=1
    fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
phase=unwrap_key
openssl pkeyutl -decrypt -inkey "$private_key" -pkeyopt rsa_padding_mode:oaep \
    -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 \
    -in "$source_dir/snapshot.key.enc" -out "$destination/snapshot.pass" 2>/dev/null || fail
phase=decrypt
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -pass "file:$destination/snapshot.pass" \
    -in "$source_dir/snapshot.tar.enc" -out "$destination/snapshot.tar" 2>/dev/null || fail
phase=payload_safety
listing="$(tar --absolute-names --list --file "$destination/snapshot.tar" 2>/dev/null | sort)" || fail
[[ "$listing" == $'database.dump\nfiles.tar\nfiles.tsv\npayload.sha256\nreferences.tsv\nsnapshot.env' ]] || fail
tar --absolute-names --list --verbose --numeric-owner --file "$destination/snapshot.tar" 2>/dev/null |
    awk 'substr($1,1,1)!="-" || $3 !~ /^[0-9]+$/ {bad=1} {total += $3}
         END {if (bad || total>6442450944) exit 1}' || fail
tar --extract --file "$destination/snapshot.tar" --directory "$destination" \
    --no-same-owner --no-same-permissions 2>/dev/null || fail
phase=payload_checksums
[[ "$(wc -l < "$destination/payload.sha256" | tr -d '[:space:]')" == 5 ]] || fail
for leaf in database.dump files.tar files.tsv references.tsv snapshot.env; do
    [[ "$(grep -Ec "^[0-9a-f]{64}  ${leaf//./\.}$" "$destination/payload.sha256")" == 1 ]] || fail
done
(cd "$destination" && sha256sum --check --strict --status payload.sha256) || fail
complete=true
printf 'backup_envelope_restore=PASS\nlive_database_changed=false\nlive_files_changed=false\n'
