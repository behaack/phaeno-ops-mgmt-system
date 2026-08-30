using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class MoveLabSampleSharedFieldsToJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "safety_declaration",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "storage_requirements",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.lab_service_orders AS job
                SET storage_requirements = COALESCE(
                        (
                            SELECT sample.storage_requirements
                            FROM commercial_ops.lab_samples AS sample
                            WHERE sample.lab_service_order_id = job.id
                            ORDER BY sample.created_at, sample.id
                            LIMIT 1
                        ),
                        ''),
                    safety_declaration = COALESCE(
                        (
                            SELECT sample.safety_declaration
                            FROM commercial_ops.lab_samples AS sample
                            WHERE sample.lab_service_order_id = job.id
                            ORDER BY sample.created_at, sample.id
                            LIMIT 1
                        ),
                        '');
                """);

            migrationBuilder.AlterColumn<string>(
                name: "storage_requirements",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "safety_declaration",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "safety_declaration",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "storage_requirements",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
