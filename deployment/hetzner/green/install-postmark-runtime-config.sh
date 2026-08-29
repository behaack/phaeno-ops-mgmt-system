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

IFS= read -r invitation_url_line
IFS= read -r server_token_line
IFS= read -r from_email_line
IFS= read -r from_name_line
IFS= read -r message_stream_line
IFS= read -r webhook_header_line
IFS= read -r webhook_secret_line

[[ "${invitation_url_line}" == 'Invitations__PublicBaseUrl=https://portal.phaenobiotech.com' ]] || {
    printf 'Invalid production invitation URL input.\n' >&2
    exit 1
}
case "${server_token_line}" in
    Postmark__ServerToken=????????????????????*) ;;
    *)
        printf 'Invalid Postmark server token input.\n' >&2
        exit 1
        ;;
esac
case "${from_email_line}" in
    Postmark__FromEmail=?*@?*.?*) ;;
    *)
        printf 'Invalid Postmark sender input.\n' >&2
        exit 1
        ;;
esac
case "${from_name_line}" in
    Postmark__FromName=?*) ;;
    *)
        printf 'Invalid Postmark sender name input.\n' >&2
        exit 1
        ;;
esac
case "${message_stream_line}" in
    Postmark__MessageStream=?*) ;;
    *)
        printf 'Invalid Postmark message stream input.\n' >&2
        exit 1
        ;;
esac
[[ "${webhook_header_line}" == 'Postmark__WebhookSecretHeaderName=X-Phaeno-Postmark-Secret' ]] || {
    printf 'Invalid Postmark webhook header input.\n' >&2
    exit 1
}
case "${webhook_secret_line}" in
    Postmark__WebhookSecret=????????????????????????????????*) ;;
    *)
        printf 'Invalid Postmark webhook secret input.\n' >&2
        exit 1
        ;;
esac

temp="$(mktemp "${RUNTIME_DIR}/portal.env.postmark.XXXXXX")"
invitation_url_found=0
server_token_found=0
from_email_found=0
from_name_found=0
message_stream_found=0
webhook_header_found=0
webhook_secret_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        Invitations__PublicBaseUrl=*)
            if [[ "${invitation_url_found}" -eq 0 ]]; then
                printf '%s\n' "${invitation_url_line}" >> "${temp}"
                invitation_url_found=1
            fi
            ;;
        Postmark__ServerToken=*)
            if [[ "${server_token_found}" -eq 0 ]]; then
                printf '%s\n' "${server_token_line}" >> "${temp}"
                server_token_found=1
            fi
            ;;
        Postmark__FromEmail=*)
            if [[ "${from_email_found}" -eq 0 ]]; then
                printf '%s\n' "${from_email_line}" >> "${temp}"
                from_email_found=1
            fi
            ;;
        Postmark__FromName=*)
            if [[ "${from_name_found}" -eq 0 ]]; then
                printf '%s\n' "${from_name_line}" >> "${temp}"
                from_name_found=1
            fi
            ;;
        Postmark__MessageStream=*)
            if [[ "${message_stream_found}" -eq 0 ]]; then
                printf '%s\n' "${message_stream_line}" >> "${temp}"
                message_stream_found=1
            fi
            ;;
        Postmark__WebhookSecretHeaderName=*)
            if [[ "${webhook_header_found}" -eq 0 ]]; then
                printf '%s\n' "${webhook_header_line}" >> "${temp}"
                webhook_header_found=1
            fi
            ;;
        Postmark__WebhookSecret=*)
            if [[ "${webhook_secret_found}" -eq 0 ]]; then
                printf '%s\n' "${webhook_secret_line}" >> "${temp}"
                webhook_secret_found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

[[ "${invitation_url_found}" -eq 1 ]] || printf '%s\n' "${invitation_url_line}" >> "${temp}"
[[ "${server_token_found}" -eq 1 ]] || printf '%s\n' "${server_token_line}" >> "${temp}"
[[ "${from_email_found}" -eq 1 ]] || printf '%s\n' "${from_email_line}" >> "${temp}"
[[ "${from_name_found}" -eq 1 ]] || printf '%s\n' "${from_name_line}" >> "${temp}"
[[ "${message_stream_found}" -eq 1 ]] || printf '%s\n' "${message_stream_line}" >> "${temp}"
[[ "${webhook_header_found}" -eq 1 ]] || printf '%s\n' "${webhook_header_line}" >> "${temp}"
[[ "${webhook_secret_found}" -eq 1 ]] || printf '%s\n' "${webhook_secret_line}" >> "${temp}"

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed Postmark invitation runtime configuration.\n'
