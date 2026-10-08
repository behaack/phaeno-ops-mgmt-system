#!/bin/sh
set -eu
umask 077
/bin/sh /opt/portal-scanner/health.sh
work="$(mktemp -d /tmp/portal-scanner-check.XXXXXX)"
trap 'rm -rf "$work"' EXIT
printf 'Phaeno scanner clean acceptance fixture\n' > "$work/clean.txt"
clamdscan --stream --no-summary "$work/clean.txt" > "$work/result" 2>&1
grep -q ': OK$' "$work/result" || { printf 'Clean fixture did not receive OK.\n' >&2; exit 1; }
printf 'scanner_clean=passed\n'
# Standard harmless EICAR antivirus test, assembled only in this ephemeral path.
printf '%s%s' 'X5O!P%@AP[4\PZX54(P^)7CC)7}' '$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > "$work/eicar.txt"
status=0
clamdscan --stream --no-summary "$work/eicar.txt" > "$work/result" 2>&1 || status=$?
[ "$status" = 1 ] && grep -q ' FOUND$' "$work/result" || { printf 'EICAR fixture was not rejected.\n' >&2; exit 1; }
printf 'scanner_eicar=passed\n'
# A valid password-encrypted ZIP containing only a harmless acceptance sentence.
printf '%s' 'UEsDBBQAAQAAAAAAAABz9vRnOAAAACwAAAAOAAAAYWNjZXB0YW5jZS50eHT4OHFxfiqyxHfTLGjkEw4kmhJ937qSoJQCApdCFVDy2IcCIOYibAcwAXUYiUuPbavhSXjNEsJnbVBLAQIUABQAAQAAAAAAAABz9vRnOAAAACwAAAAOAAAAAAAAAAAAAAAAAAAAAABhY2NlcHRhbmNlLnR4dFBLBQYAAAAAAQABADwAAABkAAAAAAA=' | base64 -d > "$work/encrypted.zip"
status=0
clamdscan --stream --no-summary "$work/encrypted.zip" > "$work/result" 2>&1 || status=$?
[ "$status" = 1 ] && grep -q 'Heuristics.Encrypted.* FOUND$' "$work/result" || { printf 'Encrypted fixture was not rejected.\n' >&2; exit 1; }
printf 'scanner_encrypted=passed\n'
# clamdscan truncates ordinary streams at its client-side StreamMaxLength, so it
# cannot prove the daemon rejects an oversized stream. Send a direct INSTREAM
# chunk header declaring 100 MiB + 1 byte (0x06400001), without a payload. clamd
# checks the declared length against its remaining quota before reading bytes.
# Require the exact framed daemon error; a timeout/reset/other error is failure.
printf 'nINSTREAM\n\006\100\000\001' > "$work/oversize-request"
printf 'INSTREAM size limit exceeded. ERROR\n' > "$work/oversize-expected"
status=0
nc -w 10 127.0.0.1 3310 < "$work/oversize-request" > "$work/result" 2> "$work/transport-error" || status=$?
if [ "$status" -ne 0 ] || ! cmp -s "$work/oversize-expected" "$work/result"; then
    printf 'Oversize fixture did not receive the exact daemon stream-limit error.\n' >&2
    printf 'scanner_oversize_transport_status=%s\nscanner_oversize_response_bytes=%s\n' "$status" "$(wc -c < "$work/result" | tr -d '[:space:]')" >&2
    # Only this synthetic request's bounded response/transport diagnostics are
    # shown. Never read daemon logs, runtime settings, or managed file content.
    printf 'scanner_oversize_response_preview=' >&2
    head -c 256 "$work/result" | LC_ALL=C tr -cd '\11\12\15\40-\176' >&2
    printf '\nscanner_oversize_transport_preview=' >&2
    head -c 256 "$work/transport-error" | LC_ALL=C tr -cd '\11\12\15\40-\176' >&2
    printf '\n' >&2
    exit 1
fi
printf 'scanner_oversize=passed\n'
/bin/sh /opt/portal-scanner/health.sh
printf 'scanner_health=passed\n'
