using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationConfigurationDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "default_billing_contact_email",
                schema: "commercial_ops",
                table: "organizations",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_notification_email",
                schema: "commercial_ops",
                table: "organizations",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "default_purchase_order_required",
                schema: "commercial_ops",
                table: "organizations",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_result_delivery_instructions",
                schema: "commercial_ops",
                table: "organizations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_shipping_instructions",
                schema: "commercial_ops",
                table: "organizations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_billing_contact_email",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "default_notification_email",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "default_purchase_order_required",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "default_result_delivery_instructions",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "default_shipping_instructions",
                schema: "commercial_ops",
                table: "organizations");
        }
    }
}
