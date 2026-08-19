using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleShippingFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sample_shipping_destinations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_destination_id = table.Column<Guid>(type: "uuid", nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    recipient_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    organization_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    address_line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    address_line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    state_or_province = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    receiving_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    receiving_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    receiving_hours = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    closure_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    carrier_restrictions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    international_shipping_allowed = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_sample_shipping_destinations", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_destinations_sample_shipping_destinations_s~",
                        column: x => x.supersedes_destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_type_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_sample_type_id = table.Column<Guid>(type: "uuid", nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    material_class = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    minimum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    maximum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    quantity_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    primary_container_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    temperature_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    stabilizer_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    packaging_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    labeling_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    prohibited_identifiers = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    safety_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    carrier_restrictions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    maximum_transit_hours = table.Column<int>(type: "integer", nullable: true),
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
                    table.PrimaryKey("PK_sample_type_definitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_type_definitions_sample_type_definitions_supersedes_~",
                        column: x => x.supersedes_sample_type_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipments", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipments_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipments_sample_shipping_destinations_destination_id",
                        column: x => x.destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_instruction_rules",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_instruction_rule_id = table.Column<Guid>(type: "uuid", nullable: true),
                    destination_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    compatibility_group = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    packing_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    temperature_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    carrier_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    dispatch_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    required_documents = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    exception_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    international_customs_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    requires_separate_shipment = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_sample_shipping_instruction_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_shipping_destinati~",
                        column: x => x.destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_shipping_instructi~",
                        column: x => x.supersedes_instruction_rule_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_instruction_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_type_definitions_s~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipment_items",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sample_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipment_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipment_items_sample_shipments_sample_shipment_id",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipment_items_sample_type_definitions_sample_type_d~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_packet_revisions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    packet_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    barcode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    destination_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    instruction_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    manifest_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    voided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    void_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    replaced_by_packet_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_packet_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_packet_revisions_sample_shipments_sample_sh~",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_packet_revisions_sample_shipping_packet_rev~",
                        column: x => x.replaced_by_packet_revision_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_packet_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_shipment_id_submitted_specimen~",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                columns: new[] { "sample_shipment_id", "submitted_specimen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_type_definition_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_authorization_source_authorization_source_~",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_destination_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "destination_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_lab_work_order_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_organization_id_status",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_shipment_number",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "shipment_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_code_revision",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "code", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_is_active_effective_from_effec~",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_supersedes_destination_id",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                column: "supersedes_destination_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_destination_id_sample_typ~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "destination_id", "sample_type_definition_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_is_active_effective_from_~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_sample_type_definition_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_supersedes_instruction_ru~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "supersedes_instruction_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_packet_number",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "packet_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_replaced_by_packet_revisio~",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "replaced_by_packet_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_sample_shipment_id_revision",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                columns: new[] { "sample_shipment_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_code_revision",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "code", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_is_active_effective_from_effective_~",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_supersedes_sample_type_id",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                column: "supersedes_sample_type_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sample_shipment_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_instruction_rules",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_packet_revisions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_type_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_destinations",
                schema: "commercial_ops");
        }
    }
}
