#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Temporary hosted-test containment, never a model migration or an auth setting.
# Run under the deployment lock. Release only after the paired API/UI acceptance.
action="${1:-}"
container="${PORTAL_FENCE_DATABASE_CONTAINER:-phaeno-portal-green-db}"
[[ "$action" == engage || "$action" == verify || "$action" == release ]] || exit 2
[[ "$container" == phaeno-portal-green-db || "$container" =~ ^phaeno-sample-tracking-[a-z0-9-]+-db$ ]] || exit 2
if [[ "$action" != verify && "$container" == phaeno-portal-green-db ]]; then
    [[ "${FILE_STORAGE_DEPLOY_LOCK_HELD:-false}" == true ]] || { echo 'The deployment lock must be held.' >&2; exit 1; }
    [[ "$(docker inspect phaeno-portal-green-api --format '{{.State.Running}}')" == false ]] || { echo 'Stop the Portal API before changing the write fence.' >&2; exit 1; }
fi
sql() {
    docker exec -i "$container" sh -ceu 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -At -v ON_ERROR_STOP=1'
}
if [[ "$action" == engage ]]; then
    [[ "$(printf 'SHOW default_transaction_read_only;\n' | sql)" == off ]] || { echo 'Unexpected existing read-only setting; preserve it for operator review.' >&2; exit 1; }
    # Refuse to overwrite any explicit pre-existing database/role configuration.
    explicit="$(printf "SELECT count(*) FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) c WHERE (s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())) AND c LIKE 'default_transaction_read_only=%%';\n" | sql)"
    [[ "$explicit" == 0 ]] || { echo 'An explicit prior write setting requires operator review.' >&2; exit 1; }
    printf "SELECT format('ALTER DATABASE %%I SET default_transaction_read_only = on',current_database()) \134gexec\n" | sql
elif [[ "$action" == release ]]; then
    [[ "$(printf 'SHOW default_transaction_read_only;\n' | sql)" == on ]] || { echo 'Expected the established read-only fence.' >&2; exit 1; }
    printf "SET default_transaction_read_only=off; SELECT format('ALTER DATABASE %%I RESET default_transaction_read_only',current_database()) \134gexec\n" | sql
fi
expected=on
[[ "$action" == release ]] && expected=off
[[ "$(printf 'SHOW default_transaction_read_only;\n' | sql)" == "$expected" ]]
printf 'portal_database_write_fence=%s\n' "$expected"
