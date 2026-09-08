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
    || fail "Usage: deploy-release.sh SOURCE_REVISION IMAGE_TAG APPLY_MIGRATIONS CUTOVER_CLERK_IDENTITY PREVIOUS_CLERK_SUBJECT_ID"

readonly SOURCE_REVISION="$1"
readonly IMAGE_TAG="$2"
readonly APPLY_MIGRATIONS="$3"
readonly CUTOVER_CLERK_IDENTITY="$4"
readonly PREVIOUS_CLERK_SUBJECT_ID="$5"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly RELEASE_DIR="$(realpath "${SCRIPT_DIR}/../../..")"
readonly DEPLOY_ROOT="${PORTAL_DEPLOY_ROOT:-/opt/phaeno.portal-green}"
readonly RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
readonly COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
readonly COMPOSE_ENV="${RUNTIME_DIR}/compose.env"
readonly DATABASE_ENV="${RUNTIME_DIR}/database.env"
readonly PORTAL_ENV="${RUNTIME_DIR}/portal.env"
readonly CURRENT_LINK="${DEPLOY_ROOT}/current"
readonly DEPLOYMENT_MANIFEST="${RUNTIME_DIR}/deployment-manifest.txt"
readonly BACKUP_ROOT="/var/backups/phaeno-portal-deploy"

[[ "${SOURCE_REVISION}" =~ ^[0-9a-f]{40}$ ]] \
    || fail "SOURCE_REVISION must be a full lowercase Git commit SHA."
[[ "${IMAGE_TAG}" =~ ^[a-z0-9][a-z0-9._-]{0,127}$ ]] \
    || fail "IMAGE_TAG contains unsupported characters."
[[ "${APPLY_MIGRATIONS}" == "true" || "${APPLY_MIGRATIONS}" == "false" ]] \
    || fail "APPLY_MIGRATIONS must be true or false."
[[ "${CUTOVER_CLERK_IDENTITY}" == "true" || "${CUTOVER_CLERK_IDENTITY}" == "false" ]] \
    || fail "CUTOVER_CLERK_IDENTITY must be true or false."
if [[ "${CUTOVER_CLERK_IDENTITY}" == "true" ]]; then
    [[ "${PREVIOUS_CLERK_SUBJECT_ID}" == user_?* ]] \
        || fail "The Clerk identity cutover requires the exact previous Clerk subject."
else
    [[ -z "${PREVIOUS_CLERK_SUBJECT_ID}" ]] \
        || fail "A previous Clerk subject is allowed only during the identity cutover."
fi
[[ "${RELEASE_DIR}" == "${DEPLOY_ROOT}/releases/"* ]] \
    || fail "The release must be under ${DEPLOY_ROOT}/releases."

for command in curl docker flock grep openssl realpath seq sha256sum shred stat; do
    require_command "${command}"
done

for path in "${COMPOSE_FILE}" "${COMPOSE_ENV}" "${DATABASE_ENV}" "${PORTAL_ENV}"; do
    [[ -f "${path}" ]] || fail "Required deployment file '${path}' is missing."
done

