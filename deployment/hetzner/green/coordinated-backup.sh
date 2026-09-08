#!/usr/bin/env bash
# Coherent Local-file/database recovery point. Root-only operator maintenance.
# No live restore is performed. Plaintext exists only in this owned 0700 staging directory.
set +x
set -Eeuo pipefail
umask 077
export LC_ALL=C
phase=arguments
fail() { printf 'coordinated_backup=FAIL phase=%s\n' "$phase" >&2; exit 1; }
[[ $# == 4 ]] || fail
mode="$1"; deploy_root="$2"; public_key="$3"; helper_revision="$4"
[[ "$mode" == backup || "$mode" == scheduled || "$mode" == latest || "$mode" == status ]] || fail
[[ "$deploy_root" == /opt/phaeno.portal-green && "$helper_revision" =~ ^[0-9a-f]{40}$ && $EUID == 0 ]] || fail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
runtime="$deploy_root/runtime"
backup_root=/var/backups/phaeno-portal-coordinated
api_name=phaeno-portal-green-api
db_name=phaeno-portal-green-db
managed_volume=phaeno-portal-green_portal_green_managed_files
work=""; api_id=""; api_stopped=false; watchdog=""; helper_id=""; helper_name=""; token=""
for command in docker flock timeout stat find awk openssl sha256sum tar systemd-run systemctl readlink shred cmp; do
    command -v "$command" >/dev/null || fail
done
[[ -d "$runtime" && ! -L "$runtime" && -f "$runtime/portal.env" && ! -L "$runtime/portal.env" ]] || fail
exec 9>"$runtime/deploy.lock"
flock --exclusive --wait 600 9 || fail
[[ ! -L "$backup_root" ]] || fail
install -d -m 700 "$backup_root"

latest() {
    local candidate
    while IFS= read -r candidate; do
        [[ "$candidate" =~ ^snapshot-[0-9]{8}T[0-9]{6}Z-[0-9a-f-]{36}$ ]] || continue
        [[ ! -L "$backup_root/$candidate" && -f "$backup_root/$candidate/receipt.env" ]] || continue
        grep -qx 'format=phaeno-coordinated-v1' "$backup_root/$candidate/receipt.env" || continue
        grep -qx 'restore_verified=true' "$backup_root/$candidate/receipt.env" || continue
        grep -qx 'cleanup_verified=true' "$backup_root/$candidate/receipt.env" || continue
        (cd "$backup_root/$candidate" && sha256sum --check --strict --status encrypted.sha256) || fail
        printf '%s\n' "$candidate"; return
    done < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
    return 1
}
if [[ "$mode" == latest || "$mode" == status ]]; then
    phase=latest_verified_backup
    backup_id="$(latest)" || fail
    created="$(sed -n 's/^created_epoch=//p' "$backup_root/$backup_id/receipt.env")"
    [[ "$created" =~ ^[0-9]+$ ]] || fail
    age=$(( $(date -u +%s) - created ))
    (( age >= 0 && age <= 30 * 3600 )) || fail
    printf 'backup_id=%s\nbackup_age_seconds=%s\ncoordinated_backup=PASS\n' "$backup_id" "$age"
    exit 0
fi
# The 03:00 fallback covers the spring DST date on which 02:00 does not exist.
if [[ "$mode" == scheduled ]]; then
    if recent="$(latest)"; then
        created="$(sed -n 's/^created_epoch=//p' "$backup_root/$recent/receipt.env")"
        [[ "$created" =~ ^[0-9]+$ ]] || fail
        age=$(( $(date -u +%s) - created ))
        if (( age >= 0 && age < 2 * 3600 )); then printf 'coordinated_backup=SKIPPED_RECENT\n'; exit 0; fi
    fi
fi

remove_helper() {
    local identity actual_id actual_owner
    [[ -n "$helper_name" ]] || return 0
    identity="$(docker inspect --format '{{.Id}} {{index .Config.Labels "phaeno.coordinated-backup-owner"}}' "$helper_name" 2>/dev/null)" || return 1
    read -r actual_id actual_owner <<< "$identity"
    [[ "$actual_id" =~ ^[0-9a-f]{64}$ && "$actual_owner" == "$token" \
        && ( -z "$helper_id" || "$actual_id" == "$helper_id" ) ]] || return 1
    timeout --kill-after=5s 30s docker rm --force --volumes "$actual_id" >/dev/null 2>&1 || return 1
    helper_id=""; helper_name=""
}
resume_api() {
    [[ "$api_stopped" == true ]] || return 0
    [[ "$(docker inspect --format '{{.Id}}' "$api_name")" == "$api_id" ]] || return 1
    timeout --kill-after=5s 20s docker start "$api_id" >/dev/null 2>&1 || return 1
    for attempt in $(seq 1 45); do
        if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$api_id" 2>/dev/null)" == healthy ]]; then
            api_stopped=false
            systemctl stop "$watchdog.timer" "$watchdog.service" >/dev/null 2>&1 || true
            printf 'backup_api_resumed=true\n'
            return 0
        fi
        sleep 2
    done
    return 1
}
cleanup() {
    local status=$?
    trap - EXIT INT TERM
    if ! resume_api; then printf 'backup_api_recovery=FAIL watchdog_retained=true\n' >&2; status=1; fi
    if ! remove_helper; then printf 'backup_helper_cleanup=FAIL\n' >&2; status=1; fi
    if [[ -n "$work" ]]; then
        [[ "$work" == "$backup_root/.working-$token" && ! -L "$work" ]] || exit 1
        # Enumerated outputs only; no recursive cleanup or shared-volume deletion.
        for leaf in database.dump files.tar files.tsv references.tsv snapshot.env payload.sha256 \
            snapshot.tar snapshot.pass envelope-roundtrip.sha256 snapshot.tar.enc snapshot.key.enc encrypted.sha256 receipt.env; do
            if [[ -f "$work/$leaf" && ! -L "$work/$leaf" ]]; then shred --remove -- "$work/$leaf" >/dev/null 2>&1 || status=1; fi
        done
        rmdir -- "$work" 2>/dev/null || status=1
    fi
    if (( status == 0 )) && [[ "$phase" == complete ]]; then
        printf 'cleanup_verified=true\n' >> "$destination/receipt.env"
        (cd "$destination" && sha256sum snapshot.tar.enc snapshot.key.enc receipt.env > encrypted.sha256 \
            && sha256sum --check --strict --status encrypted.sha256) || status=1
        if (( status == 0 )); then
            printf 'backup_id=%s\nbackup_file_count=%s\nbackup_encrypted=true\nbackup_restore_verified=true\nbackup_cleanup_verified=true\ncoordinated_backup=PASS\n' "$backup_id" "$file_count"
        fi
    fi
    if (( status != 0 )); then printf 'coordinated_backup=FAIL phase=%s\n' "$phase" >&2; fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

phase=preflight
[[ -f "$public_key" && ! -L "$public_key" && "$public_key" == /* ]] || fail
openssl pkey -pubin -in "$public_key" -noout >/dev/null 2>&1 || fail
printf 'Phaeno backup recipient preflight' | openssl pkeyutl -encrypt -pubin -inkey "$public_key" \
    -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 \
    -out /dev/null 2>/dev/null || fail
for setting in 'FileStorage__Provider=Local' 'FileStorage__LocalRootPath=/var/lib/phaeno-portal/files' 'FileStorage__LocalPersistentVolumeConfirmed=true'; do
    [[ "$(grep -c "^${setting%%=*}=" "$runtime/portal.env" || true)" == 1 ]] || fail
    grep -qxF "$setting" "$runtime/portal.env" || fail
done
api_id="$(docker inspect --format '{{.Id}}' "$api_name")"
[[ "$api_id" =~ ^[0-9a-f]{64}$ && "$(docker inspect --format '{{.State.Health.Status}}' "$api_id")" == healthy ]] || fail
api_image="$(docker inspect --format '{{.Image}}' "$api_id")"
[[ "$api_image" =~ ^sha256:[0-9a-f]{64}$ ]] || fail
source_revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$api_image")"
[[ "$source_revision" =~ ^[0-9a-f]{40}$ ]] || fail
mounted="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/phaeno-portal/files"}}{{.Type}} {{.Name}} {{.RW}}{{end}}{{end}}' "$api_id")"
[[ "$mounted" == "volume $managed_volume true" ]] || fail
[[ "$(docker ps --no-trunc --quiet --filter "volume=$managed_volume")" == "$api_id" ]] || fail
[[ "$(docker inspect --format '{{len .HostConfig.PortBindings}}' "$db_name")" == 0 ]] || fail
available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
[[ "$available_kib" =~ ^[0-9]+$ ]] && (( available_kib >= 1536 * 1024 )) || fail
query_live() {
    timeout --kill-after=5s 20s docker exec "$db_name" /bin/sh -c \
        'exec psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -X -q -At -v ON_ERROR_STOP=1 --command "$1"' -- "$1" 2>/dev/null
}
db_bytes="$(query_live 'SELECT pg_database_size(current_database());')"
[[ "$db_bytes" =~ ^[0-9]+$ ]] && (( db_bytes <= 268435456 )) || fail
token="$(cat /proc/sys/kernel/random/uuid)"
[[ "$token" =~ ^[0-9a-f-]{36}$ ]] || fail
work="$backup_root/.working-$token"
mkdir -m 700 -- "$work"
create_helper() {
    local purpose="$1"
    helper_name="phaeno-coordinated-$purpose-$token"
    mount_args=()
    [[ "$purpose" != capture ]] || mount_args+=(--mount "type=volume,source=$managed_volume,target=/source,readonly")
    helper_id="$(docker create --name "$helper_name" --label "phaeno.coordinated-backup-owner=$token" \
        --network none --read-only --cap-drop ALL --security-opt no-new-privileges --log-driver none \
        --memory 256m --memory-swap 256m --cpus 1 --pids-limit 64 --ulimit core=0 \
        --mount "type=bind,source=$script_dir/backup,target=/helpers,readonly" \
        --mount "type=bind,source=$work,target=/backup,readonly" \
        "${mount_args[@]}" --volume /restore --tmpfs /tmp:rw,nosuid,nodev,noexec,size=16m \
        --entrypoint /bin/sh "$api_image" -c 'exec sleep 1800' 2>/dev/null)" || fail
    [[ "$helper_id" =~ ^[0-9a-f]{64}$ ]] || fail
    docker start "$helper_id" >/dev/null 2>&1 || fail
}
create_helper capture
file_bytes="$(timeout --kill-after=5s 30s docker exec "$helper_id" /bin/bash -ceu \
    'set -o pipefail; find /source -type f -printf "%s\n" | awk '\''{total += $1; count++} END {if (count>100000) exit 1; printf "%.0f\n",total}'\''')"
[[ "$file_bytes" =~ ^[0-9]+$ ]] && (( file_bytes <= 4294967296 )) || fail
docker_root="$(docker info --format '{{.DockerRootDir}}')"
docker_free="$(df -Pk "$docker_root" | awk 'NR==2 {printf "%.0f",$4*1024}')"
host_free="$(df -Pk "$backup_root" | awk 'NR==2 {printf "%.0f",$4*1024}')"
(( host_free >= file_bytes * 3 + db_bytes * 3 + 2147483648 && docker_free >= file_bytes + 1073741824 )) || fail
printf 'backup_preflight=PASS\nbackup_source_revision=%s\nbackup_file_bytes=%s\n' "$source_revision" "$file_bytes"

phase=quiesce
watchdog="phaeno-backup-resume-$token"
systemd-run --quiet --collect --unit "$watchdog" --on-active=180s --timer-property=AccuracySec=1s \
    /usr/bin/docker start "$api_id" || fail
systemctl is-active --quiet "$watchdog.timer" || fail
outage_started="$(date -u +%s)"
api_stopped=true
timeout --kill-after=5s 40s docker stop --time 30 "$api_id" >/dev/null 2>&1 || fail
[[ "$(docker inspect --format '{{.State.Running}} {{.State.ExitCode}} {{.State.OOMKilled}}' "$api_id")" == 'false 0 false' ]] || fail
for attempt in $(seq 1 10); do
    clients="$(query_live "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid();")"
    [[ "$clients" == 0 ]] && break
    sleep 1
done
[[ "$clients" == 0 ]] || fail
deadline=$((SECONDS + 120))
capture() { local remaining=$((deadline - SECONDS)); (( remaining > 0 )) || fail; timeout --kill-after=5s "${remaining}s" "$@"; }
phase=snapshot
expected_migration="$(query_live 'SELECT "MigrationId" FROM public.__ef_migrations_history ORDER BY "MigrationId" DESC LIMIT 1;')"
[[ "$expected_migration" =~ ^[0-9]{14}_[A-Za-z0-9_]+$ ]] || fail
created_epoch="$(date -u +%s)"; created_utc="$(date -u +%Y%m%dT%H%M%SZ)"
capture docker exec "$db_name" /bin/sh -c \
    'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format custom --no-owner --no-privileges' \
    > "$work/database.dump" 2>/dev/null || fail
capture docker exec "$helper_id" /bin/bash /helpers/file-tree.sh manifest /source > "$work/files.tsv" || fail
capture docker exec "$helper_id" tar --create --file - --directory /source . > "$work/files.tar" 2>/dev/null || fail
file_bytes="$(awk -F '\t' '{total += $3} END {printf "%.0f", total}' "$work/files.tsv")"
(( $(stat -c %s "$work/database.dump") <= 536870912 && $(stat -c %s "$work/files.tar") <= 5368709120 )) || fail
[[ "$(docker inspect --format '{{.State.Running}}' "$api_id")" == false ]] || fail
[[ "$(query_live "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid();")" == 0 ]] || fail
phase=resume
resume_api || fail
printf 'backup_api_outage_seconds=%s\n' "$(( $(date -u +%s) - outage_started ))"
remove_helper || fail

phase=database_restore
bash "$script_dir/verify-database-backup.sh" "$work/database.dump" "$expected_migration" "$work/references.tsv" || fail
phase=file_restore
create_helper restore
docker exec "$helper_id" /bin/bash /helpers/verify-populated-fixture.sh || fail
docker exec "$helper_id" /bin/bash /helpers/file-tree.sh verify \
    /backup/files.tar /backup/files.tsv /backup/references.tsv /restore || fail
remove_helper || fail
file_count="$(wc -l < "$work/files.tsv" | tr -d '[:space:]')"
{
    printf 'format=phaeno-coordinated-v1\ncreated_epoch=%s\nsource_revision=%s\nhelper_revision=%s\n' "$created_epoch" "$source_revision" "$helper_revision"
    printf 'migration=%s\nfile_count=%s\nfile_bytes=%s\n' "$expected_migration" "$file_count" "$file_bytes"
} > "$work/snapshot.env"
phase=encrypt
(cd "$work" && sha256sum database.dump files.tar files.tsv references.tsv snapshot.env > payload.sha256 \
    && tar --create --file snapshot.tar database.dump files.tar files.tsv references.tsv snapshot.env payload.sha256)
openssl rand -base64 48 > "$work/snapshot.pass"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 -pass "file:$work/snapshot.pass" \
    -in "$work/snapshot.tar" -out "$work/snapshot.tar.enc" 2>/dev/null || fail
openssl pkeyutl -encrypt -pubin -inkey "$public_key" -pkeyopt rsa_padding_mode:oaep \
    -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 \
    -in "$work/snapshot.pass" -out "$work/snapshot.key.enc" 2>/dev/null || fail
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -pass "file:$work/snapshot.pass" \
    -in "$work/snapshot.tar.enc" 2>/dev/null | sha256sum > "$work/envelope-roundtrip.sha256" || fail
[[ "$(cut -d ' ' -f 1 "$work/envelope-roundtrip.sha256")" == "$(sha256sum "$work/snapshot.tar" | cut -d ' ' -f 1)" ]] || fail
phase=publish_verified_snapshot
backup_id="snapshot-$created_utc-$token"
destination="$backup_root/$backup_id"
[[ ! -e "$destination" && ! -L "$destination" ]] || fail
{
    cat "$work/snapshot.env"
    printf 'restore_verified=true\napi_resumed=true\nenvelope_roundtrip=true\n'
} > "$work/receipt.env"
(cd "$work" && sha256sum snapshot.tar.enc snapshot.key.enc receipt.env > encrypted.sha256 \
    && sha256sum --check --strict --status encrypted.sha256)
mkdir -m 700 -- "$destination"
for leaf in snapshot.tar.enc snapshot.key.enc receipt.env encrypted.sha256; do mv -- "$work/$leaf" "$destination/$leaf"; done
phase=complete
