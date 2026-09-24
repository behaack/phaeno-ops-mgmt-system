using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReagentManufacturing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_reagent_workflows",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    material_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
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
                    table.PrimaryKey("PK_lab_reagent_workflows", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_reagent_workflows_lab_material_definitions_material_def~",
                        column: x => x.material_definition_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_reagent_manufacturing_runs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_revision = table.Column<int>(type: "integer", nullable: false),
                    workflow_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    steps_json = table.Column<string>(type: "jsonb", nullable: false),
                    material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    recorded_step_count = table.Column<int>(type: "integer", nullable: false),
                    material_use_count = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_lab_reagent_manufacturing_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_reagent_manufacturing_runs_lab_material_lots_material_l~",
                        column: x => x.material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_reagent_manufacturing_runs_lab_reagent_workflows_workfl~",
                        column: x => x.workflow_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_reagent_workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_reagent_material_uses",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    material_exhausted = table.Column<bool>(type: "boolean", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_reagent_material_uses", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_reagent_material_uses_lab_material_lots_source_material~",
                        column: x => x.source_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_reagent_material_uses_lab_reagent_manufacturing_runs_ru~",
                        column: x => x.run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_reagent_manufacturing_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_reagent_run_steps",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    step_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    performed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    performed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_reagent_run_steps", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_reagent_run_steps_lab_reagent_manufacturing_runs_run_id",
                        column: x => x.run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_reagent_manufacturing_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_manufacturing_runs_material_lot_id",
                schema: "lab_ops",
                table: "lab_reagent_manufacturing_runs",
                column: "material_lot_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_manufacturing_runs_status_started_at_utc",
                schema: "lab_ops",
                table: "lab_reagent_manufacturing_runs",
                columns: new[] { "status", "started_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_manufacturing_runs_workflow_id",
                schema: "lab_ops",
                table: "lab_reagent_manufacturing_runs",
                column: "workflow_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_material_uses_run_id_recorded_at_utc",
                schema: "lab_ops",
                table: "lab_reagent_material_uses",
                columns: new[] { "run_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_material_uses_source_material_lot_id",
                schema: "lab_ops",
                table: "lab_reagent_material_uses",
                column: "source_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_run_steps_run_id_sequence",
                schema: "lab_ops",
                table: "lab_reagent_run_steps",
                columns: new[] { "run_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_workflows_material_definition_id",
                schema: "lab_ops",
                table: "lab_reagent_workflows",
                column: "material_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_reagent_workflows_name",
                schema: "lab_ops",
                table: "lab_reagent_workflows",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_reagent_material_uses",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_reagent_run_steps",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_reagent_manufacturing_runs",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_reagent_workflows",
                schema: "lab_ops");
        }
    }
}
