using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class DirectTrialLeadershipAndOpportunityDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "opportunity_id",
                schema: "commercial_ops",
                table: "trial_projects",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "crm_handoff_id",
                schema: "commercial_ops",
                table: "trial_projects",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "authority_id",
                schema: "commercial_ops",
                table: "trial_decisions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_department_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "department_id");

            migrationBuilder.AddForeignKey(
                name: "FK_crm_opportunities_organization_departments_department_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new InvalidOperationException("This clean baseline cannot be rolled back across direct Trial creation: reverting would remove department selections and require nonexistent CRM parents. Restore a verified pre-migration database backup instead.");
        }
    }
}
