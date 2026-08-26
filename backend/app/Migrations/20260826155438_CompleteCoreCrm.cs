using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class CompleteCoreCrm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "address_line1",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "address_line2",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "aliases",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");

            migrationBuilder.AddColumn<string>(
                name: "city",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "country_code",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "employee_count",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "lifecycle_state",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "postal_code",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "region",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "tags",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");

            migrationBuilder.CreateTable(
                name: "crm_contacts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    job_title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    communication_preference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    lawful_contact_basis = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    communication_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    tags = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    aliases = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    merged_into_contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_contacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_contacts_crm_contacts_merged_into_contact_id",
                        column: x => x.merged_into_contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_contacts_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_custom_field_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    record_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    data_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sensitivity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    options_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_custom_field_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crm_export_records",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    record_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    filter_json = table.Column<string>(type: "jsonb", nullable: false),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_export_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_export_records_users_requested_by_user_id",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_import_batches",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    record_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    rows_json = table.Column<string>(type: "jsonb", nullable: false),
                    total_rows = table.Column<int>(type: "integer", nullable: false),
                    valid_rows = table.Column<int>(type: "integer", nullable: false),
                    duplicate_rows = table.Column<int>(type: "integer", nullable: false),
                    invalid_rows = table.Column<int>(type: "integer", nullable: false),
                    error_report_json = table.Column<string>(type: "jsonb", nullable: true),
                    committed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_import_batches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crm_leads",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    display_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    company_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    source = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qualification_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    disqualification_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    next_action = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tags = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    converted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    converted_company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    converted_contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    converted_opportunity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_leads", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_leads_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_merge_records",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    record_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    merged_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    merged_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_merge_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_merge_records_users_merged_by_user_id",
                        column: x => x.merged_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_pipelines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_pipelines", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crm_portal_account_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    linked_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_portal_account_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_users_linked_by_user_id",
                        column: x => x.linked_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_saved_views",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    record_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    filter_json = table.Column<string>(type: "jsonb", nullable: false),
                    is_shared = table.Column<bool>(type: "boolean", nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_saved_views", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_saved_views_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_company_contacts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_role = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    is_primary_company = table.Column<bool>(type: "boolean", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_company_contacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_company_contacts_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_company_contacts_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_custom_field_values",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    value_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_custom_field_values", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_custom_field_values_crm_custom_field_definitions_defini~",
                        column: x => x.definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_custom_field_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_pipeline_stages",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    pipeline_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    probability = table.Column<int>(type: "integer", nullable: false),
                    requires_reason = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_pipeline_stages", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_pipeline_stages_crm_pipelines_pipeline_id",
                        column: x => x.pipeline_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_pipelines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_opportunities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    pipeline_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stage_id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_interest = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    probability = table.Column<int>(type: "integer", nullable: false),
                    expected_close_date = table.Column<DateOnly>(type: "date", nullable: true),
                    next_step = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    competitors = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    tags = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    outcome_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_opportunities", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_opportunities_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunities_crm_pipeline_stages_stage_id",
                        column: x => x.stage_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_pipeline_stages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunities_crm_pipelines_pipeline_id",
                        column: x => x.pipeline_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_pipelines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunities_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_activities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    visibility = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lead_id = table.Column<Guid>(type: "uuid", nullable: true),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_activities_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_activities_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_activities_crm_leads_lead_id",
                        column: x => x.lead_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_activities_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_activities_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_handoffs",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    relationship_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_handoffs", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_handoffs_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_handoffs_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_handoffs_portal_integration_requests_relationship_reque~",
                        column: x => x.relationship_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_opportunity_contacts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_opportunity_contacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_contacts_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_contacts_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_opportunity_stage_history",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_stage_id = table.Column<Guid>(type: "uuid", nullable: true),
                    to_stage_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_opportunity_stage_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_stage_history_crm_opportunities_opportunity~",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_stage_history_crm_pipeline_stages_from_stag~",
                        column: x => x.from_stage_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_pipeline_stages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_stage_history_crm_pipeline_stages_to_stage_~",
                        column: x => x.to_stage_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_pipeline_stages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_opportunity_stage_history_users_changed_by_user_id",
                        column: x => x.changed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_tasks",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    due_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reminder_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    recurrence_rule = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    blocked_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lead_id = table.Column<Guid>(type: "uuid", nullable: true),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_tasks", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_tasks_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_tasks_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_tasks_crm_leads_lead_id",
                        column: x => x.lead_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_tasks_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_tasks_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "commercial_ops",
                table: "crm_pipelines",
                columns: new[] { "id", "created_at", "created_by_user_id", "description", "is_active", "is_default", "name", "updated_at", "updated_by_user_id", "version" },
                values: new object[] { new Guid("20000000-0000-0000-0000-000000000001"), new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, "Default standalone commercial opportunity pipeline.", true, true, "General Sales", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L });

            migrationBuilder.InsertData(
                schema: "commercial_ops",
                table: "crm_pipeline_stages",
                columns: new[] { "id", "category", "created_at", "created_by_user_id", "is_active", "name", "pipeline_id", "position", "probability", "requires_reason", "updated_at", "updated_by_user_id", "version" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000011"), "Open", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Discovery", new Guid("20000000-0000-0000-0000-000000000001"), 10, 10, false, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000012"), "Open", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Qualified", new Guid("20000000-0000-0000-0000-000000000001"), 20, 25, false, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000013"), "Open", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Proposal", new Guid("20000000-0000-0000-0000-000000000001"), 30, 50, false, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000014"), "Open", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Negotiation", new Guid("20000000-0000-0000-0000-000000000001"), 40, 75, false, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000015"), "Won", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Won", new Guid("20000000-0000-0000-0000-000000000001"), 50, 100, false, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000016"), "Lost", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Lost", new Guid("20000000-0000-0000-0000-000000000001"), 60, 0, true, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L },
                    { new Guid("20000000-0000-0000-0000-000000000017"), "Abandoned", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Abandoned", new Guid("20000000-0000-0000-0000-000000000001"), 70, 0, true, new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L }
                });

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_lifecycle_state",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "lifecycle_state");

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "merged_into_company_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_actor_user_id",
                schema: "commercial_ops",
                table: "crm_activities",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_company_id_occurred_at",
                schema: "commercial_ops",
                table: "crm_activities",
                columns: new[] { "company_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_contact_id_occurred_at",
                schema: "commercial_ops",
                table: "crm_activities",
                columns: new[] { "contact_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_lead_id_occurred_at",
                schema: "commercial_ops",
                table: "crm_activities",
                columns: new[] { "lead_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_occurred_at",
                schema: "commercial_ops",
                table: "crm_activities",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "IX_crm_activities_opportunity_id_occurred_at",
                schema: "commercial_ops",
                table: "crm_activities",
                columns: new[] { "opportunity_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "company_id", "contact_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_contact_id_is_primary_company",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "contact_id", "is_primary_company" },
                unique: true,
                filter: "is_active = TRUE AND is_primary_company = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contacts_is_active_last_name",
                schema: "commercial_ops",
                table: "crm_contacts",
                columns: new[] { "is_active", "last_name" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_contacts_last_name_first_name",
                schema: "commercial_ops",
                table: "crm_contacts",
                columns: new[] { "last_name", "first_name" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_contacts_merged_into_contact_id",
                schema: "commercial_ops",
                table: "crm_contacts",
                column: "merged_into_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contacts_normalized_email",
                schema: "commercial_ops",
                table: "crm_contacts",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contacts_owner_user_id",
                schema: "commercial_ops",
                table: "crm_contacts",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_custom_field_definitions_record_type_name",
                schema: "commercial_ops",
                table: "crm_custom_field_definitions",
                columns: new[] { "record_type", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_custom_field_values_definition_id_record_id",
                schema: "commercial_ops",
                table: "crm_custom_field_values",
                columns: new[] { "definition_id", "record_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_export_records_requested_at",
                schema: "commercial_ops",
                table: "crm_export_records",
                column: "requested_at");

            migrationBuilder.CreateIndex(
                name: "IX_crm_export_records_requested_by_user_id",
                schema: "commercial_ops",
                table: "crm_export_records",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_handoffs_company_id",
                schema: "commercial_ops",
                table: "crm_handoffs",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_handoffs_idempotency_key",
                schema: "commercial_ops",
                table: "crm_handoffs",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_handoffs_opportunity_id",
                schema: "commercial_ops",
                table: "crm_handoffs",
                column: "opportunity_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_handoffs_relationship_request_id",
                schema: "commercial_ops",
                table: "crm_handoffs",
                column: "relationship_request_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_import_batches_idempotency_key",
                schema: "commercial_ops",
                table: "crm_import_batches",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_leads_company_name",
                schema: "commercial_ops",
                table: "crm_leads",
                column: "company_name");

            migrationBuilder.CreateIndex(
                name: "IX_crm_leads_is_active_status",
                schema: "commercial_ops",
                table: "crm_leads",
                columns: new[] { "is_active", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_leads_normalized_email",
                schema: "commercial_ops",
                table: "crm_leads",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "IX_crm_leads_owner_user_id",
                schema: "commercial_ops",
                table: "crm_leads",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_merge_records_merged_by_user_id",
                schema: "commercial_ops",
                table: "crm_merge_records",
                column: "merged_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_merge_records_record_type_source_record_id",
                schema: "commercial_ops",
                table: "crm_merge_records",
                columns: new[] { "record_type", "source_record_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_company_id_is_active",
                schema: "commercial_ops",
                table: "crm_opportunities",
                columns: new[] { "company_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_expected_close_date",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "expected_close_date");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_owner_user_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_pipeline_id_stage_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                columns: new[] { "pipeline_id", "stage_id" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_stage_id",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "stage_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_contacts_contact_id",
                schema: "commercial_ops",
                table: "crm_opportunity_contacts",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_contacts_opportunity_id_contact_id",
                schema: "commercial_ops",
                table: "crm_opportunity_contacts",
                columns: new[] { "opportunity_id", "contact_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_contacts_opportunity_id_is_primary",
                schema: "commercial_ops",
                table: "crm_opportunity_contacts",
                columns: new[] { "opportunity_id", "is_primary" },
                unique: true,
                filter: "is_primary = TRUE AND is_active = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_stage_history_changed_by_user_id",
                schema: "commercial_ops",
                table: "crm_opportunity_stage_history",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_stage_history_from_stage_id",
                schema: "commercial_ops",
                table: "crm_opportunity_stage_history",
                column: "from_stage_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_stage_history_opportunity_id_changed_at",
                schema: "commercial_ops",
                table: "crm_opportunity_stage_history",
                columns: new[] { "opportunity_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunity_stage_history_to_stage_id",
                schema: "commercial_ops",
                table: "crm_opportunity_stage_history",
                column: "to_stage_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_pipeline_stages_pipeline_id_name",
                schema: "commercial_ops",
                table: "crm_pipeline_stages",
                columns: new[] { "pipeline_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_pipeline_stages_pipeline_id_position",
                schema: "commercial_ops",
                table: "crm_pipeline_stages",
                columns: new[] { "pipeline_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_pipelines_is_default",
                schema: "commercial_ops",
                table: "crm_pipelines",
                column: "is_default",
                unique: true,
                filter: "is_default = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_pipelines_name",
                schema: "commercial_ops",
                table: "crm_pipelines",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_company_id_organization_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                columns: new[] { "company_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_linked_by_user_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                column: "linked_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_organization_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_saved_views_owner_user_id_record_type_name",
                schema: "commercial_ops",
                table: "crm_saved_views",
                columns: new[] { "owner_user_id", "record_type", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_company_id",
                schema: "commercial_ops",
                table: "crm_tasks",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_contact_id",
                schema: "commercial_ops",
                table: "crm_tasks",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_lead_id",
                schema: "commercial_ops",
                table: "crm_tasks",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_opportunity_id",
                schema: "commercial_ops",
                table: "crm_tasks",
                column: "opportunity_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_owner_user_id_status_due_at",
                schema: "commercial_ops",
                table: "crm_tasks",
                columns: new[] { "owner_user_id", "status", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_tasks_reminder_at",
                schema: "commercial_ops",
                table: "crm_tasks",
                column: "reminder_at");

            migrationBuilder.AddForeignKey(
                name: "FK_crm_companies_crm_companies_merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "merged_into_company_id",
                principalSchema: "commercial_ops",
                principalTable: "crm_companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_crm_companies_crm_companies_merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropTable(
                name: "crm_activities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_company_contacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_custom_field_values",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_export_records",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_handoffs",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_import_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_merge_records",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_opportunity_contacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_opportunity_stage_history",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_portal_account_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_saved_views",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_tasks",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_custom_field_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_contacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_leads",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_opportunities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_pipeline_stages",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_pipelines",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_crm_companies_lifecycle_state",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropIndex(
                name: "IX_crm_companies_merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "address_line1",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "address_line2",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "aliases",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "city",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "country_code",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "employee_count",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "lifecycle_state",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "merged_into_company_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "postal_code",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "region",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "source",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "tags",
                schema: "commercial_ops",
                table: "crm_companies");
        }
    }
}
