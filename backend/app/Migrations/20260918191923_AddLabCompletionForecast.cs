using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabCompletionForecast : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_business_calendars",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    coverage_from = table.Column<DateOnly>(type: "date", nullable: false),
                    coverage_to = table.Column<DateOnly>(type: "date", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_business_calendars", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_forecast_snapshots",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evaluated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_forecast_snapshots", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_forecast_snapshots_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_forecast_transitions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    previous_state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    entered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_forecast_transitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_forecast_transitions_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_holidays",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_business_calendar_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_holidays", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_holidays_lab_business_calendars_lab_business_calendar_id",
                        column: x => x.lab_business_calendar_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_business_calendars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_timing_policies",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_business_calendar_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    requires_sequencing = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_timing_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_timing_policies_lab_business_calendars_lab_business_cal~",
                        column: x => x.lab_business_calendar_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_business_calendars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_timing_policies_lab_service_workflow_versions_lab_servi~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_job_timing_policies",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_timing_policy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_job_timing_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_job_timing_policies_lab_timing_policies_lab_timing_poli~",
                        column: x => x.lab_timing_policy_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_timing_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_job_timing_policies_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_stage_durations",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_timing_policy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stage_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    days = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    day_basis = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_stage_durations", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_stage_durations_lab_timing_policies_lab_timing_policy_id",
                        column: x => x.lab_timing_policy_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_timing_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_business_calendars_revision",
                schema: "lab_ops",
                table: "lab_business_calendars",
                column: "revision",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_forecast_snapshots_lab_work_order_id_evaluated_at_utc",
                schema: "lab_ops",
                table: "lab_forecast_snapshots",
                columns: new[] { "lab_work_order_id", "evaluated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_forecast_transitions_lab_work_order_id_source_kind_sour~",
                schema: "lab_ops",
                table: "lab_forecast_transitions",
                columns: new[] { "lab_work_order_id", "source_kind", "source_id", "entered_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_holidays_lab_business_calendar_id_date",
                schema: "lab_ops",
                table: "lab_holidays",
                columns: new[] { "lab_business_calendar_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_timing_policies_lab_timing_policy_id",
                schema: "lab_ops",
                table: "lab_job_timing_policies",
                column: "lab_timing_policy_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_timing_policies_lab_work_order_id_revision",
                schema: "lab_ops",
                table: "lab_job_timing_policies",
                columns: new[] { "lab_work_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_stage_durations_lab_timing_policy_id_stage_key",
                schema: "lab_ops",
                table: "lab_stage_durations",
                columns: new[] { "lab_timing_policy_id", "stage_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_timing_policies_lab_business_calendar_id",
                schema: "lab_ops",
                table: "lab_timing_policies",
                column: "lab_business_calendar_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_timing_policies_lab_service_workflow_version_id_revision",
                schema: "lab_ops",
                table: "lab_timing_policies",
                columns: new[] { "lab_service_workflow_version_id", "revision" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_forecast_snapshots",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_forecast_transitions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_holidays",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_job_timing_policies",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_stage_durations",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_timing_policies",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_business_calendars",
                schema: "lab_ops");
        }
    }
}
