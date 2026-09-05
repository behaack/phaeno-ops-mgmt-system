using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrialProjectIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_released_retention_snapshot_one_package",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.AlterColumn<Guid>(
                name: "lab_service_order_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "lab_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "trial_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "trial_result_release_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trial_approval_authorities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    primary_authority_id = table.Column<Guid>(type: "uuid", nullable: true),
                    designated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    effective_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    revoked_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revoked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_approval_authorities", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_trial_approval_authorities_prima~",
                        column: x => x.primary_authority_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_approval_authorities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_users_designated_by_user_id",
                        column: x => x.designated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_users_revoked_by_user_id",
                        column: x => x.revoked_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_approval_authorities_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_deliverable_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    name = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_deliverable_definitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_deliverable_definitions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_deliverable_definitions_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_decisions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_scope_id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authority_id = table.Column<Guid>(type: "uuid", nullable: false),
                    as_delegate = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    decided_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_decisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_decisions_trial_approval_authorities_authority_id",
                        column: x => x.authority_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_approval_authorities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_decisions_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    summary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    internal_details_json = table.Column<string>(type: "jsonb", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_projects",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    number = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    crm_handoff_id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    current_scope_revision = table.Column<int>(type: "integer", nullable: false),
                    approved_scope_revision = table.Column<int>(type: "integer", nullable: true),
                    accepted_scope_revision = table.Column<int>(type: "integer", nullable: true),
                    accepted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_terms_version = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_on_hold = table.Column<bool>(type: "boolean", nullable: false),
                    hold_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    schedule_estimate = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    closure_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    residual_retain_until_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    actual_material_disposition = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    material_disposed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    material_disposed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    commercial_outcome = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    commercial_outcome_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    follow_up_owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    follow_up_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    complete_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_projects", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_projects_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_crm_handoffs_crm_handoff_id",
                        column: x => x.crm_handoff_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_handoffs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_accepted_by_user_id",
                        column: x => x.accepted_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_follow_up_owner_user_id",
                        column: x => x.follow_up_owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_material_disposed_by_user_id",
                        column: x => x.material_disposed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_sales_owner_user_id",
                        column: x => x.sales_owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_projects_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_result_releases",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    release_version = table.Column<int>(type: "integer", nullable: false),
                    scope_revision = table.Column<int>(type: "integer", nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    is_complete_package = table.Column<bool>(type: "boolean", nullable: false),
                    released_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_withdrawn = table.Column<bool>(type: "boolean", nullable: false),
                    withdrawal_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    supersedes_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_result_releases", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_trial_projects_trial_project_id",
                        column: x => x.trial_project_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_trial_result_releases_supersedes_rele~",
                        column: x => x.supersedes_release_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_result_releases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_users_released_by_user_id",
                        column: x => x.released_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_releases_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_scopes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    values_json = table.Column<string>(type: "jsonb", nullable: false),
                    amendment_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    proposed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    proposed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_scopes", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_scopes_trial_projects_trial_project_id",
                        column: x => x.trial_project_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_scopes_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_scopes_users_proposed_by_user_id",
                        column: x => x.proposed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_scopes_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_replacement_authorizations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    phaeno_caused_failure = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_by_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_replacement_authorizations", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_replacement_authorizations_trial_projects_trial_proje~",
                        column: x => x.trial_project_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_replacement_authorizations_users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_replacement_authorizations_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_replacement_authorizations_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_samples",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope_revision = table.Column<int>(type: "integer", nullable: false),
                    reference = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    biological_source = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    tube_count = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    concentration = table.Column<decimal>(type: "numeric", nullable: true),
                    storage_requirements = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    safety_declaration = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    inputs_json = table.Column<string>(type: "jsonb", nullable: false),
                    replaces_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    replacement_authorization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    outcome_reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_samples", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_samples_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_trial_projects_trial_project_id",
                        column: x => x.trial_project_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_trial_replacement_authorizations_replacement_~",
                        column: x => x.replacement_authorization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_replacement_authorizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_trial_samples_replaces_sample_id",
                        column: x => x.replaces_sample_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_samples_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trial_result_files",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trial_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_artifact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    managed_operational_file_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_result_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_result_files_managed_operational_files_managed_operat~",
                        column: x => x.managed_operational_file_id,
                        principalSchema: "commercial_ops",
                        principalTable: "managed_operational_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_files_result_artifacts_result_artifact_id",
                        column: x => x.result_artifact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_artifacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_files_result_output_packages_result_output_pac~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_result_files_trial_samples_trial_sample_id",
                        column: x => x.trial_sample_id,
                        principalSchema: "commercial_ops",
                        principalTable: "trial_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "commercial_ops",
                table: "trial_deliverable_definitions",
                columns: new[] { "id", "created_at", "created_by_user_id", "is_active", "is_default", "key", "name", "revision", "updated_at", "updated_by_user_id", "version" },
                values: new object[,]
                {
                    { new Guid("87c083a2-8039-4d9a-9b61-4ec577e1a001"), new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, true, true, "FASTQ", "FASTQ sequencing reads", 1, new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("87c083a2-8039-4d9a-9b61-4ec577e1a002"), new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, true, true, "FASTA", "FASTA sequences", 1, new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("87c083a2-8039-4d9a-9b61-4ec577e1a003"), new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, true, true, "BAM", "BAM alignments", 1, new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L }
                });

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "trial_project_id");

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_trial_sample_id_package_version",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "trial_sample_id", "package_version" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_result_output_package_parent",
                schema: "commercial_ops",
                table: "result_output_packages",
                sql: "(lab_service_order_id IS NOT NULL AND lab_sample_id IS NOT NULL AND trial_project_id IS NULL AND trial_sample_id IS NULL) OR (lab_service_order_id IS NULL AND lab_sample_id IS NULL AND trial_project_id IS NOT NULL AND trial_sample_id IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_trial_result_relea~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "trial_result_release_id",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_released_retention_snapshot_one_package",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                sql: "num_nonnulls(lab_result_release_id, assembly_output_release_id, trial_result_release_id) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_designated_by_user_id",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "designated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_domain",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "domain",
                unique: true,
                filter: "is_primary AND revoked_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_primary_authority_id",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "primary_authority_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_revoked_by_user_id",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "revoked_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_approval_authorities_user_id_domain",
                schema: "commercial_ops",
                table: "trial_approval_authorities",
                columns: new[] { "user_id", "domain" },
                unique: true,
                filter: "revoked_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_trial_decisions_actor_user_id",
                schema: "commercial_ops",
                table: "trial_decisions",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_decisions_authority_id",
                schema: "commercial_ops",
                table: "trial_decisions",
                column: "authority_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_decisions_trial_scope_id_domain",
                schema: "commercial_ops",
                table: "trial_decisions",
                columns: new[] { "trial_scope_id", "domain" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_deliverable_definitions_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_deliverable_definitions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_deliverable_definitions_key",
                schema: "commercial_ops",
                table: "trial_deliverable_definitions",
                column: "key",
                unique: true,
                filter: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_trial_deliverable_definitions_key_revision",
                schema: "commercial_ops",
                table: "trial_deliverable_definitions",
                columns: new[] { "key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_deliverable_definitions_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_deliverable_definitions",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_events_actor_user_id",
                schema: "commercial_ops",
                table: "trial_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_events_trial_project_id_occurred_at_utc",
                schema: "commercial_ops",
                table: "trial_events",
                columns: new[] { "trial_project_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_accepted_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "accepted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_company_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_complete_release_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "complete_release_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_crm_handoff_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "crm_handoff_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_department_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_follow_up_owner_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "follow_up_owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_material_disposed_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "material_disposed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_number",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_opportunity_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "opportunity_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_organization_id_department_id_status",
                schema: "commercial_ops",
                table: "trial_projects",
                columns: new[] { "organization_id", "department_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_sales_owner_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "sales_owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_projects_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_approved_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_original_sample_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "original_sample_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_trial_project_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "trial_project_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_replacement_authorizations_used_by_sample_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "used_by_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_files_managed_operational_file_id",
                schema: "commercial_ops",
                table: "trial_result_files",
                column: "managed_operational_file_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_files_result_artifact_id",
                schema: "commercial_ops",
                table: "trial_result_files",
                column: "result_artifact_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_files_result_output_package_id",
                schema: "commercial_ops",
                table: "trial_result_files",
                column: "result_output_package_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_files_trial_sample_id",
                schema: "commercial_ops",
                table: "trial_result_files",
                column: "trial_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_department_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_organization_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_released_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "released_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_supersedes_release_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "supersedes_release_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_trial_project_id_release_version",
                schema: "commercial_ops",
                table: "trial_result_releases",
                columns: new[] { "trial_project_id", "release_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_result_releases_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_authorization_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "authorization_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_lab_work_order_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_replacement_authorization_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "replacement_authorization_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_replaces_sample_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "replaces_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_submitted_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_trial_project_id_reference",
                schema: "commercial_ops",
                table: "trial_samples",
                columns: new[] { "trial_project_id", "reference" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_samples_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_scopes_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_scopes",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_scopes_proposed_by_user_id",
                schema: "commercial_ops",
                table: "trial_scopes",
                column: "proposed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_scopes_trial_project_id_revision",
                schema: "commercial_ops",
                table: "trial_scopes",
                columns: new[] { "trial_project_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trial_scopes_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_scopes",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_retention_snapshots_trial_result_relea~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "trial_result_release_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_result_releases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_result_output_packages_trial_projects_trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "trial_project_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_result_output_packages_trial_samples_trial_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "trial_sample_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_samples",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_trial_decisions_trial_scopes_trial_scope_id",
                schema: "commercial_ops",
                table: "trial_decisions",
                column: "trial_scope_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_scopes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_trial_events_trial_projects_trial_project_id",
                schema: "commercial_ops",
                table: "trial_events",
                column: "trial_project_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_trial_projects_trial_result_releases_complete_release_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "complete_release_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_result_releases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_trial_replacement_authorizations_trial_samples_original_sam~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "original_sample_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_samples",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_trial_replacement_authorizations_trial_samples_used_by_samp~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations",
                column: "used_by_sample_id",
                principalSchema: "commercial_ops",
                principalTable: "trial_samples",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_released_deliverable_retention_snapshots_trial_result_relea~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropForeignKey(
                name: "FK_result_output_packages_trial_projects_trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropForeignKey(
                name: "FK_result_output_packages_trial_samples_trial_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_trial_projects_trial_proje~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_trial_projects_trial_project_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_samples_trial_projects_trial_project_id",
                schema: "commercial_ops",
                table: "trial_samples");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_trial_samples_original_sam~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_trial_samples_used_by_samp~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropTable(
                name: "trial_decisions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_deliverable_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_result_files",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_approval_authorities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_scopes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_projects",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_result_releases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_samples",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_replacement_authorizations",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_result_output_packages_trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropIndex(
                name: "IX_result_output_packages_trial_sample_id_package_version",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropCheckConstraint(
                name: "ck_result_output_package_parent",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropIndex(
                name: "IX_released_deliverable_retention_snapshots_trial_result_relea~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropCheckConstraint(
                name: "ck_released_retention_snapshot_one_package",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "trial_project_id",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropColumn(
                name: "trial_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages");

            migrationBuilder.DropColumn(
                name: "trial_result_release_id",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.AlterColumn<Guid>(
                name: "lab_service_order_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "lab_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_released_retention_snapshot_one_package",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                sql: "(lab_result_release_id IS NOT NULL AND assembly_output_release_id IS NULL) OR (lab_result_release_id IS NULL AND assembly_output_release_id IS NOT NULL)");
        }
    }
}
