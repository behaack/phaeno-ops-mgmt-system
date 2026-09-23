using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddShippingKitContents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shipping_kit_contents",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    product_type_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shipping_kit_contents", x => x.id);
                    table.CheckConstraint("ck_shipping_kit_content_quantity", "quantity > 0");
                    table.ForeignKey(
                        name: "FK_shipping_kit_contents_lab_supplier_products_supplier_produc~",
                        column: x => x.supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_shipping_kit_contents_lab_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_shipping_kit_contents_sample_shipping_container_definitions~",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_shipping_kit_contents_container_definition_id_position",
                schema: "commercial_ops",
                table: "shipping_kit_contents",
                columns: new[] { "container_definition_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_shipping_kit_contents_container_definition_id_supplier_prod~",
                schema: "commercial_ops",
                table: "shipping_kit_contents",
                columns: new[] { "container_definition_id", "supplier_product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_shipping_kit_contents_supplier_id",
                schema: "commercial_ops",
                table: "shipping_kit_contents",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_shipping_kit_contents_supplier_product_id",
                schema: "commercial_ops",
                table: "shipping_kit_contents",
                column: "supplier_product_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "shipping_kit_contents",
                schema: "commercial_ops");
        }
    }
}
