using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleMaterialTransfersAndProductExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "customer_declared_quantity",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_declared_quantity_unit",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "product_expiry_snapshot_json",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "customer_declared_at",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "customer_declared_quantity",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_declared_quantity_unit",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "can_expire",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "library_tube_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "material_transfer_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "initial_quantity",
                schema: "lab_ops",
                table: "lab_containers",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "initial_quantity_unit",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "quantity_basis",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "quantity_history_json",
                schema: "lab_ops",
                table: "lab_containers",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<Guid>(
                name: "material_transfer_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_biological_material_transfers",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_member_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sequencing_batch_member_id = table.Column<Guid>(type: "uuid", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source_quantity_before = table.Column<decimal>(type: "numeric", nullable: true),
                    source_quantity_after = table.Column<decimal>(type: "numeric", nullable: true),
                    source_quantity_basis = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    exhausted_override = table.Column<bool>(type: "boolean", nullable: false),
                    balance_adjustment_quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    exhaustion_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    performed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    performed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_biological_material_transfers", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_batch_members_sequenc~",
                        column: x => x.sequencing_batch_member_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_batch_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_containers_destinatio~",
                        column: x => x.destination_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_containers_source_con~",
                        column: x => x.source_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_preparation_members_p~",
                        column: x => x.preparation_member_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_specimen_attempts_lab~",
                        column: x => x.lab_specimen_attempt_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimen_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_specimens_lab_specime~",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_biological_material_transfers_lab_work_orders_lab_work_~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "customer_declared_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_library_tube_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "library_tube_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_material_transfer_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "material_transfer_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_batch_members_material_transfer_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "material_transfer_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_batch_members_sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "sequencing_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_destination_container_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "destination_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "lab_specimen_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_lab_specimen_id_recorded_~",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                columns: new[] { "lab_specimen_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_preparation_member_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "preparation_member_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_request_id_source_contain~",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                columns: new[] { "request_id", "source_container_id", "destination_container_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_sequencing_batch_member_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "sequencing_batch_member_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_biological_material_transfers_source_container_id",
                schema: "lab_ops",
                table: "lab_biological_material_transfers",
                column: "source_container_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_batch_members_lab_biological_material_transfers_materia~",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "material_transfer_id",
                principalSchema: "lab_ops",
                principalTable: "lab_biological_material_transfers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_batch_members_lab_containers_sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "sequencing_container_id",
                principalSchema: "lab_ops",
                principalTable: "lab_containers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_preparation_members_lab_biological_material_transfers_m~",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "material_transfer_id",
                principalSchema: "lab_ops",
                principalTable: "lab_biological_material_transfers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_preparation_members_lab_containers_library_tube_contain~",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "library_tube_container_id",
                principalSchema: "lab_ops",
                principalTable: "lab_containers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_registered_sample_tubes_users_customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "customer_declared_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_batch_members_lab_biological_material_transfers_materia~",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_batch_members_lab_containers_sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_preparation_members_lab_biological_material_transfers_m~",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_preparation_members_lab_containers_library_tube_contain~",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropForeignKey(
                name: "FK_registered_sample_tubes_users_customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropTable(
                name: "lab_biological_material_transfers",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_registered_sample_tubes_customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropIndex(
                name: "IX_lab_preparation_members_library_tube_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropIndex(
                name: "IX_lab_preparation_members_material_transfer_id",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropIndex(
                name: "IX_lab_batch_members_material_transfer_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropIndex(
                name: "IX_lab_batch_members_sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "customer_declared_quantity",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events");

            migrationBuilder.DropColumn(
                name: "customer_declared_quantity_unit",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events");

            migrationBuilder.DropColumn(
                name: "product_expiry_snapshot_json",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "customer_declared_at",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "customer_declared_by_user_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "customer_declared_quantity",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "customer_declared_quantity_unit",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "can_expire",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.DropColumn(
                name: "library_tube_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropColumn(
                name: "material_transfer_id",
                schema: "lab_ops",
                table: "lab_preparation_members");

            migrationBuilder.DropColumn(
                name: "initial_quantity",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "initial_quantity_unit",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "quantity_basis",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "quantity_history_json",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "material_transfer_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "sequencing_container_id",
                schema: "lab_ops",
                table: "lab_batch_members");
        }
    }
}
