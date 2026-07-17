INSERT INTO website.web_contacts AS destination (
    id,
    first_name,
    last_name,
    organization_name,
    email,
    normalized_email,
    send_brochure,
    created_at_utc)
SELECT
    id,
    first_name,
    last_name,
    organization_name,
    email,
    normalized_email,
    send_brochure,
    created_at_utc
FROM website_cutover_contacts
ON CONFLICT (id) DO UPDATE
SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    organization_name = EXCLUDED.organization_name,
    email = EXCLUDED.email,
    normalized_email = EXCLUDED.normalized_email,
    send_brochure = EXCLUDED.send_brochure,
    created_at_utc = EXCLUDED.created_at_utc
WHERE ROW(
        destination.first_name,
        destination.last_name,
        destination.organization_name,
        destination.email,
        destination.normalized_email,
        destination.send_brochure,
        destination.created_at_utc)
    IS DISTINCT FROM ROW(
        EXCLUDED.first_name,
        EXCLUDED.last_name,
        EXCLUDED.organization_name,
        EXCLUDED.email,
        EXCLUDED.normalized_email,
        EXCLUDED.send_brochure,
        EXCLUDED.created_at_utc);

INSERT INTO website.web_orders AS destination (
    id,
    first_name,
    last_name,
    organization_name,
    email,
    description)
SELECT
    id,
    first_name,
    last_name,
    organization_name,
    email,
    description
FROM website_cutover_orders
ON CONFLICT (id) DO UPDATE
SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    organization_name = EXCLUDED.organization_name,
    email = EXCLUDED.email,
    description = EXCLUDED.description
WHERE ROW(
        destination.first_name,
        destination.last_name,
        destination.organization_name,
        destination.email,
        destination.description)
    IS DISTINCT FROM ROW(
        EXCLUDED.first_name,
        EXCLUDED.last_name,
        EXCLUDED.organization_name,
        EXCLUDED.email,
        EXCLUDED.description);
