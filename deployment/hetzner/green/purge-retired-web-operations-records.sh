#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 \
        || fail "Required command '$1' is not available."
}

[[ $# -eq 5 ]] \
    || fail "Usage: purge-retired-web-operations-records.sh DEPLOY_ROOT MODE BACKUP_PUBLIC_KEY_PATH SOURCE_REVISION PURGE_GUARD"

readonly DEPLOY_ROOT="$1"
readonly MODE="$2"
readonly BACKUP_PUBLIC_KEY_PATH="$3"
readonly SOURCE_REVISION="$4"
readonly PURGE_GUARD="$5"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly DEPLOY_LOCK="${RUNTIME_DIR}/deploy.lock"
readonly DATABASE_CONTAINER="phaeno-portal-green-db"
readonly BACKUP_ROOT="/var/backups/phaeno-portal-maintenance"

[[ "${DEPLOY_ROOT}" == /* ]] \
    || fail "DEPLOY_ROOT must be an absolute path."
[[ "${MODE}" == "preview" || "${MODE}" == "delete" ]] \
    || fail "MODE must be preview or delete."
[[ "${SOURCE_REVISION}" =~ ^[0-9a-f]{40}$ ]] \
    || fail "SOURCE_REVISION must be a full lowercase Git commit SHA."
[[ -d "${RUNTIME_DIR}" ]] \
    || fail "Portal runtime directory '${RUNTIME_DIR}' was not found."

for command in date docker flock openssl sha256sum shred; do
    require_command "${command}"
done

[[ "$(docker inspect "${DATABASE_CONTAINER}" --format '{{.State.Running}}' 2>/dev/null)" == "true" ]] \
    || fail "Portal production database container is not running."

exec 9>"${DEPLOY_LOCK}"
flock --exclusive 9

readonly DATABASE_USER="$(
    docker exec "${DATABASE_CONTAINER}" printenv POSTGRES_USER
)"
readonly DATABASE_NAME="$(
    docker exec "${DATABASE_CONTAINER}" printenv POSTGRES_DB
)"

[[ -n "${DATABASE_USER}" && -n "${DATABASE_NAME}" ]] \
    || fail "Portal database identity could not be resolved from the production container."

psql_portal() {
    docker exec -i "${DATABASE_CONTAINER}" \
        psql \
        --username "${DATABASE_USER}" \
        --dbname "${DATABASE_NAME}" \
        --no-psqlrc \
        --set ON_ERROR_STOP=1 \
        "$@"
}

psql_portal --quiet <<'SQL' >/dev/null
DO $$
BEGIN
    IF to_regclass('website.web_contacts') IS NULL THEN
        RAISE EXCEPTION 'Required table website.web_contacts was not found.';
    END IF;

    IF to_regclass('website.web_orders') IS NULL THEN
        RAISE EXCEPTION 'Required table website.web_orders was not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'website'
          AND table_name = 'web_contacts'
          AND column_name = 'unsubscribed_at_utc'
    ) THEN
        RAISE EXCEPTION 'Required column website.web_contacts.unsubscribed_at_utc was not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'website'
          AND table_name = 'web_orders'
          AND column_name = 'completed_at_utc'
    ) THEN
        RAISE EXCEPTION 'Required column website.web_orders.completed_at_utc was not found.';
    END IF;
END
$$;
SQL

readonly CUTOFF_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
counts_before="$(
    psql_portal \
        --quiet \
        --tuples-only \
        --no-align \
        --field-separator='|' \
        --set cutoff="${CUTOFF_UTC}" <<'SQL'
SELECT
    (SELECT count(*) FROM website.web_contacts),
    (SELECT count(*) FROM website.web_orders),
    (
        SELECT count(*)
        FROM website.web_contacts
        WHERE unsubscribed_at_utc IS NOT NULL
          AND unsubscribed_at_utc <= :'cutoff'::timestamptz
    ),
    (
        SELECT count(*)
        FROM website.web_orders
        WHERE completed_at_utc IS NOT NULL
          AND completed_at_utc <= :'cutoff'::timestamptz
    );
SQL
)"

IFS='|' read -r \
    contacts_before \
    orders_before \
    contact_candidates \
    order_candidates <<< "${counts_before}"

for count in \
    "${contacts_before}" \
    "${orders_before}" \
    "${contact_candidates}" \
    "${order_candidates}"; do
    [[ "${count}" =~ ^[0-9]+$ ]] \
        || fail "Production candidate counts could not be parsed."
done

printf 'Web Operations cleanup %s found %s unsubscribed mailing-list contact(s) and %s completed demo request(s).\n' \
    "${MODE}" \
    "${contact_candidates}" \
    "${order_candidates}" >&2

deleted_contacts=0
deleted_orders=0
contacts_after="${contacts_before}"
orders_after="${orders_before}"
backup_created=false
backup_base="not-created"
database_dump=""
database_passphrase=""

cleanup() {
    local status=$?
    trap - EXIT

    for sensitive_path in "${database_dump}" "${database_passphrase}"; do
        if [[ -n "${sensitive_path}" && -f "${sensitive_path}" ]]; then
            shred --remove "${sensitive_path}" || rm -f "${sensitive_path}"
        fi
    done

    exit "${status}"
}
trap cleanup EXIT

if [[ "${MODE}" == "delete" ]]; then
    [[ "${PURGE_GUARD}" == "YES" ]] \
        || fail "Set the explicit production purge guard before deleting records."
    [[ -s "${BACKUP_PUBLIC_KEY_PATH}" ]] \
        || fail "The cleanup-backup public key is missing."

    openssl pkey \
        -pubin \
        -in "${BACKUP_PUBLIC_KEY_PATH}" \
        -noout

    install -d -m 700 "${BACKUP_ROOT}"

    readonly BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
    backup_base="${BACKUP_ROOT}/pre-web-ops-purge-${BACKUP_TIMESTAMP}-${SOURCE_REVISION:0:12}"
    database_dump="${backup_base}.dump"
    database_passphrase="${backup_base}.pass"
    readonly ENCRYPTED_DUMP="${backup_base}.dump.enc"
    readonly ENCRYPTED_KEY="${backup_base}.key.enc"
    readonly ENCRYPTED_CHECKSUMS="${backup_base}.encrypted.sha256"
    readonly PURGE_MANIFEST="${backup_base}.purge.txt"

    docker exec "${DATABASE_CONTAINER}" \
        pg_dump \
        --username "${DATABASE_USER}" \
        --dbname "${DATABASE_NAME}" \
        --format custom \
        --no-owner \
        --no-privileges \
        > "${database_dump}"

    docker run \
        --rm \
        --user 0:0 \
        --volume "${database_dump}:/backup/database.dump:ro" \
        postgres:17 \
        pg_restore --list /backup/database.dump \
        > /dev/null

    openssl rand -base64 48 > "${database_passphrase}"
    openssl enc \
        -aes-256-cbc \
        -salt \
        -pbkdf2 \
        -iter 250000 \
        -pass "file:${database_passphrase}" \
        -in "${database_dump}" \
        -out "${ENCRYPTED_DUMP}"
    openssl pkeyutl \
        -encrypt \
        -pubin \
        -inkey "${BACKUP_PUBLIC_KEY_PATH}" \
        -pkeyopt rsa_padding_mode:oaep \
        -pkeyopt rsa_oaep_md:sha256 \
        -pkeyopt rsa_mgf1_md:sha256 \
        -in "${database_passphrase}" \
        -out "${ENCRYPTED_KEY}"

    (
        cd "${BACKUP_ROOT}"
        sha256sum \
            "$(basename "${ENCRYPTED_DUMP}")" \
            "$(basename "${ENCRYPTED_KEY}")" \
            > "${ENCRYPTED_CHECKSUMS}"
        sha256sum --check --strict "$(basename "${ENCRYPTED_CHECKSUMS}")"
    )
    chmod 600 "${ENCRYPTED_DUMP}" "${ENCRYPTED_KEY}" "${ENCRYPTED_CHECKSUMS}"

    shred --remove "${database_dump}" "${database_passphrase}"
    database_dump=""
    database_passphrase=""
    backup_created=true

    delete_counts="$(
        psql_portal \
            --quiet \
            --tuples-only \
            --no-align \
            --field-separator='|' \
            --set cutoff="${CUTOFF_UTC}" \
            --set expected_contacts="${contact_candidates}" \
            --set expected_orders="${order_candidates}" <<'SQL'
BEGIN;
LOCK TABLE website.web_contacts, website.web_orders IN SHARE ROW EXCLUSIVE MODE;

SELECT (
    (
        SELECT count(*)
        FROM website.web_contacts
        WHERE unsubscribed_at_utc IS NOT NULL
          AND unsubscribed_at_utc <= :'cutoff'::timestamptz
    ) = :expected_contacts::bigint
    AND
    (
        SELECT count(*)
        FROM website.web_orders
        WHERE completed_at_utc IS NOT NULL
          AND completed_at_utc <= :'cutoff'::timestamptz
    ) = :expected_orders::bigint
) AS candidates_unchanged
\gset

\if :candidates_unchanged
\else
    ROLLBACK;
    \echo 'Candidate counts changed before deletion; no records were removed.'
    \quit 3
\endif

WITH deleted_contact_rows AS (
    DELETE FROM website.web_contacts
    WHERE unsubscribed_at_utc IS NOT NULL
      AND unsubscribed_at_utc <= :'cutoff'::timestamptz
    RETURNING 1
),
deleted_order_rows AS (
    DELETE FROM website.web_orders
    WHERE completed_at_utc IS NOT NULL
      AND completed_at_utc <= :'cutoff'::timestamptz
    RETURNING 1
)
SELECT
    (SELECT count(*) FROM deleted_contact_rows),
    (SELECT count(*) FROM deleted_order_rows);

COMMIT;
SQL
    )"

    IFS='|' read -r deleted_contacts deleted_orders <<< "${delete_counts}"
    [[ "${deleted_contacts}" == "${contact_candidates}" ]] \
        || fail "Deleted mailing-list contact count did not match the previewed candidate count."
    [[ "${deleted_orders}" == "${order_candidates}" ]] \
        || fail "Deleted demo-request count did not match the previewed candidate count."

    verification_counts="$(
        psql_portal \
            --quiet \
            --tuples-only \
            --no-align \
            --field-separator='|' \
            --set cutoff="${CUTOFF_UTC}" <<'SQL'
SELECT
    (SELECT count(*) FROM website.web_contacts),
    (SELECT count(*) FROM website.web_orders),
    (
        SELECT count(*)
        FROM website.web_contacts
        WHERE unsubscribed_at_utc IS NOT NULL
          AND unsubscribed_at_utc <= :'cutoff'::timestamptz
    ),
    (
        SELECT count(*)
        FROM website.web_orders
        WHERE completed_at_utc IS NOT NULL
          AND completed_at_utc <= :'cutoff'::timestamptz
    );
SQL
    )"

    IFS='|' read -r \
        contacts_after \
        orders_after \
        remaining_contacts \
        remaining_orders <<< "${verification_counts}"

    [[ "${remaining_contacts}" == "0" && "${remaining_orders}" == "0" ]] \
        || fail "One or more records eligible at the maintenance cutoff remain after deletion."

    {
        printf 'executed_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        printf 'cutoff_utc=%s\n' "${CUTOFF_UTC}"
        printf 'source_revision=%s\n' "${SOURCE_REVISION}"
        printf 'contacts_before=%s\n' "${contacts_before}"
        printf 'orders_before=%s\n' "${orders_before}"
        printf 'contact_candidates=%s\n' "${contact_candidates}"
        printf 'order_candidates=%s\n' "${order_candidates}"
        printf 'deleted_contacts=%s\n' "${deleted_contacts}"
        printf 'deleted_orders=%s\n' "${deleted_orders}"
        printf 'contacts_after=%s\n' "${contacts_after}"
        printf 'orders_after=%s\n' "${orders_after}"
        printf 'encrypted_dump=%s\n' "$(basename "${ENCRYPTED_DUMP}")"
        printf 'encrypted_key=%s\n' "$(basename "${ENCRYPTED_KEY}")"
        printf 'encrypted_checksums=%s\n' "$(basename "${ENCRYPTED_CHECKSUMS}")"
    } > "${PURGE_MANIFEST}"
    chmod 600 "${PURGE_MANIFEST}"
fi

printf 'mode=%s\n' "${MODE}"
printf 'cutoff_utc=%s\n' "${CUTOFF_UTC}"
printf 'contacts_before=%s\n' "${contacts_before}"
printf 'orders_before=%s\n' "${orders_before}"
printf 'contact_candidates=%s\n' "${contact_candidates}"
printf 'order_candidates=%s\n' "${order_candidates}"
printf 'deleted_contacts=%s\n' "${deleted_contacts}"
printf 'deleted_orders=%s\n' "${deleted_orders}"
printf 'contacts_after=%s\n' "${contacts_after}"
printf 'orders_after=%s\n' "${orders_after}"
printf 'backup_created=%s\n' "${backup_created}"
printf 'backup_base=%s\n' "${backup_base}"
