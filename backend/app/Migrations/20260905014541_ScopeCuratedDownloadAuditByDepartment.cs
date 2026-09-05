using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ScopeCuratedDownloadAuditByDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_dataset_download_audits_organization_id",
                schema: "commercial_ops",
                table: "dataset_download_audits");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_department_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_id_department_id_downl~",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                columns: new[] { "organization_id", "department_id", "downloaded_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_dataset_download_audits_organization_departments_department~",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_dataset_download_audits_organization_departments_department~",
                schema: "commercial_ops",
                table: "dataset_download_audits");

            migrationBuilder.DropIndex(
                name: "IX_dataset_download_audits_department_id",
                schema: "commercial_ops",
                table: "dataset_download_audits");

            migrationBuilder.DropIndex(
                name: "IX_dataset_download_audits_organization_id_department_id_downl~",
                schema: "commercial_ops",
                table: "dataset_download_audits");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "dataset_download_audits");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "organization_id");
        }
    }
}
