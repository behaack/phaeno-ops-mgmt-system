#!/usr/bin/env bash
set -Eeuo pipefail
readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly TARGET="${DEPLOY_ROOT}/runtime/portal.env"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fail() { printf '%s\n' "$*" >&2; exit 1; }
IFS= read -r storage_selection
IFS= read -r scanner_selection
if IFS= read -r _; then fail 'Unexpected file-services preflight input.'; fi
[[ "${storage_selection}" == Preserve || "${storage_selection}" == Local || "${storage_selection}" == Disabled ]] || fail 'Invalid storage selection.'
[[ "${scanner_selection}" == Preserve || "${scanner_selection}" == ClamAv || "${scanner_selection}" == Disabled ]] || fail 'Invalid scanner selection.'
[[ -f "${TARGET}" && ! -L "${TARGET}" && -r "${TARGET}" ]] || fail 'Protected Portal runtime configuration is unavailable.'
one_setting() {
    local count
    count="$(grep -c "^$1=" "${TARGET}" || true)"
    [[ "${count}" -le 1 ]] || fail 'Duplicate file-service settings require review.'
    sed -n "s/^$1=//p" "${TARGET}"
}
provider="$(one_setting FileStorage__Provider)"
scanner_provider="$(one_setting FileScanning__Provider)"
local_root="$(one_setting FileStorage__LocalRootPath)"
scanner_host="$(one_setting FileScanning__Host)"
case "${provider}" in Disabled|Local|S3) ;; *) fail 'An explicit supported current storage provider is required.' ;; esac
case "${scanner_provider}" in ''|Disabled|ClamAv) ;; *) fail 'Current scanner provider requires review.' ;; esac
printf 'storage_provider=%s\nscanner_provider=%s\n' "${provider}" "${scanner_provider:-Disabled}"
if [[ "${local_root}" == /var/lib/phaeno-portal/files ]]; then printf 'local_root=managed_volume\n'; elif [[ -z "${local_root}" ]]; then printf 'local_root=unconfigured\n'; else printf 'local_root=other_configured_root\n'; fi
docker_root="$(docker info --format '{{.DockerRootDir}}')"
disk_kib="$(df -Pk "${docker_root}" | awk 'NR==2 {print $4}')"
available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
[[ "${disk_kib}" =~ ^[0-9]+$ && "${available_kib}" =~ ^[0-9]+$ ]] || fail 'Capacity measurements are unavailable.'
printf 'docker_disk_free_mib=%s\nhost_available_memory_mib=%s\n' "$((disk_kib / 1024))" "$((available_kib / 1024))"
docker exec phaeno-portal-green-api id -u | sed 's/^/api_process_uid=/'
references="$(docker exec -i phaeno-portal-green-db /bin/sh -c 'exec psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -X -q -At -v ON_ERROR_STOP=1' <<'SQL'
BEGIN READ ONLY;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SELECT 'managed_files_refs=' || count(*) FROM commercial_ops.managed_files WHERE nullif(btrim(storage_key), '') IS NOT NULL;
SELECT 'operational_files_refs=' || count(*) FROM commercial_ops.managed_operational_files WHERE nullif(btrim(storage_key), '') IS NOT NULL;
SELECT 'invoice_pdf_refs=' || count(*) FROM commercial_ops.invoices WHERE nullif(btrim(pdf_storage_key), '') IS NOT NULL;
SELECT 'result_artifact_refs=' || count(*) FROM commercial_ops.result_artifacts WHERE nullif(btrim(object_storage_key), '') IS NOT NULL;
COMMIT;
SQL
)"
[[ "$(printf '%s\n' "${references}" | grep -Ec '^(managed_files_refs|operational_files_refs|invoice_pdf_refs|result_artifact_refs)=[0-9]+$')" == 4 ]] || fail 'Metadata reference inventory was incomplete.'
printf '%s\n' "${references}"
reference_total="$(printf '%s\n' "${references}" | awk -F= '{n += $2} END {print n}')"
byte_inventory="$(docker exec -i phaeno-portal-green-api /bin/sh -s -- /app/App_Data legacy < "${SCRIPT_DIR}/count-file-areas.sh")"
# The chosen volume may already exist without being mounted in the current image.
# Inspect it read-only rather than inferring emptiness from the current API path.
volumes="$(docker volume ls --format '{{.Name}}')"
readonly MANAGED_VOLUME=phaeno-portal-green_portal_green_managed_files
if printf '%s\n' "${volumes}" | grep -qx "${MANAGED_VOLUME}"; then
    api_image="$(docker inspect phaeno-portal-green-api --format '{{.Image}}')"
    [[ "${api_image}" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'Current API image identity is unavailable.'
    managed_inventory="$(docker run --rm --interactive --network none --read-only --entrypoint /bin/sh \
        --mount "type=volume,source=${MANAGED_VOLUME},target=/inspection,readonly" \
        "${api_image}" -s -- /inspection managed < "${SCRIPT_DIR}/count-file-areas.sh")"
else
    managed_inventory=$'managed_files=0\nmanaged_links=0'
fi
byte_inventory+=$'\n'"${managed_inventory}"
printf '%s\n' "${byte_inventory}"
[[ "$(printf '%s\n' "${byte_inventory}" | grep -Ec '^(legacy|managed)_(files|links)=[0-9]+$')" == 4 ]] || fail 'Managed-byte inventory was incomplete.'
object_total="$(printf '%s\n' "${byte_inventory}" | awk -F= '{n += $2} END {print n}')"
if [[ "${storage_selection}" == Local ]]; then
    [[ "${provider}" != S3 ]] || fail 'S3-to-Local requires explicit inventory and migration.'
    [[ -z "${local_root}" || "${local_root}" == /var/lib/phaeno-portal/files ]] || fail 'A different Local root requires explicit inventory and migration.'
    if [[ "${provider}" != Local || "${local_root}" != /var/lib/phaeno-portal/files ]]; then
        [[ "${reference_total}" == 0 && "${object_total}" == 0 ]] || fail 'Initial Local activation found metadata or bytes requiring explicit review/migration.'
    fi
fi
if [[ "${scanner_selection}" == ClamAv || ( "${scanner_selection}" == Preserve && "${scanner_provider}" == ClamAv && "${scanner_host}" == scanner ) ]]; then
    running="$(docker inspect phaeno-portal-green-scanner --format '{{.State.Running}}' 2>/dev/null || true)"
    if [[ "${running}" == true ]]; then minimum_kib=1048576; else minimum_kib=5242880; fi
    [[ "${available_kib}" -ge "${minimum_kib}" ]] || fail 'Insufficient scanner memory headroom (4 GiB plus 1 GiB reserve for first activation).'
    [[ "${disk_kib}" -ge 3145728 ]] || fail 'At least 3 GiB of free Docker disk space is required for scanner activation.'
    printf 'scanner_capacity=passed\n'
fi
printf 'file_services_preflight=passed\n'
