using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnforceUniqueLabStepNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "normalized_name",
                schema: "lab_ops",
                table: "lab_steps",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql("UPDATE lab_ops.lab_steps SET normalized_name = upper(btrim(name));");

            migrationBuilder.AlterColumn<string>(
                name: "normalized_name",
                schema: "lab_ops",
                table: "lab_steps",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_steps_normalized_name",
                schema: "lab_ops",
                table: "lab_steps",
                column: "normalized_name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_steps_normalized_name",
                schema: "lab_ops",
                table: "lab_steps");

            migrationBuilder.DropColumn(
                name: "normalized_name",
                schema: "lab_ops",
                table: "lab_steps");
        }
    }
}
