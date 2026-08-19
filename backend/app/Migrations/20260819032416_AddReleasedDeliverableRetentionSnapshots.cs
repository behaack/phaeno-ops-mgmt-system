using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReleasedDeliverableRetentionSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH next_policy AS (
                    SELECT COALESCE(MAX(revision), 0) + 1 AS revision
                    FROM commercial_ops.released_deliverable_policy_defaults
                )
                INSERT INTO commercial_ops.released_deliverable_policy_defaults (
                    id,
                    revision,
                    standard_retention_days,
                    undownloaded_warning_lead_days,
                    undownloaded_grace_days,
                    change_reason,
                    supersedes_policy_id,
                    is_active,
                    deactivated_at,
                    deactivated_by_user_id,
                    deactivation_reason,
                    created_at,
                    created_by_user_id,
                    updated_at,
                    updated_by_user_id,
                    version)
                SELECT
                    '6e69a578-ec2d-43bd-af95-e2e7bc4a0fc4'::uuid,
                    next_policy.revision,
                    30,
                    5,
                    5,
                    'Initialized the approved global 30-day retention, 5-day warning, and 5-day grace defaults.',
                    NULL,
                    TRUE,
                    NULL,
                    NULL,
                    NULL,
                    CURRENT_TIMESTAMP,
                    NULL,
                    CURRENT_TIMESTAMP,
                    NULL,
                    next_policy.revision
                FROM next_policy
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM commercial_ops.released_deliverable_policy_defaults
                    WHERE is_active);
                """);

            migrationBuilder.CreateTable(
                name: "released_deliverable_retention_snapshots",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_result_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assembly_output_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    global_policy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    global_policy_revision = table.Column<int>(type: "integer", nullable: false),
                    organization_policy_override_id = table.Column<Guid>(type: "uuid", nullable: true),
                    organization_policy_override_revision = table.Column<int>(type: "integer", nullable: true),
                    standard_retention_days = table.Column<int>(type: "integer", nullable: false),
                    standard_retention_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    undownloaded_warning_lead_days = table.Column<int>(type: "integer", nullable: false),
                    undownloaded_warning_lead_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    undownloaded_grace_days = table.Column<int>(type: "integer", nullable: false),
                    undownloaded_grace_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    warning_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    standard_deletion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    potential_final_deletion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    grace_activated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    download_access_closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    byte_deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deletion_outcome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_retention_snapshots", x => x.id);
                    table.CheckConstraint("ck_released_retention_snapshot_one_package", "(lab_result_release_id IS NOT NULL AND assembly_output_release_id IS NULL) OR (lab_result_release_id IS NULL AND assembly_output_release_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_released_retention_snapshot_assembly_output",
                        column: x => x.assembly_output_release_id,
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_output_releases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_released_retention_snapshot_global_policy",
                        column: x => x.global_policy_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_policy_defaults",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_released_retention_snapshot_lab_result",
                        column: x => x.lab_result_release_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_result_releases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_released_retention_snapshot_org_override",
                        column: x => x.organization_policy_override_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_released_deliverable_policy_overrides",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_released_retention_snapshot_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_assembly_output_re~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "assembly_output_release_id",
                unique: true,
                filter: "\"assembly_output_release_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_global_policy_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "global_policy_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_lab_result_release~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "lab_result_release_id",
                unique: true,
                filter: "\"lab_result_release_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_organization_id_st~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                columns: new[] { "organization_id", "standard_deletion_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_organization_polic~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "organization_policy_override_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_potential_final_de~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "potential_final_deletion_at_utc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "released_deliverable_retention_snapshots",
                schema: "commercial_ops");
        }
    }
}
