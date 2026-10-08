using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleAmountBounds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "minimum_sample_amount",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sample_amount_unit",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "maximum_sample_amount",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sample_amount_unit",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "minimum_sample_amount",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropColumn(
                name: "sample_amount_unit",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropColumn(
                name: "maximum_sample_amount",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.DropColumn(
                name: "sample_amount_unit",
                schema: "lab_ops",
                table: "lab_supplier_products");
        }
    }
}
