-- Data reset only: preserve the deployed schema and public EF migration history.
-- Required psql variables: mode, operation_id, source_revision.
\set ON_ERROR_STOP on
\set VERBOSITY terse
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '120s';
SELECT set_config('reconstruction.mode', :'mode', true) AS mode \gset
SELECT set_config('reconstruction.operation_id', :'operation_id', true) AS operation_id \gset
SELECT set_config('reconstruction.source_revision', :'source_revision', true) AS source_revision \gset

CREATE TEMP TABLE reconstruction_inventory (
    table_oid regclass PRIMARY KEY,
    qualified_name text NOT NULL,
    before_count bigint NOT NULL DEFAULT 0
) ON COMMIT DROP;
INSERT INTO reconstruction_inventory (table_oid, qualified_name)
SELECT c.oid, format('%I.%I', n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('commercial_ops', 'lab_ops', 'website') AND c.relkind IN ('r', 'p');

DO $guards$
DECLARE item record; tables text;
BEGIN
    IF current_database() <> 'phaeno_portal_green'
        OR current_setting('reconstruction.mode') NOT IN ('preview', 'reset')
        OR current_setting('reconstruction.operation_id') !~ '^github-actions-[0-9]+-[0-9]+$'
        OR current_setting('reconstruction.source_revision') !~ '^[0-9a-f]{40}$' THEN
        RAISE EXCEPTION 'Invalid reconstruction target or operation metadata.';
    END IF;
    IF to_regclass('public.__ef_migrations_history') IS NULL
        OR NOT EXISTS (SELECT 1 FROM reconstruction_inventory) THEN
        RAISE EXCEPTION 'Expected Portal schema and migration history are required.';
    END IF;
    -- No CASCADE: a foreign-key dependency outside the owned schemas must refuse reset.
    IF EXISTS (SELECT 1 FROM pg_constraint f WHERE f.contype = 'f'
        AND f.confrelid IN (SELECT table_oid FROM reconstruction_inventory)
        AND f.conrelid NOT IN (SELECT table_oid FROM reconstruction_inventory)) THEN
        RAISE EXCEPTION 'A table outside the Portal schemas references application data.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_inherits p
        WHERE p.inhparent IN (SELECT table_oid FROM reconstruction_inventory)
        AND p.inhrelid NOT IN (SELECT table_oid FROM reconstruction_inventory)) THEN
        RAISE EXCEPTION 'An application table has descendants outside the Portal schemas.';
    END IF;
    IF current_setting('reconstruction.mode') = 'reset' THEN
        SELECT string_agg(qualified_name, ', ' ORDER BY qualified_name) INTO tables FROM reconstruction_inventory;
        EXECUTE 'LOCK TABLE ' || tables || ' IN ACCESS EXCLUSIVE MODE';
    END IF;
    FOR item IN SELECT * FROM reconstruction_inventory LOOP
        EXECUTE format('UPDATE reconstruction_inventory SET before_count = (SELECT count(*) FROM %s) WHERE table_oid = %s',
            item.qualified_name, item.table_oid::oid);
    END LOOP;
END;
$guards$;

CREATE TEMP TABLE reconstruction_keep (
    table_oid regclass PRIMARY KEY,
    rows jsonb NOT NULL,
    disposition text NOT NULL CHECK (disposition IN ('preserve', 'seed')),
    restored boolean NOT NULL DEFAULT false
) ON COMMIT DROP;

CREATE FUNCTION pg_temp.keep_rows(target regclass, predicate text DEFAULT 'true') RETURNS void
LANGUAGE plpgsql AS $capture$
DECLARE captured jsonb;
BEGIN
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id), ''[]''::jsonb) FROM %s t WHERE %s', target, predicate) INTO captured;
    INSERT INTO reconstruction_keep (table_oid, rows, disposition) VALUES (target, captured, 'preserve');
END;
$capture$;

