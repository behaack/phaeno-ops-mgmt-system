#!/usr/bin/env bash
# Private manifest/restore worker. Run in an isolated container; never print keys.
set +x
set -Eeuo pipefail
umask 077
export LC_ALL=C
phase=arguments
fail() { printf 'file_restore_check=FAIL phase=%s\n' "$phase" >&2; exit 1; }
valid_path() {
    local path="$1" part
    [[ "$path" =~ ^(provisioning-files|order-files)(/[A-Za-z0-9._-]+)*$ ]] || return 1
    IFS=/ read -ra parts <<< "$path"
    for part in "${parts[@]}"; do [[ "$part" != . && "$part" != .. && "$part" != *. ]] || return 1; done
}
manifest() {
    local root="$1" path relative digest bytes total=0 count=0
    [[ -d "$root" && ! -L "$root" ]] || fail
    while IFS= read -r -d '' path; do
        relative="${path#"$root"/}"
        valid_path "$relative" || fail
        [[ ! -L "$path" ]] || fail
        if [[ -d "$path" ]]; then continue; fi
        [[ "$relative" == */* && -f "$path" && "$(stat -c %h -- "$path" 2>/dev/null)" == 1 ]] || fail
        bytes="$(stat -c %s -- "$path" 2>/dev/null)"
        [[ "$bytes" =~ ^[0-9]+$ ]] || fail
        total=$((total + bytes)); count=$((count + 1))
        (( total <= 4294967296 && count <= 100000 )) || fail
        digest="$(sha256sum -- "$path" 2>/dev/null)"; digest="${digest%% *}"
        printf '%s\t%s\t%s\n' "$relative" "$digest" "$bytes"
    done < <(find "$root" -mindepth 1 -print0 2>/dev/null)
}
[[ $# -ge 2 ]] || fail
case "$1" in
    manifest)
        [[ $# == 2 ]] || fail
        phase=source_inventory
        # Capture find failures separately instead of treating an unreadable root
        # as an empty store through process-substitution status loss.
        find "$2" -mindepth 1 -printf '' 2>/dev/null || fail
        manifest "$2" | sort
        ;;
    verify)
        [[ $# == 5 ]] || fail
        archive="$2"; expected="$3"; references="$4"; destination="$5"
        [[ -f "$archive" && ! -L "$archive" && -f "$expected" && ! -L "$expected" \
            && -f "$references" && ! -L "$references" && -d "$destination" && ! -L "$destination" ]] || fail
        [[ -z "$(find "$destination" -mindepth 1 -print -quit)" ]] || fail
        (( $(stat -c %s -- "$archive") <= 5368709120 )) || fail
        (( $(stat -c %s -- "$expected") <= 67108864 && $(stat -c %s -- "$references") <= 134217728 )) || fail
        phase=archive_safety
        listing="$(tar --absolute-names --list --quoting-style=literal --file "$archive" 2>/dev/null)" || fail
        declare -A archive_paths=()
        while IFS= read -r entry; do
            [[ "$entry" == ./ ]] && continue
            path="${entry#./}"; path="${path%/}"
            valid_path "$path" || fail
            [[ -z "${archive_paths[$path]+set}" ]] || fail
            archive_paths[$path]=1
        done <<< "$listing"
        # Hard/symbolic links, devices, sparse huge entries and other types are
        # rejected before extraction. Numeric-owner listing keeps the size field fixed.
        tar --absolute-names --list --verbose --numeric-owner --full-time --file "$archive" 2>/dev/null |
            awk 'substr($1,1,1)!="-" && substr($1,1,1)!="d" {bad=1}
                 $3 !~ /^[0-9]+$/ {bad=1}
                 {total += $3; count++}
                 END {if (bad || total>4294967296 || count>200001) exit 1}' || fail
        phase=extract
        tar --extract --file "$archive" --directory "$destination" \
            --no-same-owner --no-same-permissions --delay-directory-restore 2>/dev/null || fail
        find "$destination" -type d -exec chmod 700 {} + 2>/dev/null || fail
        find "$destination" -type f -exec chmod 600 {} + 2>/dev/null || fail
        phase=byte_manifest
        actual="$(manifest "$destination" | sort)" || fail
        [[ "$actual" == "$(cat "$expected")" ]] || fail
        declare -A hashes=() sizes=() seen_references=()
        while IFS= read -r line; do
            [[ -n "$line" ]] || continue
            IFS=$'\t' read -r path digest bytes extra <<< "$line"
            [[ "$line" == "$path"$'\t'"$digest"$'\t'"$bytes" && "$digest" =~ ^[0-9a-f]{64}$ \
                && "$bytes" =~ ^[0-9]+$ && -z "${hashes[$path]+set}" ]] || fail
            valid_path "$path" || fail
            hashes[$path]="$digest"; sizes[$path]="$bytes"
        done < "$expected"
        phase=database_references
        required=0; retired=0; rows=0
        while IFS= read -r line; do
            IFS=$'\t' read -r path digest bytes presence extra <<< "$line"
            [[ "$line" == "$path"$'\t'"$digest"$'\t'"$bytes"$'\t'"$presence" \
                && "$digest" =~ ^[0-9a-f]{64}$ && ( "$bytes" == unknown || "$bytes" =~ ^[0-9]+$ ) \
                && ( "$presence" == required || "$presence" == retired ) ]] || fail
            valid_path "$path" || fail
            rows=$((rows + 1)); (( rows <= 500000 )) || fail
            if [[ -n "${hashes[$path]+set}" ]]; then
                [[ "${hashes[$path]}" == "$digest" && ( "$bytes" == unknown || "${sizes[$path]}" == "$bytes" ) ]] || fail
                seen_references[$path]=1
            elif [[ "$presence" == required ]]; then fail; fi
            if [[ "$presence" == required ]]; then required=$((required + 1)); else retired=$((retired + 1)); fi
        done < "$references"
        printf 'file_restore_files=%s\nfile_restore_required_references=%s\nfile_restore_retired_references=%s\nfile_restore_unreferenced_files=%s\nfile_restore_check=PASS\n' \
            "${#hashes[@]}" "$required" "$retired" "$((${#hashes[@]} - ${#seen_references[@]}))"
        ;;
    *) fail ;;
esac
