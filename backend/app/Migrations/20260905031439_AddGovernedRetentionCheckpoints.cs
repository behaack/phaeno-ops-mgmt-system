using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGovernedRetentionCheckpoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "grace_notification_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "standard_checkpoint_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "warning_checkpoint_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "warning_checkpoint_outcome",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "warning_notification_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_grace_notification~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "grace_notification_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "warning_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_notificati~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "warning_notification_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_workflow_type_workflow_id_event_type",
                schema: "commercial_ops",
                table: "order_notifications",
                columns: new[] { "workflow_type", "workflow_id", "event_type" },
                unique: true,
                filter: "workflow_type = 'ReleasedDeliverableRetention'");

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_retention_snapshots_order_notification~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "grace_notification_id",
                principalSchema: "commercial_ops",
                principalTable: "order_notifications",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_retention_snapshots_order_notificatio~1",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "warning_notification_id",
                principalSchema: "commercial_ops",
                principalTable: "order_notifications",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM commercial_ops.released_deliverable_retention_snapshots
                    WHERE warning_checkpoint_at_utc IS NOT NULL OR standard_checkpoint_at_utc IS NOT NULL)
                  THEN RAISE EXCEPTION 'Retention checkpoint evidence exists; use a reviewed forward fix instead of dropping it.';
                  END IF;
                END $$;
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_released_deliverable_retention_snapshots_order_notification~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropForeignKey(
                name: "FK_released_deliverable_retention_snapshots_order_notificatio~1",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropIndex(
                name: "IX_released_deliverable_retention_snapshots_grace_notification~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_notificati~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropIndex(
                name: "IX_order_notifications_workflow_type_workflow_id_event_type",
                schema: "commercial_ops",
                table: "order_notifications");

            migrationBuilder.DropColumn(
                name: "grace_notification_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "standard_checkpoint_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "warning_checkpoint_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "warning_checkpoint_outcome",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "warning_notification_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");
        }
    }
}
