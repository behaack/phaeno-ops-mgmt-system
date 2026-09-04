using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ScopeDatasetGrantsByDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_department_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active' AND \"department_id\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_department_id_c~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "department_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active' AND \"department_id\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_organization_dataset_grants_organization_departments_depart~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
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
                name: "FK_organization_dataset_grants_organization_departments_depart~",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.DropIndex(
                name: "IX_organization_dataset_grants_department_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.DropIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.DropIndex(
                name: "IX_organization_dataset_grants_organization_id_department_id_c~",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active'");
        }
    }
}
