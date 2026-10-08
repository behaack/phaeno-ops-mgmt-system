using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    public partial class AddSeparateSampleRunPricing : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "proposed_additional_run_price",
                schema: "commercial_ops",
                table: "lab_job_phases",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "proposed_additional_run_price",
                schema: "commercial_ops",
                table: "lab_job_phases");
        }
    }
}
