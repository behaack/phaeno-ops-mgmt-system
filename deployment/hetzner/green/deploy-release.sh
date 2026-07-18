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

[[ $# -eq 3 ]] \
    || fail "Usage: deploy-release.sh SOURCE_REVISION IMAGE_TAG APPLY_MIGRATIONS"

readonly SOURCE_REVISION="$1"
readonly IMAGE_TAG="$2"
readonly APPLY_MIGRATIONS="$3"
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
[[ "${RELEASE_DIR}" == "${DEPLOY_ROOT}/releases/"* ]] \
    || fail "The release must be under ${DEPLOY_ROOT}/releases."

for command in curl docker flock openssl realpath seq sha256sum shred stat; do
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

    docker exec phaeno-portal-green-db \
        pg_dump \
        --username phaeno_portal_green \
        --dbname phaeno_portal_green \
        --format custom \
        --no-owner \
        --no-privileges \
        > "${migration_dump}"

    docker run \
        --rm \
        --user 0:0 \
        --volume "${migration_dump}:/backup/database.dump:ro" \
        postgres:17 \
        pg_restore --list /backup/database.dump \
        > /dev/null

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
[[ "${health}" == "healthy" ]] \
    || fail "Portal green API did not become healthy."

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

printf 'Portal green deployment succeeded.\n'
printf 'source_revision=%s\n' "${SOURCE_REVISION}"
printf 'image_tag=%s\n' "${IMAGE_TAG}"
printf 'migrations_requested=%s\n' "${APPLY_MIGRATIONS}"
printf 'website_counts=%s\n' "${website_counts_after//$'\n'/,}"
