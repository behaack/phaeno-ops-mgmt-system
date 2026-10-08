using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabSampleTubePairs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_sample_tube_pairs",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_tube_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    supplier_tube_barcode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    declared_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    declared_quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sequencing_run_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_sample_tube_pairs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_sample_tube_pairs_lab_service_orders_lab_service_order_~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_tube_pairs_sample_shipping_stock_kits_stock_kit_~",
                        column: x => x.stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_tube_pairs_sample_shipping_stock_tubes_stock_tub~",
                        column: x => x.stock_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_pairs_lab_service_order_id_customer_sample_~",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                columns: new[] { "lab_service_order_id", "customer_sample_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_pairs_lab_service_order_id_stock_tube_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                columns: new[] { "lab_service_order_id", "stock_tube_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_pairs_stock_kit_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                column: "stock_kit_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_pairs_stock_tube_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_pairs",
                column: "stock_tube_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_sample_tube_pairs",
                schema: "commercial_ops");
        }
    }
}
