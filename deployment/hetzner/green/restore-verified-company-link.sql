-- TEMPORARY: single reviewed restoration; remove after verified completion.
-- Restore only the original Company/access-scope association lost by the
-- 20260901162409 table-fold migration. Never create/merge an organization,
-- advance a request, change readiness/credit, or create memberships/grants.
-- Before execution: preserve a recoverable DB backup and the private preflight
-- row/audit export; review section confirmed_link_repair_evidence. Abort for
-- conflicting/tied history or an eligible canonical account/apply action.
-- Required psql variable (missing/invalid input fails closed):
--   apply_repair = restore-confirmed-original-link
-- The Company version, organization version, immutable source event, and
-- applied request/handoff snapshot below are fixed from the protected inventory.
-- Run only through the authorized protected maintenance connection with
-- psql -X -q -A -t -v ON_ERROR_STOP=1. Do not put credentials in arguments/output.
-- The new audit uses a null system actor, matching centralized maintenance
-- audit semantics; its request_id points to the immutable source audit.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SELECT set_config('phaeno.repair.authorization', :'apply_repair', true) IS NOT NULL AS authorization_input_set;

DO $repair$
DECLARE
    repair_company_id constant uuid := '6d0f41aa-35e9-4b97-b235-ff1ebf71b293';
    repair_organization_id constant uuid := '37b12cf9-658b-4e49-b5a7-52a4841f1b24';
    source_audit_id constant uuid := '66de39f7-b424-4923-a8a6-17fe79dd6cfa';
    repair_request_id constant text := 'restore-original-link:66de39f7-b424-4923-a8a6-17fe79dd6cfa';
    expected_version constant bigint := 1;
    expected_requests constant jsonb := '[{"id":"99eeed59-2919-4add-b4d9-3f622e65a20d","organization_id":"37b12cf9-658b-4e49-b5a7-52a4841f1b24","request_type":"Onboarding","status":"Applied","version":3,"requested_organization_kind":"Customer","handoffs":[{"id":"2536526b-8034-4eb1-b569-06ef12ccc838","company_id":"6d0f41aa-35e9-4b97-b235-ff1ebf71b293"}],"requested_services":["PSeqLabService"],"canonical_account_recovery_candidate":false,"canonical_apply_relink_candidate":false}]'::jsonb;
    current_requests jsonb;
    company commercial_ops.crm_companies%ROWTYPE;
    organization commercial_ops.organizations%ROWTYPE;
    source_event commercial_ops.audit_events%ROWTYPE;
    latest_event_id uuid;
    last_active text;
    changed_count integer;
    repair_at timestamptz := transaction_timestamp();
