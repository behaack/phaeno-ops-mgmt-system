using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSequencingRunLineage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs");

            migrationBuilder.AddColumn<string>(
                name: "library_preparation_choice",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "sequencing_run_number",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_id_sequencing_run_number",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                columns: new[] { "lab_specimen_id", "sequencing_run_number" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_id_sequencing_run_number",
                schema: "lab_ops",
                table: "lab_sequencing_outputs");

            migrationBuilder.DropColumn(
                name: "library_preparation_choice",
                schema: "lab_ops",
                table: "lab_sequencing_outputs");

            migrationBuilder.DropColumn(
                name: "sequencing_run_number",
                schema: "lab_ops",
                table: "lab_sequencing_outputs");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "lab_specimen_id");
        }
    }
}
