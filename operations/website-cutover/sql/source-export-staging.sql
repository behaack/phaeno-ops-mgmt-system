SET TIME ZONE 'UTC';

SELECT 'CREATE TEMP TABLE website_cutover_contacts (id uuid PRIMARY KEY, first_name varchar(60) NOT NULL, last_name varchar(60) NOT NULL, organization_name varchar(250) NOT NULL, email varchar(256) NOT NULL, normalized_email varchar(256) NOT NULL, send_brochure boolean NULL, created_at_utc timestamptz NOT NULL) ON COMMIT DROP;';

SELECT format(
    'INSERT INTO website_cutover_contacts (id, first_name, last_name, organization_name, email, normalized_email, send_brochure, created_at_utc) VALUES (%L::uuid, %L, %L, %L, %L, %L, %L::boolean, %L::timestamptz);',
    "Id",
    "FirstName",
    "LastName",
    "OrganizationName",
    "Email",
    "NormalizedEmail",
    "SendBrochure",
    "CreatedAtUtc")
FROM public."WebContacts"
ORDER BY "Id";

SELECT 'CREATE TEMP TABLE website_cutover_orders (id uuid PRIMARY KEY, first_name varchar(60) NOT NULL, last_name varchar(60) NOT NULL, organization_name varchar(250) NOT NULL, email varchar(256) NOT NULL, description text NOT NULL) ON COMMIT DROP;';

SELECT format(
    'INSERT INTO website_cutover_orders (id, first_name, last_name, organization_name, email, description) VALUES (%L::uuid, %L, %L, %L, %L, %L);',
    "Id",
    "FirstName",
    "LastName",
    "OrganizationName",
    "Email",
    "Description")
FROM public."WebOrders"
ORDER BY "Id";

SELECT 'CREATE TEMP TABLE website_cutover_expected (entity text PRIMARY KEY, row_count bigint NOT NULL, content_hash char(32) NOT NULL) ON COMMIT DROP;';

WITH source_rows AS (
    SELECT
        "Id" AS id,
        jsonb_build_array(
            "Id",
            "FirstName",
            "LastName",
            "OrganizationName",
            "Email",
            "NormalizedEmail",
            "SendBrochure",
            "CreatedAtUtc")::text AS payload
    FROM public."WebContacts"
)
SELECT format(
    'INSERT INTO website_cutover_expected (entity, row_count, content_hash) VALUES (%L, %s, %L);',
    'web_contacts',
    count(*),
    coalesce(
        md5(string_agg(payload, E'\n' ORDER BY id)),
        md5('')))
FROM source_rows;

WITH source_rows AS (
    SELECT
        "Id" AS id,
        jsonb_build_array(
            "Id",
            "FirstName",
            "LastName",
            "OrganizationName",
            "Email",
            "Description")::text AS payload
    FROM public."WebOrders"
)
SELECT format(
    'INSERT INTO website_cutover_expected (entity, row_count, content_hash) VALUES (%L, %s, %L);',
    'web_orders',
    count(*),
    coalesce(
        md5(string_agg(payload, E'\n' ORDER BY id)),
        md5('')))
FROM source_rows;
