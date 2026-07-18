#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly TARGET="${RUNTIME_DIR}/portal.env"

temp=""

cleanup() {
    if [[ -n "${temp}" ]]; then
        rm -f "${temp}"
    fi
}
trap cleanup EXIT

[[ -d "${RUNTIME_DIR}" ]] || {
    printf 'Portal runtime directory is missing.\n' >&2
    exit 1
}
[[ -f "${TARGET}" && -r "${TARGET}" && -w "${TARGET}" ]] || {
    printf 'Portal runtime environment file is not readable and writable.\n' >&2
    exit 1
}

IFS= read -r clerk_line
case "${clerk_line}" in
    Clerk__SecretKey=sk_test_*|Clerk__SecretKey=sk_live_*) ;;
    *)
        printf 'Invalid Clerk runtime secret input.\n' >&2
        exit 1
        ;;
esac

temp="$(mktemp "${RUNTIME_DIR}/portal.env.clerk.XXXXXX")"
found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        Clerk__SecretKey=*)
            if [[ "${found}" -eq 0 ]]; then
                printf '%s\n' "${clerk_line}" >> "${temp}"
                found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

if [[ "${found}" -eq 0 ]]; then
    printf '%s\n' "${clerk_line}" >> "${temp}"
fi

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed Clerk runtime secret.\n'