SELECT pg_temp.keep_rows('commercial_ops.organizations', 'kind = ''Phaeno''');
SELECT pg_temp.keep_rows('commercial_ops.users', 'id IN (SELECT m.user_id FROM commercial_ops.organization_memberships m JOIN commercial_ops.organizations o ON o.id = m.organization_id WHERE o.kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('commercial_ops.organization_memberships', 'organization_id IN (SELECT id FROM commercial_ops.organizations WHERE kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('commercial_ops.organization_departments', 'organization_id IN (SELECT id FROM commercial_ops.organizations WHERE kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('commercial_ops.organization_department_memberships', 'organization_membership_id IN (SELECT m.id FROM commercial_ops.organization_memberships m JOIN commercial_ops.organizations o ON o.id = m.organization_id WHERE o.kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('commercial_ops.business_role_assignments', 'user_id IN (SELECT m.user_id FROM commercial_ops.organization_memberships m JOIN commercial_ops.organizations o ON o.id = m.organization_id WHERE o.kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('lab_ops.lab_role_assignments', 'user_id IN (SELECT m.user_id FROM commercial_ops.organization_memberships m JOIN commercial_ops.organizations o ON o.id = m.organization_id WHERE o.kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('commercial_ops.trial_approval_authorities', 'user_id IN (SELECT m.user_id FROM commercial_ops.organization_memberships m JOIN commercial_ops.organizations o ON o.id = m.organization_id WHERE o.kind = ''Phaeno'')');
SELECT pg_temp.keep_rows('lab_ops.lab_product_types', 'id IN (''90000000-0000-4000-8000-000000000001'', ''90000000-0000-4000-8000-000000000002'', ''90000000-0000-4000-8000-000000000003'')');
SELECT pg_temp.keep_rows('lab_ops.lab_business_calendars');
SELECT pg_temp.keep_rows('lab_ops.lab_holidays');

-- Recreate model defaults, rather than carry forward customized system configuration.
-- Keep these definitions aligned with the model's HasData declarations.
INSERT INTO reconstruction_keep (table_oid, rows, disposition) VALUES
('commercial_ops.crm_pipelines', '[{"id":"20000000-0000-0000-0000-000000000001","name":"General Sales","description":"Default standalone commercial opportunity pipeline.","is_default":true,"is_active":true,"created_at":"2026-08-26T00:00:00Z","created_by_user_id":null,"updated_at":"2026-08-26T00:00:00Z","updated_by_user_id":null,"version":1}]', 'seed'),
('lab_ops.lab_suppliers', '[{"id":"1e739efa-20d6-462d-a954-b12721fcfb20","name":"Phaeno","normalized_name":"PHAENO","is_active":true,"is_internal_producer":true,"created_at":"2026-09-28T00:00:00Z","created_by_user_id":null,"updated_at":"2026-09-28T00:00:00Z","updated_by_user_id":null,"version":1}]', 'seed'),
('website.web_notification_processing_controls', '[{"id":"526a3498-feb3-4a94-a5f2-9277c2bc9c97","is_paused":false,"version":"a6d4f4cc-c523-4a08-86f7-5d2bb44a1099","updated_at_utc":null,"updated_by_user_id":null,"reason":null}]', 'seed');

INSERT INTO reconstruction_keep (table_oid, rows, disposition)
SELECT 'commercial_ops.crm_pipeline_stages'::regclass, jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'category', category, 'position', position, 'probability', probability,
    'requires_reason', requires_reason, 'pipeline_id', '20000000-0000-0000-0000-000000000001',
    'is_active', true, 'created_at', '2026-08-26T00:00:00Z', 'updated_at', '2026-08-26T00:00:00Z',
    'created_by_user_id', NULL, 'updated_by_user_id', NULL, 'version', 1) ORDER BY id), 'seed'
FROM (VALUES
    ('20000000-0000-0000-0000-000000000011', 'Discovery', 'Open', 10, 10, false),
    ('20000000-0000-0000-0000-000000000012', 'Qualified', 'Open', 20, 25, false),
    ('20000000-0000-0000-0000-000000000013', 'Proposal', 'Open', 30, 50, false),
    ('20000000-0000-0000-0000-000000000014', 'Negotiation', 'Open', 40, 75, false),
    ('20000000-0000-0000-0000-000000000015', 'Won', 'Won', 50, 100, false),
    ('20000000-0000-0000-0000-000000000016', 'Lost', 'Lost', 60, 0, true),
    ('20000000-0000-0000-0000-000000000017', 'Abandoned', 'Lost', 70, 0, true)
) stages(id, name, category, position, probability, requires_reason);

INSERT INTO reconstruction_keep (table_oid, rows, disposition)
SELECT 'commercial_ops.trial_deliverable_definitions'::regclass, jsonb_agg(jsonb_build_object(
    'id', id, 'key', key, 'name', name, 'revision', 1, 'is_active', true, 'is_default', true,
    'created_at', '2026-09-05T00:00:00Z', 'updated_at', '2026-09-05T00:00:00Z',
    'created_by_user_id', NULL, 'updated_by_user_id', NULL, 'version', 1) ORDER BY id), 'seed'
FROM (VALUES
    ('87c083a2-8039-4d9a-9b61-4ec577e1a001', 'FASTQ', 'FASTQ sequencing reads'),
    ('87c083a2-8039-4d9a-9b61-4ec577e1a002', 'FASTA', 'FASTA sequences'),
    ('87c083a2-8039-4d9a-9b61-4ec577e1a003', 'BAM', 'BAM alignments')
) deliverables(id, key, name);

DO $validate$
DECLARE item record; fk record; nonnull text; matches text; missing boolean; target_rows jsonb; expected_columns text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM commercial_ops.users u
        JOIN commercial_ops.organization_memberships m ON m.user_id = u.id
        JOIN commercial_ops.organizations o ON o.id = m.organization_id
        WHERE o.kind = 'Phaeno' AND o.is_active AND m.is_active AND m.is_organization_admin
            AND u.is_active AND u.external_identity_provider = 'clerk' AND nullif(u.external_subject_id, '') IS NOT NULL) THEN
        RAISE EXCEPTION 'An active, linked Phaeno administrator must remain.';
    END IF;
    IF (SELECT jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_product_types'::regclass) <> 3
        OR (SELECT jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_business_calendars'::regclass) = 0
        OR (SELECT jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_holidays'::regclass) = 0 THEN
        RAISE EXCEPTION 'All three built-in types and a populated holiday calendar are required.';
    END IF;
    -- Normalize seed date/number types using the live table definition before comparing.
    FOR item IN SELECT * FROM reconstruction_keep WHERE disposition = 'seed' LOOP
        SELECT array_agg(attname::text ORDER BY attname) INTO expected_columns FROM pg_attribute
            WHERE attrelid = item.table_oid AND attnum > 0 AND NOT attisdropped;
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(item.rows) r(value)
            WHERE (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(r.value) keys(key)) IS DISTINCT FROM expected_columns) THEN
            RAISE EXCEPTION 'Reference seeds need review for the deployed columns of %', item.table_oid;
        END IF;
        EXECUTE format('SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM jsonb_populate_recordset(NULL::%s, $1) t', item.table_oid)
            INTO target_rows USING item.rows;
        UPDATE reconstruction_keep SET rows = target_rows WHERE table_oid = item.table_oid;
    END LOOP;
    -- Check all retained references before TRUNCATE, including authority self-references.
    FOR fk IN SELECT f.* FROM pg_constraint f JOIN reconstruction_keep k ON k.table_oid = f.conrelid
        WHERE f.contype = 'f' AND jsonb_array_length(k.rows) > 0 LOOP
        SELECT string_agg(format('s.%I IS NOT NULL', sa.attname), ' AND ' ORDER BY s.ordinality),
            string_agg(format('s.%I = t.%I', sa.attname, ta.attname), ' AND ' ORDER BY s.ordinality)
        INTO nonnull, matches
        FROM unnest(fk.conkey) WITH ORDINALITY s(attnum, ordinality)
        JOIN unnest(fk.confkey) WITH ORDINALITY t(attnum, ordinality) USING (ordinality)
        JOIN pg_attribute sa ON sa.attrelid = fk.conrelid AND sa.attnum = s.attnum
        JOIN pg_attribute ta ON ta.attrelid = fk.confrelid AND ta.attnum = t.attnum;
        SELECT coalesce(rows, '[]'::jsonb) INTO target_rows FROM reconstruction_keep WHERE table_oid = fk.confrelid;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM jsonb_populate_recordset(NULL::%s, $1) s WHERE %s AND NOT EXISTS (SELECT 1 FROM jsonb_populate_recordset(NULL::%s, $2) t WHERE %s))',
            fk.conrelid::regclass, nonnull, fk.confrelid::regclass, matches)
            INTO missing USING (SELECT rows FROM reconstruction_keep WHERE table_oid = fk.conrelid), coalesce(target_rows, '[]'::jsonb);
        IF missing THEN RAISE EXCEPTION 'Preserved records have an unresolved dependency: %', fk.conname; END IF;
    END LOOP;
END;
$validate$;

-- Define the reset function in preview too, so PostgreSQL validates its procedural syntax.
CREATE FUNCTION pg_temp.reset_database() RETURNS void LANGUAGE plpgsql AS $reset$
DECLARE tables text; item record; columns text; actual jsonb; progress integer;
BEGIN
    IF current_setting('reconstruction.mode') <> 'reset' THEN
        RAISE EXCEPTION 'Preview cannot execute the data reset.';
    END IF;
    SELECT string_agg(qualified_name, ', ' ORDER BY qualified_name) INTO tables FROM reconstruction_inventory;
    EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY';
    WHILE EXISTS (SELECT 1 FROM reconstruction_keep WHERE NOT restored) LOOP
        progress := 0;
        FOR item IN SELECT k.* FROM reconstruction_keep k WHERE NOT k.restored AND NOT EXISTS (
            SELECT 1 FROM pg_constraint f JOIN reconstruction_keep parent ON parent.table_oid = f.confrelid
            WHERE f.contype = 'f' AND f.conrelid = k.table_oid AND f.confrelid <> f.conrelid AND NOT parent.restored)
            ORDER BY k.table_oid::text LOOP
            SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO columns FROM pg_attribute
                WHERE attrelid = item.table_oid AND attnum > 0 AND NOT attisdropped AND attgenerated = '';
            EXECUTE format('INSERT INTO %s (%s) SELECT %s FROM jsonb_populate_recordset(NULL::%s, $1)',
                item.table_oid, columns, columns, item.table_oid) USING item.rows;
            UPDATE reconstruction_keep SET restored = true WHERE table_oid = item.table_oid;
            progress := progress + 1;
        END LOOP;
        IF progress = 0 THEN RAISE EXCEPTION 'Preserved records have a cross-table dependency cycle.'; END IF;
    END LOOP;
    FOR item IN SELECT i.*, coalesce(k.rows, '[]'::jsonb) AS expected FROM reconstruction_inventory i LEFT JOIN reconstruction_keep k USING (table_oid) LOOP
        EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)->>''id''), ''[]''::jsonb) FROM %s t', item.qualified_name) INTO actual;
        IF actual <> item.expected THEN RAISE EXCEPTION 'Post-reset comparison failed for %', item.qualified_name; END IF;
    END LOOP;
    INSERT INTO commercial_ops.audit_events
        (id, entity_name, entity_id, operation, organization_id, actor_user_id, request_id, occurred_at, changes_json)
    SELECT gen_random_uuid(), 'PortalDatabase', current_database(), 'Reconstructed', NULL, NULL,
        current_setting('reconstruction.operation_id'), transaction_timestamp(), jsonb_build_object(
            'sourceRevision', current_setting('reconstruction.source_revision'),
            'maintenanceAuditRecords', 1,
            'tables', (SELECT jsonb_agg(jsonb_build_object('table', i.qualified_name, 'before', i.before_count,
                'disposition', coalesce(k.disposition, 'clear'), 'after', coalesce(jsonb_array_length(k.rows), 0)) ORDER BY i.qualified_name)
                FROM reconstruction_inventory i LEFT JOIN reconstruction_keep k USING (table_oid)));
    EXECUTE format('COMMENT ON DATABASE %I IS %L', current_database(),
        'phaeno-reconstruction-v1:' || current_setting('reconstruction.operation_id'));
