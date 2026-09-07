-- TEMPORARY: remove after authorized repair and verification.
-- Read-only inventory for the current commercial_ops schema. Run with psql
-- -X -A -t -v ON_ERROR_STOP=1. Output excludes names, contacts, free-form text,
-- storage keys, external references, payload JSON, and connection values.
-- Counts cover all rows; detail arrays are capped at 250 and report truncation.
-- Candidate matches and audit values are evidence for review, not repair commands.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

SELECT jsonb_build_object('section', 'audit_metadata', 'generated_at', transaction_timestamp(),
    'read_only', current_setting('transaction_read_only'),
    'latest_migration', (SELECT max("MigrationId") FROM public.__ef_migrations_history));

SELECT jsonb_build_object('section', 'order_defaults',
    'row_count', (SELECT count(*) FROM commercial_ops.order_system_configurations),
    'truncated', (SELECT count(*) > 250 FROM commercial_ops.order_system_configurations),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'version', version,
        'supported_sample_mode', sample_configuration_json = '{"mode":"ExactSampleRoster"}'::jsonb,
        'supported_result_destination', result_destination_configuration_json = '{"destination":"GovernedPortal"}'::jsonb,
        'quote_validity_in_range', quote_validity_days BETWEEN 1 AND 365,
        'has_submission_instructions', length(trim(sample_submission_instructions)) > 0,
        'has_legacy_shipping_json', shipping_configuration_json <> '{}'::jsonb
    ) ORDER BY created_at, id), '[]'::jsonb))
FROM (SELECT * FROM commercial_ops.order_system_configurations ORDER BY created_at, id LIMIT 250) configurations;

SELECT jsonb_build_object('section', 'effective_readiness_definitions',
    'canonical_specimen_offerings', (SELECT count(*) FROM commercial_ops.qbo_catalog_items
        WHERE is_active AND lower(external_item_id) = 'pseq-lab-service' AND lower(sales_unit) = 'specimen'),
    'effective_sample_types', (SELECT count(*) FROM commercial_ops.sample_type_definitions
        WHERE is_active AND effective_from <= transaction_timestamp() AND (effective_to IS NULL OR effective_to > transaction_timestamp())),
    'effective_destinations', (SELECT count(*) FROM commercial_ops.sample_shipping_destinations
        WHERE is_active AND effective_from <= transaction_timestamp() AND (effective_to IS NULL OR effective_to > transaction_timestamp())),
    'effective_compatible_rules', (SELECT count(*) FROM commercial_ops.sample_shipping_instruction_rules r
        JOIN commercial_ops.sample_type_definitions s ON s.id = r.sample_type_definition_id
        JOIN commercial_ops.sample_shipping_destinations d ON d.id = r.destination_id
        WHERE r.is_active AND s.is_active AND d.is_active
        AND r.effective_from <= transaction_timestamp() AND (r.effective_to IS NULL OR r.effective_to > transaction_timestamp())
        AND s.effective_from <= transaction_timestamp() AND (s.effective_to IS NULL OR s.effective_to > transaction_timestamp())
        AND d.effective_from <= transaction_timestamp() AND (d.effective_to IS NULL OR d.effective_to > transaction_timestamp())));

