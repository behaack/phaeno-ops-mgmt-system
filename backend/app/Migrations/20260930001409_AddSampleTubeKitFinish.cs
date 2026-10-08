using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleTubeKitFinish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "finished_at",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "finished_by_user_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "finished_at",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections");

            migrationBuilder.DropColumn(
                name: "finished_by_user_id",
                schema: "commercial_ops",
                table: "lab_sample_tube_kit_selections");
        }
    }
}
