-- Temporary views allow recovery of pre-managed-file archives with their original schema.
DO $$ BEGIN
  IF to_regclass('lab_ops.lab_scientific_files') IS NULL THEN
    EXECUTE 'CREATE TEMP VIEW backup_scientific_files AS SELECT NULL::text storage_key, NULL::text sha256, NULL::bigint size_bytes WHERE false';
  ELSE
    EXECUTE 'CREATE TEMP VIEW backup_scientific_files AS SELECT storage_key, sha256, size_bytes FROM lab_ops.lab_scientific_files';
  END IF;
  IF to_regclass('lab_ops.lab_scientific_uploads') IS NULL THEN
    EXECUTE 'CREATE TEMP VIEW backup_upload_chunks AS SELECT NULL::jsonb chunks_json WHERE false';
  ELSE
    EXECUTE 'CREATE TEMP VIEW backup_upload_chunks AS SELECT chunks_json FROM lab_ops.lab_scientific_uploads';
  END IF;
END $$;
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
    SELECT 'order-files/' || storage_key, lower(sha256), size_bytes::text, 'required'
      FROM backup_scientific_files
    UNION ALL
    SELECT 'order-files/' || (chunk->>'Key'), lower(chunk->>'Sha256'), chunk->>'SizeBytes', 'required'
      FROM backup_upload_chunks CROSS JOIN LATERAL jsonb_array_elements(chunks_json) chunk
    UNION ALL
    SELECT 'order-files/' || pdf_storage_key, lower(pdf_sha256), 'unknown', 'required'
      FROM commercial_ops.invoices WHERE nullif(btrim(pdf_storage_key), '') IS NOT NULL
    UNION ALL
    SELECT 'order-files/' || object_storage_key, lower(sha256), size_bytes::text,
           CASE WHEN deleted_at_utc IS NULL THEN 'required' ELSE 'retired' END
      FROM commercial_ops.result_artifacts
    UNION ALL
    SELECT 'order-files/' || (details_json->'qcReport'->>'storageKey'),
           lower(details_json->'qcReport'->>'sha256'),
           details_json->'qcReport'->>'sizeBytes', 'required'
      FROM lab_ops.lab_preparation_records
      WHERE jsonb_typeof(details_json->'qcReport') = 'object'
    UNION ALL
    SELECT 'order-files/' || (details_json->'preparationReport'->>'storageKey'),
           lower(details_json->'preparationReport'->>'sha256'),
           details_json->'preparationReport'->>'sizeBytes', 'required'
      FROM lab_ops.lab_preparation_records
      WHERE jsonb_typeof(details_json->'preparationReport') = 'object'
)
SELECT path || E'\t' || hash || E'\t' || bytes || E'\t' || presence FROM file_refs ORDER BY path, presence;
