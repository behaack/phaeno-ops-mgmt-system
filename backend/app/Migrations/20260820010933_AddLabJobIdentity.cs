using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabJobIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH ranked_jobs AS (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY organization_id,
                                            UPPER(BTRIM(COALESCE(NULLIF(customer_reference, ''), order_number)))
                               ORDER BY created_at, id) AS duplicate_number
                    FROM commercial_ops.lab_service_orders
                )
                UPDATE commercial_ops.lab_service_orders AS job
                SET customer_reference = CASE
                    WHEN job.customer_reference IS NULL OR BTRIM(job.customer_reference) = ''
                        THEN job.order_number
                    WHEN ranked_jobs.duplicate_number > 1
                        THEN LEFT(BTRIM(job.customer_reference), 200) || ' [' || job.id::text || ']'
                    ELSE BTRIM(job.customer_reference)
                END
                FROM ranked_jobs
                WHERE ranked_jobs.id = job.id;

                UPDATE commercial_ops.lab_service_orders
                SET normalized_job_name = UPPER(customer_reference);
                """);

            migrationBuilder.AlterColumn<string>(
                name: "customer_reference",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "normalized_job_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_organization_id_normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.AlterColumn<string>(
                name: "customer_reference",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);
        }
    }
}
