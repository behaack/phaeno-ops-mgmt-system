using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerTransportationKitOrdering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "customer_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "customer_received_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "customer_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "transportation_kit_request_line_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "customer_delivery_locations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recipient = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    region = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_delivery_locations", x => x.id);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_department",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transportation_kit_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transportation_kit_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_lab_service_orders_lab_service_~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_organization_departments_depart~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_location",
                        column: x => x.delivery_location_id,
                        principalSchema: "commercial_ops",
                        principalTable: "customer_delivery_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_requester",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transportation_kit_request_lines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transportation_kit_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transportation_kit_request_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_transportation_kit_line_container",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_line_request",
                        column: x => x.transportation_kit_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "transportation_kit_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_customer_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_delivery_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_customer_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_received_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_transportation_kit_request_line_~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "transportation_kit_request_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_created_by_user_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_department_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_organization_id_department_id_i~",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                columns: new[] { "organization_id", "department_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_updated_by_user_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_customer_delivery_location_default",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                columns: new[] { "organization_id", "department_id" },
                unique: true,
                filter: "is_active = TRUE AND is_default = TRUE");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_line_size",
                schema: "commercial_ops",
                table: "transportation_kit_request_lines",
                columns: new[] { "transportation_kit_request_id", "container_definition_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_request_lines_container_definition_id",
                schema: "commercial_ops",
                table: "transportation_kit_request_lines",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_open_job",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "lab_service_order_id",
                unique: true,
                filter: "closed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_created_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_delivery_location_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "delivery_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_department_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_organization_id_department_id_r~",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                columns: new[] { "organization_id", "department_id", "requested_at" });

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_requested_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_updated_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_delivery_location",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_delivery_location_id",
                principalSchema: "commercial_ops",
                principalTable: "customer_delivery_locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_received_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_received_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_transport_request_line",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "transportation_kit_request_line_id",
                principalSchema: "commercial_ops",
                principalTable: "transportation_kit_request_lines",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_delivery_location",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_received_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_transport_request_line",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropTable(
                name: "transportation_kit_request_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "transportation_kit_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "customer_delivery_locations",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_customer_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_customer_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_transportation_kit_request_line_~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "customer_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "customer_received_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "customer_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "transportation_kit_request_line_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");
        }
    }
}
