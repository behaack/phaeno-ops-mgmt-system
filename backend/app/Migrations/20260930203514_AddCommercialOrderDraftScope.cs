using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddCommercialOrderDraftScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "commercial_draft_json",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "price_proposal_note",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "price_proposed_at_utc",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "proposed_unit_price",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "scope_json",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_pairs_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                column: "lab_job_phase_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_sample_tube_pairs_lab_job_phases_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
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
                name: "FK_lab_sample_tube_pairs_lab_job_phases_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs");

            migrationBuilder.DropIndex(
                name: "IX_lab_sample_tube_pairs_lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs");

            migrationBuilder.DropColumn(
                name: "commercial_draft_json",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "lab_job_phase_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs");

            migrationBuilder.DropColumn(
                name: "price_proposal_note",
                schema: "commercial_ops",
                table: "lab_job_phases");

            migrationBuilder.DropColumn(
                name: "price_proposed_at_utc",
                schema: "commercial_ops",
                table: "lab_job_phases");

            migrationBuilder.DropColumn(
                name: "price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_job_phases");

            migrationBuilder.DropColumn(
                name: "proposed_unit_price",
                schema: "commercial_ops",
                table: "lab_job_phases");

            migrationBuilder.DropColumn(
                name: "scope_json",
                schema: "commercial_ops",
                table: "lab_job_phases");
        }
    }
}
