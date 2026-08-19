using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompletionAwareReleasedDownloads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "downloaded_at",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                newName: "started_at_utc");

            migrationBuilder.RenameIndex(
                name: "IX_operational_file_downloads_organization_id_downloaded_at",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                newName: "IX_operational_file_downloads_organization_id_started_at_utc");

            migrationBuilder.AddColumn<DateTime>(
                name: "completed_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "counts_for_released_package_retention",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outcome",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "released_package_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "released_package_type",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "scope",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "terminal_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_reason_code",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "version",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.operational_file_downloads AS download
                SET transfer_id = download.id,
                    lease_expires_at_utc = download.started_at_utc + interval '1 hour',
                    terminal_at_utc = download.started_at_utc,
                    outcome = 'Failed',
                    terminal_reason_code = 'legacy_completion_unverified',
                    scope = 'IndividualFile',
                    released_package_type = CASE
                        WHEN file.purpose = 'LabResult' THEN 'LabResult'
                        ELSE 'AssemblyOutput'
                    END,
                    released_package_id = COALESCE(file.parent_record_id, file.workflow_id),
                    counts_for_released_package_retention = FALSE,
                    version = 1
                FROM commercial_ops.managed_operational_files AS file
                WHERE file.id = download.managed_operational_file_id;
                """);

            migrationBuilder.AlterColumn<DateTime>(
                name: "lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "outcome",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "released_package_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "released_package_type",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "scope",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_organization_id_released_package~",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                columns: new[] { "organization_id", "released_package_type", "released_package_id" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_outcome_lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                columns: new[] { "outcome", "lease_expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "transfer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_operational_file_downloads_organization_id_released_package~",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropIndex(
                name: "IX_operational_file_downloads_outcome_lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropIndex(
                name: "IX_operational_file_downloads_transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "completed_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "counts_for_released_package_retention",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "outcome",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "released_package_id",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "released_package_type",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "scope",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "terminal_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "terminal_reason_code",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "commercial_ops",
                table: "operational_file_downloads");

            migrationBuilder.RenameColumn(
                name: "started_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                newName: "downloaded_at");

            migrationBuilder.RenameIndex(
                name: "IX_operational_file_downloads_organization_id_started_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                newName: "IX_operational_file_downloads_organization_id_downloaded_at");
        }
    }
}
