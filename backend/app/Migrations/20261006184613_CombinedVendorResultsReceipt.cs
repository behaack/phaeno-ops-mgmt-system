using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class CombinedVendorResultsReceipt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "run_not_performed",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "sequencing_completed_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "run_not_performed",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "sequencing_completed_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");
        }
    }
}
