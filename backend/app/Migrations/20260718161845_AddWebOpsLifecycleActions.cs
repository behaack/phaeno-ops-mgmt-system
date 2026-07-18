using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWebOpsLifecycleActions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "completed_at_utc",
                schema: "website",
                table: "web_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "completed_by_user_id",
                schema: "website",
                table: "web_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "unsubscribed_at_utc",
                schema: "website",
                table: "web_contacts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "unsubscribed_by_user_id",
                schema: "website",
                table: "web_contacts",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "completed_at_utc",
                schema: "website",
                table: "web_orders");

            migrationBuilder.DropColumn(
                name: "completed_by_user_id",
                schema: "website",
                table: "web_orders");

            migrationBuilder.DropColumn(
                name: "unsubscribed_at_utc",
                schema: "website",
                table: "web_contacts");

            migrationBuilder.DropColumn(
                name: "unsubscribed_by_user_id",
                schema: "website",
                table: "web_contacts");
        }
    }
}
