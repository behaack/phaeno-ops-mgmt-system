using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddKitAssemblyWorkflowName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "name",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_kit_assembly_workflows AS workflow
                SET name = LEFT(COALESCE(
                    NULLIF(BTRIM(product.description), ''),
                    NULLIF(BTRIM(product.product_number), ''),
                    'Kit assembly workflow'), 160)
                FROM lab_ops.lab_supplier_products AS product
                WHERE product.id = workflow.finished_kit_product_id;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "name",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(160)",
                oldMaxLength: 160,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows");
        }
    }
}
