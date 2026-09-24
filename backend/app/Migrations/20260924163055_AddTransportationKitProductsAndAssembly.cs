using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTransportationKitProductsAndAssembly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO lab_ops.lab_product_types
                    (id, name, normalized_name, description, kit_use, is_active,
                     created_at, updated_at, version)
                VALUES
                    ('90000000-0000-4000-8000-000000000004', 'Transportation kit',
                     'TRANSPORTATION KIT', 'Finished Phaeno-assembled sample transportation kit.',
                     'Other', TRUE, now(), now(), 1)
                ON CONFLICT (id) DO NOTHING;
                """);
            migrationBuilder.AddColumn<Guid>(
                name: "tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "assembly_completed_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "tubes_verified_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "tubes_verified_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "source_stock_tube_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_workflows",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    finished_kit_product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    latest_revision = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_workflows", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflows_lab_supplier_products_finished_k~",
                        column: x => x.finished_kit_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflows_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflows_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_stock_tube_corrections",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipping_stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    replacement_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    barcode_namespace = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    corrected_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    corrected_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_stock_tube_corrections", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_stock_tube_corrections_sample_shipping_stoc~",
                        column: x => x.sample_shipping_stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_stock_tube_corrections_users_corrected_by_u~",
                        column: x => x.corrected_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_workflow_revisions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_workflow_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflow_revisions_lab_kit_assembly_workfl~",
                        column: x => x.workflow_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_kit_assembly_workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflow_revisions_users_approved_by_user_~",
                        column: x => x.approved_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_workflow_revisions_users_authored_by_user_~",
                        column: x => x.authored_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_components",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_components", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_components_lab_kit_assembly_workflow_revis~",
                        column: x => x.workflow_revision_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_kit_assembly_workflow_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_components_lab_supplier_products_supplier_~",
                        column: x => x.supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_runs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    recorded_step_count = table.Column<int>(type: "integer", nullable: false),
                    started_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    finished_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    abandonment_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_runs_lab_kit_assembly_workflow_revisions_w~",
                        column: x => x.workflow_revision_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_kit_assembly_workflow_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_runs_sample_shipping_stock_kits_stock_kit_~",
                        column: x => x.stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_runs_users_finished_by_user_id",
                        column: x => x.finished_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_runs_users_started_by_user_id",
                        column: x => x.started_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_step_records",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    lab_step_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    performed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    performed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_step_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_step_records_lab_kit_assembly_runs_run_id",
                        column: x => x.run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_kit_assembly_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_step_records_lab_step_versions_lab_step_ve~",
                        column: x => x.lab_step_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_step_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_step_records_users_performed_by_user_id",
                        column: x => x.performed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_kit_assembly_uses",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_material_lot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_kit_assembly_uses", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_uses_lab_kit_assembly_runs_run_id",
                        column: x => x.run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_kit_assembly_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_uses_lab_material_lots_source_material_lot~",
                        column: x => x.source_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_uses_lab_supplier_products_supplier_produc~",
                        column: x => x.supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_kit_assembly_uses_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "tube_supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "assembly_workflow_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "finished_kit_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_tubes_verified_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "tubes_verified_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "finished_kit_product_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_assembly_workflow_rev~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "assembly_workflow_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_source_stock_tube_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "source_stock_tube_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_components_supplier_product_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_components",
                column: "supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_components_workflow_revision_id_position",
                schema: "lab_ops",
                table: "lab_kit_assembly_components",
                columns: new[] { "workflow_revision_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_components_workflow_revision_id_supplier_p~",
                schema: "lab_ops",
                table: "lab_kit_assembly_components",
                columns: new[] { "workflow_revision_id", "supplier_product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_finished_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "finished_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_started_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "started_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_stock_kit_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "stock_kit_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_runs_workflow_revision_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_runs",
                column: "workflow_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_step_records_lab_step_version_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records",
                column: "lab_step_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_step_records_performed_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records",
                column: "performed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_step_records_run_id_sequence",
                schema: "lab_ops",
                table: "lab_kit_assembly_step_records",
                columns: new[] { "run_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_uses_recorded_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_uses",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_uses_run_id_supplier_product_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_uses",
                columns: new[] { "run_id", "supplier_product_id" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_uses_source_material_lot_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_uses",
                column: "source_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_uses_supplier_product_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_uses",
                column: "supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflow_revisions_approved_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflow_revisions",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflow_revisions_authored_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflow_revisions",
                column: "authored_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflow_revisions_workflow_id_revision",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflow_revisions",
                columns: new[] { "workflow_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflows_created_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflows_finished_kit_product_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows",
                column: "finished_kit_product_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_kit_assembly_workflows_updated_by_user_id",
                schema: "lab_ops",
                table: "lab_kit_assembly_workflows",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tube_corrections_corrected_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tube_corrections",
                column: "corrected_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tube_corrections_sample_shipping_stoc~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tube_corrections",
                columns: new[] { "sample_shipping_stock_kit_id", "corrected_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_registered_tube_source_stock_tube",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "source_stock_tube_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipping_stock_tubes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_spec_assembly_workflow_revision",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "assembly_workflow_revision_id",
                principalSchema: "lab_ops",
                principalTable: "lab_kit_assembly_workflow_revisions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_spec_finished_kit_product",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "finished_kit_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_assembly_workflow_revision",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "assembly_workflow_revision_id",
                principalSchema: "lab_ops",
                principalTable: "lab_kit_assembly_workflow_revisions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_finished_product",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "finished_kit_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_tubes_verified_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "tubes_verified_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_tube_product",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "tube_supplier_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // Preserve historical records. Backfill only identities supported by an exact
            // stock-kit, manufacturer namespace, and printed-value match. Historical kits
            // remain unverified because a database migration cannot inspect packed tubes.
            migrationBuilder.Sql("""
                UPDATE commercial_ops.sample_shipping_stock_tubes AS tube
                SET tube_supplier_product_id = kit.tube_supplier_product_id
                FROM commercial_ops.sample_shipping_stock_kits AS kit
                WHERE tube.sample_shipping_stock_kit_id = kit.id
                  AND kit.tube_supplier_product_id IS NOT NULL;

                UPDATE commercial_ops.registered_sample_tubes AS registered
                SET source_stock_tube_id = stock_tube.id
                FROM commercial_ops.sample_return_kits AS return_kit
                JOIN commercial_ops.sample_shipping_stock_kits AS stock_kit
                  ON stock_kit.kit_number = return_kit.kit_number
                JOIN commercial_ops.sample_shipping_stock_tubes AS stock_tube
                  ON stock_tube.sample_shipping_stock_kit_id = stock_kit.id
                WHERE registered.sample_return_kit_id = return_kit.id
                  AND registered.supplier_barcode = stock_tube.supplier_barcode
                  AND registered.barcode_namespace = stock_tube.barcode_namespace
                  AND registered.source_stock_tube_id IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM lab_ops.lab_supplier_products
                               WHERE product_type_id = '90000000-0000-4000-8000-000000000004') THEN
                        RAISE EXCEPTION 'Cannot remove Transportation kit type while products use it';
                    END IF;
                END $$;
                DELETE FROM lab_ops.lab_product_types
                WHERE id = '90000000-0000-4000-8000-000000000004';
                """);
            migrationBuilder.DropForeignKey(
                name: "fk_registered_tube_source_stock_tube",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_spec_assembly_workflow_revision",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_spec_finished_kit_product",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_assembly_workflow_revision",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_finished_product",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_tubes_verified_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_tube_product",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_components",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_step_records",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_uses",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_stock_tube_corrections",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_runs",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_workflow_revisions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_kit_assembly_workflows",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_tubes_tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_tubes_verified_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_definitions_assembly_workflow_rev~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropIndex(
                name: "IX_registered_sample_tubes_source_stock_tube_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes");

            migrationBuilder.DropColumn(
                name: "tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes");

            migrationBuilder.DropColumn(
                name: "assembly_completed_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "tubes_verified_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "tubes_verified_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.DropColumn(
                name: "assembly_workflow_revision_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions");

            migrationBuilder.DropColumn(
                name: "source_stock_tube_id",
                schema: "commercial_ops",
                table: "registered_sample_tubes");
        }
    }
}
