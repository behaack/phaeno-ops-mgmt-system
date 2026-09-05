using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class UnifyGovernedResultRetentionPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "retention_snapshot_id",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "managed_operational_file_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "result_artifact_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_retention_snapshot_id",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                column: "retention_snapshot_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_result_artifact_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "result_artifact_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_operational_download_file_target",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                sql: "(managed_operational_file_id IS NOT NULL AND result_artifact_id IS NULL AND released_package_type <> 'PSeqResult') OR (managed_operational_file_id IS NULL AND result_artifact_id IS NOT NULL AND released_package_type = 'PSeqResult')");

            migrationBuilder.AddForeignKey(
                name: "FK_operational_file_downloads_result_artifacts_result_artifact~",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "result_artifact_id",
                principalSchema: "commercial_ops",
                principalTable: "result_artifacts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_result_retention_schedules_released_deliverable_retention_s~",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                column: "retention_snapshot_id",
                principalSchema: "commercial_ops",
                principalTable: "released_deliverable_retention_snapshots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Downgrading cannot represent governed attempts or frozen policy links.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM commercial_ops.operational_file_downloads WHERE result_artifact_id IS NOT NULL)
                        OR EXISTS (SELECT 1 FROM commercial_ops.result_retention_schedules WHERE retention_snapshot_id IS NOT NULL) THEN
                        RAISE EXCEPTION 'Cannot downgrade after governed retention evidence has been recorded; preserve evidence and roll forward.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_operational_file_downloads_result_artifacts_result_artifact~",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropForeignKey(
                name: "FK_result_retention_schedules_released_deliverable_retention_s~",
                schema: "commercial_ops",
                table: "result_retention_schedules");

            migrationBuilder.DropIndex(
                name: "IX_result_retention_schedules_retention_snapshot_id",
                schema: "commercial_ops",
                table: "result_retention_schedules");

            migrationBuilder.DropIndex(
                name: "IX_operational_file_downloads_result_artifact_id",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropCheckConstraint(
                name: "ck_operational_download_file_target",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "retention_snapshot_id",
                schema: "commercial_ops",
                table: "result_retention_schedules");

            migrationBuilder.DropColumn(
                name: "result_artifact_id",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.AlterColumn<Guid>(
                name: "managed_operational_file_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