for secret_file in "${COMPOSE_ENV}" "${DATABASE_ENV}" "${PORTAL_ENV}"; do
    mode="$(stat -c '%a' "${secret_file}")"
    (( 10#${mode} % 100 == 0 )) \
        || fail "${secret_file} must not be accessible by group or other users."
done

[[ "$(grep -c '^FileStorage__Provider=' "${PORTAL_ENV}" || true)" == 1 ]] \
    || fail "Runtime must contain exactly one explicit FileStorage__Provider entry."
if grep --fixed-strings --line-regexp 'FileStorage__Provider=Disabled' "${PORTAL_ENV}" > /dev/null; then
    printf 'File storage is disabled; file operations will return service unavailable.\n'
elif grep --fixed-strings --line-regexp 'FileStorage__Provider=Local' "${PORTAL_ENV}" > /dev/null; then
    [[ "$(grep -c '^FileStorage__LocalRootPath=' "${PORTAL_ENV}" || true)" == 1 && "$(grep -c '^FileStorage__LocalPersistentVolumeConfirmed=' "${PORTAL_ENV}" || true)" == 1 ]] \
        || fail "Local storage root and persistent-volume acknowledgement must each be configured once."
    grep --fixed-strings --line-regexp 'FileStorage__LocalRootPath=/var/lib/phaeno-portal/files' "${PORTAL_ENV}" > /dev/null \
        || fail "Local storage must use the dedicated persistent file volume."
    grep --fixed-strings --line-regexp 'FileStorage__LocalPersistentVolumeConfirmed=true' "${PORTAL_ENV}" > /dev/null \
        || fail "Local storage requires explicit persistent-volume confirmation."
    printf 'File storage uses the dedicated persistent Local volume; scanning is configured independently.\n'
elif grep --fixed-strings --line-regexp 'FileStorage__Provider=S3' "${PORTAL_ENV}" > /dev/null; then
    for key in \
        FileStorage__S3__BucketName \
        FileStorage__S3__Region \
        FileStorage__S3__KeyPrefix \
        AWS_ACCESS_KEY_ID \
        AWS_SECRET_ACCESS_KEY; do
        grep --extended-regexp --quiet "^${key}=.+$" "${PORTAL_ENV}" \
            || fail "Portal S3 runtime is missing ${key}."
    done
else
    fail "Portal production runtime must configure FileStorage__Provider=Disabled, Local or S3."
fi

exec 9>"${RUNTIME_DIR}/deploy.lock"
flock --exclusive 9

readonly OLD_COMPOSE_ENV="$(mktemp "${RUNTIME_DIR}/compose.env.previous.XXXXXX")"
readonly NEW_COMPOSE_ENV="$(mktemp "${RUNTIME_DIR}/compose.env.next.XXXXXX")"
readonly INVALID_RECAPTCHA_RESPONSE="$(mktemp /tmp/phaeno-portal-invalid-recaptcha.XXXXXX)"
migration_dump=""
migration_passphrase=""
api_replaced=false
migrations_ran=false

cleanup() {
    local status=$?
    trap - EXIT

    if [[ "${status}" -ne 0 && "${migrations_ran}" == false ]]; then
        printf 'Restore\n' | FILE_STORAGE_DEPLOY_LOCK_HELD=true \
            "${SCRIPT_DIR}/install-file-scanning-runtime-config.sh" "${DEPLOY_ROOT}" >&2 || \
            printf 'Scanner runtime recovery requires manual review; its protected receipt is retained.\n' >&2
        printf 'Restore\n' | FILE_STORAGE_DEPLOY_LOCK_HELD=true \
            "${SCRIPT_DIR}/install-file-storage-runtime-config.sh" "${DEPLOY_ROOT}" >&2 || \
            printf 'Storage runtime recovery requires manual review; the protected rollback receipt is retained.\n' >&2
    fi
    if [[ "${status}" -ne 0 && "${api_replaced}" == true && "${migrations_ran}" == false ]]; then
        printf 'Deployment failed; restoring the previous green API image.\n' >&2
        docker compose \
            --env-file "${OLD_COMPOSE_ENV}" \
            --file "${COMPOSE_FILE}" \
            up --detach api >&2 || true
    elif [[ "${status}" -ne 0 && "${migrations_ran}" == true ]]; then
        printf 'Deployment failed after the authorized migration; automatic image rollback is disabled.\n' >&2
    fi

    for sensitive_path in "${migration_dump}" "${migration_passphrase}"; do
        if [[ -n "${sensitive_path}" && -f "${sensitive_path}" ]]; then
            shred --remove "${sensitive_path}" || rm -f "${sensitive_path}"
        fi
    done

    rm -f \
        "${OLD_COMPOSE_ENV}" \
        "${NEW_COMPOSE_ENV}" \
        "${INVALID_RECAPTCHA_RESPONSE}"

    exit "${status}"
}
trap cleanup EXIT

install -m 600 "${COMPOSE_ENV}" "${OLD_COMPOSE_ENV}"

awk \
    -v image_tag="${IMAGE_TAG}" \
    -v source_revision="${SOURCE_REVISION}" \
    '
        BEGIN {
            image_seen = 0
            revision_seen = 0
        }
        /^PORTAL_GREEN_IMAGE_TAG=/ {
            print "PORTAL_GREEN_IMAGE_TAG=" image_tag
            image_seen = 1
            next
        }
        /^PORTAL_GREEN_SOURCE_REVISION=/ {
            print "PORTAL_GREEN_SOURCE_REVISION=" source_revision
            revision_seen = 1
            next
        }
        {
            print
        }
        END {
            if (!image_seen) {
                print "PORTAL_GREEN_IMAGE_TAG=" image_tag
            }
            if (!revision_seen) {
                print "PORTAL_GREEN_SOURCE_REVISION=" source_revision
            }
        }
    ' \
    "${COMPOSE_ENV}" \
    > "${NEW_COMPOSE_ENV}"
chmod 600 "${NEW_COMPOSE_ENV}"

compose() {
    docker compose \
        --env-file "${NEW_COMPOSE_ENV}" \
        --file "${COMPOSE_FILE}" \
        "$@"
}

compose config --quiet
compose build api
if grep -qx 'FileScanning__Provider=ClamAv' "${PORTAL_ENV}"; then
    if grep -qx 'FileScanning__Host=scanner' "${PORTAL_ENV}"; then
        for setting in \
            'FileScanning__Port=3310' \
            'FileScanning__TimeoutSeconds=120' \
            'FileScanning__MaximumStreamBytes=104857600' \
            'FileScanning__ClamAvLimitsConfirmed=true'; do
            grep -qx "${setting}" "${PORTAL_ENV}" || fail 'Managed scanner limits do not match the reviewed deployment configuration.'
        done
        compose --profile scanner pull scanner
        compose --profile scanner up --detach --wait --wait-timeout 1200 scanner
        compose --profile scanner exec -T scanner /bin/sh /opt/portal-scanner/smoke.sh
        docker inspect phaeno-portal-green-scanner --format 'scanner_image_id={{.Image}}'
    fi
    if grep -Eq '^FileStorage__Provider=(Local|S3)$' "${PORTAL_ENV}"; then
        compose run --rm --no-deps api --verify-file-services
    fi
fi
compose up --detach --wait db

website_counts_before="$(
    docker exec phaeno-portal-green-db \
        psql \
        --username phaeno_portal_green \
        --dbname phaeno_portal_green \
        --tuples-only \
        --no-align \
        --set ON_ERROR_STOP=1 \
        --command "SELECT count(*) FROM website.web_contacts;
                   SELECT count(*) FROM website.web_orders;"
)"

if [[ "${APPLY_MIGRATIONS}" == "true" ]]; then
    [[ "${ALLOW_PORTAL_MIGRATIONS:-}" == "YES" ]] \
        || fail "Set ALLOW_PORTAL_MIGRATIONS=YES for an authorized shared-database migration."
    [[ -n "${PORTAL_MIGRATION_BACKUP_PUBLIC_KEY_PATH:-}" ]] \
        || fail "PORTAL_MIGRATION_BACKUP_PUBLIC_KEY_PATH is required."
    [[ -s "${PORTAL_MIGRATION_BACKUP_PUBLIC_KEY_PATH}" ]] \
        || fail "The migration-backup public key is missing."

    install -d -m 700 "${BACKUP_ROOT}"
    openssl pkey \
        -pubin \
        -in "${PORTAL_MIGRATION_BACKUP_PUBLIC_KEY_PATH}" \
        -noout

    readonly MIGRATION_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
    readonly BACKUP_BASE="${BACKUP_ROOT}/pre-migration-${MIGRATION_TIMESTAMP}-${SOURCE_REVISION:0:12}"
    migration_dump="${BACKUP_BASE}.dump"
    migration_passphrase="${BACKUP_BASE}.pass"
    readonly ENCRYPTED_DUMP="${BACKUP_BASE}.dump.enc"
    readonly ENCRYPTED_KEY="${BACKUP_BASE}.key.enc"
    readonly ENCRYPTED_CHECKSUMS="${BACKUP_BASE}.encrypted.sha256"

    expected_backup_migration="$(
        timeout --kill-after=5s 20s docker exec phaeno-portal-green-db \
            psql --username phaeno_portal_green --dbname phaeno_portal_green \
            --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 \
            --command 'SELECT "MigrationId" FROM public.__ef_migrations_history ORDER BY "MigrationId" DESC LIMIT 1;'
    )"
    [[ "${expected_backup_migration}" =~ ^[0-9]{14}_[A-Za-z0-9_]+$ ]] \
        || fail 'The current migration identity could not be verified for backup restoration.'
    docker exec phaeno-portal-green-db \
        pg_dump \
        --username phaeno_portal_green \
        --dbname phaeno_portal_green \
        --format custom \
        --no-owner \
        --no-privileges \
        > "${migration_dump}"

    bash "${SCRIPT_DIR}/verify-database-backup.sh" \
        "${migration_dump}" "${expected_backup_migration}"

    openssl rand -base64 48 > "${migration_passphrase}"
    openssl enc \
        -aes-256-cbc \
        -salt \
        -pbkdf2 \
        -iter 250000 \
        -pass "file:${migration_passphrase}" \
        -in "${migration_dump}" \
        -out "${ENCRYPTED_DUMP}"
    openssl pkeyutl \
        -encrypt \
        -pubin \
        -inkey "${PORTAL_MIGRATION_BACKUP_PUBLIC_KEY_PATH}" \
        -pkeyopt rsa_padding_mode:oaep \
        -pkeyopt rsa_oaep_md:sha256 \
        -pkeyopt rsa_mgf1_md:sha256 \
        -in "${migration_passphrase}" \
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
    shred --remove "${migration_dump}" "${migration_passphrase}"
    migration_dump=""
    migration_passphrase=""

    compose run --rm migrate
    migrations_ran=true
