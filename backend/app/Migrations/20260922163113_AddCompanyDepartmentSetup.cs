using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyDepartmentSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "setup_organization_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_crm_companies_organizations_setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "setup_organization_id",
                principalSchema: "commercial_ops",
                principalTable: "organizations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_crm_companies_organizations_setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropIndex(
                name: "IX_crm_companies_setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "setup_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");
        }
    }
}