END;
$reset$;

-- Count-only preview: never emit user profiles, emails, identity bindings or record payloads.
SELECT 'table=' || i.qualified_name || ' before=' || i.before_count
    || ' disposition=' || coalesce(k.disposition, 'clear')
    || ' after=' || (coalesce(jsonb_array_length(k.rows), 0) + CASE WHEN i.table_oid = 'commercial_ops.audit_events'::regclass THEN 1 ELSE 0 END)
FROM reconstruction_inventory i LEFT JOIN reconstruction_keep k USING (table_oid) ORDER BY i.qualified_name;
SELECT 'preserved_users=' || jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'commercial_ops.users'::regclass;
SELECT 'preserved_product_types=' || jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_product_types'::regclass;
SELECT 'preserved_calendars=' || jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_business_calendars'::regclass;
SELECT 'preserved_holidays=' || jsonb_array_length(rows) FROM reconstruction_keep WHERE table_oid = 'lab_ops.lab_holidays'::regclass;
SELECT current_setting('reconstruction.mode') = 'reset' AS execute_reset \gset
\if :execute_reset
SELECT pg_temp.reset_database();
COMMIT;
\echo reconstruction=RESET_COMPLETE
\else
ROLLBACK;
\echo reconstruction=PREVIEW_COMPLETE
\endif
