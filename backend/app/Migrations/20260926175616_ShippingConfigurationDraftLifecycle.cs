using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ShippingConfigurationDraftLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "LegacyInactive");

            migrationBuilder.AddColumn<string>(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_procedures",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "LegacyInactive");

            migrationBuilder.AddColumn<string>(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "LegacyInactive");

            migrationBuilder.AddColumn<string>(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "LegacyInactive");

            migrationBuilder.AddColumn<Guid>(
                name: "sample_type_anchor_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "shipping_procedure_revision_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "shipping_safety_held_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "shipping_safety_held_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shipping_safety_hold_reason",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "shipping_safety_hold_resolved_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "shipping_safety_hold_resolved_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            // Existing inactive rows have several meanings. Preserve their ambiguity for review.
            migrationBuilder.Sql("UPDATE commercial_ops.sample_type_definitions SET lifecycle = CASE WHEN is_active THEN 'Released' ELSE 'LegacyInactive' END");
            migrationBuilder.Sql("UPDATE commercial_ops.sample_shipping_procedures SET lifecycle = CASE WHEN is_active THEN 'Released' ELSE 'LegacyInactive' END");
            migrationBuilder.Sql("UPDATE commercial_ops.sample_shipping_destinations SET lifecycle = CASE WHEN is_active THEN 'Released' ELSE 'LegacyInactive' END");
            migrationBuilder.Sql("UPDATE commercial_ops.sample_shipping_container_definitions SET lifecycle = CASE WHEN is_active THEN 'Released' WHEN deactivated_at IS NOT NULL THEN 'Deactivated' ELSE 'LegacyInactive' END");
            // Under the old immutable identity-level link, every specification inherited this anchor.
            migrationBuilder.Sql("""
                UPDATE commercial_ops.sample_shipping_container_definitions AS definition
                SET sample_type_anchor_id = container.sample_type_anchor_id
                FROM commercial_ops.sample_shipping_container_types AS container
                WHERE definition.container_type_id = container.id
                  AND container.sample_type_anchor_id IS NOT NULL
                """);

            migrationBuilder.CreateIndex(
                name: "ux_sample_type_one_draft",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                column: "definition_key",
                unique: true,
                filter: "lifecycle = 'Draft'");

            migrationBuilder.CreateIndex(
                name: "ux_shipping_procedure_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_procedures",
                column: "definition_key",
                unique: true,
                filter: "lifecycle = 'Draft'");

            migrationBuilder.CreateIndex(
                name: "ux_shipping_destination_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                column: "definition_key",
                unique: true,
                filter: "lifecycle = 'Draft'");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_sample_type_anchor_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "sample_type_anchor_id");

            migrationBuilder.CreateIndex(
                name: "ux_shipping_spec_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "container_type_id",
                unique: true,
                filter: "lifecycle = 'Draft'");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_shipping_procedure_revision_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_procedure_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_shipping_safety_held_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_safety_held_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_shipping_safety_hold_resolved_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_safety_hold_resolved_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_lab_service_order_shipping_hold_actor",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_safety_held_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_lab_service_order_shipping_hold_resolver",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_safety_hold_resolved_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_lab_service_order_shipping_procedure_revision",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "shipping_procedure_revision_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipping_procedures",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_spec_sample_type_anchor",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "sample_type_anchor_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_type_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_lab_service_order_shipping_hold_actor",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "fk_lab_service_order_shipping_hold_resolver",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "fk_lab_service_order_shipping_procedure_revision",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_spec_sample_type_anchor",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropIndex(
                name: "ux_sample_type_one_draft",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropIndex(
                name: "ux_shipping_procedure_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_procedures");

            migrationBuilder.DropIndex(
                name: "ux_shipping_destination_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_destinations");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_definitions_sample_type_anchor_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropIndex(
                name: "ux_shipping_spec_one_draft",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_shipping_procedure_revision_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_shipping_safety_held_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_shipping_safety_hold_resolved_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropColumn(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_procedures");

            migrationBuilder.DropColumn(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_destinations");

            migrationBuilder.DropColumn(
                name: "lifecycle",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropColumn(
                name: "sample_type_anchor_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropColumn(
                name: "shipping_procedure_revision_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shipping_safety_held_at",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shipping_safety_held_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shipping_safety_hold_reason",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shipping_safety_hold_resolved_at",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shipping_safety_hold_resolved_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
