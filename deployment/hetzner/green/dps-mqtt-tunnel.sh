#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# The SSH process joins only the current API network namespace. Its key stays on
# the host, and the MQTT listener is available only on the API's loopback.
: "${DPS_SSH_HOST:?DPS_SSH_HOST is required}"
: "${DPS_IDENTITY_FILE:?DPS_IDENTITY_FILE is required}"
: "${DPS_KNOWN_HOSTS_FILE:?DPS_KNOWN_HOSTS_FILE is required}"
[[ "$DPS_SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || exit 1
[[ -f "$DPS_IDENTITY_FILE" && -f "$DPS_KNOWN_HOSTS_FILE" ]] || exit 1

tunnel_pid=''
cleanup() {
    if [[ -n "$tunnel_pid" ]]; then
        kill "$tunnel_pid" 2>/dev/null || true
        wait "$tunnel_pid" 2>/dev/null || true
        tunnel_pid=''
    fi
}
trap 'cleanup; exit 0' TERM INT
trap cleanup EXIT

while true; do
    signature="$(docker inspect --format '{{.Id}} {{.State.Pid}} {{.State.Running}}' phaeno-portal-green-api 2>/dev/null || true)"
    read -r container_id api_pid running <<< "$signature"
    if [[ "$running" != true || ! "$api_pid" =~ ^[1-9][0-9]*$ ]]; then
        sleep 2
        continue
    fi
    # Resolve on the host; its DNS stub is not inside the container namespace.
    address="$(getent ahostsv4 "$DPS_SSH_HOST" | awk 'NR==1 { print $1 }')"
    [[ "$address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1
    nsenter --target "$api_pid" --net -- /usr/bin/ssh -F /dev/null -N -T -a \
        -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none \
        -o StrictHostKeyChecking=yes -o "HostKeyAlias=$DPS_SSH_HOST" \
        -o "UserKnownHostsFile=$DPS_KNOWN_HOSTS_FILE" -o UpdateHostKeys=no \
        -o ExitOnForwardFailure=yes -o ConnectTimeout=10 \
        -o ServerAliveInterval=15 -o ServerAliveCountMax=2 \
        -i "$DPS_IDENTITY_FILE" -L 127.0.0.1:11883:127.0.0.1:1883 "ubuntu@$address" &
    tunnel_pid=$!
    while kill -0 "$tunnel_pid" 2>/dev/null; do
        current="$(docker inspect --format '{{.Id}} {{.State.Pid}} {{.State.Running}}' phaeno-portal-green-api 2>/dev/null || true)"
        [[ "$current" == "$signature" ]] || break
        sleep 2
    done
    cleanup
    sleep 3
done
