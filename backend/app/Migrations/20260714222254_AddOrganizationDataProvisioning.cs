using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationDataProvisioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "curated_datasets",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    eligible_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    eligibility_approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eligibility_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curated_datasets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "source_samples",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    biological_context = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    assay_context = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    analysis_summary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    qc_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    provenance = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    is_synthetic = table.Column<bool>(type: "boolean", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ownership_basis = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ownership_evidence_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ownership_confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ownership_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deidentification_method = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    deidentification_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    deidentification_confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deidentification_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ready_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ready_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    archived_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_samples", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "curated_dataset_versions",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_revision = table.Column<int>(type: "integer", nullable: false),
                    source_snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_synthetic = table.Column<bool>(type: "boolean", nullable: false),
                    sample_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    biological_context = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    assay_context = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    analysis_summary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    qc_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    provenance = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ownership_basis = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ownership_evidence_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ownership_confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ownership_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deidentification_method = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    deidentification_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    deidentification_confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    deidentification_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    release_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    content_checksum = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    published_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curated_dataset_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_curated_dataset_versions_curated_datasets_curated_dataset_id",
                        column: x => x.curated_dataset_id,
                        principalSchema: "portal",
                        principalTable: "curated_datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curated_dataset_versions_source_samples_source_sample_id",
                        column: x => x.source_sample_id,
                        principalSchema: "portal",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "managed_files",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    file_kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    scan_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    scan_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_managed_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_managed_files_source_samples_source_sample_id",
                        column: x => x.source_sample_id,
                        principalSchema: "portal",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_dataset_grants",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    granted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    granted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revoked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_dataset_grants", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_curated_dataset_versions_curate~",
                        column: x => x.curated_dataset_version_id,
                        principalSchema: "portal",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_curated_datasets_curated_datase~",
                        column: x => x.curated_dataset_id,
                        principalSchema: "portal",
                        principalTable: "curated_datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "curated_dataset_version_files",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    managed_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    file_kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curated_dataset_version_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_curated_dataset_version_files_curated_dataset_versions_cura~",
                        column: x => x.curated_dataset_version_id,
                        principalSchema: "portal",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curated_dataset_version_files_managed_files_managed_file_id",
                        column: x => x.managed_file_id,
                        principalSchema: "portal",
                        principalTable: "managed_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dataset_download_audits",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_dataset_grant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    managed_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    downloaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    request_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    remote_address = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dataset_download_audits", x => x.id);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_curated_dataset_versions_curated_da~",
                        column: x => x.curated_dataset_version_id,
                        principalSchema: "portal",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_managed_files_managed_file_id",
                        column: x => x.managed_file_id,
                        principalSchema: "portal",
                        principalTable: "managed_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_organization_dataset_grants_organiz~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "portal",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "provisioning_runs",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    organization_dataset_grant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    failure_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    failure_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provisioning_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_curated_dataset_versions_curated_dataset_~",
                        column: x => x.curated_dataset_version_id,
                        principalSchema: "portal",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_organization_dataset_grants_organization_~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "portal",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_version_files_curated_dataset_version_id_ma~",
                schema: "portal",
                table: "curated_dataset_version_files",
                columns: new[] { "curated_dataset_version_id", "managed_file_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_version_files_managed_file_id",
                schema: "portal",
                table: "curated_dataset_version_files",
                column: "managed_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_versions_curated_dataset_id_version_number",
                schema: "portal",
                table: "curated_dataset_versions",
                columns: new[] { "curated_dataset_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_versions_source_sample_id_source_revision",
                schema: "portal",
                table: "curated_dataset_versions",
                columns: new[] { "source_sample_id", "source_revision" });

            migrationBuilder.CreateIndex(
                name: "IX_curated_datasets_eligible_version_id",
                schema: "portal",
                table: "curated_datasets",
                column: "eligible_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_curated_datasets_name",
                schema: "portal",
                table: "curated_datasets",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_curated_dataset_version_id",
                schema: "portal",
                table: "dataset_download_audits",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_downloaded_at",
                schema: "portal",
                table: "dataset_download_audits",
                column: "downloaded_at");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_managed_file_id",
                schema: "portal",
                table: "dataset_download_audits",
                column: "managed_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_dataset_grant_id",
                schema: "portal",
                table: "dataset_download_audits",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_id",
                schema: "portal",
                table: "dataset_download_audits",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_user_id",
                schema: "portal",
                table: "dataset_download_audits",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_files_source_sample_id",
                schema: "portal",
                table: "managed_files",
                column: "source_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_files_storage_key",
                schema: "portal",
                table: "managed_files",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_curated_dataset_id",
                schema: "portal",
                table: "organization_dataset_grants",
                column: "curated_dataset_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_curated_dataset_version_id",
                schema: "portal",
                table: "organization_dataset_grants",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id",
                schema: "portal",
                table: "organization_dataset_grants",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "portal",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_curated_dataset_version_id",
                schema: "portal",
                table: "provisioning_runs",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_organization_dataset_grant_id",
                schema: "portal",
                table: "provisioning_runs",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_organization_id_idempotency_key",
                schema: "portal",
                table: "provisioning_runs",
                columns: new[] { "organization_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_samples_label",
                schema: "portal",
                table: "source_samples",
                column: "label",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_samples_status",
                schema: "portal",
                table: "source_samples",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "curated_dataset_version_files",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "dataset_download_audits",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "provisioning_runs",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "managed_files",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "organization_dataset_grants",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "curated_dataset_versions",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "curated_datasets",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "source_samples",
                schema: "portal");
        }
    }
}
