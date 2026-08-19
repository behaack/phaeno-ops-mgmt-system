using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRegisteredSampleTubeWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "tube_assigned_at",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "version",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<string>(
                name: "barcode_source",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PhaenoGenerated");

            migrationBuilder.AddColumn<Guid>(
                name: "external_barcode_reference_id",
                schema: "lab_ops",
                table: "lab_containers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sample_return_kits",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tube_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tube_lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    shipper_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    shipper_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    required_tube_count = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
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
                    table.PrimaryKey("PK_sample_return_kits", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_return_kits_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_return_kits_sample_shipments_sample_shipment_id",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "registered_sample_tubes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_return_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accessioned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registered_sample_tubes", x => x.id);
                    table.ForeignKey(
                        name: "FK_registered_sample_tubes_sample_return_kits_sample_return_ki~",
                        column: x => x.sample_return_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_return_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_tube_assignment_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registered_sample_tube_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_tube_assignment_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_registered_sample_tubes_regis~",
                        column: x => x.registered_sample_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "registered_sample_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_sample_shipment_items_sample_~",
                        column: x => x.sample_shipment_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipment_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_sample_shipments_sample_shipm~",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                column: "registered_sample_tube_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_shipment_id_customer_sample_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                columns: new[] { "sample_shipment_id", "customer_sample_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_external_barcode_reference_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "external_barcode_reference_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_sample_return_kit_id_status",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                columns: new[] { "sample_return_kit_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_authorization_source_authorization_sourc~",
                schema: "commercial_ops",
                table: "sample_return_kits",
                columns: new[] { "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_kit_number",
                schema: "commercial_ops",
                table: "sample_return_kits",
                column: "kit_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_organization_id_status",
                schema: "commercial_ops",
                table: "sample_return_kits",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_return_kits",
                column: "sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_registered_sample_tube_id_occ~",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                columns: new[] { "registered_sample_tube_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_id_occurred_at",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                columns: new[] { "sample_shipment_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_item_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                column: "sample_shipment_item_id");

            migrationBuilder.AddForeignKey(
                name: "FK_sample_shipment_items_registered_sample_tubes_registered_sa~",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                column: "registered_sample_tube_id",
                principalSchema: "commercial_ops",
                principalTable: "registered_sample_tubes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sample_shipment_items_registered_sample_tubes_registered_sa~",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropTable(
                name: "sample_tube_assignment_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "registered_sample_tubes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_return_kits",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipment_items_registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipment_items_sample_shipment_id_customer_sample_id",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_external_barcode_reference_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "created_at",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "tube_assigned_at",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "updated_at",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "commercial_ops",
                table: "sample_shipment_items");

            migrationBuilder.DropColumn(
                name: "barcode_source",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "external_barcode_reference_id",
                schema: "lab_ops",
                table: "lab_containers");
        }
    }
}
