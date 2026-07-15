using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class CompleteDataProvisioningGovernance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "kind",
                schema: "portal",
                table: "provisioning_runs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Grant");

            migrationBuilder.AddColumn<Guid>(
                name: "previous_organization_dataset_grant_id",
                schema: "portal",
                table: "provisioning_runs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "superseded_at",
                schema: "portal",
                table: "organization_dataset_grants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "superseded_by_user_id",
                schema: "portal",
                table: "organization_dataset_grants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "data_governance_incidents",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    external_guidance = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    internal_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    attestation_due_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_governance_incidents", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_governance_incidents_source_samples_source_sample_id",
                        column: x => x.source_sample_id,
                        principalSchema: "portal",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_affected_organizations",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    affected_grant_count = table.Column<int>(type: "integer", nullable: false),
                    reminder_count = table.Column<int>(type: "integer", nullable: false),
                    last_reminded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attested_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    attestation_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    organization_contact = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    evidence_source = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    attestation_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_governance_affected_organizations", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_organizations_data_governance_inci~",
                        column: x => x.incident_id,
                        principalSchema: "portal",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_organizations_organizations_organi~",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_affected_versions",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prior_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_governance_affected_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_versions_curated_dataset_versions_~",
                        column: x => x.curated_dataset_version_id,
                        principalSchema: "portal",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_versions_data_governance_incidents~",
                        column: x => x.incident_id,
                        principalSchema: "portal",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_follow_ups",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_governance_follow_ups", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_governance_follow_ups_data_governance_incidents_incide~",
                        column: x => x.incident_id,
                        principalSchema: "portal",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_follow_ups_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_follow_ups_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_provisioning_notices",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: true),
                    organization_dataset_grant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_provisioning_notices", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_provisioning_notices_data_governance_incidents_inciden~",
                        column: x => x.incident_id,
                        principalSchema: "portal",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_provisioning_notices_organization_dataset_grants_organ~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "portal",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_provisioning_notices_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_previous_organization_dataset_grant_id",
                schema: "portal",
                table: "provisioning_runs",
                column: "previous_organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_incident_id_organiza~",
                schema: "portal",
                table: "data_governance_affected_organizations",
                columns: new[] { "incident_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_organization_id",
                schema: "portal",
                table: "data_governance_affected_organizations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_status",
                schema: "portal",
                table: "data_governance_affected_organizations",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_versions_curated_dataset_version_id",
                schema: "portal",
                table: "data_governance_affected_versions",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_versions_incident_id_curated_datas~",
                schema: "portal",
                table: "data_governance_affected_versions",
                columns: new[] { "incident_id", "curated_dataset_version_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_actor_user_id",
                schema: "portal",
                table: "data_governance_follow_ups",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_incident_id_occurred_at",
                schema: "portal",
                table: "data_governance_follow_ups",
                columns: new[] { "incident_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_organization_id",
                schema: "portal",
                table: "data_governance_follow_ups",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_incidents_source_sample_id",
                schema: "portal",
                table: "data_governance_incidents",
                column: "source_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_incidents_status",
                schema: "portal",
                table: "data_governance_incidents",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_incident_id",
                schema: "portal",
                table: "data_provisioning_notices",
                column: "incident_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_organization_dataset_grant_id",
                schema: "portal",
                table: "data_provisioning_notices",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_organization_id_created_at",
                schema: "portal",
                table: "data_provisioning_notices",
                columns: new[] { "organization_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_status_next_attempt_at",
                schema: "portal",
                table: "data_provisioning_notices",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_provisioning_runs_organization_dataset_grants_previous_orga~",
                schema: "portal",
                table: "provisioning_runs",
                column: "previous_organization_dataset_grant_id",
                principalSchema: "portal",
                principalTable: "organization_dataset_grants",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_provisioning_runs_organization_dataset_grants_previous_orga~",
                schema: "portal",
                table: "provisioning_runs");

            migrationBuilder.DropTable(
                name: "data_governance_affected_organizations",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_governance_affected_versions",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_governance_follow_ups",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_provisioning_notices",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_governance_incidents",
                schema: "portal");

            migrationBuilder.DropIndex(
                name: "IX_provisioning_runs_previous_organization_dataset_grant_id",
                schema: "portal",
                table: "provisioning_runs");

            migrationBuilder.DropColumn(
                name: "kind",
                schema: "portal",
                table: "provisioning_runs");

            migrationBuilder.DropColumn(
                name: "previous_organization_dataset_grant_id",
                schema: "portal",
                table: "provisioning_runs");

            migrationBuilder.DropColumn(
                name: "superseded_at",
                schema: "portal",
                table: "organization_dataset_grants");

            migrationBuilder.DropColumn(
                name: "superseded_by_user_id",
                schema: "portal",
                table: "organization_dataset_grants");
        }
    }
}
