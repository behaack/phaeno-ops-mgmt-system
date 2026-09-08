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
# Sparse 101 MiB input crosses the configured 100 MiB stream boundary.
dd if=/dev/zero of="$work/oversize.bin" bs=1048576 count=0 seek=101 2>/dev/null
status=0
clamdscan --stream --no-summary "$work/oversize.bin" > "$work/result" 2>&1 || status=$?
[ "$status" -ne 0 ] && grep -qi 'size limit exceeded' "$work/result" || { printf 'Oversize fixture did not fail at the stream limit.\n' >&2; exit 1; }
printf 'scanner_oversize=passed\n'
/bin/sh /opt/portal-scanner/health.sh
printf 'scanner_health=passed\n'
