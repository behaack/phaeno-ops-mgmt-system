using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialQuantityReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "quantity_history_json",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "quantity_hold_reason",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "quantity_history_json",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "quantity_hold_reason",
                schema: "lab_ops",
                table: "lab_material_lots");
        }
    }
}
