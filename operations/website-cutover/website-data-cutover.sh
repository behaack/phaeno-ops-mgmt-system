#!/usr/bin/env bash

set -Eeuo pipefail

umask 077

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SQL_DIR="${SCRIPT_DIR}/sql"
readonly SOURCE_SERVICE="${WEBSITE_SOURCE_PGSERVICE:-website-source}"
readonly DESTINATION_SERVICE="${PORTAL_DESTINATION_PGSERVICE:-portal-destination}"

usage() {
    cat <<'USAGE'
Usage: website-data-cutover.sh snapshot|import|verify|verify-documents

Required environment:
  SNAPSHOT_DIR                      Protected directory outside the repository
  PGSERVICEFILE                     Required by database commands
  WEBSITE_DOCUMENTS_DIR             Required by snapshot
  PORTAL_DOCUMENTS_DIR              Required by verify-documents

Optional service names:
  WEBSITE_SOURCE_PGSERVICE          Default: website-source
  PORTAL_DESTINATION_PGSERVICE      Default: portal-destination

Required for destination writes:
  ALLOW_PORTAL_WEBSITE_IMPORT=YES
USAGE
}

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 \
        || fail "Required command '$1' is not available."
}

validate_service_name() {
    local service_name="$1"
    [[ "${service_name}" =~ ^[A-Za-z0-9_.-]+$ ]] \
        || fail "PostgreSQL service names may contain only letters, numbers, '.', '_' and '-'."
}

prepare_common() {
    [[ -n "${SNAPSHOT_DIR:-}" ]] \
        || fail "SNAPSHOT_DIR is required."

    require_command sha256sum
    require_command realpath
}

