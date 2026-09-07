#!/usr/bin/env bash
# TEMPORARY: retire after the verified one-row repair and post-repair inventory.
set -Eeuo pipefail
umask 077
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || fail "Expected backup public key path, source revision, and run ID."
[[ $ALLOW_VERIFIED_COMPANY_LINK_RESTORE == YES ]] || fail "Repair is not enabled."
key_path="$1"
source_revision="$2"
run_id="$3"
[[ $key_path =~ ^/tmp/phaeno-portal-backup-[0-9]+-[0-9]+\.pub$ ]] || fail "Unexpected backup key path."
[[ $source_revision =~ ^[0-9a-f]{40}$ ]] || fail "Invalid source revision."
[[ $run_id =~ ^[0-9]+$ ]] || fail "Invalid run ID."
script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
[[ $script_dir == /opt/phaeno.portal-green/releases/*/deployment/hetzner/green ]] || fail "Unexpected release directory."
sql_path="$script_dir/restore-verified-company-link.sql"
[[ -s $sql_path && -s $key_path ]] || fail "Required verified SQL or backup key is missing."
for command in docker openssl sha256sum shred flock; do
    command -v "$command" >/dev/null || fail "Required command is unavailable."
done
[[ "$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' phaeno-portal-green-db)" == phaeno-portal-green ]] || fail "Unexpected database container."
exec 9>/opt/phaeno.portal-green/runtime/deploy.lock
flock --exclusive 9

# Follow the established deployment backup encryption format; do not migrate.
backup_root=/var/backups/phaeno-portal-deploy
install -d -m 700 "$backup_root"
openssl pkey -pubin -in "$key_path" -noout
backup_base="$backup_root/pre-company-link-$(date -u +%Y%m%dT%H%M%SZ)-$run_id"
plain_dump="$backup_base.dump"
passphrase="$backup_base.pass"
cleanup() {
    [[ ! -f $plain_dump ]] || shred --remove "$plain_dump"
    [[ ! -f $passphrase ]] || shred --remove "$passphrase"
}
trap cleanup EXIT
docker exec phaeno-portal-green-db sh -c \
    'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format custom --no-owner --no-privileges' > "$plain_dump"
test -s "$plain_dump"
docker run --rm --user 0:0 --volume "$plain_dump:/backup/database.dump:ro" \
    postgres:17 pg_restore --list /backup/database.dump > /dev/null
openssl rand -base64 48 > "$passphrase"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 -pass "file:$passphrase" \
    -in "$plain_dump" -out "$backup_base.dump.enc"
openssl pkeyutl -encrypt -pubin -inkey "$key_path" -pkeyopt rsa_padding_mode:oaep \
    -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 \
    -in "$passphrase" -out "$backup_base.key.enc"
(
    cd "$backup_root"
    sha256sum "$(basename "$backup_base.dump.enc")" "$(basename "$backup_base.key.enc")" > "$backup_base.encrypted.sha256"
    sha256sum --check --strict "$backup_base.encrypted.sha256"
)
chmod 600 "$backup_base.dump.enc" "$backup_base.key.enc" "$backup_base.encrypted.sha256"
cleanup
printf 'encrypted_backup=%s\n' "$backup_base"
printf 'repair_source_revision=%s\n' "$source_revision"
docker exec -i phaeno-portal-green-db sh -c \
    'exec psql -X -q -A -t -v ON_ERROR_STOP=1 -v apply_repair=restore-confirmed-original-link -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$sql_path"
