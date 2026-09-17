using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabApprovalOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "approval_override_reason",
                schema: "lab_ops",
                table: "lab_service_workflow_versions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "approval_override_reason",
                schema: "lab_ops",
                table: "lab_protocol_versions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "approval_override_reason",
                schema: "lab_ops",
                table: "lab_service_workflow_versions");

            migrationBuilder.DropColumn(
                name: "approval_override_reason",
                schema: "lab_ops",
                table: "lab_protocol_versions");
        }
    }
}
