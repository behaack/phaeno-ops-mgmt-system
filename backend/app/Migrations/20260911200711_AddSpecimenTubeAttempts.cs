using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecimenTubeAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "tube_use_policy_authorization_version",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tube_use_policy_key",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tube_use_policy_version",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "processing_next_action",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "processing_note",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "processing_owner_user_id",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "processing_reason_code",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "processing_state",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "processing_updated_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tube_use_policy_key",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tube_use_policy_version",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_attempt_command_receipts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    applied_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_attempt_command_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_attempt_command_receipts_lab_work_orders_lab_work_order~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_specimen_attempts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    previous_attempt_id = table.Column<Guid>(type: "uuid", nullable: true),
                    state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    failure_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    failure_evidence = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    failed_execution_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hold_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    hold_owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hold_next_action = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    stage_skips_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_specimen_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_containers_source_container_id",
                        column: x => x.source_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_protocol_executions_failed_execut~",
                        column: x => x.failed_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_service_workflow_versions_lab_ser~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_specimen_attempts_previous_attemp~",
                        column: x => x.previous_attempt_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimen_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_specimen_attempt_id_lab_service~",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                columns: new[] { "lab_specimen_attempt_id", "lab_service_workflow_stage_id" },
                unique: true,
                filter: "lab_specimen_attempt_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "lab_specimen_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_attempt_command_receipts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_attempt_command_receipts",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_failed_execution_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "failed_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_specimen_id",
                unique: true,
                filter: "state IN ('Planned', 'InProgress', 'OnHold', 'Succeeded')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id_sequence",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                columns: new[] { "lab_specimen_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_previous_attempt_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "previous_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "source_container_id",
                unique: true,
                filter: "state <> 'Cancelled'");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_containers_lab_specimen_attempts_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_protocol_executions_lab_specimen_attempts_lab_specimen_~",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_containers_lab_specimen_attempts_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_protocol_executions_lab_specimen_attempts_lab_specimen_~",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropTable(
                name: "lab_attempt_command_receipts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_specimen_attempts",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_protocol_executions_lab_specimen_attempt_id_lab_service~",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "tube_use_policy_authorization_version",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "tube_use_policy_key",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "tube_use_policy_version",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "processing_next_action",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "processing_note",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "processing_owner_user_id",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "processing_reason_code",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "processing_state",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "processing_updated_at_utc",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "tube_use_policy_key",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "tube_use_policy_version",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropColumn(
                name: "lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers");
        }
    }
}