fi

if [[ "${CUTOVER_CLERK_IDENTITY}" == "true" ]]; then
    [[ "${ALLOW_PORTAL_CLERK_IDENTITY_CUTOVER:-}" == "YES" ]] \
        || fail "Set ALLOW_PORTAL_CLERK_IDENTITY_CUTOVER=YES for the authorized one-time identity cutover."

    compose run \
        --rm \
        --no-deps \
        --env "Bootstrap__ClerkIdentityCutoverPreviousSubjectId=${PREVIOUS_CLERK_SUBJECT_ID}" \
        api \
        --cutover-clerk-bootstrap-identity
fi

api_replaced=true
compose up --detach api

for attempt in $(seq 1 30); do
    health="$(
        docker inspect phaeno-portal-green-api \
            --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
    )"
    if [[ "${health}" == "healthy" ]]; then
        break
    fi
    sleep 4
done
if [[ "${health}" != "healthy" ]]; then
    printf 'Portal green API startup diagnostics follow.\n' >&2
    compose ps api >&2 || true
    compose logs --no-color --tail 200 api >&2 || true
    fail "Portal green API did not become healthy."
fi

curl \
    --fail \
    --silent \
    --show-error \
    --output /dev/null \
    --header 'X-Forwarded-Proto: https' \
    http://127.0.0.1:8084/api/health
