using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSingleUseMasterMix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_master_mix_workflows",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    revision_history_json = table.Column<string>(type: "jsonb", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_workflows", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_master_mix_preparations",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_revision = table.Column<int>(type: "integer", nullable: false),
                    workflow_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recorded_step_count = table.Column<int>(type: "integer", nullable: false),
                    ingredient_use_count = table.Column<int>(type: "integer", nullable: false),
                    prepared_quantity = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: true),
                    used_quantity = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: false),
                    started_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    prepared_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    prepared_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    discarded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    discarded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    measured_discard_quantity = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: true),
                    discard_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_preparations", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_preparations_lab_master_mix_workflows_workfl~",
                        column: x => x.workflow_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_master_mix_ingredients",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    material_exhausted = table.Column<bool>(type: "boolean", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_ingredients", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_ingredients_lab_master_mix_preparations_prep~",
                        column: x => x.preparation_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_preparations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_ingredients_lab_material_lots_source_materia~",
                        column: x => x.source_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_master_mix_steps",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    performed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    performed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_steps", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_steps_lab_master_mix_preparations_preparatio~",
                        column: x => x.preparation_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_preparations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_master_mix_tray_uses",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    field_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_tray_uses", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_tray_uses_lab_master_mix_preparations_prepar~",
                        column: x => x.preparation_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_preparations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_tray_uses_lab_preparation_batches_lab_prepar~",
                        column: x => x.lab_preparation_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_tray_uses_lab_preparation_records_lab_prepar~",
                        column: x => x.lab_preparation_record_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_records",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_ingredients_preparation_id",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                column: "preparation_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_ingredients_source_material_lot_id",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                column: "source_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_preparations_status_started_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                columns: new[] { "status", "started_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_preparations_workflow_id",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                column: "workflow_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_steps_preparation_id_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_steps",
                columns: new[] { "preparation_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_tray_uses_lab_preparation_batch_id",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses",
                column: "lab_preparation_batch_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_tray_uses_lab_preparation_record_id_field_key",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses",
                columns: new[] { "lab_preparation_record_id", "field_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_tray_uses_preparation_id_lab_preparation_bat~",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses",
                columns: new[] { "preparation_id", "lab_preparation_batch_id" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_workflows_name",
                schema: "lab_ops",
                table: "lab_master_mix_workflows",
                column: "name",
                unique: true,
                filter: "status <> 'Retired'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_master_mix_ingredients",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_master_mix_steps",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_master_mix_tray_uses",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_master_mix_preparations",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_master_mix_workflows",
                schema: "lab_ops");
        }
    }
}
