using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSequentialLabJobPhases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // This development model intentionally starts with an empty Job scope.
            // No compatibility backfill or invented phase history is permitted.
            migrationBuilder.Sql("""
                LOCK TABLE commercial_ops.lab_service_orders IN ACCESS EXCLUSIVE MODE;
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM commercial_ops.lab_service_orders) THEN
                        RAISE EXCEPTION 'Delete existing Jobs and scoped child records before applying the phase model migration.';
                    END IF;
                END $$;
                """);
            migrationBuilder.DropIndex(
                name: "IX_invoices_accepted_quote_id",
                schema: "commercial_ops",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "IX_invoices_lab_service_order_id",
                schema: "commercial_ops",
                table: "invoices");

            migrationBuilder.AddColumn<string>(
                name: "phase_plan_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "phase_plan_revision",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_samples",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_job_phases",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    sample_count = table.Column<int>(type: "integer", nullable: false),
                    turnaround_business_days = table.Column<int>(type: "integer", nullable: true),
                    accepted_subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    carried_invoiced_subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    price_lines_json = table.Column<string>(type: "jsonb", nullable: false),
                    first_receipt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    complete_receipt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    original_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    adjusted_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    calendar_id = table.Column<Guid>(type: "uuid", nullable: true),
                    calendar_revision = table.Column<int>(type: "integer", nullable: true),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    first_delivered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    superseded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_job_phases", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_job_phases_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_phase_plan_proposals",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_version = table.Column<long>(type: "bigint", nullable: false),
                    before_json = table.Column<string>(type: "jsonb", nullable: false),
                    after_json = table.Column<string>(type: "jsonb", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    proposed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    proposed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_phase_plan_proposals", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_phase_plan_proposals_lab_service_orders_lab_service_ord~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_phase_cancellation_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_job_phase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_phase_cancellation_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_phase_cancellation_requests_lab_job_phases_lab_job_phas~",
                        column: x => x.lab_job_phase_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_job_phases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_phase_invoice_allocations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_job_phase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    phase_name_snapshot = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    price_lines_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_phase_invoice_allocations", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_phase_invoice_allocations_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_phase_invoice_allocations_lab_job_phases_lab_job_phase_~",
                        column: x => x.lab_job_phase_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_job_phases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_phase_billing_assignments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_phase_invoice_allocation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_job_phase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    superseded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_phase_billing_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_phase_billing_assignments_lab_job_phases_lab_job_phase_~",
                        column: x => x.lab_job_phase_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_job_phases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_phase_billing_assignments_lab_phase_invoice_allocations~",
                        column: x => x.lab_phase_invoice_allocation_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_phase_invoice_allocations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_lab_job_phase_id_status",
                schema: "commercial_ops",
                table: "lab_samples",
                columns: new[] { "lab_job_phase_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_deadline_changes_lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes",
                column: "lab_job_phase_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_accepted_quote_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "accepted_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_lab_service_order_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "lab_service_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_phases_lab_service_order_id_position",
                schema: "commercial_ops",
                table: "lab_job_phases",
                columns: new[] { "lab_service_order_id", "position" },
                filter: "superseded_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_billing_assignments_lab_job_phase_id_lab_phase_in~",
                schema: "commercial_ops",
                table: "lab_phase_billing_assignments",
                columns: new[] { "lab_job_phase_id", "lab_phase_invoice_allocation_id" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_billing_assignments_lab_phase_invoice_allocation_~",
                schema: "commercial_ops",
                table: "lab_phase_billing_assignments",
                column: "lab_phase_invoice_allocation_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_cancellation_requests_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_phase_cancellation_requests",
                column: "lab_job_phase_id",
                unique: true,
                filter: "status = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_invoice_allocations_invoice_id_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_phase_invoice_allocations",
                columns: new[] { "invoice_id", "lab_job_phase_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_invoice_allocations_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_phase_invoice_allocations",
                column: "lab_job_phase_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_phase_plan_proposals_lab_service_order_id",
                schema: "commercial_ops",
                table: "lab_phase_plan_proposals",
                column: "lab_service_order_id",
                unique: true,
                filter: "status = 'Pending'");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_job_deadline_changes_lab_job_phases_lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes",
                column: "lab_job_phase_id",
                principalSchema: "commercial_ops",
                principalTable: "lab_job_phases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_samples_lab_job_phases_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_samples",
                column: "lab_job_phase_id",
                principalSchema: "commercial_ops",
                principalTable: "lab_job_phases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_job_deadline_changes_lab_job_phases_lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_samples_lab_job_phases_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_samples");

            migrationBuilder.DropTable(
                name: "lab_phase_billing_assignments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_phase_cancellation_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_phase_plan_proposals",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_phase_invoice_allocations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_job_phases",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_samples_lab_job_phase_id_status",
                schema: "commercial_ops",
                table: "lab_samples");

            migrationBuilder.DropIndex(
                name: "IX_lab_job_deadline_changes_lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes");

            migrationBuilder.DropIndex(
                name: "IX_invoices_accepted_quote_id",
                schema: "commercial_ops",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "IX_invoices_lab_service_order_id",
                schema: "commercial_ops",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "phase_plan_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "phase_plan_revision",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_samples");

            migrationBuilder.DropColumn(
                name: "lab_job_phase_id",
                schema: "lab_ops",
                table: "lab_job_deadline_changes");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_accepted_quote_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "accepted_quote_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_lab_service_order_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "lab_service_order_id",
                unique: true);
        }
    }
}
