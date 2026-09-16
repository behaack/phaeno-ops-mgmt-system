using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabChangeQuoteSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "accepted_amendment_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "change_roster_finalized_at",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "change_scope_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "accepted_amendment_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "change_roster_finalized_at",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "change_scope_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");
        }
    }
}
