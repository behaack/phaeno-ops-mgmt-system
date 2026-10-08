using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddAssemblyMessagingRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_assembly_commands",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_assembly_job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    first_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    confirmed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    escalated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    suppressed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_assembly_commands", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_assembly_commands_lab_assembly_jobs_lab_assembly_job_id",
                        column: x => x.lab_assembly_job_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_assembly_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_assembly_receipts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_assembly_job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    provider_event_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    sequence = table.Column<long>(type: "bigint", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    conflict_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    conflict_recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_assembly_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_assembly_receipts_lab_assembly_jobs_lab_assembly_job_id",
                        column: x => x.lab_assembly_job_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_assembly_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_commands_confirmed_at_utc_next_attempt_at_utc",
                schema: "lab_ops",
                table: "lab_assembly_commands",
                columns: new[] { "confirmed_at_utc", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_commands_lab_assembly_job_id_kind",
                schema: "lab_ops",
                table: "lab_assembly_commands",
                columns: new[] { "lab_assembly_job_id", "kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_receipts_lab_assembly_job_id_sequence",
                schema: "lab_ops",
                table: "lab_assembly_receipts",
                columns: new[] { "lab_assembly_job_id", "sequence" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_receipts_provider_key_provider_event_id",
                schema: "lab_ops",
                table: "lab_assembly_receipts",
                columns: new[] { "provider_key", "provider_event_id" },
                unique: true);

            // Initialize recovery identities without asserting delivery or execution facts.
            migrationBuilder.Sql("""
                INSERT INTO lab_ops.lab_assembly_commands
                    (id, lab_assembly_job_id, kind, requested_at_utc, attempt_count, suppressed)
                SELECT gen_random_uuid(), id, 'Run', requested_at_utc, 0, false
                FROM lab_ops.lab_assembly_jobs
                WHERE state NOT IN ('Succeeded', 'Failed', 'Terminated', 'CancelledBeforeStart');

                INSERT INTO lab_ops.lab_assembly_commands
                    (id, lab_assembly_job_id, kind, requested_at_utc, attempt_count, suppressed)
                SELECT gen_random_uuid(), id, 'Cancel', cancellation_requested_at_utc, 0, false
                FROM lab_ops.lab_assembly_jobs
                WHERE cancellation_requested_at_utc IS NOT NULL
                  AND state NOT IN ('Succeeded', 'Failed', 'Terminated', 'CancelledBeforeStart');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_assembly_commands",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_assembly_receipts",
                schema: "lab_ops");
        }
    }
}
