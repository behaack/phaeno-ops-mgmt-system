using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddLabAssemblyJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_assembly_jobs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequencing_run_number = table.Column<int>(type: "integer", nullable: false),
                    previous_job_id = table.Column<Guid>(type: "uuid", nullable: true),
                    retry_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    provider_job_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    recipe_json = table.Column<string>(type: "jsonb", nullable: false),
                    inputs_json = table.Column<string>(type: "jsonb", nullable: false),
                    request_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    dispatch_requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    stopped_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    disposition_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    disposition_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    attention_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    output_manifest_json = table.Column<string>(type: "jsonb", nullable: true),
                    lab_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_assembly_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_assembly_jobs_lab_analysis_runs_lab_analysis_run_id",
                        column: x => x.lab_analysis_run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_jobs_lab_assembly_jobs_previous_job_id",
                        column: x => x.previous_job_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_assembly_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_jobs_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_jobs_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_assembly_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_assembly_job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    evidence_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_assembly_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_assembly_events_lab_assembly_jobs_lab_assembly_job_id",
                        column: x => x.lab_assembly_job_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_assembly_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_events_lab_assembly_job_id_recorded_at_utc",
                schema: "lab_ops",
                table: "lab_assembly_events",
                columns: new[] { "lab_assembly_job_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_lab_analysis_run_id",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                column: "lab_analysis_run_id",
                unique: true,
                filter: "lab_analysis_run_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_lab_specimen_id_sequencing_run_number",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                columns: new[] { "lab_specimen_id", "sequencing_run_number" },
                unique: true,
                filter: "state NOT IN ('Succeeded', 'Failed', 'Terminated', 'CancelledBeforeStart')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_previous_job_id",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                column: "previous_job_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_provider_key_provider_job_id",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                columns: new[] { "provider_key", "provider_job_id" },
                unique: true,
                filter: "provider_job_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_jobs_state_requested_at_utc",
                schema: "lab_ops",
                table: "lab_assembly_jobs",
                columns: new[] { "state", "requested_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_assembly_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_assembly_jobs",
                schema: "lab_ops");
        }
    }
}
