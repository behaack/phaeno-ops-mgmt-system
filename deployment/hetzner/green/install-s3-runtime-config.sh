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
IFS= read -r bucket_line
IFS= read -r region_line
IFS= read -r prefix_line
IFS= read -r access_key_line
IFS= read -r secret_key_line

if IFS= read -r _; then
    printf 'Unexpected extra S3 runtime configuration input.\n' >&2
    exit 1
fi

[[ "${provider_line}" == 'FileStorage__Provider=S3' ]] || {
    printf 'Invalid file-storage provider input.\n' >&2
    exit 1
}

case "${bucket_line}" in
    FileStorage__S3__BucketName=?*) ;;
    *)
        printf 'Invalid S3 bucket input.\n' >&2
        exit 1
        ;;
esac
bucket_name="${bucket_line#FileStorage__S3__BucketName=}"
[[ "${#bucket_name}" -ge 3 && "${#bucket_name}" -le 63
    && "${bucket_name}" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$
    && "${bucket_name}" != *..*
    && ! "${bucket_name}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    printf 'Invalid S3 bucket name.\n' >&2
    exit 1
}

case "${region_line}" in
    FileStorage__S3__Region=?*) ;;
    *)
        printf 'Invalid S3 region input.\n' >&2
        exit 1
        ;;
esac
region="${region_line#FileStorage__S3__Region=}"
[[ "${region}" =~ ^[a-z]{2}(-gov)?-[a-z0-9-]+-[0-9]+$ ]] || {
    printf 'Invalid S3 region.\n' >&2
    exit 1
}

case "${prefix_line}" in
    FileStorage__S3__KeyPrefix=?*) ;;
    *)
        printf 'Invalid S3 key-prefix input.\n' >&2
        exit 1
        ;;
esac
key_prefix="${prefix_line#FileStorage__S3__KeyPrefix=}"
[[ "${key_prefix}" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*[A-Za-z0-9]$
    && "${key_prefix}" != *..*
    && "${key_prefix}" != *//* ]] || {
    printf 'Invalid S3 key prefix.\n' >&2
    exit 1
}

case "${access_key_line}" in
    AWS_ACCESS_KEY_ID=?*) ;;
    *)
        printf 'Invalid AWS access-key input.\n' >&2
        exit 1
        ;;
esac
access_key_id="${access_key_line#AWS_ACCESS_KEY_ID=}"
[[ "${access_key_id}" =~ ^[A-Z0-9]{16,128}$ ]] || {
    printf 'Invalid AWS access-key identifier.\n' >&2
    exit 1
}

case "${secret_key_line}" in
    AWS_SECRET_ACCESS_KEY=?*) ;;
    *)
        printf 'Invalid AWS secret-key input.\n' >&2
        exit 1
        ;;
esac
secret_access_key="${secret_key_line#AWS_SECRET_ACCESS_KEY=}"
[[ "${secret_access_key}" =~ ^[A-Za-z0-9/+=]{40,256}$ ]] || {
    printf 'Invalid AWS secret access key.\n' >&2
    exit 1
}

temp="$(mktemp "${RUNTIME_DIR}/portal.env.s3.XXXXXX")"
provider_found=0
bucket_found=0
region_found=0
prefix_found=0
access_key_found=0
secret_key_found=0

while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
        FileStorage__Provider=*)
            if [[ "${provider_found}" -eq 0 ]]; then
                printf '%s\n' "${provider_line}" >> "${temp}"
                provider_found=1
            fi
            ;;
        FileStorage__S3__BucketName=*)
            if [[ "${bucket_found}" -eq 0 ]]; then
                printf '%s\n' "${bucket_line}" >> "${temp}"
                bucket_found=1
            fi
            ;;
        FileStorage__S3__Region=*)
            if [[ "${region_found}" -eq 0 ]]; then
                printf '%s\n' "${region_line}" >> "${temp}"
                region_found=1
            fi
            ;;
        FileStorage__S3__KeyPrefix=*)
            if [[ "${prefix_found}" -eq 0 ]]; then
                printf '%s\n' "${prefix_line}" >> "${temp}"
                prefix_found=1
            fi
            ;;
        AWS_ACCESS_KEY_ID=*)
            if [[ "${access_key_found}" -eq 0 ]]; then
                printf '%s\n' "${access_key_line}" >> "${temp}"
                access_key_found=1
            fi
            ;;
        AWS_SECRET_ACCESS_KEY=*)
            if [[ "${secret_key_found}" -eq 0 ]]; then
                printf '%s\n' "${secret_key_line}" >> "${temp}"
                secret_key_found=1
            fi
            ;;
        *)
            printf '%s\n' "${line}" >> "${temp}"
            ;;
    esac
done < "${TARGET}"

[[ "${provider_found}" -eq 1 ]] || printf '%s\n' "${provider_line}" >> "${temp}"
[[ "${bucket_found}" -eq 1 ]] || printf '%s\n' "${bucket_line}" >> "${temp}"
[[ "${region_found}" -eq 1 ]] || printf '%s\n' "${region_line}" >> "${temp}"
[[ "${prefix_found}" -eq 1 ]] || printf '%s\n' "${prefix_line}" >> "${temp}"
[[ "${access_key_found}" -eq 1 ]] || printf '%s\n' "${access_key_line}" >> "${temp}"
[[ "${secret_key_found}" -eq 1 ]] || printf '%s\n' "${secret_key_line}" >> "${temp}"

chmod 600 "${temp}"
mv -f "${temp}" "${TARGET}"
temp=""

printf 'Installed S3 runtime configuration.\n'
