using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowInvalidation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "invalidated_at_utc",
                schema: "lab_ops",
                table: "lab_service_workflow_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "invalidation_reason",
                schema: "lab_ops",
                table: "lab_service_workflow_versions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "invalidated_at_utc",
                schema: "lab_ops",
                table: "lab_service_workflow_versions");

            migrationBuilder.DropColumn(
                name: "invalidation_reason",
                schema: "lab_ops",
                table: "lab_service_workflow_versions");
        }
    }
}
