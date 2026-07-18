using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialQcDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "qc_failure_reason",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "qc_performed_on",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "qc_failure_reason",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "qc_performed_on",
                schema: "lab_ops",
                table: "lab_material_lots");
        }
    }
}
