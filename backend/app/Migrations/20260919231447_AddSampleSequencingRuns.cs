using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleSequencingRuns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "sequencing_run_count",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "sequencing_run_count",
                schema: "commercial_ops",
                table: "lab_samples",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "sequencing_run_count",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sequencing_run_count",
                schema: "commercial_ops",
                table: "lab_samples");
        }
    }
}
