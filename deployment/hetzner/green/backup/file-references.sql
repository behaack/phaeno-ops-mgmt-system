-- Executed ONLY against the isolated restored database. Output remains private
-- inside the encrypted backup; no names, contact data, or freeform notes.
WITH deleted_managed AS (
    SELECT f.id
    FROM commercial_ops.managed_operational_files f
    JOIN commercial_ops.released_deliverable_retention_snapshots s
      ON s.organization_id = f.organization_id AND s.byte_deleted_at_utc IS NOT NULL
    LEFT JOIN commercial_ops.lab_result_releases lab ON lab.id = s.lab_result_release_id
    LEFT JOIN commercial_ops.trial_result_releases trial ON trial.id = s.trial_result_release_id
    WHERE (s.assembly_output_release_id = f.parent_record_id AND f.purpose = 'AssemblyOutput')
       OR (s.lab_result_release_id IS NOT NULL AND lab.lab_service_order_id = f.workflow_id
           AND lab.lab_sample_id = f.parent_record_id AND f.purpose = 'LabResult'
           AND (lower(lab.manifest_json->>'fileId') = f.id::text OR EXISTS (
               SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(lab.manifest_json->'files') = 'array'
                    THEN lab.manifest_json->'files' ELSE '[]'::jsonb END) entry
               WHERE lower(coalesce(entry->>'id',entry->>'fileId')) = f.id::text)))
       OR (s.trial_result_release_id IS NOT NULL AND trial.trial_project_id = f.workflow_id
           AND f.purpose = 'TrialResult'
           AND (lower(trial.manifest_json->>'fileId') = f.id::text OR EXISTS (
               SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(trial.manifest_json->'files') = 'array'
                    THEN trial.manifest_json->'files' ELSE '[]'::jsonb END) entry
               WHERE lower(coalesce(entry->>'id',entry->>'fileId')) = f.id::text)))
), file_refs AS (
    SELECT 'provisioning-files/' || storage_key AS path, lower(sha256) AS hash,
           size_bytes::text AS bytes, 'required' AS presence FROM commercial_ops.managed_files
    UNION ALL
    SELECT 'order-files/' || f.storage_key, lower(f.sha256), f.size_bytes::text,
           CASE WHEN EXISTS(SELECT 1 FROM deleted_managed d WHERE d.id = f.id) THEN 'retired' ELSE 'required' END
      FROM commercial_ops.managed_operational_files f
    UNION ALL
    SELECT 'order-files/' || pdf_storage_key, lower(pdf_sha256), 'unknown', 'required'
      FROM commercial_ops.invoices WHERE nullif(btrim(pdf_storage_key), '') IS NOT NULL
    UNION ALL
    SELECT 'order-files/' || object_storage_key, lower(sha256), size_bytes::text,
           CASE WHEN deleted_at_utc IS NULL THEN 'required' ELSE 'retired' END
      FROM commercial_ops.result_artifacts
)
SELECT path || E'\t' || hash || E'\t' || bytes || E'\t' || presence FROM file_refs ORDER BY path, presence;
