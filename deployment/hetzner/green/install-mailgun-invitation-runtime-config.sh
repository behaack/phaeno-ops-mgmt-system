#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly TARGET="${RUNTIME_DIR}/portal.env"
readonly INVITATION_URL="https://portal.phaenobiotech.com"

temp=""

cleanup() {
    if [[ -n "${temp}" ]]; then rm -f "${temp}"; fi
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
command -v grep >/dev/null || { printf 'grep is required.\n' >&2; exit 1; }

IFS= read -r signing_key_line
case "${signing_key_line}" in
    EmailServiceSettings__WebhookSigningKey=????????????????????*) ;;
    *)
        printf 'Invalid Mailgun webhook signing key input.\n' >&2
        exit 1
        ;;
esac
webhook_signing_key="${signing_key_line#*=}"

read_setting() {
    local key="$1"
    local count
    local line
    count="$(grep -c "^${key}=" "${TARGET}" || true)"
    [[ "${count}" -eq 1 ]] || {
        printf 'Production Mailgun configuration %s must occur exactly once.\n' "${key}" >&2
        exit 1
    }
    line="$(grep -m 1 "^${key}=" "${TARGET}")"
    printf '%s' "${line#*=}"
}

mailgun_url="$(read_setting 'EmailServiceSettings__Url')"
mailgun_resource="$(read_setting 'EmailServiceSettings__Resource')"
mailgun_api_key="$(read_setting 'EmailServiceSettings__ApiKey')"
mailgun_sender="$(read_setting 'EmailServiceSettings__AccountFrom')"

if [[ ! "${mailgun_url}" =~ ^https://api(\.eu)?\.mailgun\.net/v3/[A-Za-z0-9.-]+/?$ ]]; then
    printf 'Production Mailgun API URL is invalid.\n' >&2
    exit 1
fi
[[ "${mailgun_resource}" == 'messages' ]] || {
    printf 'Production Mailgun resource must be messages.\n' >&2
    exit 1
}
[[ "${#mailgun_api_key}" -ge 20 ]] || {
    printf 'Production Mailgun API key is invalid.\n' >&2
    exit 1
}
[[ "${mailgun_sender}" == *'@'*.* ]] || {
    printf 'Production Mailgun sender is invalid.\n' >&2
    exit 1
}

temp="$(mktemp "${RUNTIME_DIR}/portal.env.mailgun.XXXXXX")"
invitation_url_found=0
signing_key_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        Invitations__PublicBaseUrl=*)
            if [[ "${invitation_url_found}" -eq 0 ]]; then
                printf 'Invitations__PublicBaseUrl=%s\n' "${INVITATION_URL}" >> "${temp}"
                invitation_url_found=1
            fi
            ;;
        EmailServiceSettings__WebhookSigningKey=*)
            if [[ "${signing_key_found}" -eq 0 ]]; then
                printf 'EmailServiceSettings__WebhookSigningKey=%s\n' "${webhook_signing_key}" >> "${temp}"
                signing_key_found=1
            fi
            ;;
        Postmark__*)
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

[[ "${invitation_url_found}" -eq 1 ]] \
    || printf 'Invitations__PublicBaseUrl=%s\n' "${INVITATION_URL}" >> "${temp}"
[[ "${signing_key_found}" -eq 1 ]] \
    || printf 'EmailServiceSettings__WebhookSigningKey=%s\n' "${webhook_signing_key}" >> "${temp}"

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Validated existing Mailgun delivery and installed invitation webhook verification configuration.\n'
