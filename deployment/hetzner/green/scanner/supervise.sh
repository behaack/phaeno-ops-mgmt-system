#!/bin/sh
set -eu
# The official image starts FreshClam and clamd but its parent waits indefinitely.
# Exit this container if either daemon or loaded-signature readiness is lost, so
# Docker restarts it. No managed file volume is mounted in this service.
/bin/sh /init &
init_pid=$!
trap 'kill "$init_pid" 2>/dev/null || true' EXIT
trap 'exit 0' INT TERM
ready=false
elapsed=0
failures=0
while kill -0 "$init_pid" 2>/dev/null; do
    if /bin/sh /opt/portal-scanner/health.sh >/dev/null 2>&1; then
        ready=true
        failures=0
    elif [ "$ready" = true ]; then
        failures=$((failures + 1))
        if [ "$failures" -ge 3 ]; then
            printf 'Scanner readiness lost; restarting the private scanner.\n' >&2
            exit 1
        fi
    elif [ "$elapsed" -ge 1200 ]; then
        printf 'Scanner did not obtain current signatures and start in time.\n' >&2
        exit 1
    fi
    sleep 10
    elapsed=$((elapsed + 10))
done
exit 1
