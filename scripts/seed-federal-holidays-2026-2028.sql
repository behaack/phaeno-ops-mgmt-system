-- Owner-authorized, data-only initialization of the Phaeno observed-holiday calendar.
-- Source verified 2026-09-30: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
-- Run with psql -X -v expected_database=<verified database> -f <this file>.
-- Refuses other databases or a populated calendar needing an explicit revision review.
-- Exact replay is a no-op. Existing timing policies and commitments are never rewritten.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT set_config('holiday_seed.expected_database', :'expected_database', true);
LOCK TABLE lab_ops.lab_business_calendars, lab_ops.lab_holidays IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE federal_holiday_seed (
    holiday_year integer NOT NULL,
    date date PRIMARY KEY,
    name varchar(255) NOT NULL
) ON COMMIT DROP;
INSERT INTO federal_holiday_seed VALUES
    (2026, '2026-01-01', 'New Year''s Day'),
    (2026, '2026-01-19', 'Birthday of Martin Luther King, Jr.'),
    (2026, '2026-02-16', 'Washington''s Birthday'),
    (2026, '2026-05-25', 'Memorial Day'),
    (2026, '2026-06-19', 'Juneteenth National Independence Day'),
    (2026, '2026-07-03', 'Independence Day (observed)'),
    (2026, '2026-09-07', 'Labor Day'),
    (2026, '2026-10-12', 'Columbus Day'),
    (2026, '2026-11-11', 'Veterans Day'),
    (2026, '2026-11-26', 'Thanksgiving Day'),
    (2026, '2026-12-25', 'Christmas Day'),
    (2027, '2027-01-01', 'New Year''s Day'),
    (2027, '2027-01-18', 'Birthday of Martin Luther King, Jr.'),
    (2027, '2027-02-15', 'Washington''s Birthday'),
    (2027, '2027-05-31', 'Memorial Day'),
    (2027, '2027-06-18', 'Juneteenth National Independence Day (observed)'),
    (2027, '2027-07-05', 'Independence Day (observed)'),
    (2027, '2027-09-06', 'Labor Day'),
    (2027, '2027-10-11', 'Columbus Day'),
    (2027, '2027-11-11', 'Veterans Day'),
    (2027, '2027-11-25', 'Thanksgiving Day'),
    (2027, '2027-12-24', 'Christmas Day (observed)'),
    -- New Year's Day 2028 falls on Saturday; its observed closure is in 2027.
    (2028, '2027-12-31', 'New Year''s Day (2028, observed)'),
    (2028, '2028-01-17', 'Birthday of Martin Luther King, Jr.'),
    (2028, '2028-02-21', 'Washington''s Birthday'),
    (2028, '2028-05-29', 'Memorial Day'),
    (2028, '2028-06-19', 'Juneteenth National Independence Day'),
    (2028, '2028-07-04', 'Independence Day'),
    (2028, '2028-09-04', 'Labor Day'),
    (2028, '2028-10-09', 'Columbus Day'),
    (2028, '2028-11-10', 'Veterans Day (observed)'),
    (2028, '2028-11-23', 'Thanksgiving Day'),
    (2028, '2028-12-25', 'Christmas Day');

DO $seed$
DECLARE
    calendar_id uuid := gen_random_uuid();
    stamp timestamptz := transaction_timestamp();
    seed_reason text := 'Owner-requested US federal observed holidays for 2026, 2027 and 2028. OPM schedule verified 2026-09-30: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/';
    request_id text := 'federal-holidays-2026-2028-' || current_database();
