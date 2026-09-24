using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReagentIdentityAndInventoryUnits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_reagent_workflows_material_definition_id",
                schema: "lab_ops",
                table: "lab_reagent_workflows");

            migrationBuilder.AddColumn<string>(
                name: "default_quantity_unit",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_quantity_unit",
                schema: "lab_ops",
                table: "lab_material_definitions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_workflows_material_definition_id",
                schema: "lab_ops",
                table: "lab_reagent_workflows",
                column: "material_definition_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_reagent_workflows_material_definition_id",
                schema: "lab_ops",
                table: "lab_reagent_workflows");

            migrationBuilder.DropColumn(
                name: "default_quantity_unit",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.DropColumn(
                name: "default_quantity_unit",
                schema: "lab_ops",
                table: "lab_material_definitions");

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_workflows_material_definition_id",
                schema: "lab_ops",
                table: "lab_reagent_workflows",
                column: "material_definition_id");
        }
    }
}
