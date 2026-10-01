#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077

fail() { printf 'reconstruction=FAIL reason=%s\n' "$1" >&2; exit 1; }
[[ $# == 4 ]] || fail 'Expected DEPLOY_ROOT MODE SOURCE_REVISION OPERATION_ID.'
root="$1"; mode="$2"; revision="$3"; operation="$4"
[[ "$root" == /opt/phaeno.portal-green && $EUID == 0 ]] || fail 'Unexpected maintenance host/root.'
[[ "$mode" == preview || "$mode" == reset ]] || fail 'Invalid mode.'
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$operation" =~ ^github-actions-[0-9]+-[0-9]+$ ]] || fail 'Invalid operation identity.'
helper_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ "$helper_dir" == "$root/maintenance/reconstruction-$operation" ]] || fail 'Unexpected helper directory.'
sql_file="$helper_dir/reconstruct-portal-database.sql"
[[ -f "$sql_file" && ! -L "$sql_file" ]] || fail 'Missing reviewed SQL.'
for command in docker flock python3 curl; do command -v "$command" >/dev/null || fail 'Missing maintenance command.'; done
exec 9>"$root/runtime/deploy.lock"
flock --exclusive --wait 120 9 || fail 'Another production maintenance operation is active.'

# Inspect credentials privately; print no runtime settings, profiles or identity subjects.
python3 - <<'PY'
import json, subprocess
api = json.loads(subprocess.check_output(['docker','inspect','phaeno-portal-green-api']))[0]
db = json.loads(subprocess.check_output(['docker','inspect','phaeno-portal-green-db']))[0]
env = dict(item.split('=',1) for item in api['Config']['Env'])
connection = env.get('ConnectionStrings__DefaultConnection', '')
parts = {key.strip().lower(): value.strip() for key,value in
         (item.split('=',1) for item in connection.split(';') if '=' in item)}
db_env = dict(item.split('=',1) for item in db['Config']['Env'])
assert parts.get('database') == 'phaeno_portal_green', 'Unexpected active API database'
assert parts.get('host') in ('db','postgres','phaeno-portal-green-db'), 'Unexpected API database host'
assert db_env.get('POSTGRES_DB') == db_env.get('POSTGRES_USER') == 'phaeno_portal_green', 'Unexpected database identity'
assert api['State']['Health']['Status'] == db['State']['Health']['Status'] == 'healthy', 'Unhealthy Portal service'
assert any(m.get('Name') == 'phaeno-portal-green-postgres18-data' and m['Destination'] == '/var/lib/postgresql' for m in db['Mounts']), 'Unexpected database volume'
assert not any(db['NetworkSettings']['Ports'].values()), 'Database has published ports'
PY
api_id="$(docker inspect phaeno-portal-green-api --format '{{.Id}}')"
[[ "$(docker exec phaeno-portal-green-db psql -U phaeno_portal_green -d phaeno_portal_green -X -qAt -c "SELECT current_setting('server_version_num')::integer / 10000")" == 18 ]] || fail 'Expected PostgreSQL 18.'

restart_needed=false
restart_api() {
    docker start "$api_id" >/dev/null
    for attempt in $(seq 1 45); do
        [[ "$(docker inspect "$api_id" --format '{{.State.Health.Status}}')" == healthy ]] && return 0
        sleep 2
    done
    return 1
}
cleanup() {
    status=$?
    trap - EXIT
    if [[ "$restart_needed" == true ]]; then
        restart_api || { printf 'api_restart=FAIL\n' >&2; status=1; }
    fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
if [[ "$mode" == reset ]]; then
    restart_needed=true
    docker stop --time 30 "$api_id" >/dev/null
    [[ "$(docker inspect "$api_id" --format '{{.State.Running}}')" == false ]] || fail 'API did not stop.'
    [[ "$(docker exec phaeno-portal-green-db psql -U phaeno_portal_green -d postgres -X -qAt -c "SELECT count(*) FROM pg_stat_activity WHERE datname='phaeno_portal_green' AND backend_type='client backend'")" == 0 ]] || fail 'Another database client is still connected.'
fi
printf 'mode=%s\noperation_id=%s\nsource_revision=%s\n' "$mode" "$operation" "$revision"
docker exec -i phaeno-portal-green-db psql -U phaeno_portal_green -d phaeno_portal_green -X -qAt \
    -v ON_ERROR_STOP=1 -v mode="$mode" -v operation_id="$operation" -v source_revision="$revision" < "$sql_file"
if [[ "$restart_needed" == true ]]; then
    restart_api || fail 'API did not become healthy after reset.'
    restart_needed=false
fi
curl --fail --silent --show-error --max-time 20 --output /dev/null https://api.phaenobiotech.com/api/health
curl --fail --silent --show-error --max-time 20 --output /dev/null https://api.phaenobiotech.com/api/v1/web-ops/database-ping
printf 'api_health=PASS\ndatabase_ping=PASS\n'
