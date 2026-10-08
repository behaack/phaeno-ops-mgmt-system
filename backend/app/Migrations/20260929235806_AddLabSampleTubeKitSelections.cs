using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabSampleTubeKitSelections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_sample_tube_kit_selections",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_sample_tube_kit_selections", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_sample_tube_kit_selections_lab_service_orders_lab_servi~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_tube_kit_selections_sample_shipping_stock_kits_s~",
                        column: x => x.stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_kit_selections_lab_service_order_id_stock_k~",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                columns: new[] { "lab_service_order_id", "stock_kit_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_tube_kit_selections_stock_kit_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                column: "stock_kit_id",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO commercial_ops.lab_sample_tube_kit_selections
                    (id, lab_service_order_id, organization_id, department_id, stock_kit_id,
                     created_at, created_by_user_id, updated_at, updated_by_user_id, version)
                SELECT gen_random_uuid(), lab_service_order_id, organization_id, department_id,
                    stock_kit_id, MIN(created_at), NULL, MIN(created_at), NULL, 1
                FROM commercial_ops.lab_sample_tube_pairs
                GROUP BY lab_service_order_id, organization_id, department_id, stock_kit_id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_sample_tube_kit_selections",
                schema: "commercial_ops");
        }
    }
}