BEGIN
    IF current_setting('phaeno.repair.authorization') <> 'restore-confirmed-original-link' THEN
        RAISE EXCEPTION 'Repair authorization or reviewed preflight inputs are missing.';
    END IF;

    SELECT c.* INTO STRICT company FROM commercial_ops.crm_companies c WHERE c.id = repair_company_id FOR UPDATE;
    SELECT o.* INTO STRICT organization FROM commercial_ops.organizations o WHERE o.id = repair_organization_id FOR UPDATE;
    IF (company.access_organization_id IS NOT NULL AND company.access_organization_id <> repair_organization_id)
        OR NOT company.is_active OR NOT organization.is_active OR organization.kind <> 'Customer'
        OR organization.version <> 2 OR company.name <> organization.name
        OR EXISTS (SELECT 1 FROM commercial_ops.crm_companies c WHERE c.access_organization_id = repair_organization_id AND c.id <> repair_company_id) THEN
        RAISE EXCEPTION 'Current Company or organization does not match reviewed original-link repair.';
    END IF;
    IF EXISTS (SELECT 1 FROM commercial_ops.organization_memberships m WHERE m.organization_id = repair_organization_id AND m.is_active)
        OR EXISTS (SELECT 1 FROM commercial_ops.lab_service_orders o WHERE o.organization_id = repair_organization_id)
        OR EXISTS (SELECT 1 FROM commercial_ops.organization_dataset_grants g WHERE g.organization_id = repair_organization_id) THEN
        RAISE EXCEPTION 'The reviewed access-scope usage changed; repeat the inventory.';
    END IF;

    SELECT a.* INTO STRICT source_event FROM commercial_ops.audit_events a
        WHERE a.id = source_audit_id AND a.entity_name = 'CrmPortalAccountLink';
    IF source_event.operation <> 'Created'
        OR source_event.occurred_at <> '2026-08-29T18:14:10.370658Z'::timestamptz
        OR source_event.actor_user_id IS DISTINCT FROM '19a51eb3-1a16-43b2-941f-ef3149bc3f93'::uuid
        OR (SELECT count(*) FROM commercial_ops.audit_events a
            WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id) <> 1 THEN
        RAISE EXCEPTION 'The reviewed original creation evidence changed.';
    END IF;
    SELECT a.id INTO STRICT latest_event_id FROM commercial_ops.audit_events a
        WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id
        ORDER BY a.occurred_at DESC, a.id DESC LIMIT 1;
    IF latest_event_id <> source_audit_id OR source_event.operation = 'Deleted'
        OR EXISTS (SELECT 1 FROM commercial_ops.audit_events a
            WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id
            GROUP BY a.occurred_at HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Original-link history changed or its final ordering is ambiguous.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM commercial_ops.audit_events a
        WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id AND a.operation = 'Created'
            AND coalesce(a.changes_json #>> '{CompanyId,new}', a.changes_json #>> '{companyId,new}') = repair_company_id::text
            AND coalesce(a.changes_json #>> '{OrganizationId,new}', a.changes_json #>> '{organizationId,new}') = repair_organization_id::text)
        OR EXISTS (SELECT 1 FROM commercial_ops.audit_events a
            CROSS JOIN LATERAL (VALUES
                (coalesce(a.changes_json #>> '{CompanyId,old}', a.changes_json #>> '{companyId,old}'), repair_company_id::text),
                (coalesce(a.changes_json #>> '{CompanyId,new}', a.changes_json #>> '{companyId,new}'), repair_company_id::text),
                (coalesce(a.changes_json #>> '{OrganizationId,old}', a.changes_json #>> '{organizationId,old}'), repair_organization_id::text),
                (coalesce(a.changes_json #>> '{OrganizationId,new}', a.changes_json #>> '{organizationId,new}'), repair_organization_id::text)) v(actual, expected)
            WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id
                AND v.actual IS NOT NULL AND v.actual <> v.expected) THEN
        RAISE EXCEPTION 'The immutable history does not establish only the reviewed original pair.';
    END IF;
    SELECT coalesce(a.changes_json #>> '{IsActive,new}', a.changes_json #>> '{isActive,new}') INTO last_active
        FROM commercial_ops.audit_events a WHERE a.entity_name = source_event.entity_name AND a.entity_id = source_event.entity_id
            AND coalesce(a.changes_json #>> '{IsActive,new}', a.changes_json #>> '{isActive,new}') IS NOT NULL
        ORDER BY a.occurred_at DESC, a.id DESC LIMIT 1;
    IF last_active IS DISTINCT FROM 'true'
        OR EXISTS (SELECT 1 FROM commercial_ops.audit_events a WHERE a.entity_name = source_event.entity_name
            AND a.entity_id = source_event.entity_id AND a.operation NOT IN ('Created', 'Updated')) THEN
        RAISE EXCEPTION 'The prior link was revoked, deleted, or has unsupported history.';
    END IF;
    -- Preserve the reviewed request/handoff and selected services while the
    -- Company update commits. No request, handoff, or service row is changed.
    PERFORM r.id FROM commercial_ops.portal_integration_requests r
        WHERE r.id = '99eeed59-2919-4add-b4d9-3f622e65a20d'::uuid FOR SHARE;
    PERFORM h.id FROM commercial_ops.crm_handoffs h
        WHERE h.id = '2536526b-8034-4eb1-b569-06ef12ccc838'::uuid FOR SHARE;
    PERFORM rs.id FROM commercial_ops.portal_integration_request_services rs
        WHERE rs.portal_integration_request_id = '99eeed59-2919-4add-b4d9-3f622e65a20d'::uuid FOR SHARE;
    SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) INTO current_requests FROM (
        SELECT r.id, r.organization_id, r.request_type, r.status, r.version, r.requested_organization_kind,
            coalesce((SELECT jsonb_agg(jsonb_build_object('id', h.id, 'company_id', h.company_id) ORDER BY h.id)
                FROM commercial_ops.crm_handoffs h WHERE h.relationship_request_id = r.id), '[]'::jsonb) AS handoffs,
            coalesce((SELECT jsonb_agg(rs.service ORDER BY rs.service) FROM commercial_ops.portal_integration_request_services rs
                WHERE rs.portal_integration_request_id = r.id), '[]'::jsonb) AS requested_services,
            r.status = 'Approved' AND r.organization_id IS NULL AND r.request_type IN ('Onboarding', 'Evaluation')
                AND r.requested_organization_kind = 'Customer'
                AND EXISTS (SELECT 1 FROM commercial_ops.crm_handoffs h WHERE h.relationship_request_id = r.id AND h.company_id = repair_company_id) AS canonical_account_recovery_candidate,
            r.status = 'Approved' AND r.organization_id = repair_organization_id
                AND EXISTS (SELECT 1 FROM commercial_ops.crm_handoffs h WHERE h.relationship_request_id = r.id AND h.company_id = repair_company_id) AS canonical_apply_relink_candidate
        FROM commercial_ops.portal_integration_requests r WHERE r.organization_id = repair_organization_id OR EXISTS (
            SELECT 1 FROM commercial_ops.crm_handoffs h WHERE h.relationship_request_id = r.id AND h.company_id = repair_company_id)
    ) r;
    IF current_requests <> expected_requests THEN
        RAISE EXCEPTION 'Related request evidence changed; repeat the inventory.';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(current_requests) r WHERE
        (r->>'canonical_account_recovery_candidate')::boolean OR (r->>'canonical_apply_relink_candidate')::boolean) THEN
        RAISE EXCEPTION 'A canonical application recovery candidate exists; review that action instead.';
    END IF;

    IF company.access_organization_id = repair_organization_id THEN
        IF company.version <> expected_version + 1 OR company.updated_by_user_id IS NOT NULL
            OR (SELECT count(*) FROM commercial_ops.audit_events a WHERE a.request_id = repair_request_id) <> 1
            OR NOT EXISTS (SELECT 1 FROM commercial_ops.audit_events a WHERE a.request_id = repair_request_id
                AND a.entity_name = 'CrmCompany' AND a.entity_id = repair_company_id::text AND a.operation = 'Updated'
                AND a.actor_user_id IS NULL AND a.organization_id IS NULL AND a.occurred_at = company.updated_at
                AND a.changes_json = jsonb_build_object('AccessOrganizationId', jsonb_build_object('old', NULL, 'new', repair_organization_id)))
            OR (SELECT count(*) FROM commercial_ops.audit_events a WHERE a.entity_name = 'CrmCompany' AND a.entity_id = repair_company_id::text
                AND (a.changes_json ? 'AccessOrganizationId' OR a.changes_json ? 'accessOrganizationId')) <> 1 THEN
            RAISE EXCEPTION 'The association exists without the exact durable recovery audit; review before retrying.';
        END IF;
        RAISE NOTICE 'Exact audited recovery already committed; no rows changed.';
        RETURN;
    END IF;
    IF company.version <> expected_version OR EXISTS (SELECT 1 FROM commercial_ops.audit_events a
        WHERE a.request_id = repair_request_id OR (a.entity_name = 'CrmCompany' AND a.entity_id = repair_company_id::text
            AND (a.changes_json ? 'AccessOrganizationId' OR a.changes_json ? 'accessOrganizationId'))) THEN
        RAISE EXCEPTION 'Company version or replacement-column audit history changed; repeat the inventory.';
    END IF;

    UPDATE commercial_ops.crm_companies c SET access_organization_id = repair_organization_id,
        version = c.version + 1, updated_at = repair_at, updated_by_user_id = NULL
        WHERE c.id = repair_company_id AND c.version = expected_version AND c.access_organization_id IS NULL;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 1 THEN RAISE EXCEPTION 'Expected exactly one Company association update.'; END IF;
    INSERT INTO commercial_ops.audit_events (id, entity_name, entity_id, operation, organization_id,
        actor_user_id, request_id, occurred_at, changes_json)
    VALUES (gen_random_uuid(), 'CrmCompany', repair_company_id::text, 'Updated', NULL, NULL, repair_request_id, repair_at,
        jsonb_build_object('AccessOrganizationId', jsonb_build_object('old', NULL, 'new', repair_organization_id)));
END;
$repair$;

SELECT jsonb_build_object('section', 'restored_company_access', 'company_id', c.id,
    'access_organization_id', c.access_organization_id, 'company_version', c.version,
    'repair_audit_ids', coalesce((SELECT jsonb_agg(a.id) FROM commercial_ops.audit_events a
        WHERE a.request_id = 'restore-original-link:66de39f7-b424-4923-a8a6-17fe79dd6cfa'), '[]'::jsonb))
FROM commercial_ops.crm_companies c WHERE c.id = '6d0f41aa-35e9-4b97-b235-ff1ebf71b293'::uuid;
COMMIT;
