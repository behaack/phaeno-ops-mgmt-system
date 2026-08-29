#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly TARGET="${RUNTIME_DIR}/portal.env"
readonly INVITATION_URL="https://portal.phaenobiotech.com"
readonly WEBHOOK_URL="https://api.phaenobiotech.com/api/integrations/mailgun/invitations"

temp=""
curl_config=""
response=""

cleanup() {
    if [[ -n "${temp}" ]]; then rm -f "${temp}"; fi
    if [[ -n "${curl_config}" ]]; then rm -f "${curl_config}"; fi
    if [[ -n "${response}" ]]; then rm -f "${response}"; fi
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
command -v curl >/dev/null || { printf 'curl is required.\n' >&2; exit 1; }
command -v grep >/dev/null || { printf 'grep is required.\n' >&2; exit 1; }
command -v sed >/dev/null || { printf 'sed is required.\n' >&2; exit 1; }

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

if [[ "${mailgun_url}" =~ ^(https://api(\.eu)?\.mailgun\.net)/v3/([A-Za-z0-9.-]+)/?$ ]]; then
    api_origin="${BASH_REMATCH[1]}"
    mailgun_domain="${BASH_REMATCH[3]}"
else
    printf 'Production Mailgun API URL is invalid.\n' >&2
    exit 1
fi
[[ "${mailgun_resource}" == 'messages' ]] || {
    printf 'Production Mailgun resource must be messages.\n' >&2
    exit 1
}
[[ "${#mailgun_api_key}" -ge 20 && "${mailgun_api_key}" =~ ^[A-Za-z0-9._-]+$ ]] || {
    printf 'Production Mailgun API key is invalid.\n' >&2
    exit 1
}
[[ "${mailgun_sender}" == *'@'*.* ]] || {
    printf 'Production Mailgun sender is invalid.\n' >&2
    exit 1
}

curl_config="$(mktemp "${RUNTIME_DIR}/mailgun-curl.XXXXXX")"
response="$(mktemp "${RUNTIME_DIR}/mailgun-response.XXXXXX")"
printf 'user = "api:%s"\n' "${mailgun_api_key}" > "${curl_config}"
chmod 600 "${curl_config}" "${response}"

curl --fail --silent --show-error \
    --config "${curl_config}" \
    --output "${response}" \
    "${api_origin}/v5/accounts/http_signing_key"
webhook_signing_key="$(sed -n 's/.*"http_signing_key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${response}")"
[[ "${#webhook_signing_key}" -ge 20 ]] || {
    printf 'Mailgun did not return a valid webhook signing key.\n' >&2
    exit 1
}

curl --fail --silent --show-error \
    --request PUT \
    --config "${curl_config}" \
    --output "${response}" \
    --data-urlencode "url=${WEBHOOK_URL}" \
    --data-urlencode 'event_types=delivered' \
    --data-urlencode 'event_types=permanent_fail' \
    "${api_origin}/v4/domains/${mailgun_domain}/webhooks"

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

printf 'Validated existing Mailgun delivery and installed signed invitation webhook configuration.\n'
