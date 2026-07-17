DO $verification$
DECLARE
    actual_count bigint;
    actual_hash text;
    expected_count bigint;
    expected_hash text;
BEGIN
    SELECT row_count, content_hash
    INTO expected_count, expected_hash
    FROM website_cutover_expected
    WHERE entity = 'web_contacts';

    SELECT
        count(*),
        coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
    INTO actual_count, actual_hash
    FROM (
        SELECT
            id,
            jsonb_build_array(
                id,
                first_name,
                last_name,
                organization_name,
                email,
                normalized_email,
                send_brochure,
                created_at_utc)::text AS payload
        FROM website_cutover_contacts
    ) AS contact_rows;

    IF expected_count IS NULL
        OR expected_count <> actual_count
        OR expected_hash IS DISTINCT FROM actual_hash THEN
        RAISE EXCEPTION
            'The Website contact staging data does not match its recorded source fingerprint.';
    END IF;

    SELECT row_count, content_hash
    INTO expected_count, expected_hash
    FROM website_cutover_expected
    WHERE entity = 'web_orders';

    SELECT
        count(*),
        coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
    INTO actual_count, actual_hash
    FROM (
        SELECT
            id,
            jsonb_build_array(
                id,
                first_name,
                last_name,
                organization_name,
                email,
                description)::text AS payload
        FROM website_cutover_orders
    ) AS order_rows;

    IF expected_count IS NULL
        OR expected_count <> actual_count
        OR expected_hash IS DISTINCT FROM actual_hash THEN
        RAISE EXCEPTION
            'The Website order staging data does not match its recorded source fingerprint.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM website_cutover_contacts
        GROUP BY normalized_email
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'The snapshot contains duplicate normalized contact emails.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM website_cutover_contacts AS source
        LEFT JOIN website.web_contacts AS destination
            ON destination.id = source.id
        WHERE destination.id IS NULL
            OR ROW(
                destination.first_name,
                destination.last_name,
                destination.organization_name,
                destination.email,
                destination.normalized_email,
                destination.send_brochure,
                destination.created_at_utc)
                IS DISTINCT FROM ROW(
                    source.first_name,
                    source.last_name,
                    source.organization_name,
                    source.email,
                    source.normalized_email,
                    source.send_brochure,
                    source.created_at_utc)
    ) THEN
        RAISE EXCEPTION
            'One or more Website contact snapshot rows differ from the destination.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM website_cutover_orders AS source
        LEFT JOIN website.web_orders AS destination
            ON destination.id = source.id
        WHERE destination.id IS NULL
            OR ROW(
                destination.first_name,
                destination.last_name,
                destination.organization_name,
                destination.email,
                destination.description)
                IS DISTINCT FROM ROW(
                    source.first_name,
                    source.last_name,
                    source.organization_name,
                    source.email,
                    source.description)
    ) THEN
        RAISE EXCEPTION
            'One or more Website order snapshot rows differ from the destination.';
    END IF;
END
$verification$;

WITH source_rows AS (
    SELECT
        id,
        jsonb_build_array(
            id,
            first_name,
            last_name,
            organization_name,
            email,
            normalized_email,
            send_brochure,
            created_at_utc)::text AS payload
    FROM website_cutover_contacts
),
destination_rows AS (
    SELECT
        destination.id,
        jsonb_build_array(
            destination.id,
            destination.first_name,
            destination.last_name,
            destination.organization_name,
            destination.email,
            destination.normalized_email,
            destination.send_brochure,
            destination.created_at_utc)::text AS payload
    FROM website.web_contacts AS destination
    INNER JOIN website_cutover_contacts AS source
        ON source.id = destination.id
)
SELECT
    'web_contacts' AS entity,
    (SELECT count(*) FROM source_rows) AS snapshot_rows,
    (SELECT count(*) FROM destination_rows) AS destination_matching_ids,
    (SELECT count(*) FROM website.web_contacts) AS destination_total_rows,
    (SELECT count(*) FROM website.web_contacts)
        - (SELECT count(*) FROM source_rows) AS destination_only_rows,
    (
        SELECT content_hash
        FROM website_cutover_expected
        WHERE entity = 'web_contacts'
    ) AS recorded_source_hash,
    (
        SELECT coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
        FROM source_rows
    ) AS snapshot_hash,
    (
        SELECT coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
        FROM destination_rows
    ) AS destination_snapshot_hash
UNION ALL
SELECT
    'web_orders',
    (SELECT count(*) FROM website_cutover_orders),
    (
        SELECT count(*)
        FROM website.web_orders AS destination
        INNER JOIN website_cutover_orders AS source
            ON source.id = destination.id
    ),
    (SELECT count(*) FROM website.web_orders),
    (SELECT count(*) FROM website.web_orders)
        - (SELECT count(*) FROM website_cutover_orders),
    (
        SELECT content_hash
        FROM website_cutover_expected
        WHERE entity = 'web_orders'
    ),
    (
        SELECT coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
        FROM (
            SELECT
                id,
                jsonb_build_array(
                    id,
                    first_name,
                    last_name,
                    organization_name,
                    email,
                    description)::text AS payload
            FROM website_cutover_orders
        ) AS source_order_rows
    ),
    (
        SELECT coalesce(
            md5(string_agg(payload, E'\n' ORDER BY id)),
            md5(''))
        FROM (
            SELECT
                destination.id,
                jsonb_build_array(
                    destination.id,
                    destination.first_name,
                    destination.last_name,
                    destination.organization_name,
                    destination.email,
                    destination.description)::text AS payload
            FROM website.web_orders AS destination
            INNER JOIN website_cutover_orders AS source
                ON source.id = destination.id
        ) AS destination_order_rows
    )
ORDER BY entity;
