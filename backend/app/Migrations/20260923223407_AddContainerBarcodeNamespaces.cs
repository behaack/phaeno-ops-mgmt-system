using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContainerBarcodeNamespaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.AddColumn<string>(
                name: "barcode_namespace",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LEGACY");

            migrationBuilder.AddColumn<string>(
                name: "tube_barcode_namespace",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LEGACY");

            migrationBuilder.AddColumn<string>(
                name: "tube_barcode_namespace",
                schema: "commercial_ops",
                table: "sample_return_kits",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LEGACY");

            migrationBuilder.AddColumn<string>(
                name: "barcode_namespace",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LEGACY");

            migrationBuilder.AddColumn<string>(
                name: "barcode_namespace",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LEGACY");

            migrationBuilder.CreateTable(
                name: "lab_container_barcodes",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    @namespace = table.Column<string>(name: "namespace", type: "character varying(50)", maxLength: 50, nullable: false),
                    value = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    symbology = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_container_barcodes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_container_barcodes_lab_containers_lab_container_id",
                        column: x => x.lab_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql("""
                UPDATE commercial_ops.sample_shipping_stock_kits AS kit
                SET tube_barcode_namespace = 'MFR-' || upper(replace(product.supplier_id::text, '-', ''))
                FROM lab_ops.lab_supplier_products AS product
                WHERE kit.tube_supplier_product_id = product.id;

                UPDATE commercial_ops.sample_shipping_stock_tubes AS tube
                SET barcode_namespace = kit.tube_barcode_namespace
                FROM commercial_ops.sample_shipping_stock_kits AS kit
                WHERE tube.sample_shipping_stock_kit_id = kit.id;

                UPDATE commercial_ops.sample_return_kits AS kit
                SET tube_barcode_namespace = stock.tube_barcode_namespace
                FROM commercial_ops.sample_shipping_stock_kits AS stock
                WHERE kit.kit_number = stock.kit_number;

                UPDATE commercial_ops.sample_return_kits AS kit
                SET tube_barcode_namespace = 'MFR-' || upper(replace(supplier.id::text, '-', ''))
                FROM lab_ops.lab_suppliers AS supplier
                WHERE kit.tube_barcode_namespace = 'LEGACY'
                  AND upper(kit.tube_supplier_name) = upper(supplier.name)
                  AND (SELECT count(*) FROM lab_ops.lab_suppliers AS candidate
                       WHERE upper(candidate.name) = upper(kit.tube_supplier_name)) = 1;

                UPDATE commercial_ops.registered_sample_tubes AS tube
                SET barcode_namespace = kit.tube_barcode_namespace
                FROM commercial_ops.sample_return_kits AS kit
                WHERE tube.sample_return_kit_id = kit.id;

                UPDATE lab_ops.lab_containers
                SET barcode_namespace = 'PHAENO'
                WHERE barcode_source = 'PhaenoGenerated';

                UPDATE lab_ops.lab_containers AS container
                SET barcode_namespace = tube.barcode_namespace
                FROM commercial_ops.registered_sample_tubes AS tube
                WHERE container.external_barcode_reference_id = tube.id;

                INSERT INTO lab_ops.lab_container_barcodes
                    (id, lab_container_id, namespace, value, symbology, source, is_primary)
                SELECT gen_random_uuid(), id, barcode_namespace, barcode, 'Unknown', barcode_source, true
                FROM lab_ops.lab_containers;

                ALTER TABLE commercial_ops.sample_shipping_stock_tubes ALTER COLUMN barcode_namespace DROP DEFAULT;
                ALTER TABLE commercial_ops.sample_shipping_stock_kits ALTER COLUMN tube_barcode_namespace DROP DEFAULT;
                ALTER TABLE commercial_ops.sample_return_kits ALTER COLUMN tube_barcode_namespace DROP DEFAULT;
                ALTER TABLE commercial_ops.registered_sample_tubes ALTER COLUMN barcode_namespace DROP DEFAULT;
                ALTER TABLE lab_ops.lab_containers ALTER COLUMN barcode_namespace DROP DEFAULT;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_barcode_namespace_supplier_barc~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                columns: new[] { "barcode_namespace", "supplier_barcode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "supplier_barcode");

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_barcode_namespace_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                columns: new[] { "barcode_namespace", "supplier_barcode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "supplier_barcode");

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers",
                column: "barcode");

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_barcode_namespace_barcode",
                schema: "lab_ops",
                table: "lab_containers",
                columns: new[] { "barcode_namespace", "barcode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_container_barcodes_lab_container_id",
                schema: "lab_ops",
                table: "lab_container_barcodes",
                column: "lab_container_id",
                unique: true,
                filter: "is_primary");

            migrationBuilder.CreateIndex(
                name: "IX_lab_container_barcodes_namespace_value",
                schema: "lab_ops",
                table: "lab_container_barcodes",
                columns: new[] { "namespace", "value" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_container_barcodes",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_tubes_barcode_namespace_supplier_barc~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropIndex(
                name: "IX_registered_sample_tubes_barcode_namespace_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_barcode_namespace_barcode",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "barcode_namespace",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropColumn(
                name: "tube_barcode_namespace",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "tube_barcode_namespace",
                schema: "commercial_ops",
                table: "sample_return_kits");

            migrationBuilder.DropColumn(
                name: "barcode_namespace",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "barcode_namespace",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers",
                column: "barcode",
                unique: true);
        }
    }
}
