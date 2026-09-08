#!/bin/sh
# Read-only inventory; output counts only, never file keys or content.
set -eu
root="${1:?Storage root is required}"
label="${2:?Inventory label is required}"
case "$label" in legacy|managed) ;; *) exit 1 ;; esac
count=0; links=0
if [ -L "$root" ]; then links=1; fi
for area in provisioning-files order-files; do
    if [ -e "$root/$area" ] || [ -L "$root/$area" ]; then
        files="$(find "$root/$area" -type f -printf '.')"
        linked="$(find "$root/$area" -type l -printf '.')"
        count=$((count + ${#files})); links=$((links + ${#linked}))
    fi
done
printf '%s_files=%s\n%s_links=%s\n' "$label" "$count" "$label" "$links"
