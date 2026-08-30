using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class BackfillJobPricingProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.lab_service_orders AS job
                SET requested_specimen_count = GREATEST(
                    (SELECT COUNT(*)::integer
                     FROM commercial_ops.lab_samples AS sample
                     WHERE sample.lab_service_order_id = job.id),
                    1);

                INSERT INTO commercial_ops.lab_service_source_groups (
                    id, lab_service_order_id, biological_source,
                    normalized_biological_source, specimen_count,
                    created_at, created_by_user_id, updated_at,
                    updated_by_user_id, version)
                SELECT
                    gen_random_uuid(), job.id, BTRIM(job.shared_biological_source),
                    UPPER(BTRIM(job.shared_biological_source)),
                    job.requested_specimen_count,
                    job.created_at, job.created_by_user_id, job.updated_at,
                    job.updated_by_user_id, 1
                FROM commercial_ops.lab_service_orders AS job
                WHERE NOT job.has_mixed_biological_sources
                  AND NULLIF(BTRIM(job.shared_biological_source), '') IS NOT NULL
                ON CONFLICT (lab_service_order_id, normalized_biological_source) DO NOTHING;

                INSERT INTO commercial_ops.lab_service_source_groups (
                    id, lab_service_order_id, biological_source,
                    normalized_biological_source, specimen_count,
                    created_at, created_by_user_id, updated_at,
                    updated_by_user_id, version)
                SELECT
                    gen_random_uuid(), job.id, MIN(BTRIM(sample.biological_source)),
                    UPPER(BTRIM(sample.biological_source)), COUNT(*)::integer,
                    job.created_at, job.created_by_user_id, job.updated_at,
                    job.updated_by_user_id, 1
                FROM commercial_ops.lab_service_orders AS job
                JOIN commercial_ops.lab_samples AS sample
                  ON sample.lab_service_order_id = job.id
                WHERE job.has_mixed_biological_sources
                GROUP BY job.id, UPPER(BTRIM(sample.biological_source)),
                    job.created_at, job.created_by_user_id, job.updated_at,
                    job.updated_by_user_id
                ON CONFLICT (lab_service_order_id, normalized_biological_source) DO NOTHING;

                UPDATE commercial_ops.lab_service_orders
                SET sample_roster_finalized_at = COALESCE(placed_at, updated_at)
                WHERE status IN ('PlacedAwaitingSamples', 'InProgress',
                    'ResultsAvailable', 'OnHold', 'CancellationRequested',
                    'Completed', 'Cancelled')
                  AND EXISTS (
                    SELECT 1 FROM commercial_ops.lab_samples AS sample
                    WHERE sample.lab_service_order_id = lab_service_orders.id);
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