WITH suspect AS (
    SELECT r.id, r.organization_id, r.status, r.version, r.source, r.requested_organization_kind,
        h.company_id, h.id AS handoff_id,
        length(trim(coalesce(r.summary, ''))) > 0 AS has_summary,
        length(trim(coalesce(r.internal_notes, ''))) > 0 AS has_internal_notes
    FROM commercial_ops.portal_integration_requests r
    LEFT JOIN commercial_ops.crm_handoffs h ON h.relationship_request_id = r.id
    WHERE r.request_type = 'RelationshipChange'
        AND (r.requested_organization_kind IS NULL OR r.requested_organization_kind NOT IN ('Customer', 'Partner'))
), audited AS (
    SELECT s.id, a.id AS audit_id, CASE v.value
        WHEN '2' THEN 'Customer' WHEN 'Customer' THEN 'Customer'
        WHEN '4' THEN 'Partner' WHEN 'Partner' THEN 'Partner' END AS target
    FROM suspect s JOIN commercial_ops.audit_events a
        ON a.entity_name = 'PortalIntegrationRequest' AND a.entity_id = s.id::text
    CROSS JOIN LATERAL (VALUES
        (coalesce(a.changes_json #>> '{RequestedOrganizationKind,new}', a.changes_json #>> '{requestedOrganizationKind,new}')),
        (coalesce(a.changes_json #>> '{RequestedOrganizationKind,old}', a.changes_json #>> '{requestedOrganizationKind,old}'))
    ) v(value)
    WHERE v.value IN ('2', '4', 'Customer', 'Partner')
), details AS (
    SELECT s.*, coalesce((SELECT jsonb_agg(DISTINCT a.target) FROM audited a WHERE a.id = s.id), '[]'::jsonb) AS audited_target_enums,
        coalesce((SELECT jsonb_agg(DISTINCT a.audit_id) FROM audited a WHERE a.id = s.id), '[]'::jsonb) AS target_audit_ids
    FROM suspect s
)
SELECT jsonb_build_object('section', 'historical_relationship_targets', 'affected_count', (SELECT count(*) FROM details),
    'truncated', (SELECT count(*) > 250 FROM details),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM details ORDER BY id LIMIT 250) d), '[]'::jsonb));

-- The 20260901162409 migration dropped crm_portal_account_links without copying
-- its rows. Immutable audit may retain IDs and last active state; it cannot
-- reconstruct facts that were never recorded. Only allowed UUID/boolean values
-- are emitted. A historical pair is not automatic authorization to relink it.
WITH old_link_events AS (
    SELECT entity_id, id AS audit_id, occurred_at, operation,
        coalesce(changes_json #>> '{CompanyId,new}', changes_json #>> '{companyId,new}',
            changes_json #>> '{CompanyId,old}', changes_json #>> '{companyId,old}') AS company_text,
        coalesce(changes_json #>> '{OrganizationId,new}', changes_json #>> '{organizationId,new}',
            changes_json #>> '{OrganizationId,old}', changes_json #>> '{organizationId,old}') AS organization_text,
        coalesce(changes_json #>> '{IsActive,new}', changes_json #>> '{isActive,new}') AS active_text
    FROM commercial_ops.audit_events WHERE entity_name = 'CrmPortalAccountLink'
), reconstructed AS (
    SELECT entity_id,
        (array_agg(company_text ORDER BY occurred_at DESC, audit_id DESC) FILTER (WHERE company_text IS NOT NULL))[1] AS company_text,
        (array_agg(organization_text ORDER BY occurred_at DESC, audit_id DESC) FILTER (WHERE organization_text IS NOT NULL))[1] AS organization_text,
        (array_agg(active_text ORDER BY occurred_at DESC, audit_id DESC) FILTER (WHERE active_text IS NOT NULL))[1] AS active_text,
        (array_agg(operation ORDER BY occurred_at DESC, audit_id DESC))[1] AS last_operation,
        (array_agg(audit_id ORDER BY occurred_at DESC, audit_id DESC))[1] AS latest_audit_id
    FROM old_link_events GROUP BY entity_id
), valid AS (
    SELECT CASE WHEN company_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN company_text::uuid END AS company_id,
        CASE WHEN organization_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN organization_text::uuid END AS organization_id,
        active_text = 'true' AND last_operation <> 'Deleted' AS last_recorded_active,
        latest_audit_id
    FROM reconstructed
), details AS (
    SELECT v.company_id, v.organization_id, v.last_recorded_active, v.latest_audit_id,
        c.id IS NOT NULL AS company_exists, o.id IS NOT NULL AS organization_exists,
        coalesce(c.is_active, false) AS company_active, coalesce(o.is_active, false) AS organization_active,
        c.access_organization_id AS current_company_organization_id,
        EXISTS (SELECT 1 FROM commercial_ops.crm_companies x WHERE x.access_organization_id = v.organization_id AND x.id <> v.company_id) AS linked_to_another_company
    FROM valid v LEFT JOIN commercial_ops.crm_companies c ON c.id = v.company_id
    LEFT JOIN commercial_ops.organizations o ON o.id = v.organization_id
    WHERE v.company_id IS NOT NULL AND v.organization_id IS NOT NULL
)
SELECT jsonb_build_object('section', 'prior_account_link_audit', 'candidate_count', (SELECT count(*) FROM details),
    'truncated', (SELECT count(*) > 250 FROM details),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM details ORDER BY organization_id, company_id LIMIT 250) d), '[]'::jsonb));

WITH unassociated AS (
    SELECT o.id AS organization_id, o.kind, o.is_active, o.version,
        (SELECT count(*) FROM commercial_ops.crm_companies c WHERE c.is_active AND c.name = o.name AND c.access_organization_id IS NULL) AS exact_name_unlinked_company_count,
        coalesce((SELECT jsonb_agg(c.id ORDER BY c.id) FROM commercial_ops.crm_companies c
            WHERE c.is_active AND c.name = o.name AND c.access_organization_id IS NULL), '[]'::jsonb) AS exact_name_unlinked_company_ids,
        (SELECT count(*) FROM commercial_ops.organization_memberships m WHERE m.organization_id = o.id AND m.is_active) AS active_membership_count,
        (SELECT count(*) FROM commercial_ops.portal_integration_requests r WHERE r.organization_id = o.id) AS relationship_request_count,
        (SELECT count(*) FROM commercial_ops.lab_service_orders l WHERE l.organization_id = o.id) AS lab_order_count,
        (SELECT count(*) FROM commercial_ops.organization_dataset_grants g WHERE g.organization_id = o.id) AS dataset_grant_count
    FROM commercial_ops.organizations o WHERE o.kind <> 'Phaeno'
        AND NOT EXISTS (SELECT 1 FROM commercial_ops.crm_companies c WHERE c.access_organization_id = o.id)
)
SELECT jsonb_build_object('section', 'unassociated_organizations', 'affected_count', (SELECT count(*) FROM unassociated),
    'truncated', (SELECT count(*) > 250 FROM unassociated),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM unassociated ORDER BY organization_id LIMIT 250) d), '[]'::jsonb));

