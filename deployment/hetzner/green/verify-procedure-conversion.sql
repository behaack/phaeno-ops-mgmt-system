-- Read-only verification immediately after conversion, before authors resume.
DO $verify$ DECLARE target text; bad bigint; BEGIN
 FOREACH target IN ARRAY ARRAY['lab_kit_assembly_workflow_revisions','lab_kit_assembly_runs'] LOOP
 EXECUTE format('SELECT count(*) FROM lab_ops.%I t WHERE NOT EXISTS (SELECT 1 FROM lab_ops.lab_configuration_definition_archives a WHERE a.source_table=%L AND a.source_id=t.id)',target,target) INTO bad;
 IF bad <> 0 THEN RAISE EXCEPTION 'Original definition archive coverage is incomplete'; END IF;
 EXECUTE format('SELECT count(*) FROM lab_ops.lab_configuration_definition_archives a LEFT JOIN lab_ops.%I t ON t.id=a.source_id WHERE a.source_table=%L AND t.id IS NULL',target,target) INTO bad;
 IF bad <> 0 THEN RAISE EXCEPTION 'A retained original definition is missing'; END IF;
 EXECUTE format($query$SELECT count(*) FROM lab_ops.%I t JOIN lab_ops.lab_configuration_definition_archives a ON a.source_id=t.id AND a.source_table=%L WHERE EXISTS (
 SELECT 1 FROM jsonb_array_elements(a.definition_json::jsonb) WITH ORDINALITY old(value,idx)
 FULL JOIN jsonb_array_elements(t.steps_json) WITH ORDINALITY current(value,idx) USING(idx)
 WHERE old.value IS NULL OR current.value IS NULL
 OR (old.value-'LabStepVersionId'-'labStepVersionId') IS DISTINCT FROM (current.value-'StepKey'-'SourceLabStepVersionId')
 OR coalesce(old.value->'LabStepVersionId',old.value->'labStepVersionId') IS DISTINCT FROM current.value->'StepKey'
 OR current.value->'StepKey' IS DISTINCT FROM current.value->'SourceLabStepVersionId')$query$,target,target) INTO bad;
 IF bad <> 0 THEN RAISE EXCEPTION 'Converted instructions do not match retained source'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM lab_ops.lab_kit_assembly_step_records r JOIN lab_ops.lab_kit_assembly_runs run ON run.id=r.run_id WHERE (run.steps_json->r.sequence->>'StepKey')::uuid IS DISTINCT FROM r.step_key) THEN RAISE EXCEPTION 'Recorded occurrence identity mismatch'; END IF;
END $verify$;
SELECT 'procedure_conversion_content_order_provenance_records=PASS';
SELECT source_table,count(*) AS archived_definitions FROM lab_ops.lab_configuration_definition_archives GROUP BY source_table ORDER BY source_table;
