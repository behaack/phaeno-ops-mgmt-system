using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddOnDemandPhaseKitShipping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_transportation_kit_request_open_job",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.AddColumn<Guid>(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "uses_paired_preparation",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "phase_sample_count",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                type: "integer",
                nullable: true);

            // Reviewed local development records only. Both already used paired
            // preparation and have no samples, pairs or physical kit selections.
            // Carry that existing mode into the newly introduced marker without
            // converting phase, request, dispatch, receipt or preparation history.
            migrationBuilder.Sql("""
                UPDATE commercial_ops.lab_service_orders o
                SET uses_paired_preparation = TRUE
                WHERE o.id IN ('df55ec9f-b799-4b07-bf3c-1aec819259a4', '0bc83125-9f7c-4653-a44b-5756f0a31c85')
                    AND o.placed_at IS NOT NULL AND o.placement_snapshot_json ? 'kitDeliveryAddress'
                    AND NOT EXISTS (SELECT 1 FROM commercial_ops.lab_samples s WHERE s.lab_service_order_id = o.id)
                    AND NOT EXISTS (SELECT 1 FROM commercial_ops.lab_sample_tube_pairs p WHERE p.lab_service_order_id = o.id)
                    AND NOT EXISTS (SELECT 1 FROM commercial_ops.lab_sample_tube_kit_selections k WHERE k.lab_service_order_id = o.id);
                """);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "preparation_completed_at_utc",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_open_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                columns: new[] { "lab_service_order_id", "lab_job_phase_id" },
                unique: true,
                filter: "closed_at IS NULL AND lab_job_phase_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "lab_job_phase_id");

            migrationBuilder.CreateIndex(
                name: "ix_lab_sample_tube_kit_selection_phase",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                column: "lab_job_phase_id");

            migrationBuilder.AddForeignKey(
                name: "fk_lab_sample_tube_kit_selection_phase",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                column: "lab_job_phase_id",
                principalSchema: "commercial_ops",
                principalTable: "lab_job_phases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_transportation_kit_request_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
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
                name: "fk_lab_sample_tube_kit_selection_phase",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections");

            migrationBuilder.DropForeignKey(
                name: "fk_transportation_kit_request_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.DropIndex(
                name: "ix_transportation_kit_request_open_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.DropIndex(
                name: "ix_transportation_kit_request_phase",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.DropIndex(
                name: "ix_lab_sample_tube_kit_selection_phase",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections");

            migrationBuilder.DropColumn(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.DropColumn(
                name: "uses_paired_preparation",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "phase_sample_count",
                schema: "commercial_ops",
                table: "transportation_kit_requests");

            migrationBuilder.DropColumn(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections");

            migrationBuilder.DropColumn(
                name: "preparation_completed_at_utc",
                schema: "commercial_ops",
                table: "lab_job_phases");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_open_job",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "lab_service_order_id",
                unique: true,
                filter: "closed_at IS NULL");
        }
    }
}
