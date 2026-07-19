using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabBatchNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "name",
                schema: "lab_ops",
                table: "lab_operational_batches",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE lab_ops.lab_operational_batches SET name = batch_number WHERE name IS NULL;");

            migrationBuilder.Sql(
                "ALTER TABLE lab_ops.lab_operational_batches ALTER COLUMN name SET NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name",
                schema: "lab_ops",
                table: "lab_operational_batches");
        }
    }
}
