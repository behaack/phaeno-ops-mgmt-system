#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly DEPLOY_ROOT="${1:?Deploy root is required}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly TARGET="${RUNTIME_DIR}/portal.env"
readonly RECEIPT="${RUNTIME_DIR}/file-storage-rollback.env"
[[ -d "${RUNTIME_DIR}" && -f "${TARGET}" && ! -L "${TARGET}" && -r "${TARGET}" && -w "${TARGET}" ]] || {
    printf 'A protected Portal runtime environment file is required.\n' >&2; exit 1;
}
IFS= read -r selection
if IFS= read -r _; then printf 'Unexpected extra storage configuration input.\n' >&2; exit 1; fi
[[ "${selection}" == Preserve || "${selection}" == Local || "${selection}" == Disabled || "${selection}" == Restore || "${selection}" == Complete ]] || {
    printf 'Storage selection must be Preserve, Local or Disabled.\n' >&2; exit 1;
}
if [[ "${FILE_STORAGE_DEPLOY_LOCK_HELD:-false}" != true ]]; then
    exec 9>"${RUNTIME_DIR}/deploy.lock"
    flock --exclusive 9
fi
storage_lines() { grep -E '^FileStorage__(Provider|LocalRootPath|LocalPersistentVolumeConfirmed)=' "$1" || true; }
storage_hash() { storage_lines "$1" | sha256sum | cut -d ' ' -f 1; }
temp=""
receipt_temp=""
trap '[[ -z "${temp}" ]] || rm -f "${temp}"; [[ -z "${receipt_temp}" ]] || rm -f "${receipt_temp}"' EXIT
if [[ "${selection}" == Restore || "${selection}" == Complete ]]; then
    [[ -e "${RECEIPT}" ]] || exit 0
    [[ -f "${RECEIPT}" && ! -L "${RECEIPT}" ]] || { printf 'Invalid storage rollback receipt.\n' >&2; exit 1; }
    IFS= read -r expected_line < "${RECEIPT}"
    [[ "${expected_line}" =~ ^expected_sha256=([0-9a-f]{64})$ ]] || { printf 'Invalid storage rollback fingerprint.\n' >&2; exit 1; }
    expected_hash="${BASH_REMATCH[1]}"
    current_hash="$(storage_hash "${TARGET}")"
    if [[ "${current_hash}" == "$(storage_hash "${RECEIPT}")" ]]; then
        rm -f "${RECEIPT}"
        exit 0
    fi
    [[ "${current_hash}" == "${expected_hash}" ]] || {
        printf 'Storage settings changed after selection; refusing to overwrite unreviewed settings during recovery.\n' >&2; exit 1;
    }
    if [[ "${selection}" == Restore ]]; then
        temp="$(mktemp "${RUNTIME_DIR}/portal.env.file-storage-restore.XXXXXX")"
        while IFS= read -r line || [[ -n "${line}" ]]; do
            case "${line}" in
                FileStorage__Provider=*|FileStorage__LocalRootPath=*|FileStorage__LocalPersistentVolumeConfirmed=*) ;;
                *) printf '%s\n' "${line}" >> "${temp}" ;;
            esac
        done < "${TARGET}"
        storage_lines "${RECEIPT}" >> "${temp}"
        chmod 600 "${temp}"; mv -f "${temp}" "${TARGET}"; temp=""
        printf 'Restored prior file-storage settings before API image rollback. No bytes were moved.\n'
    fi
    rm -f "${RECEIPT}"
    exit 0
fi
if [[ "${selection}" == Preserve ]]; then
    printf 'Preserving the existing file-storage provider and configuration.\n'
    exit 0
fi
[[ ! -e "${RECEIPT}" ]] || {
    printf 'An earlier storage selection awaits rollout or recovery. Use Preserve to finish that release first.\n' >&2; exit 1;
}
if [[ "${selection}" == Local ]] && grep -E '^FileStorage__LocalRootPath=.+$' "${TARGET}" | grep -vx 'FileStorage__LocalRootPath=/var/lib/phaeno-portal/files' >/dev/null; then
    printf 'A different local root is recorded. Inventory its referenced bytes and explicitly migrate/configure it before selecting the managed volume.\n' >&2
    exit 1
fi
if [[ "${selection}" == Local ]] && grep -iqx 'FileStorage__Provider=S3' "${TARGET}"; then
    printf 'S3-to-Local switching requires an explicit verified data migration and separate runtime configuration.\n' >&2
    exit 1
fi
temp="$(mktemp "${RUNTIME_DIR}/portal.env.file-storage.XXXXXX")"
while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        FileStorage__Provider=*) ;;
        FileStorage__LocalRootPath=*|FileStorage__LocalPersistentVolumeConfirmed=*)
            [[ "${selection}" == Local ]] || printf '%s\n' "${line}" >> "${temp}" ;;
        *) printf '%s\n' "${line}" >> "${temp}" ;;
    esac
done < "${TARGET}"
printf 'FileStorage__Provider=%s\n' "${selection}" >> "${temp}"
if [[ "${selection}" == Local ]]; then
    printf 'FileStorage__LocalRootPath=/var/lib/phaeno-portal/files\nFileStorage__LocalPersistentVolumeConfirmed=true\n' >> "${temp}"
fi
chmod 600 "${temp}"
receipt_temp="$(mktemp "${RUNTIME_DIR}/file-storage-rollback.XXXXXX")"
printf 'expected_sha256=%s\n' "$(storage_hash "${temp}")" > "${receipt_temp}"
storage_lines "${TARGET}" >> "${receipt_temp}"
chmod 600 "${receipt_temp}"
mv -f "${receipt_temp}" "${RECEIPT}"; receipt_temp=""
mv -f "${temp}" "${TARGET}"
temp=""
printf 'Installed explicitly selected %s file storage. No file bytes were moved.\n' "${selection}"