prepare_database_connections() {
    [[ -n "${PGSERVICEFILE:-}" ]] \
        || fail "PGSERVICEFILE must point to the private libpq service file."
    [[ -f "${PGSERVICEFILE}" ]] \
        || fail "PGSERVICEFILE does not exist or is not a regular file."

    local service_mode
    require_command stat
    service_mode="$(stat -c '%a' "${PGSERVICEFILE}")"
    (( 10#${service_mode} % 100 == 0 )) \
        || fail "PGSERVICEFILE must not be accessible by group or other users."

    validate_service_name "${SOURCE_SERVICE}"
    validate_service_name "${DESTINATION_SERVICE}"
    require_command psql
}

source_psql() {
    psql "service=${SOURCE_SERVICE}" \
        --no-psqlrc \
        --set=ON_ERROR_STOP=1 \
        "$@"
}

destination_psql() {
    psql "service=${DESTINATION_SERVICE}" \
        --no-psqlrc \
        --set=ON_ERROR_STOP=1 \
        "$@"
}

resolve_existing_snapshot_dir() {
    [[ -d "${SNAPSHOT_DIR}" ]] \
        || fail "Snapshot directory '${SNAPSHOT_DIR}' does not exist."
    SNAPSHOT_DIR="$(realpath "${SNAPSHOT_DIR}")"
    readonly SNAPSHOT_DIR
}

verify_snapshot_checksums() {
    local required_files=(
        "SHA256SUMS"
        "legacy-website.dump"
        "legacy-website.dump.list"
        "source-fingerprint.csv"
        "source-preflight.txt"
        "web_contacts.csv"
        "web_orders.csv"
        "website-documents.sha256"
        "website-documents.summary"
        "website-documents.tar"
        "website-documents.tar.list"
        "website-staging.sql"
    )

    local file_name
    for file_name in "${required_files[@]}"; do
        [[ -f "${SNAPSHOT_DIR}/${file_name}" ]] \
            || fail "Snapshot artifact '${file_name}' is missing."
    done

    (
        cd "${SNAPSHOT_DIR}"
        sha256sum --check --strict SHA256SUMS
    )
}

create_snapshot() {
    prepare_database_connections
    require_command pg_dump
    require_command pg_restore
    require_command tar
    require_command find
    require_command sort
    require_command xargs
    require_command awk
    require_command wc

    [[ -n "${WEBSITE_DOCUMENTS_DIR:-}" ]] \
        || fail "WEBSITE_DOCUMENTS_DIR is required for a complete snapshot."
    [[ -d "${WEBSITE_DOCUMENTS_DIR}" ]] \
        || fail "WEBSITE_DOCUMENTS_DIR does not exist or is not a directory."

    if [[ -e "${SNAPSHOT_DIR}" ]] \
        && [[ -n "$(find "${SNAPSHOT_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
        fail "SNAPSHOT_DIR must be new or empty."
    fi

    mkdir -p "${SNAPSHOT_DIR}"
    chmod 700 "${SNAPSHOT_DIR}"
    SNAPSHOT_DIR="$(realpath "${SNAPSHOT_DIR}")"
    readonly SNAPSHOT_DIR

    source_psql \
        --file="${SQL_DIR}/source-preflight.sql" \
        | tee "${SNAPSHOT_DIR}/source-preflight.txt"

    pg_dump "service=${SOURCE_SERVICE}" \
        --format=custom \
        --no-owner \
        --no-privileges \
        --table='public."WebContacts"' \
        --table='public."WebOrders"' \
        --file="${SNAPSHOT_DIR}/legacy-website.dump"

    pg_restore \
        --list "${SNAPSHOT_DIR}/legacy-website.dump" \
        > "${SNAPSHOT_DIR}/legacy-website.dump.list"

    source_psql \
        --csv \
        --command='SELECT "Id" AS id, "FirstName" AS first_name, "LastName" AS last_name, "OrganizationName" AS organization_name, "Email" AS email, "NormalizedEmail" AS normalized_email, "SendBrochure" AS send_brochure, to_char("CreatedAtUtc" AT TIME ZONE '\''UTC'\'', '\''YYYY-MM-DD"T"HH24:MI:SS.US"Z"'\'') AS created_at_utc FROM public."WebContacts" ORDER BY "Id";' \
        > "${SNAPSHOT_DIR}/web_contacts.csv"

    source_psql \
        --csv \
        --command='SELECT "Id" AS id, "FirstName" AS first_name, "LastName" AS last_name, "OrganizationName" AS organization_name, "Email" AS email, "Description" AS description FROM public."WebOrders" ORDER BY "Id";' \
        > "${SNAPSHOT_DIR}/web_orders.csv"

    source_psql \
        --quiet \
        --tuples-only \
        --no-align \
        --file="${SQL_DIR}/source-export-staging.sql" \
        > "${SNAPSHOT_DIR}/website-staging.sql"

    source_psql \
        --quiet \
        --tuples-only \
        --no-align \
        --field-separator=',' \
        --file="${SQL_DIR}/source-fingerprint.sql" \
        > "${SNAPSHOT_DIR}/source-fingerprint.csv"

    (
        cd "${WEBSITE_DOCUMENTS_DIR}"
        find . -type f -print0 \
            | sort --zero-terminated \
            | xargs --null --no-run-if-empty sha256sum
    ) > "${SNAPSHOT_DIR}/website-documents.sha256"

    {
        printf 'file_count='
        find "${WEBSITE_DOCUMENTS_DIR}" -type f -printf '.' | wc -c
        printf 'total_bytes='
        find "${WEBSITE_DOCUMENTS_DIR}" -type f -printf '%s\n' \
            | awk '{ total += $1 } END { print total + 0 }'
    } > "${SNAPSHOT_DIR}/website-documents.summary"

    tar \
        --create \
        --format=posix \
        --file="${SNAPSHOT_DIR}/website-documents.tar" \
        --directory="${WEBSITE_DOCUMENTS_DIR}" \
        .

    tar \
        --list \
        --file="${SNAPSHOT_DIR}/website-documents.tar" \
        > "${SNAPSHOT_DIR}/website-documents.tar.list"

    chmod 600 "${SNAPSHOT_DIR}"/*

    (
        cd "${SNAPSHOT_DIR}"
        sha256sum \
            legacy-website.dump \
            legacy-website.dump.list \
            source-fingerprint.csv \
            source-preflight.txt \
            web_contacts.csv \
            web_orders.csv \
            website-documents.sha256 \
            website-documents.summary \
            website-documents.tar \
            website-documents.tar.list \
            website-staging.sql \
            > SHA256SUMS
        chmod 600 SHA256SUMS
    )

    printf 'Snapshot created at %s\n' "${SNAPSHOT_DIR}"
    printf 'Source fingerprint:\n'
    cat "${SNAPSHOT_DIR}/source-fingerprint.csv"
}

import_snapshot() {
    prepare_database_connections
    [[ "${ALLOW_PORTAL_WEBSITE_IMPORT:-}" == "YES" ]] \
        || fail "Set ALLOW_PORTAL_WEBSITE_IMPORT=YES to authorize destination writes."

    resolve_existing_snapshot_dir
    verify_snapshot_checksums

    destination_psql \
        --file="${SQL_DIR}/destination-begin.sql" \
        --file="${SNAPSHOT_DIR}/website-staging.sql" \
        --file="${SQL_DIR}/destination-upsert.sql" \
        --file="${SQL_DIR}/destination-verify.sql" \
        --command=COMMIT \
        | tee "${SNAPSHOT_DIR}/destination-import.txt"

    chmod 600 "${SNAPSHOT_DIR}/destination-import.txt"
    printf 'Portal Website import committed and verified.\n'
}

verify_snapshot() {
    prepare_database_connections
    resolve_existing_snapshot_dir
    verify_snapshot_checksums

    destination_psql \
        --file="${SQL_DIR}/destination-begin.sql" \
        --file="${SNAPSHOT_DIR}/website-staging.sql" \
        --file="${SQL_DIR}/destination-verify.sql" \
        --command=ROLLBACK \
        | tee "${SNAPSHOT_DIR}/destination-verification.txt"

    chmod 600 "${SNAPSHOT_DIR}/destination-verification.txt"
    printf 'Portal Website snapshot verification passed; transaction rolled back.\n'
}

verify_documents() {
    [[ -n "${PORTAL_DOCUMENTS_DIR:-}" ]] \
        || fail "PORTAL_DOCUMENTS_DIR is required."
    [[ -d "${PORTAL_DOCUMENTS_DIR}" ]] \
        || fail "PORTAL_DOCUMENTS_DIR does not exist or is not a directory."

    resolve_existing_snapshot_dir
    verify_snapshot_checksums

    (
        cd "${PORTAL_DOCUMENTS_DIR}"
        sha256sum \
            --check \
            --strict \
            "${SNAPSHOT_DIR}/website-documents.sha256"
    )

    printf 'Portal documents match every file in the Website snapshot.\n'
}

main() {
    [[ $# -eq 1 ]] || {
        usage
        exit 2
    }

    prepare_common

    case "$1" in
        snapshot)
            create_snapshot
            ;;
        import)
            import_snapshot
            ;;
        verify)
            verify_snapshot
            ;;
        verify-documents)
            verify_documents
            ;;
        *)
            usage
            exit 2
            ;;
    esac
}

main "$@"
