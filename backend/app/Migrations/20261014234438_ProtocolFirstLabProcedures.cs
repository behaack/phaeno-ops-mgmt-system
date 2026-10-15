using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class ProtocolFirstLabProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_kit_assembly_step_records_lab_step_versions_lab_step_ve~",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records");

            migrationBuilder.DropIndex(
                name: "IX_lab_kit_assembly_step_records_lab_step_version_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records");

            migrationBuilder.RenameColumn(
                name: "lab_step_version_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records",
                newName: "step_key");

            migrationBuilder.CreateTable(
                name: "lab_configuration_assets",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    storage_key = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_configuration_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_configuration_assets_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_configuration_definition_archives",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_table = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_column = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    definition_json = table.Column<string>(type: "text", nullable: false),
                    archived_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_configuration_definition_archives", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_configuration_assets_recorded_by_user_id",
                schema: "lab_ops",
                table: "lab_configuration_assets",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_configuration_definition_archives_source_table_source_i~",
                schema: "lab_ops",
                table: "lab_configuration_definition_archives",
                columns: new[] { "source_table", "source_id", "source_column" },
                unique: true);

            // Preserve original bytes and provenance before normalizing kit occurrence identity.
            migrationBuilder.Sql("""
                INSERT INTO lab_ops.lab_configuration_definition_archives
                    (id, source_table, source_id, source_column, definition_json, archived_at_utc)
                SELECT gen_random_uuid(), 'lab_kit_assembly_workflow_revisions', id, 'steps_json', steps_json::text, now()
                    FROM lab_ops.lab_kit_assembly_workflow_revisions
                UNION ALL
                SELECT gen_random_uuid(), 'lab_kit_assembly_runs', id, 'steps_json', steps_json::text, now()
                    FROM lab_ops.lab_kit_assembly_runs;

                DO $conversion$
                DECLARE target text; invalid_count bigint;
                BEGIN
                    FOREACH target IN ARRAY ARRAY['lab_kit_assembly_workflow_revisions','lab_kit_assembly_runs'] LOOP
                        EXECUTE format('UPDATE lab_ops.%I t SET steps_json = (
                            SELECT coalesce(jsonb_agg(
                                (entry - ''LabStepVersionId'' - ''labStepVersionId'') || jsonb_build_object(
                                    ''StepKey'', coalesce(entry->''LabStepVersionId'', entry->''labStepVersionId''),
                                    ''SourceLabStepVersionId'', coalesce(entry->''LabStepVersionId'', entry->''labStepVersionId''))
                                ORDER BY ordinal), ''[]''::jsonb)
                            FROM jsonb_array_elements(t.steps_json::jsonb) WITH ORDINALITY x(entry, ordinal))', target);
                        EXECUTE format('SELECT count(*) FROM lab_ops.%I t WHERE EXISTS (
                            SELECT 1 FROM jsonb_array_elements(t.steps_json::jsonb) entry
                            WHERE entry->>''StepKey'' IS NULL OR (entry->>''StepKey'')::uuid = ''00000000-0000-0000-0000-000000000000''::uuid)
                            OR jsonb_array_length(t.steps_json::jsonb) <> (SELECT count(DISTINCT entry->>''StepKey'') FROM jsonb_array_elements(t.steps_json::jsonb) entry)', target)
                            INTO invalid_count;
                        IF invalid_count > 0 THEN
                            RAISE EXCEPTION 'Kit instruction identities are incomplete; preserving conversion aborted';
                        END IF;
                    END LOOP;
                    IF EXISTS (
                        SELECT 1 FROM lab_ops.lab_kit_assembly_step_records record
                        JOIN lab_ops.lab_kit_assembly_runs run ON run.id = record.run_id
                        WHERE (run.steps_json::jsonb -> record.sequence ->> 'StepKey') IS NULL
                            OR (run.steps_json::jsonb -> record.sequence ->> 'StepKey')::uuid <> record.step_key
                    ) THEN
                        RAISE EXCEPTION 'Kit instruction mapping is incomplete; preserving conversion aborted';
                    END IF;
                END $conversion$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Retained procedure history cannot be removed by automatic downgrade. Use a reviewed preserving forward repair or the verified recovery archive.");
        }
    }
}
