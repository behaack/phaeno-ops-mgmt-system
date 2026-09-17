using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierProductCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "shipper_product_description",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "shipper_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tube_product_description",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_supplier_products",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_supplier_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_supplier_products_lab_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_shipper_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "shipper_supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "tube_supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_products_supplier_id_normalized_product_number",
                schema: "lab_ops",
                table: "lab_supplier_products",
                columns: new[] { "supplier_id", "normalized_product_number" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sample_shipping_stock_kits_lab_supplier_products_shipper_su~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "shipper_supplier_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sample_shipping_stock_kits_lab_supplier_products_tube_suppl~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "tube_supplier_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sample_shipping_stock_kits_lab_supplier_products_shipper_su~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "FK_sample_shipping_stock_kits_lab_supplier_products_tube_suppl~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropTable(
                name: "lab_supplier_products",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_shipper_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "shipper_product_description",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "shipper_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "tube_product_description",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");
        }
    }
}
