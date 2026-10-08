using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddKitAssemblyLabelVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "container_barcode_verified_at_utc",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "container_barcode_verified_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "draft_notes",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "draft_verification_json",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "label_print_requested_at_utc",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_container_barcode_verified_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "container_barcode_verified_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "label_print_requested_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_kit_assembly_runs_users_container_barcode_verified_by_u~",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "container_barcode_verified_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_kit_assembly_runs_users_label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "label_print_requested_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_kit_assembly_runs_users_container_barcode_verified_by_u~",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_kit_assembly_runs_users_label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropIndex(
                name: "IX_lab_kit_assembly_runs_container_barcode_verified_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropIndex(
                name: "IX_lab_kit_assembly_runs_label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "container_barcode_verified_at_utc",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "container_barcode_verified_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "draft_notes",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "draft_verification_json",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "label_print_requested_at_utc",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");

            migrationBuilder.DropColumn(
                name: "label_print_requested_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs");
        }
    }
}
