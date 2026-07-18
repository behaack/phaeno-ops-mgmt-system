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

IFS= read -r organization_line
IFS= read -r email_line
IFS= read -r first_name_line
IFS= read -r last_name_line

case "${organization_line}" in
    Bootstrap__PhaenoOrganizationName=?*) ;;
    *)
        printf 'Invalid bootstrap organization input.\n' >&2
        exit 1
        ;;
esac

case "${email_line}" in
    Bootstrap__AdminEmail=*@*.*) ;;
    *)
        printf 'Invalid bootstrap administrator email input.\n' >&2
        exit 1
        ;;
esac

case "${first_name_line}" in
    Bootstrap__AdminFirstName=?*) ;;
    *)
        printf 'Invalid bootstrap administrator first-name input.\n' >&2
        exit 1
        ;;
esac

case "${last_name_line}" in
    Bootstrap__AdminLastName=?*) ;;
    *)
        printf 'Invalid bootstrap administrator last-name input.\n' >&2
        exit 1
        ;;
esac

temp="$(mktemp "${RUNTIME_DIR}/portal.env.bootstrap.XXXXXX")"
organization_found=0
email_found=0
first_name_found=0
last_name_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        Bootstrap__PhaenoOrganizationName=*)
            if [[ "${organization_found}" -eq 0 ]]; then
                printf '%s\n' "${organization_line}" >> "${temp}"
                organization_found=1
            fi
            ;;
        Bootstrap__AdminEmail=*)
            if [[ "${email_found}" -eq 0 ]]; then
                printf '%s\n' "${email_line}" >> "${temp}"
                email_found=1
            fi
            ;;
        Bootstrap__AdminFirstName=*)
            if [[ "${first_name_found}" -eq 0 ]]; then
                printf '%s\n' "${first_name_line}" >> "${temp}"
                first_name_found=1
            fi
            ;;
        Bootstrap__AdminLastName=*)
            if [[ "${last_name_found}" -eq 0 ]]; then
                printf '%s\n' "${last_name_line}" >> "${temp}"
                last_name_found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

if [[ "${organization_found}" -eq 0 ]]; then
    printf '%s\n' "${organization_line}" >> "${temp}"
fi

if [[ "${email_found}" -eq 0 ]]; then
    printf '%s\n' "${email_line}" >> "${temp}"
fi

if [[ "${first_name_found}" -eq 0 ]]; then
    printf '%s\n' "${first_name_line}" >> "${temp}"
fi

if [[ "${last_name_found}" -eq 0 ]]; then
    printf '%s\n' "${last_name_line}" >> "${temp}"
fi

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed Portal bootstrap runtime configuration.\n'
