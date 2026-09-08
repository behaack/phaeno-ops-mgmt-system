#!/usr/bin/env bash
# Install only after a current, verified first backup. No default-branch dependency.
set +x
set -Eeuo pipefail
umask 077
fail() { printf 'backup_timer_install=FAIL\n' >&2; exit 1; }
[[ $# == 3 && $EUID == 0 ]] || fail
deploy_root="$1"; revision="$2"; supplied_key="$3"
[[ "$deploy_root" == /opt/phaeno.portal-green && "$revision" =~ ^[0-9a-f]{40}$ ]] || fail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
[[ "$script_dir" == "$deploy_root/maintenance/backup/$revision" ]] || fail
[[ -f "$supplied_key" && ! -L "$supplied_key" ]] || fail
runtime="$deploy_root/runtime"
key="$runtime/coordinated-backup-public.pem"
unit_root=/etc/systemd/system
[[ -d "$runtime" && ! -L "$runtime" && -d "$unit_root" && ! -L "$unit_root" ]] || fail
openssl pkey -pubin -in "$supplied_key" -noout >/dev/null 2>&1 || fail
if [[ -e "$key" || -L "$key" ]]; then
    [[ -f "$key" && ! -L "$key" ]] || fail
    [[ "$(openssl pkey -pubin -in "$key" -outform DER | sha256sum)" \
        == "$(openssl pkey -pubin -in "$supplied_key" -outform DER | sha256sum)" ]] || fail
else
    install -m 600 "$supplied_key" "$key"
fi
bash "$script_dir/coordinated-backup.sh" status "$deploy_root" "$key" "$revision" || fail
# The status command uses this same lock itself; acquire it only after that
# child has returned, then serialize unit replacement with host maintenance.
exec 9> "$runtime/deploy.lock"
flock -w 600 9 || fail
systemd-analyze calendar '*-*-* 02:00:00 America/Los_Angeles' >/dev/null || fail
systemd-analyze calendar '*-*-* 03:00:00 America/Los_Angeles' >/dev/null || fail
for unit in phaeno-portal-backup.service phaeno-portal-backup.timer; do
    [[ ! -L "$unit_root/$unit" ]] || fail
    if [[ -e "$unit_root/$unit" ]]; then
        grep -qx '# Phaeno coordinated backup managed v1' "$unit_root/$unit" || fail
    fi
done
service_tmp="$(mktemp "$runtime/backup.service.XXXXXX")"
timer_tmp="$(mktemp "$runtime/backup.timer.XXXXXX")"
trap 'rm -f -- "$service_tmp" "$timer_tmp"' EXIT
cat > "$service_tmp" <<EOF
# Phaeno coordinated backup managed v1
[Unit]
Description=Phaeno coordinated database and Local-file backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
UMask=0077
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
TimeoutStartSec=30min
ExecStart=/bin/bash $script_dir/coordinated-backup.sh scheduled $deploy_root $key $revision
StandardOutput=journal
StandardError=journal
EOF
cat > "$timer_tmp" <<'EOF'
# Phaeno coordinated backup managed v1
[Unit]
Description=Daily Phaeno backup at 2 a.m. Pacific

[Timer]
OnCalendar=*-*-* 02:00:00 America/Los_Angeles
# At the spring DST transition 02:00 is absent; a recent successful 02:00 backup
# makes the ordinary 03:00 invocation a no-op. Never catch up during office hours.
OnCalendar=*-*-* 03:00:00 America/Los_Angeles
Persistent=false
AccuracySec=1min
Unit=phaeno-portal-backup.service

[Install]
WantedBy=timers.target
EOF
install -m 644 "$service_tmp" "$unit_root/phaeno-portal-backup.service"
install -m 644 "$timer_tmp" "$unit_root/phaeno-portal-backup.timer"
systemctl daemon-reload
systemctl enable --now phaeno-portal-backup.timer >/dev/null
systemctl is-enabled --quiet phaeno-portal-backup.timer || fail
systemctl is-active --quiet phaeno-portal-backup.timer || fail
printf 'backup_timer_install=PASS\nbackup_schedule=02:00_America_Los_Angeles\nbackup_spring_dst_fallback=03:00\n'
