using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowRepeatedLibraryPreparation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts");

            migrationBuilder.DropIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_specimen_id",
                unique: true,
                filter: "state IN ('Planned', 'InProgress', 'OnHold')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "source_container_id",
                unique: true,
                filter: "state IN ('Planned', 'InProgress', 'OnHold')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts");

            migrationBuilder.DropIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_specimen_id",
                unique: true,
                filter: "state IN ('Planned', 'InProgress', 'OnHold', 'Succeeded')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "source_container_id",
                unique: true,
                filter: "state <> 'Cancelled'");
        }
    }
}
