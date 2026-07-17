SET TIME ZONE 'UTC';

WITH contact_rows AS (
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
SELECT
    'web_contacts',
    count(*),
    coalesce(
        md5(string_agg(payload, E'\n' ORDER BY id)),
        md5(''))
FROM contact_rows
UNION ALL
SELECT
    'web_orders',
    count(*),
    coalesce(
        md5(string_agg(payload, E'\n' ORDER BY id)),
        md5(''))
FROM (
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
) AS order_rows
ORDER BY 1;
