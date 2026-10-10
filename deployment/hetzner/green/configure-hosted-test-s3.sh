#!/usr/bin/env bash
# One-time empty-store cutover for the Owner-approved hosted TEST environment.
set +x
set -Eeuo pipefail
umask 077
root="${1:?}"; revision="${2:?}"; image="${3:?}"
[[ $# == 3 && "$root" == /opt/phaeno.portal-green && $EUID == 0 && "$revision" =~ ^[0-9a-f]{40}$ && "$image" =~ ^[a-z0-9][a-z0-9._-]{0,127}$ ]] || exit 1
scripts="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
runtime="$root/runtime"; env_file="$runtime/portal.env"
bucket=phaeno-portal-hosted-test-767828764389-us-east-2
IFS= read -r access; IFS= read -r secret
if IFS= read -r _; then exit 1; fi
[[ "$access" =~ ^AWS_ACCESS_KEY_ID=[A-Z0-9]{16,128}$ && "$secret" =~ ^AWS_SECRET_ACCESS_KEY=[A-Za-z0-9/+=]{40,256}$ ]] || exit 1
[[ -f "$env_file" && ! -L "$env_file" ]] || exit 1
grep -qx 'FileStorage__Provider=Local' "$env_file" || { printf 'Testing S3 cutover requires the current Local provider.\n' >&2; exit 1; }
exec 9>"$runtime/deploy.lock"; flock --exclusive 9
db_name="$(docker exec phaeno-portal-green-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -q -Atc "select current_database()"')"
[[ "$db_name" == phaeno_portal_green ]] || exit 1
rollback="$runtime/testing-s3-rollback-$revision.env"
[[ ! -e "$rollback" ]] || { printf 'A prior testing cutover receipt requires operator review.\n' >&2; exit 1; }
cp -- "$env_file" "$rollback"; chmod 600 "$rollback"
timer_enabled=false; timer_active=false
if systemctl is-enabled --quiet phaeno-portal-backup.timer; then timer_enabled=true; fi
if systemctl is-active --quiet phaeno-portal-backup.timer; then timer_active=true; fi
complete=false; stopped=false
cleanup() {
    status=$?; trap - EXIT
    if [[ "$complete" != true ]]; then
        cp -- "$rollback" "$env_file"; chmod 600 "$env_file"
        if [[ "$timer_enabled" == true ]]; then systemctl enable phaeno-portal-backup.timer >/dev/null; fi
        if [[ "$timer_active" == true ]]; then systemctl start phaeno-portal-backup.timer; fi
        if [[ "$stopped" == true ]]; then
            docker compose --env-file "$runtime/compose.env" --file "$scripts/docker-compose.yml" up --detach --force-recreate --wait --wait-timeout 120 api >/dev/null || status=1
        fi
        printf 'Testing cutover failed; prior settings restored.\n' >&2
    fi
    exit "$status"
}
trap cleanup EXIT
systemctl disable --now phaeno-portal-backup.timer >/dev/null
systemctl stop phaeno-portal-backup.service
docker stop --time 30 phaeno-portal-green-api >/dev/null; stopped=true
references="$(docker exec -i phaeno-portal-green-db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -q -At -v ON_ERROR_STOP=1' < "$scripts/backup/file-references.sql")"
[[ -z "$references" ]] || { printf 'Referenced files exist; a reviewed conversion is required before S3 cutover.\n' >&2; exit 1; }
# The stopped container cannot execute; inspect the preserved named volume in isolation.
volume="$(docker inspect phaeno-portal-green-api --format '{{range .Mounts}}{{if eq .Destination "/var/lib/phaeno-portal/files"}}{{.Name}}{{end}}{{end}}')"
[[ "$volume" == phaeno-portal-green_portal_green_managed_files ]] || exit 1
bytes="$(docker run --rm --network none --read-only --volume "$volume:/files:ro" --entrypoint /bin/sh "$(docker inspect phaeno-portal-green-api --format '{{.Config.Image}}')" -c 'find /files -type f | wc -l')"
[[ "$bytes" == 0 ]] || { printf 'Retained Local bytes exist; refusing empty-store cutover.\n' >&2; exit 1; }
printf 'FileStorage__Provider=S3\nFileStorage__S3__BucketName=%s\nFileStorage__S3__Region=us-east-2\nFileStorage__S3__KeyPrefix=\n%s\n%s\n' "$bucket" "$access" "$secret" | "$scripts/install-s3-runtime-config.sh" "$root"
sed -i '/^AWS_SESSION_TOKEN=/d;/^FileStorage__S3__CredentialProfile=/d;/^FileStorage__S3__CredentialProfileFile=/d;/^FileStorage__S3__ServiceUrl=/d;/^FileStorage__S3__ForcePathStyle=/d;/^PortalTesting__S3BackupsDeferred=/d' "$env_file"
printf 'AWS_SESSION_TOKEN=\nFileStorage__S3__ServiceUrl=\nFileStorage__S3__ForcePathStyle=false\nPortalTesting__S3BackupsDeferred=true\n' >> "$env_file"
chmod 600 "$env_file"
export FILE_STORAGE_DEPLOY_LOCK_HELD=true
"$scripts/deploy-release.sh" "$revision" "$image" false false ''
provider="$(docker exec phaeno-portal-green-api printenv FileStorage__Provider)"
[[ "$provider" == S3 ]] || exit 1
complete=true
printf 'testing_s3_cutover=PASS\nbackup_status=DEFERRED_TESTING_ONLY\nlocal_volume_preserved=true\n'
