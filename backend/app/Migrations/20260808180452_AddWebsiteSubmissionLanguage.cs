using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWebsiteSubmissionLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "language",
                schema: "website",
                table: "web_orders",
                type: "character varying(35)",
                maxLength: 35,
                nullable: false,
                defaultValue: "en-US");

            migrationBuilder.AddColumn<string>(
                name: "language",
                schema: "website",
                table: "web_contacts",
                type: "character varying(35)",
                maxLength: 35,
                nullable: false,
                defaultValue: "en-US");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "language",
                schema: "website",
                table: "web_orders");

            migrationBuilder.DropColumn(
                name: "language",
                schema: "website",
                table: "web_contacts");
        }
    }
}
