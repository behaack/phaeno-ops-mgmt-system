using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPhysicalPreparationTray : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "tray_barcode",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_tray_barcode",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "tray_barcode",
                unique: true,
                filter: "tray_barcode IS NOT NULL AND status IN ('Draft', 'InProgress')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_preparation_batches_tray_barcode",
                schema: "lab_ops",
                table: "lab_preparation_batches");

            migrationBuilder.DropColumn(
                name: "tray_barcode",
                schema: "lab_ops",
                table: "lab_preparation_batches");
        }
    }
}
