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

IFS= read -r authority_line
IFS= read -r secret_line

case "${authority_line}" in
    Clerk__Authority=https://*.clerk.accounts.dev|Clerk__Authority=https://*.clerk.com) ;;
    *)
        printf 'Invalid Clerk authority input.\n' >&2
        exit 1
        ;;
esac

case "${secret_line}" in
    Clerk__SecretKey=sk_test_*|Clerk__SecretKey=sk_live_*) ;;
    *)
        printf 'Invalid Clerk runtime secret input.\n' >&2
        exit 1
        ;;
esac

temp="$(mktemp "${RUNTIME_DIR}/portal.env.clerk.XXXXXX")"
authority_found=0
secret_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        Clerk__Authority=*)
            if [[ "${authority_found}" -eq 0 ]]; then
                printf '%s\n' "${authority_line}" >> "${temp}"
                authority_found=1
            fi
            ;;
        Clerk__SecretKey=*)
            if [[ "${secret_found}" -eq 0 ]]; then
                printf '%s\n' "${secret_line}" >> "${temp}"
                secret_found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

if [[ "${authority_found}" -eq 0 ]]; then
    printf '%s\n' "${authority_line}" >> "${temp}"
fi

if [[ "${secret_found}" -eq 0 ]]; then
    printf '%s\n' "${secret_line}" >> "${temp}"
fi

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed Clerk runtime configuration.\n'
