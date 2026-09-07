using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrialAndReconciliationDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "draft_saved_at_utc",
                schema: "commercial_ops",
                table: "trial_projects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "draft_scope_json",
                schema: "commercial_ops",
                table: "trial_projects",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "draft_changes_json",
                schema: "commercial_ops",
                table: "reconciliation_batches",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "draft_saved_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_trial_projects_users_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "draft_saved_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropIndex(
                name: "IX_trial_projects_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropColumn(
                name: "draft_saved_at_utc",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropColumn(
                name: "draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropColumn(
                name: "draft_scope_json",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropColumn(
                name: "draft_changes_json",
                schema: "commercial_ops",
                table: "reconciliation_batches");
        }
    }
}
