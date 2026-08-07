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

IFS= read -r provider_line
if IFS= read -r _; then
    printf 'Unexpected extra disabled file-storage configuration input.\n' >&2
    exit 1
fi

[[ "${provider_line}" == 'FileStorage__Provider=Disabled' ]] || {
    printf 'Invalid disabled file-storage provider input.\n' >&2
    exit 1
}

temp="$(mktemp "${RUNTIME_DIR}/portal.env.file-storage-disabled.XXXXXX")"
provider_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        FileStorage__Provider=*)
            if [[ "${provider_found}" -eq 0 ]]; then
                printf '%s\n' "${provider_line}" >> "${temp}"
                provider_found=1
            fi
            ;;
        FileStorage__S3__*|AWS_ACCESS_KEY_ID=*|AWS_SECRET_ACCESS_KEY=*|AWS_SESSION_TOKEN=*)
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

[[ "${provider_found}" -eq 1 ]] || printf '%s\n' "${provider_line}" >> "${temp}"

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed disabled file-storage runtime configuration.\n'
