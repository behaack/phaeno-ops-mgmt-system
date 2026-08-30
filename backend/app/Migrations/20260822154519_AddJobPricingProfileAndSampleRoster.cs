using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddJobPricingProfileAndSampleRoster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "sample_shipment_tube_slot_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "placement_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "requested_specimen_count",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "sample_roster_finalized_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_sample_import_previews",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    rows_json = table.Column<string>(type: "jsonb", nullable: false),
                    errors_json = table.Column<string>(type: "jsonb", nullable: false),
                    valid_row_count = table.Column<int>(type: "integer", nullable: false),
                    blank_row_count = table.Column<int>(type: "integer", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_sample_import_previews", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_lab_service_orders_lab_service_o~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_source_groups",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    specimen_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_source_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_source_groups_lab_service_orders_lab_service_or~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipment_tube_slots",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ordinal = table.Column<int>(type: "integer", nullable: false),
                    registered_sample_tube_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tube_assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipment_tube_slots", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipment_tube_slots_registered_sample_tubes_register~",
                        column: x => x.registered_sample_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "registered_sample_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipment_tube_slots_sample_shipment_items_sample_shi~",
                        column: x => x.sample_shipment_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipment_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_tube_slot_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                column: "sample_shipment_tube_slot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "sample_roster_finalized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_actor_user_id",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_expires_at",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_lab_service_order_id_created_at",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                columns: new[] { "lab_service_order_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_organization_id",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_source_groups_lab_service_order_id_normalized_b~",
                schema: "commercial_ops",
                table: "lab_service_source_groups",
                columns: new[] { "lab_service_order_id", "normalized_biological_source" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_tube_slots_registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_tube_slots",
                column: "registered_sample_tube_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_tube_slots_sample_shipment_item_id_ordinal",
                schema: "commercial_ops",
                table: "sample_shipment_tube_slots",
                columns: new[] { "sample_shipment_item_id", "ordinal" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_users_sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "sample_roster_finalized_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sample_tube_assignment_events_sample_shipment_tube_slots_sa~",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                column: "sample_shipment_tube_slot_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipment_tube_slots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_users_sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_sample_tube_assignment_events_sample_shipment_tube_slots_sa~",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events");

            migrationBuilder.DropTable(
                name: "lab_sample_import_previews",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_source_groups",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipment_tube_slots",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_tube_slot_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sample_shipment_tube_slot_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events");

            migrationBuilder.DropColumn(
                name: "placement_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "requested_specimen_count",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sample_roster_finalized_at",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