WITH receipt_markers AS (
    SELECT id, organization_id, status, version,
        CASE WHEN evidence_storage_key IS NULL OR trim(evidence_storage_key) = '' THEN 'Missing'
            WHEN evidence_storage_key LIKE 'receipt-evidence:%' AND length(evidence_storage_key) > 17 THEN 'ManagedReceiptMarker'
            WHEN evidence_storage_key ~* '^payment-import:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'ImportMarker'
            ELSE 'LegacyOrInvalidReference' END AS evidence_marker,
        CASE WHEN evidence_storage_key ~* '^payment-import:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN substring(evidence_storage_key FROM 16)::uuid END AS import_id
    FROM commercial_ops.payment_receipts
), details AS (
    SELECT r.*, CASE WHEN r.import_id IS NULL THEN NULL ELSE EXISTS
        (SELECT 1 FROM commercial_ops.payment_import_batches b WHERE b.id = r.import_id AND b.status = 'Confirmed') END AS confirmed_import_exists
    FROM receipt_markers r
)
SELECT jsonb_build_object('section', 'receipt_evidence',
    'marker_counts', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM
        (SELECT evidence_marker, count(*) AS count FROM details GROUP BY evidence_marker ORDER BY evidence_marker) c), '[]'::jsonb),
    'affected_count', (SELECT count(*) FROM details WHERE evidence_marker IN ('Missing', 'LegacyOrInvalidReference') OR confirmed_import_exists = false),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM details ORDER BY id LIMIT 250) d), '[]'::jsonb),
    'truncated', (SELECT count(*) > 250 FROM details));

WITH documents AS (
    SELECT id, workflow_id, CASE WHEN workflow_type IN ('LabService', 'DataAssembly', 'Reagent') THEN workflow_type ELSE 'Other' END AS workflow_type,
        kind, sync_status, version,
        CASE WHEN external_document_id LIKE 'local-%' THEN 'SyntheticLocal'
            WHEN external_document_id LIKE 'manual:%' THEN 'ManualJournal'
            WHEN external_document_id IS NULL THEN 'Missing' ELSE 'ExternalReference' END AS document_marker,
        total = 0 AS zero_total, balance = 0 AS zero_balance
    FROM commercial_ops.commercial_document_links
)
SELECT jsonb_build_object('section', 'commercial_document_markers',
    'marker_counts', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM
        (SELECT document_marker, kind, sync_status, count(*) AS count FROM documents GROUP BY document_marker, kind, sync_status ORDER BY document_marker, kind, sync_status) c), '[]'::jsonb),
    'synthetic_count', (SELECT count(*) FROM documents WHERE document_marker = 'SyntheticLocal'),
    'synthetic_rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM documents WHERE document_marker = 'SyntheticLocal' ORDER BY id LIMIT 250) d), '[]'::jsonb),
    'truncated', (SELECT count(*) > 250 FROM documents WHERE document_marker = 'SyntheticLocal'));

WITH outbox AS (
    SELECT id, operation, status, attempt_count, version, workflow_id,
        CASE WHEN workflow_type IN ('LabService', 'DataAssembly', 'Reagent', 'Configuration') THEN workflow_type ELSE 'Other' END AS workflow_type,
        coalesce(payload_json->>'externalDocumentId', payload_json->>'ExternalDocumentId', '') LIKE 'local-%' AS has_synthetic_document_reference,
        coalesce(payload_json->>'externalDocumentId', payload_json->>'ExternalDocumentId', '') LIKE 'manual:%' AS has_manual_document_reference
    FROM commercial_ops.order_outbox_messages
)
SELECT jsonb_build_object('section', 'commercial_outbox',
    'state_counts', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM
        (SELECT operation, status, count(*) AS count FROM outbox GROUP BY operation, status ORDER BY operation, status) c), '[]'::jsonb),
    'active_or_synthetic_count', (SELECT count(*) FROM outbox WHERE status <> 'Succeeded' OR has_synthetic_document_reference),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM
        (SELECT * FROM outbox WHERE status <> 'Succeeded' OR has_synthetic_document_reference ORDER BY id LIMIT 250) d), '[]'::jsonb),
    'truncated', (SELECT count(*) > 250 FROM outbox WHERE status <> 'Succeeded' OR has_synthetic_document_reference));

SELECT jsonb_build_object('section', 'commercial_profile_flags', 'row_count', count(*),
    'assembly_credit_count', count(*) FILTER (WHERE assembly_credit_approved),
    'legacy_lab_credit_count', count(*) FILTER (WHERE lab_credit_approved),
    'qbo_reference_count', count(*) FILTER (WHERE qbo_customer_id IS NOT NULL),
    'synthetic_qbo_reference_count', count(*) FILTER (WHERE qbo_customer_id LIKE 'local-%'))
FROM commercial_ops.organization_commercial_profiles;

COMMIT;
