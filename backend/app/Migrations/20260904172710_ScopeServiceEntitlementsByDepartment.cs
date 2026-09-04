using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ScopeServiceEntitlementsByDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_organization_service_entitlements_organization_id_service_e~",
                schema: "commercial_ops",
                table: "organization_service_entitlements");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_department_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_organization_id_departmen~",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                columns: new[] { "organization_id", "department_id", "service", "effective_from" });

            migrationBuilder.AddForeignKey(
                name: "FK_organization_service_entitlements_organization_departments_~",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
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
                name: "FK_organization_service_entitlements_organization_departments_~",
                schema: "commercial_ops",
                table: "organization_service_entitlements");

            migrationBuilder.DropIndex(
                name: "IX_organization_service_entitlements_department_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements");

            migrationBuilder.DropIndex(
                name: "IX_organization_service_entitlements_organization_id_departmen~",
                schema: "commercial_ops",
                table: "organization_service_entitlements");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements");

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_organization_id_service_e~",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                columns: new[] { "organization_id", "service", "effective_from" });
        }
    }
}
