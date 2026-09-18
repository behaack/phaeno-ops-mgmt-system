using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddJobDeliveryDeadlines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "adjusted_delivery_due_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "delivery_due_at_first_delivery_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "first_delivered_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "original_delivery_due_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            // Retain known historical targets; never infer a date from CreatedAt or
            // laboratory completion. New jobs freeze their baseline at acceptance.
            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_work_orders
                SET original_delivery_due_at_utc = original_target_at_utc
                WHERE original_target_at_utc IS NOT NULL;
                """);

            migrationBuilder.CreateTable(
                name: "lab_job_deadline_changes",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_job_deadline_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_job_deadline_changes_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_deadline_changes_lab_work_order_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_job_deadline_changes",
                columns: new[] { "lab_work_order_id", "occurred_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_job_deadline_changes",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "adjusted_delivery_due_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "delivery_due_at_first_delivery_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "first_delivered_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "original_delivery_due_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");
        }
    }
}