BEGIN
    IF current_database() <> current_setting('holiday_seed.expected_database')
        OR current_database() NOT IN ('phaeno_ops_clean_20260919', 'phaeno_ops_recovery_20261008', 'phaeno_portal_green') THEN
        RAISE EXCEPTION 'The connected database is not the verified holiday-seeding target.';
    END IF;
    IF (SELECT count(*) FROM federal_holiday_seed) <> 33
        OR (SELECT count(DISTINCT holiday_year) FROM federal_holiday_seed) <> 3
        OR EXISTS (SELECT 1 FROM federal_holiday_seed GROUP BY holiday_year HAVING count(*) <> 11)
        OR EXISTS (SELECT 1 FROM federal_holiday_seed WHERE extract(isodow FROM date) > 5) THEN
        RAISE EXCEPTION 'Invalid observed-holiday fixture.';
    END IF;

    IF EXISTS (SELECT 1 FROM lab_ops.lab_business_calendars) THEN
        SELECT id INTO calendar_id FROM lab_ops.lab_business_calendars ORDER BY revision DESC LIMIT 1;
        IF EXISTS (SELECT 1 FROM lab_ops.lab_business_calendars WHERE id = calendar_id
            AND time_zone_id = 'America/Los_Angeles'
            AND coverage_from <= DATE '2026-01-01' AND coverage_to >= DATE '2028-12-31')
            AND NOT EXISTS (SELECT 1 FROM federal_holiday_seed s WHERE NOT EXISTS (
                SELECT 1 FROM lab_ops.lab_holidays h WHERE h.lab_business_calendar_id = calendar_id
                AND h.date = s.date AND h.name = s.name)) THEN
            RAISE NOTICE 'All 33 federal observed holidays are already present; no changes made.';
            RETURN;
        END IF;
        RAISE EXCEPTION 'A calendar now exists. Review its current revision before adding holidays.';
    END IF;
    IF EXISTS (SELECT 1 FROM lab_ops.lab_work_events WHERE event_code = 'DeliveryDeadlinePendingCalendar') THEN
        RAISE EXCEPTION 'Pending deadlines require the application calendar-save workflow.';
    END IF;

    INSERT INTO lab_ops.lab_business_calendars
        (id, revision, time_zone_id, coverage_from, coverage_to, reason,
         created_at, created_by_user_id, updated_at, updated_by_user_id, version)
    VALUES (calendar_id, 1, 'America/Los_Angeles', '2026-01-01', '2028-12-31', seed_reason,
            stamp, NULL, stamp, NULL, 1);
    INSERT INTO lab_ops.lab_holidays (id, lab_business_calendar_id, date, name)
    SELECT gen_random_uuid(), calendar_id, date, name FROM federal_holiday_seed ORDER BY date;

    -- Match the application's audit property names and old/new value structure.
    INSERT INTO commercial_ops.audit_events
        (id, entity_name, entity_id, operation, organization_id, actor_user_id, request_id, occurred_at, changes_json)
    SELECT gen_random_uuid(), 'LabBusinessCalendar', c.id::text, 'Created', NULL, NULL, request_id, stamp,
        jsonb_build_object(
            'Revision', jsonb_build_object('old', NULL, 'new', c.revision),
            'TimeZoneId', jsonb_build_object('old', NULL, 'new', c.time_zone_id),
            'CoverageFrom', jsonb_build_object('old', NULL, 'new', c.coverage_from),
            'CoverageTo', jsonb_build_object('old', NULL, 'new', c.coverage_to),
            'Reason', jsonb_build_object('old', NULL, 'new', c.reason))
    FROM lab_ops.lab_business_calendars c WHERE c.id = calendar_id;
    INSERT INTO commercial_ops.audit_events
        (id, entity_name, entity_id, operation, organization_id, actor_user_id, request_id, occurred_at, changes_json)
    SELECT gen_random_uuid(), 'LabHoliday', h.id::text, 'Created', NULL, NULL, request_id, stamp,
        jsonb_build_object(
            'LabBusinessCalendarId', jsonb_build_object('old', NULL, 'new', h.lab_business_calendar_id),
            'Date', jsonb_build_object('old', NULL, 'new', h.date),
            'Name', jsonb_build_object('old', NULL, 'new', h.name))
    FROM lab_ops.lab_holidays h WHERE h.lab_business_calendar_id = calendar_id;
    IF (SELECT count(*) FROM lab_ops.lab_holidays WHERE lab_business_calendar_id = calendar_id) <> 33 THEN
        RAISE EXCEPTION 'Holiday insertion count mismatch.';
    END IF;
END;
$seed$;

SELECT json_build_object('database', current_database(), 'revision', c.revision,
    'coverage_from', c.coverage_from, 'coverage_to', c.coverage_to,
    'time_zone', c.time_zone_id, 'holidays', (SELECT count(*) FROM lab_ops.lab_holidays h WHERE h.lab_business_calendar_id = c.id))
FROM lab_ops.lab_business_calendars c ORDER BY revision DESC LIMIT 1;
COMMIT;
