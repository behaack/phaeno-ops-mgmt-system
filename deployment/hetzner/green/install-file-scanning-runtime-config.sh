#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly TARGET="${RUNTIME_DIR}/portal.env"
readonly RECEIPT="${RUNTIME_DIR}/file-scanning-rollback.env"
[[ -d "${RUNTIME_DIR}" && -f "${TARGET}" && ! -L "${TARGET}" && -r "${TARGET}" && -w "${TARGET}" ]] || {
    printf 'A protected Portal runtime environment file is required.\n' >&2; exit 1;
}
IFS= read -r selection
if IFS= read -r _; then printf 'Unexpected extra scanner configuration input.\n' >&2; exit 1; fi
[[ "${selection}" == Preserve || "${selection}" == ClamAv || "${selection}" == Disabled || "${selection}" == Restore || "${selection}" == Complete ]] || {
    printf 'Scanner selection must be Preserve, ClamAv or Disabled.\n' >&2; exit 1;
}
if [[ "${FILE_STORAGE_DEPLOY_LOCK_HELD:-false}" != true ]]; then
    exec 9>"${RUNTIME_DIR}/deploy.lock"
    flock --exclusive 9
fi
scanner_lines() { grep -E '^FileScanning__(Provider|Host|Port|TimeoutSeconds|MaximumStreamBytes|ClamAvLimitsConfirmed)=' "$1" || true; }
scanner_hash() { scanner_lines "$1" | sha256sum | cut -d ' ' -f 1; }
temp=""; receipt_temp=""
trap '[[ -z "${temp}" ]] || rm -f "${temp}"; [[ -z "${receipt_temp}" ]] || rm -f "${receipt_temp}"' EXIT
if [[ "${selection}" == Restore || "${selection}" == Complete ]]; then
    [[ -e "${RECEIPT}" ]] || exit 0
    [[ -f "${RECEIPT}" && ! -L "${RECEIPT}" ]] || { printf 'Invalid scanner rollback receipt.\n' >&2; exit 1; }
    IFS= read -r expected_line < "${RECEIPT}"
    [[ "${expected_line}" =~ ^expected_sha256=([0-9a-f]{64})$ ]] || { printf 'Invalid scanner rollback fingerprint.\n' >&2; exit 1; }
    expected_hash="${BASH_REMATCH[1]}"
    current_hash="$(scanner_hash "${TARGET}")"
    if [[ "${current_hash}" == "$(scanner_hash "${RECEIPT}")" ]]; then rm -f "${RECEIPT}"; exit 0; fi
    [[ "${current_hash}" == "${expected_hash}" ]] || {
        printf 'Scanner settings changed after selection; refusing to overwrite unreviewed settings.\n' >&2; exit 1;
    }
    if [[ "${selection}" == Restore ]]; then
        temp="$(mktemp "${RUNTIME_DIR}/portal.env.scanner-restore.XXXXXX")"
        while IFS= read -r line || [[ -n "${line}" ]]; do
            case "${line}" in
                FileScanning__Provider=*|FileScanning__Host=*|FileScanning__Port=*|FileScanning__TimeoutSeconds=*|FileScanning__MaximumStreamBytes=*|FileScanning__ClamAvLimitsConfirmed=*) ;;
                *) printf '%s\n' "${line}" >> "${temp}" ;;
            esac
        done < "${TARGET}"
        scanner_lines "${RECEIPT}" >> "${temp}"
        chmod 600 "${temp}"; mv -f "${temp}" "${TARGET}"; temp=""
        printf 'Restored prior scanner settings before API image rollback.\n'
    fi
    rm -f "${RECEIPT}"
    exit 0
fi
if [[ "${selection}" == Preserve ]]; then printf 'Preserving existing scanner configuration.\n'; exit 0; fi
[[ ! -e "${RECEIPT}" ]] || { printf 'An earlier scanner selection awaits rollout or recovery. Use Preserve to finish that release first.\n' >&2; exit 1; }
if [[ "${selection}" == ClamAv ]] && grep -qx 'FileScanning__Provider=ClamAv' "${TARGET}" && ! grep -qx 'FileScanning__Host=scanner' "${TARGET}"; then
    printf 'A different ClamAV endpoint is configured; review it before switching to the managed scanner.\n' >&2; exit 1
fi
temp="$(mktemp "${RUNTIME_DIR}/portal.env.scanner.XXXXXX")"
while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        FileScanning__Provider=*) ;;
        FileScanning__Host=*|FileScanning__Port=*|FileScanning__TimeoutSeconds=*|FileScanning__MaximumStreamBytes=*|FileScanning__ClamAvLimitsConfirmed=*)
            [[ "${selection}" == ClamAv ]] || printf '%s\n' "${line}" >> "${temp}" ;;
        *) printf '%s\n' "${line}" >> "${temp}" ;;
    esac
done < "${TARGET}"
printf 'FileScanning__Provider=%s\n' "${selection}" >> "${temp}"
if [[ "${selection}" == ClamAv ]]; then
    printf 'FileScanning__Host=scanner\nFileScanning__Port=3310\nFileScanning__TimeoutSeconds=120\nFileScanning__MaximumStreamBytes=104857600\nFileScanning__ClamAvLimitsConfirmed=true\n' >> "${temp}"
fi
chmod 600 "${temp}"
receipt_temp="$(mktemp "${RUNTIME_DIR}/file-scanning-rollback.XXXXXX")"
printf 'expected_sha256=%s\n' "$(scanner_hash "${temp}")" > "${receipt_temp}"
scanner_lines "${TARGET}" >> "${receipt_temp}"
chmod 600 "${receipt_temp}"
mv -f "${receipt_temp}" "${RECEIPT}"; receipt_temp=""
mv -f "${temp}" "${TARGET}"; temp=""
printf 'Installed explicitly selected %s scanning. Managed scanner checks precede API replacement.\n' "${selection}"
