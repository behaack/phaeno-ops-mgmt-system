using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    public partial class AddCustomerStandardOrdering : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "maximum_customer_samples", schema: "commercial_ops",
                table: "qbo_catalog_items", type: "integer", nullable: true);
            migrationBuilder.AddColumn<string>(name: "customer_draft_json", schema: "commercial_ops",
                table: "lab_service_orders", type: "jsonb", nullable: true);
            migrationBuilder.CreateTable(name: "lab_service_negotiated_prices", schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lab_service_negotiated_prices", x => x.id);
                    table.ForeignKey("fk_lab_service_negotiated_prices_organization", x => x.organization_id,
                        principalSchema: "commercial_ops", principalTable: "organizations", principalColumn: "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_lab_service_negotiated_prices_department", x => x.department_id,
                        principalSchema: "commercial_ops", principalTable: "organization_departments", principalColumn: "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_lab_service_negotiated_prices_catalog", x => x.catalog_item_id,
                        principalSchema: "commercial_ops", principalTable: "qbo_catalog_items", principalColumn: "id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(name: "ix_lab_service_negotiated_prices_scope", schema: "commercial_ops",
                table: "lab_service_negotiated_prices", columns: new[] { "organization_id", "catalog_item_id", "department_id", "effective_from" });
            migrationBuilder.CreateIndex(name: "ix_lab_service_negotiated_prices_catalog_item_id", schema: "commercial_ops", table: "lab_service_negotiated_prices", column: "catalog_item_id");
            migrationBuilder.CreateIndex(name: "ix_lab_service_negotiated_prices_department_id", schema: "commercial_ops", table: "lab_service_negotiated_prices", column: "department_id");
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "lab_service_negotiated_prices", schema: "commercial_ops");
            migrationBuilder.DropColumn(name: "maximum_customer_samples", schema: "commercial_ops", table: "qbo_catalog_items");
            migrationBuilder.DropColumn(name: "customer_draft_json", schema: "commercial_ops", table: "lab_service_orders");
        }
    }
}
