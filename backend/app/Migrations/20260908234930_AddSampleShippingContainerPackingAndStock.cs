using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleShippingContainerPackingAndStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "container_snapshot_json",
                schema: "commercial_ops",
                table: "sample_shipments",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_packing_pool",
                schema: "commercial_ops",
                table: "sample_shipments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "received_at",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_types",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_types", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_type_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_type_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_definition_id = table.Column<Guid>(type: "uuid", nullable: true),
                    common_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_capacity = table.Column<int>(type: "integer", nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    supplier_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    packing_instructions = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: true),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    deactivated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_definitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_predecessor",
                        column: x => x.supersedes_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_type",
                        column: x => x.container_type_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_compatibilities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    instruction_rule_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_compatibilities", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_revision",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_rule",
                        column: x => x.instruction_rule_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_instruction_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_sample_type",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_stock_kits",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    tube_capacity = table.Column<int>(type: "integer", nullable: false),
                    tube_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tube_lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    shipper_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    shipper_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    authorization_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: true),
                    bound_sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    outbound_carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    outbound_tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    fulfilled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_stock_kits", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_bound_shipment",
                        column: x => x.bound_sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_container_revision",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_department",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_stock_tubes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipping_stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_stock_tubes", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_stock_tube_kit",
                        column: x => x.sample_shipping_stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_container_definit~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                columns: new[] { "container_definition_id", "sample_type_definition_id", "instruction_rule_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_instruction_rule_~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                column: "instruction_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_sample_type_defin~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_container_type_id_rev~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                columns: new[] { "container_type_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_is_active_effective_f~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_supersedes_definition~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "supersedes_definition_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "normalized_sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_bound_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "bound_sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_department_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_kit_number",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "kit_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_organization_id_department_id_au~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                columns: new[] { "organization_id", "department_id", "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_sample_shipping_stock_kit_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "sample_shipping_stock_kit_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_sample_shipment_container_revision",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "container_definition_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipping_container_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_sample_shipment_container_revision",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_compatibilities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_stock_tubes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_stock_kits",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_types",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipments_container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "container_snapshot_json",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "is_packing_pool",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "received_at",
                schema: "commercial_ops",
                table: "registered_sample_tubes");
        }
    }
}
