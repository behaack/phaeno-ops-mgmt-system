#!/usr/bin/env bash
# Verify a caller-owned, protected custom pg_dump without connecting to the live DB.
# Usage: bash verify-database-backup.sh /absolute/private/database.dump EXPECTED_MIGRATION
# Call before encrypting/removing the plaintext dump. Capture EXPECTED_MIGRATION
# immediately before pg_dump. No credentials, live Docker volumes or network are used.
# Fixed activation budget: 512 MiB data tmpfs, 1024 MiB memory, no swap, one CPU.
# A larger backup must receive a separately reviewed resource budget, not an override.
set +x
set -Eeuo pipefail
umask 077

phase=arguments
container_name=""
container_id=""
owner_token=""

fail() {
    printf 'backup_restore_check=FAIL phase=%s\n' "${phase}" >&2
    exit 1
}

cleanup() {
    local status=$? inspected="" owned_id="" owned_label=""
    trap - EXIT INT TERM
    # Also recover a timed-out create whose response was lost. Never remove by
    # a broad name/filter: both the random ownership label and exact ID must match.
    if [[ -n "${container_name}" ]]; then
        if inspected="$(timeout --kill-after=5s 15s docker inspect \
            --format '{{.Id}} {{index .Config.Labels "phaeno.backup-restore-owner"}}' \
            "${container_name}" 2>/dev/null)"; then
            read -r owned_id owned_label <<< "${inspected}"
            if [[ "${owned_id}" =~ ^[0-9a-f]{64}$ && "${owned_label}" == "${owner_token}" \
                && ( -z "${container_id}" || "${owned_id}" == "${container_id}" ) ]]; then
                if ! timeout --kill-after=5s 30s docker rm --force --volumes "${owned_id}" >/dev/null 2>&1; then
                    printf 'backup_restore_cleanup=FAIL\n' >&2
                    status=1
                fi
            else
                printf 'backup_restore_cleanup=FAIL\n' >&2
                status=1
            fi
        elif [[ -n "${container_id}" ]]; then
            printf 'backup_restore_cleanup=FAIL\n' >&2
            status=1
        fi
    fi
    if [[ "${status}" == 0 ]]; then
        printf 'backup_restore_cleanup=PASS\nbackup_restore_check=PASS\n'
    else
        printf 'backup_restore_check=FAIL phase=%s\n' "${phase}" >&2
    fi
    exit "${status}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ "$#" == 2 ]] || fail
dump_path="$1"
expected_migration="$2"
[[ "${dump_path}" == /* && "${dump_path}" != *','* && "${dump_path}" != *$'\n'* \
    && "${dump_path}" != *$'\r'* && -f "${dump_path}" && ! -L "${dump_path}" && -r "${dump_path}" ]] || fail
[[ "${expected_migration}" =~ ^[0-9]{14}_[A-Za-z0-9_]+$ ]] || fail
for command in docker timeout stat awk head readlink cat sleep; do
    command -v "${command}" >/dev/null 2>&1 || fail
done
dump_path="$(readlink -f -- "${dump_path}")"
[[ "${dump_path}" != *','* && "${dump_path}" != *$'\n'* && "${dump_path}" != *$'\r'* ]] || fail
dump_mode="$(stat --format '%a' -- "${dump_path}")"
[[ "${dump_mode}" =~ ^[0-7]{3,4}$ ]] || fail
(( (8#${dump_mode} & 077) == 0 )) || fail
[[ "$(head -c 5 -- "${dump_path}")" == PGDMP ]] || fail
dump_user="$(stat --format '%u:%g' -- "${dump_path}")"
[[ "${dump_user}" =~ ^[0-9]+:[0-9]+$ ]] || fail

phase=resource_preflight
dump_bytes="$(stat --format '%s' -- "${dump_path}")"
[[ "${dump_bytes}" =~ ^[0-9]+$ ]] && (( dump_bytes > 0 && dump_bytes <= 512 * 1024 * 1024 )) || fail
[[ -r /proc/meminfo ]] || fail
available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
[[ "${available_kib}" =~ ^[0-9]+$ ]] && (( available_kib >= 1536 * 1024 )) || fail
# Do not pull an image or expand the approved resource/storage scope implicitly.
timeout --kill-after=5s 15s docker image inspect postgres:17 >/dev/null 2>&1 || fail
owner_token="$(cat /proc/sys/kernel/random/uuid)"
[[ "${owner_token}" =~ ^[0-9a-f-]{36}$ ]] || fail
container_name="phaeno-backup-verify-${owner_token}"

phase=create_isolated_restore
# Use a private nested PGDATA so the unprivileged image user can create its own
# 0700 directory on the tmpfs. Bypass the image entrypoint to avoid a temporary
# startup server racing the readiness probe. PostgreSQL never listens on TCP.
container_id="$(timeout --kill-after=5s 30s docker create \
    --name "${container_name}" \
    --label "phaeno.backup-restore-owner=${owner_token}" \
    --network none --read-only --user postgres --cap-drop ALL \
    --security-opt no-new-privileges --log-driver none \
    --memory 1024m --memory-swap 1024m --cpus 1 --pids-limit 128 \
    --ulimit core=0 --shm-size 16m \
    --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,noexec,size=512m,mode=1777 \
    --tmpfs /var/run/postgresql:rw,nosuid,nodev,noexec,size=16m,mode=1777 \
    --tmpfs /tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777 \
    --mount "type=bind,source=${dump_path},target=/backup.dump,readonly" \
    --env PGDATA=/var/lib/postgresql/data/restore \
    --entrypoint /bin/sh postgres:17 -ceu '
        initdb --pgdata="$PGDATA" --username=postgres --encoding=UTF8 --locale=C \
            --auth-local=trust --auth-host=reject >/dev/null 2>&1
        exec postgres -D "$PGDATA" -c listen_addresses= \
            -c unix_socket_directories=/var/run/postgresql \
            -c shared_buffers=32MB -c work_mem=4MB -c maintenance_work_mem=32MB \
            -c max_connections=10 -c max_wal_size=128MB \
            -c log_statement=none -c log_min_error_statement=panic
    ' 2>/dev/null)" || fail
[[ "${container_id}" =~ ^[0-9a-f]{64}$ ]] || fail
timeout --kill-after=5s 15s docker start "${container_id}" >/dev/null 2>&1 || fail

phase=startup
startup_deadline=$((SECONDS + 120))
ready=false
while (( SECONDS < startup_deadline )); do
    if timeout --kill-after=2s 5s docker exec "${container_id}" \
        pg_isready --host /var/run/postgresql --username postgres --dbname postgres >/dev/null 2>&1; then
        ready=true
        break
    fi
    sleep 1
done
[[ "${ready}" == true ]] || fail

phase=restore
# The client runs as the host dump's UID/GID so a 0600 file never needs relaxed
# permissions. The isolated server uses local trust; there is no host/remote path.
timeout --kill-after=5s 600s docker exec --user "${dump_user}" "${container_id}" \
    pg_restore --host /var/run/postgresql --username postgres --dbname postgres \
    --exit-on-error --single-transaction --clean --if-exists --no-owner --no-privileges \
    /backup.dump >/dev/null 2>&1 || fail

query() {
    timeout --kill-after=5s 30s docker exec "${container_id}" \
        psql --host /var/run/postgresql --username postgres --dbname postgres \
        --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 \
        --command "$1" 2>/dev/null
}

phase=schema_and_migrations
schema_count="$(query "SELECT count(*) FROM pg_namespace WHERE nspname IN ('public','commercial_ops','lab_ops','website');")" || fail
[[ "${schema_count}" == 4 ]] || fail
latest_migration="$(query 'SELECT "MigrationId" FROM public.__ef_migrations_history ORDER BY "MigrationId" DESC LIMIT 1;')" || fail
[[ "${latest_migration}" == "${expected_migration}" ]] || fail
printf 'backup_restore_schemas=4\nbackup_restore_migration=PASS\n'

tables=(
    public.__ef_migrations_history
    commercial_ops.users
    commercial_ops.organizations
    commercial_ops.crm_companies
    commercial_ops.trial_projects
    commercial_ops.lab_service_orders
    commercial_ops.invoices
    commercial_ops.payment_receipts
    commercial_ops.reconciliation_batches
    lab_ops.lab_work_orders
    commercial_ops.managed_files
    commercial_ops.managed_operational_files
    commercial_ops.result_artifacts
)
phase=compare_dump_counts
for qualified_table in "${tables[@]}"; do
    schema="${qualified_table%%.*}"
    table="${qualified_table#*.}"
    # COPY uses one escaped physical line per row, including rows with embedded
    # newlines. Require one complete COPY block, including for an empty table.
    # Rows flow only through this private container's pipe; they are never logged
    # or written to a host file. pipefail catches corrupt/incomplete dump streams.
    dump_count="$(timeout --kill-after=5s 60s docker exec --user "${dump_user}" "${container_id}" \
        bash -ceu 'set -o pipefail
            pg_restore --data-only --no-owner --no-privileges --schema "$1" --table "$2" --file - /backup.dump |
            awk '\''
                /^COPY / { if (seen || $0 !~ / FROM stdin;$/) exit 2; seen=1; copying=1; next }
                copying && $0 == "\\." { copying=0; complete=1; next }
                copying { rows++ }
                END { if (!seen || copying || !complete) exit 2; print rows+0 }
            '\''
        ' -- "${schema}" "${table}" 2>/dev/null)" || fail
    restored_count="$(query "SELECT count(*) FROM ${qualified_table};")" || fail
    [[ "${dump_count}" =~ ^[0-9]+$ && "${restored_count}" == "${dump_count}" ]] || fail
    printf 'backup_restore_rows.%s=%s\n' "${qualified_table}" "${restored_count}"
done
phase=file_reference_counts
for source in managed_files managed_operational_files invoices result_artifacts; do
    case "${source}" in
        invoices) key=pdf_storage_key ;;
        result_artifacts) key=object_storage_key ;;
        *) key=storage_key ;;
    esac
    references="$(query "SELECT count(*) FROM commercial_ops.${source} WHERE nullif(btrim(${key}), '') IS NOT NULL;")" || fail
    [[ "${references}" =~ ^[0-9]+$ ]] || fail
    printf 'backup_restore_file_refs.%s=%s\n' "${source}" "${references}"
done
phase=complete
