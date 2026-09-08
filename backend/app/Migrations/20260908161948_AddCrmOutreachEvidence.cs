using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCrmOutreachEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "outreach_permission_source",
                schema: "commercial_ops",
                table: "crm_contacts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "outreach_recorded_on",
                schema: "commercial_ops",
                table: "crm_contacts",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outreach_suppression_reason",
                schema: "commercial_ops",
                table: "crm_contacts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "outreach_permission_source",
                schema: "commercial_ops",
                table: "crm_contacts");

            migrationBuilder.DropColumn(
                name: "outreach_recorded_on",
                schema: "commercial_ops",
                table: "crm_contacts");

            migrationBuilder.DropColumn(
                name: "outreach_suppression_reason",
                schema: "commercial_ops",
                table: "crm_contacts");
        }
    }
}
