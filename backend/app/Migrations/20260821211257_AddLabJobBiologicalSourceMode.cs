using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabJobBiologicalSourceMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "has_mixed_biological_sources",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "shared_biological_source",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH source_profiles AS (
                    SELECT
                        job.id,
                        COUNT(DISTINCT LOWER(BTRIM(sample.biological_source))) > 1 AS has_mixed_sources,
                        (ARRAY_AGG(BTRIM(sample.biological_source)
                            ORDER BY sample.created_at, sample.id)
                            FILTER (WHERE sample.id IS NOT NULL))[1] AS first_source
                    FROM commercial_ops.lab_service_orders AS job
                    LEFT JOIN commercial_ops.lab_samples AS sample
                        ON sample.lab_service_order_id = job.id
                    GROUP BY job.id
                )
                UPDATE commercial_ops.lab_service_orders AS job
                SET
                    has_mixed_biological_sources = profile.has_mixed_sources,
                    shared_biological_source = CASE
                        WHEN profile.has_mixed_sources THEN NULL
                        ELSE profile.first_source
                    END
                FROM source_profiles AS profile
                WHERE profile.id = job.id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "has_mixed_biological_sources",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "shared_biological_source",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
