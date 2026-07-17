\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';
SET LOCAL TIME ZONE 'UTC';

DO $preflight$
BEGIN
    IF to_regclass('website.web_contacts') IS NULL THEN
        RAISE EXCEPTION
            'Destination table website.web_contacts was not found. Apply the approved Portal migrations first.';
    END IF;

    IF to_regclass('website.web_orders') IS NULL THEN
        RAISE EXCEPTION
            'Destination table website.web_orders was not found. Apply the approved Portal migrations first.';
    END IF;
END
$preflight$;
