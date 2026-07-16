using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabOperationsFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "lab_ops");

            migrationBuilder.CreateTable(
                name: "lab_work_orders",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_authorization_version = table.Column<int>(type: "integer", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitting_organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    service_version = table.Column<int>(type: "integer", nullable: false),
                    turnaround_policy_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    opaque_submitter_reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_orders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_scientific_approvals",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approval_version = table.Column<int>(type: "integer", nullable: false),
                    release_definition_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    release_definition_version = table.Column<int>(type: "integer", nullable: false),
                    permitted_qc_projection_json = table.Column<string>(type: "jsonb", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_scientific_approvals", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_scientific_approvals_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_specimens",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    accession_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    intake_disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    receipt_condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    intake_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    current_location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_specimens", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_specimens_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_authorization_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_id = table.Column<Guid>(type: "uuid", nullable: false),
                    correlation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_version = table.Column<int>(type: "integer", nullable: false),
                    contract_version = table.Column<int>(type: "integer", nullable: false),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_authorization_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_authorization_versions_lab_work_orders_lab_work_or~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    event_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_events_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_work_events_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_lab_work_order_id_approval_version",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                columns: new[] { "lab_work_order_id", "approval_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_lab_work_order_id_projection_versi~",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                columns: new[] { "lab_work_order_id", "projection_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_accession_number",
                schema: "lab_ops",
                table: "lab_specimens",
                column: "accession_number",
                unique: true,
                filter: "\"accession_number\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_intake_disposition_received_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                columns: new[] { "intake_disposition", "received_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_lab_work_order_id_submitted_specimen_id",
                schema: "lab_ops",
                table: "lab_specimens",
                columns: new[] { "lab_work_order_id", "submitted_specimen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_authorization_versions_command_id",
                schema: "lab_ops",
                table: "lab_work_authorization_versions",
                column: "command_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_authorization_versions_lab_work_order_id_authoriza~",
                schema: "lab_ops",
                table: "lab_work_authorization_versions",
                columns: new[] { "lab_work_order_id", "authorization_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_events_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_work_events",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_events_lab_work_order_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_work_events",
                columns: new[] { "lab_work_order_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_authorization_id",
                schema: "lab_ops",
                table: "lab_work_orders",
                column: "authorization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_submitting_organization_id_status_created_at",
                schema: "lab_ops",
                table: "lab_work_orders",
                columns: new[] { "submitting_organization_id", "status", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_scientific_approvals",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_authorization_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_specimens",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_orders",
                schema: "lab_ops");
        }
    }
}
