using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTubeIntakeReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "intake_disposition",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "intake_notes",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "intake_reason_code",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "intake_reviewed_at_utc",
                schema: "lab_ops",
                table: "lab_containers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "intake_reviewed_by_user_id",
                schema: "lab_ops",
                table: "lab_containers",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "intake_disposition",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "intake_notes",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "intake_reason_code",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "intake_reviewed_at_utc",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "intake_reviewed_by_user_id",
                schema: "lab_ops",
                table: "lab_containers");
        }
    }
}