curl \
    --fail \
    --silent \
    --show-error \
    --output /dev/null \
    --header 'X-Forwarded-Proto: https' \
    http://127.0.0.1:8084/api/v1/web-ops/database-ping
curl \
    --fail \
    --silent \
    --show-error \
    --output /dev/null \
    --header 'X-Forwarded-Proto: https' \
    'http://127.0.0.1:8084/api/v1/web-ops/search-pages?search=PSeq'
curl \
    --fail \
    --silent \
    --show-error \
    --output /dev/null \
    --header 'X-Forwarded-Proto: https' \
    'http://127.0.0.1:8084/public/technical-brief-C660184C-47D0-45AA-872F-8B3538F17BE5/PSeq-Technical-Brief.AD6548E7-F66A-429A-B0F6-A63988935D68.pdf'

invalid_status="$(
    curl \
        --silent \
        --show-error \
        --output "${INVALID_RECAPTCHA_RESPONSE}" \
        --header 'Content-Type: application/json' \
        --header 'X-Forwarded-Proto: https' \
        --request POST \
        --data '{"webContact":{"firstName":"Deploy","lastName":"Smoke","organizationName":"Phaeno","email":"deploy-smoke-invalid@invalid.example","sendBrochure":false},"recaptchaAction":"contact","recaptchaCode":"invalid-deploy-smoke-token"}' \
        --write-out '%{http_code}' \
        http://127.0.0.1:8084/api/v1/web-ops/contact
)"
[[ "${invalid_status}" == "403" ]] \
    || fail "Invalid reCAPTCHA smoke returned ${invalid_status}, expected 403."

