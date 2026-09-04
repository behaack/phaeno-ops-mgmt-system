using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddControlledLabServiceWorkflows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_service_workflow_stage_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_service_workflows",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    latest_version = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflows", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_workflow_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    production_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    production_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflow_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_versions_lab_service_workflows_lab_ser~",
                        column: x => x.lab_service_workflow_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_workflow_stages",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    lab_protocol_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requirement = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    handoff_criteria = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflow_stages", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_stages_lab_protocol_versions_lab_proto~",
                        column: x => x.lab_protocol_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_stages_lab_service_workflow_versions_l~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_work_orders",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_service_workflow_stage_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_service_workflow_stage_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_stages_lab_protocol_version_id",
                schema: "lab_ops",
                table: "lab_service_workflow_stages",
                column: "lab_protocol_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_stages_lab_service_workflow_version_id~",
                schema: "lab_ops",
                table: "lab_service_workflow_stages",
                columns: new[] { "lab_service_workflow_version_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_versions_lab_service_workflow_id_workf~",
                schema: "lab_ops",
                table: "lab_service_workflow_versions",
                columns: new[] { "lab_service_workflow_id", "workflow_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflows_service_key",
                schema: "lab_ops",
                table: "lab_service_workflows",
                column: "service_key",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_protocol_executions_lab_service_workflow_stages_lab_ser~",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_service_workflow_stage_id",
                principalSchema: "lab_ops",
                principalTable: "lab_service_workflow_stages",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_work_orders_lab_service_workflow_versions_lab_service_w~",
                schema: "lab_ops",
                table: "lab_work_orders",
                column: "lab_service_workflow_version_id",
                principalSchema: "lab_ops",
                principalTable: "lab_service_workflow_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_protocol_executions_lab_service_workflow_stages_lab_ser~",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_work_orders_lab_service_workflow_versions_lab_service_w~",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropTable(
                name: "lab_service_workflow_stages",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_workflow_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_workflows",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_work_orders_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_protocol_executions_lab_service_workflow_stage_id",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropColumn(
                name: "lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "lab_service_workflow_stage_id",
                schema: "lab_ops",
                table: "lab_protocol_executions");
        }
    }
}
