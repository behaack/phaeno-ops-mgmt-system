using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class SequencingVendorCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vendor_product_name",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "vendor_shipment_address_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vendor_shipment_address_label",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "vendor_shipment_address_version",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_supplier_shipment_addresses",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recipient = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    address_line1 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    address_line2 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    city = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    region = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    postal_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    instructions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_supplier_shipment_addresses", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_supplier_shipment_addresses_lab_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "lab_ops",
                table: "lab_product_types",
                columns: new[] { "id", "created_at", "created_by_user_id", "description", "is_active", "kit_use", "name", "normalized_name", "updated_at", "updated_by_user_id", "version" },
                values: new object[] { new Guid("90000000-0000-4000-8000-000000000004"), new DateTime(2026, 10, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, "External sequencing services supplied by a vendor.", true, "Other", "Sequencing service", "SEQUENCING SERVICE", new DateTime(2026, 10, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L });

            migrationBuilder.CreateIndex(
                name: "IX_lab_ngs_sendouts_vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_ngs_sendouts_vendor_shipment_address_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_shipment_address_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_ngs_sendouts_vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_shipment_addresses_supplier_id_normalized_label",
                schema: "lab_ops",
                table: "lab_supplier_shipment_addresses",
                columns: new[] { "supplier_id", "normalized_label" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_ngs_sendouts_lab_supplier_products_vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_ngs_sendouts_lab_supplier_shipment_addresses_vendor_shi~",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_shipment_address_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_shipment_addresses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_ngs_sendouts_lab_suppliers_vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "vendor_supplier_id",
                principalSchema: "lab_ops",
                principalTable: "lab_suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_ngs_sendouts_lab_supplier_products_vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_ngs_sendouts_lab_supplier_shipment_addresses_vendor_shi~",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_ngs_sendouts_lab_suppliers_vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropTable(
                name: "lab_supplier_shipment_addresses",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_ngs_sendouts_vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropIndex(
                name: "IX_lab_ngs_sendouts_vendor_shipment_address_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropIndex(
                name: "IX_lab_ngs_sendouts_vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DeleteData(
                schema: "lab_ops",
                table: "lab_product_types",
                keyColumn: "id",
                keyValue: new Guid("90000000-0000-4000-8000-000000000004"));

            migrationBuilder.DropColumn(
                name: "vendor_product_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "vendor_product_name",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "vendor_shipment_address_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "vendor_shipment_address_label",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "vendor_shipment_address_version",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "vendor_supplier_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");
        }
    }
}