website_counts_after="$(
    docker exec phaeno-portal-green-db \
        psql \
        --username phaeno_portal_green \
        --dbname phaeno_portal_green \
        --tuples-only \
        --no-align \
        --set ON_ERROR_STOP=1 \
        --command "SELECT count(*) FROM website.web_contacts;
                   SELECT count(*) FROM website.web_orders;"
)"
[[ "${website_counts_after}" == "${website_counts_before}" ]] \
    || fail "Website row counts changed during deployment smoke checks."

deployed_image="$(
    docker inspect phaeno-portal-green-api \
        --format '{{.Config.Image}}'
)"
[[ "${deployed_image}" == "phaeno-portal-green-api:${IMAGE_TAG}" ]] \
    || fail "Unexpected deployed image '${deployed_image}'."

image_id="$(
    docker inspect phaeno-portal-green-api \
        --format '{{.Image}}'
)"
deployed_revision="$(
    docker image inspect "${image_id}" \
        --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
)"
[[ "${deployed_revision}" == "${SOURCE_REVISION}" ]] \
    || fail "The deployed image revision label does not match the requested commit."

install -m 600 "${NEW_COMPOSE_ENV}" "${COMPOSE_ENV}"
link_path="${CURRENT_LINK}.next"
rm -f "${link_path}"
ln -s "${RELEASE_DIR}" "${link_path}"
mv -T "${link_path}" "${CURRENT_LINK}"

{
    printf 'deployed_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'source_revision=%s\n' "${SOURCE_REVISION}"
    printf 'image_tag=%s\n' "${IMAGE_TAG}"
    printf 'release_dir=%s\n' "${RELEASE_DIR}"
    printf 'migrations_requested=%s\n' "${APPLY_MIGRATIONS}"
    printf 'website_counts=%s\n' "${website_counts_after//$'\n'/,}"
} > "${DEPLOYMENT_MANIFEST}"
chmod 600 "${DEPLOYMENT_MANIFEST}"

printf 'Complete\n' | FILE_STORAGE_DEPLOY_LOCK_HELD=true \
    "${SCRIPT_DIR}/install-file-storage-runtime-config.sh" "${DEPLOY_ROOT}"
printf 'Complete\n' | FILE_STORAGE_DEPLOY_LOCK_HELD=true \
    "${SCRIPT_DIR}/install-file-scanning-runtime-config.sh" "${DEPLOY_ROOT}"

printf 'Portal green deployment succeeded.\n'
printf 'source_revision=%s\n' "${SOURCE_REVISION}"
printf 'image_tag=%s\n' "${IMAGE_TAG}"
printf 'migrations_requested=%s\n' "${APPLY_MIGRATIONS}"
printf 'website_counts=%s\n' "${website_counts_after//$'\n'/,}"
