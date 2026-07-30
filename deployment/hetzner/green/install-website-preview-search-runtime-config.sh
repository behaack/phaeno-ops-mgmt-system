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

IFS= read -r enabled_line
IFS= read -r url_line
IFS= read -r bypass_line
IFS= read -r proxy_key_line

[[ "${enabled_line}" == 'WebsitePreviewSearch__Enabled=true' ]] || {
    printf 'Invalid Website Preview search enabled input.\n' >&2
    exit 1
}
case "${url_line}" in
    WebsitePreviewSearch__Url=https://*) ;;
    *)
        printf 'Invalid Website Preview search URL input.\n' >&2
        exit 1
        ;;
esac
case "${bypass_line}" in
    WebsitePreviewSearch__VercelProtectionBypassSecret=?*) ;;
    *)
        printf 'Invalid Vercel protection bypass input.\n' >&2
        exit 1
        ;;
esac
case "${proxy_key_line}" in
    WebsitePreviewSearch__ProxyApiKey=????????????????????????????????*) ;;
    *)
        printf 'Invalid Website Preview search proxy key input.\n' >&2
        exit 1
        ;;
esac

temp="$(mktemp "${RUNTIME_DIR}/portal.env.website-preview-search.XXXXXX")"
enabled_found=0
url_found=0
bypass_found=0
proxy_key_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        WebsitePreviewSearch__Enabled=*)
            if [[ "${enabled_found}" -eq 0 ]]; then
                printf '%s\n' "${enabled_line}" >> "${temp}"
                enabled_found=1
            fi
            ;;
        WebsitePreviewSearch__Url=*)
            if [[ "${url_found}" -eq 0 ]]; then
                printf '%s\n' "${url_line}" >> "${temp}"
                url_found=1
            fi
            ;;
        WebsitePreviewSearch__VercelProtectionBypassSecret=*)
            if [[ "${bypass_found}" -eq 0 ]]; then
                printf '%s\n' "${bypass_line}" >> "${temp}"
                bypass_found=1
            fi
            ;;
        WebsitePreviewSearch__ProxyApiKey=*)
            if [[ "${proxy_key_found}" -eq 0 ]]; then
                printf '%s\n' "${proxy_key_line}" >> "${temp}"
                proxy_key_found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

[[ "${enabled_found}" -eq 1 ]] || printf '%s\n' "${enabled_line}" >> "${temp}"
[[ "${url_found}" -eq 1 ]] || printf '%s\n' "${url_line}" >> "${temp}"
[[ "${bypass_found}" -eq 1 ]] || printf '%s\n' "${bypass_line}" >> "${temp}"
[[ "${proxy_key_found}" -eq 1 ]] || printf '%s\n' "${proxy_key_line}" >> "${temp}"

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed Website Preview search runtime configuration.\n'
