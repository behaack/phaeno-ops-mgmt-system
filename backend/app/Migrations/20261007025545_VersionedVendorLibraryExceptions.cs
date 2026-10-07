using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class VersionedVendorLibraryExceptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $guard$ BEGIN
                    IF EXISTS (SELECT 1 FROM lab_ops.lab_vendor_library_exceptions) THEN
                        RAISE EXCEPTION 'Versioned exception attribution requires an explicitly reviewed one-time data conversion. No historical facts are guessed.';
                    END IF;
                END $guard$;
                """);
            migrationBuilder.DropIndex(
                name: "IX_lab_vendor_library_exceptions_lab_ngs_sendout_id_lab_batch_~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions");

            migrationBuilder.AddColumn<Guid>(
                name: "lab_vendor_results_version_id",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                type: "uuid",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_library_exceptions_lab_ngs_sendout_id",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                column: "lab_ngs_sendout_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_library_exceptions_lab_vendor_results_version_id~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                columns: new[] { "lab_vendor_results_version_id", "lab_batch_member_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_vendor_library_exceptions_lab_vendor_results_versions_l~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                column: "lab_vendor_results_version_id",
                principalSchema: "lab_ops",
                principalTable: "lab_vendor_results_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_vendor_library_exceptions_lab_vendor_results_versions_l~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions");

            migrationBuilder.DropIndex(
                name: "IX_lab_vendor_library_exceptions_lab_ngs_sendout_id",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions");

            migrationBuilder.DropIndex(
                name: "IX_lab_vendor_library_exceptions_lab_vendor_results_version_id~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions");

            migrationBuilder.DropColumn(
                name: "lab_vendor_results_version_id",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions");

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_library_exceptions_lab_ngs_sendout_id_lab_batch_~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                columns: new[] { "lab_ngs_sendout_id", "lab_batch_member_id" },
                unique: true);
        }
    }
}
