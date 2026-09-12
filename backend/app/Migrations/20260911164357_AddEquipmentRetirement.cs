using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentRetirement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "retired_at_utc",
                schema: "lab_ops",
                table: "lab_equipment",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "retired_by_user_id",
                schema: "lab_ops",
                table: "lab_equipment",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "retirement_reason",
                schema: "lab_ops",
                table: "lab_equipment",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "retired_at_utc",
                schema: "lab_ops",
                table: "lab_equipment");

            migrationBuilder.DropColumn(
                name: "retired_by_user_id",
                schema: "lab_ops",
                table: "lab_equipment");

            migrationBuilder.DropColumn(
                name: "retirement_reason",
                schema: "lab_ops",
                table: "lab_equipment");
        }
    }
}
