#!/bin/sh
set -eu
# VERSION reports the database actually loaded by clamd, not a file copy's mtime.
reply="$(printf 'nPING\n' | nc -w 3 127.0.0.1 3310)"
[ "$reply" = PONG ] || exit 1
pidof freshclam >/dev/null || exit 1
version="$(printf 'nVERSION\n' | nc -w 3 127.0.0.1 3310)"
case "$version" in 'ClamAV '*/*/*) ;; *) exit 1 ;; esac
built="$(date -u -D '%a %b %e %H:%M:%S %Y' -d "${version##*/}" +%s)" || exit 1
now="$(date -u +%s)"
age="$((now - built))"
[ "$age" -ge 0 ] && [ "$age" -le 259200 ]
