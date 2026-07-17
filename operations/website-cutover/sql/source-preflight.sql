\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

DO $preflight$
BEGIN
    IF to_regclass('public."WebContacts"') IS NULL THEN
        RAISE EXCEPTION 'Source table public."WebContacts" was not found.';
    END IF;

    IF to_regclass('public."WebOrders"') IS NULL THEN
        RAISE EXCEPTION 'Source table public."WebOrders" was not found.';
    END IF;
END
$preflight$;

SELECT
    current_database() AS source_database,
    current_setting('transaction_read_only') AS transaction_read_only;

SELECT
    'WebContacts' AS source_table,
    count(*) AS row_count
FROM public."WebContacts"
UNION ALL
SELECT
    'WebOrders',
    count(*)
FROM public."WebOrders"
ORDER BY source_table;

SELECT
    count(*) AS duplicate_normalized_email_groups
FROM (
    SELECT 1
    FROM public."WebContacts"
    GROUP BY "NormalizedEmail"
    HAVING count(*) > 1
) AS duplicate_groups;

DO $preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public."WebContacts"
        GROUP BY "NormalizedEmail"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Duplicate normalized Website contact emails must be resolved before import.';
    END IF;
END
$preflight$;

COMMIT;
