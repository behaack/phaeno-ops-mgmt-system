using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConfiguredLabAndPartnerKitBundles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_kit_bundle",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "included_assembly_profile_snapshot_json",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "included_assembly_profile_version",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "included_offering_version",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "completed_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "expected_completion_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "has_timing_override",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "maximum_turnaround_days",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "minimum_turnaround_days",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "original_target_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "accepted_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "completed_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "original_target_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "configured_commercial_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entry_mode",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "ManualQuote");

            migrationBuilder.AddColumn<Guid>(
                name: "lab_service_offering_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "kit_assembly_case_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "kit_profile_snapshot_json",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "commercial_sale_summaries",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    committed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    commitment_actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expected_completion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    schedule_health = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    projected_revision = table.Column<int>(type: "integer", nullable: false),
                    projected_activity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    failure_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commercial_sale_summaries", x => x.id);
                    table.ForeignKey(
                        name: "FK_commercial_sale_summaries_crm_activities_projected_activity~",
                        column: x => x.projected_activity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_activities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commercial_sale_summaries_crm_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_opportunities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commercial_sale_summaries_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commercial_sale_summaries_users_commitment_actor_user_id",
                        column: x => x.commitment_actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_offerings",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    family_id = table.Column<Guid>(type: "uuid", nullable: false),
                    offering_version = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    analysis_ids_json = table.Column<string>(type: "jsonb", nullable: false),
                    allowed_material_types_json = table.Column<string>(type: "jsonb", nullable: false),
                    allowed_biological_sources_json = table.Column<string>(type: "jsonb", nullable: false),
                    included_output_contract = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    minimum_turnaround_days = table.Column<int>(type: "integer", nullable: false),
                    maximum_turnaround_days = table.Column<int>(type: "integer", nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_synthetic = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_offerings", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_offerings_qbo_catalog_items_catalog_item_id",
                        column: x => x.catalog_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_timing_changes",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_expected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_safe_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    timing_changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notification_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_timing_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_timing_changes_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_work_timing_changes_order_notifications_notification_id",
                        column: x => x.notification_id,
                        principalSchema: "commercial_ops",
                        principalTable: "order_notifications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_work_timing_changes_users_timing_changed_by_user_id",
                        column: x => x.timing_changed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_kit_units",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_line_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    reagent_shipment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    replaces_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    replaced_by_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    shipped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    lot_batch_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_kit_units", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_partner_kit_units_replaced_by_kit_unit_id",
                        column: x => x.replaced_by_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_partner_kit_units_replaces_kit_unit_id",
                        column: x => x.replaces_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_partner_reagent_order_lines_partner_reage~",
                        column: x => x.partner_reagent_order_line_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_order_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_partner_reagent_orders_partner_reagent_or~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_reagent_shipments_reagent_shipment_id",
                        column: x => x.reagent_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "reagent_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_units_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "kit_assembly_cases",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assembly_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    case_number = table.Column<string>(type: "character varying(105)", maxLength: 105, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    submission_deadline_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deadline_basis = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    billing_shipment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    billing_document_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assembly_request_id = table.Column<Guid>(type: "uuid", nullable: true),
                    first_submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kit_assembly_cases", x => x.id);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_assembly_profiles_assembly_profile_id",
                        column: x => x.assembly_profile_id,
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_commercial_document_links_billing_docume~",
                        column: x => x.billing_document_id,
                        principalSchema: "commercial_ops",
                        principalTable: "commercial_document_links",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_data_assembly_requests_assembly_request_~",
                        column: x => x.assembly_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "data_assembly_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_partner_kit_units_current_kit_unit_id",
                        column: x => x.current_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_partner_kit_units_original_kit_unit_id",
                        column: x => x.original_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_partner_reagent_orders_partner_reagent_o~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_reagent_shipments_billing_shipment_id",
                        column: x => x.billing_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "reagent_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_assembly_cases_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "kit_case_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_assembly_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    previous_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    current_kit_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    previous_deadline_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    current_deadline_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kit_case_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_kit_case_events_kit_assembly_cases_kit_assembly_case_id",
                        column: x => x.kit_assembly_case_id,
                        principalSchema: "commercial_ops",
                        principalTable: "kit_assembly_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_case_events_partner_kit_units_current_kit_unit_id",
                        column: x => x.current_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_case_events_partner_kit_units_previous_kit_unit_id",
                        column: x => x.previous_kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_kit_case_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "included_assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                column: "included_assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_lab_service_offering_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "lab_service_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_kit_assembly_case_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "kit_assembly_case_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_commitment_actor_user_id",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                column: "commitment_actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_opportunity_id",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                column: "opportunity_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_organization_id",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_projected_activity_id",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                column: "projected_activity_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_projected_revision_next_attempt_a~",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                columns: new[] { "projected_revision", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_commercial_sale_summaries_workflow_type_order_id",
                schema: "commercial_ops",
                table: "commercial_sale_summaries",
                columns: new[] { "workflow_type", "order_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_assembly_profile_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_assembly_request_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "assembly_request_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_billing_document_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "billing_document_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_billing_shipment_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "billing_shipment_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_case_number",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "case_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_created_by_user_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_current_kit_unit_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "current_kit_unit_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_department_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_organization_id_department_id_partner_re~",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                columns: new[] { "organization_id", "department_id", "partner_reagent_order_id" });

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_original_kit_unit_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "original_kit_unit_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_partner_reagent_order_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "partner_reagent_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_status_submission_deadline_at",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                columns: new[] { "status", "submission_deadline_at" });

            migrationBuilder.CreateIndex(
                name: "IX_kit_assembly_cases_updated_by_user_id",
                schema: "commercial_ops",
                table: "kit_assembly_cases",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_case_events_actor_user_id",
                schema: "commercial_ops",
                table: "kit_case_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_case_events_current_kit_unit_id",
                schema: "commercial_ops",
                table: "kit_case_events",
                column: "current_kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_kit_case_events_kit_assembly_case_id_at",
                schema: "commercial_ops",
                table: "kit_case_events",
                columns: new[] { "kit_assembly_case_id", "at" });

            migrationBuilder.CreateIndex(
                name: "IX_kit_case_events_previous_kit_unit_id",
                schema: "commercial_ops",
                table: "kit_case_events",
                column: "previous_kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                column: "catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_family_id_offering_version",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                columns: new[] { "family_id", "offering_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_timing_changes_lab_work_order_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_work_timing_changes",
                columns: new[] { "lab_work_order_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_timing_changes_notification_id",
                schema: "lab_ops",
                table: "lab_work_timing_changes",
                column: "notification_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_timing_changes_timing_changed_by_user_id",
                schema: "lab_ops",
                table: "lab_work_timing_changes",
                column: "timing_changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_created_by_user_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_department_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_label",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "label",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_organization_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_partner_reagent_order_id_partner_reagent_~",
                schema: "commercial_ops",
                table: "partner_kit_units",
                columns: new[] { "partner_reagent_order_id", "partner_reagent_order_line_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_partner_reagent_order_line_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "partner_reagent_order_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_reagent_shipment_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "reagent_shipment_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_replaced_by_kit_unit_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "replaced_by_kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_replaces_kit_unit_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "replaces_kit_unit_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_updated_by_user_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_input_revisions_partner_kit_units_kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_unit_id",
                principalSchema: "commercial_ops",
                principalTable: "partner_kit_units",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_data_assembly_requests_kit_assembly_cases_kit_assembly_case~",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "kit_assembly_case_id",
                principalSchema: "commercial_ops",
                principalTable: "kit_assembly_cases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_lab_service_offerings_lab_service_offeri~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "lab_service_offering_id",
                principalSchema: "commercial_ops",
                principalTable: "lab_service_offerings",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_reagent_offerings_assembly_profiles_included_assemb~",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                column: "included_assembly_profile_id",
                principalSchema: "commercial_ops",
                principalTable: "assembly_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_reagent_order_lines_assembly_profiles_included_asse~",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "included_assembly_profile_id",
                principalSchema: "commercial_ops",
                principalTable: "assembly_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assembly_input_revisions_partner_kit_units_kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropForeignKey(
                name: "FK_data_assembly_requests_kit_assembly_cases_kit_assembly_case~",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_lab_service_offerings_lab_service_offeri~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_offerings_assembly_profiles_included_assemb~",
                schema: "commercial_ops",
                table: "partner_reagent_offerings");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_order_lines_assembly_profiles_included_asse~",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropTable(
                name: "commercial_sale_summaries",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "kit_case_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_offerings",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_work_timing_changes",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "kit_assembly_cases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_kit_units",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_order_lines_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_offerings_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_lab_service_offering_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_data_assembly_requests_kit_assembly_case_id",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropIndex(
                name: "IX_assembly_input_revisions_kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropColumn(
                name: "is_kit_bundle",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropColumn(
                name: "included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropColumn(
                name: "included_assembly_profile_snapshot_json",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropColumn(
                name: "included_assembly_profile_version",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropColumn(
                name: "included_offering_version",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropColumn(
                name: "included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings");

            migrationBuilder.DropColumn(
                name: "completed_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "expected_completion_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "has_timing_override",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "maximum_turnaround_days",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "minimum_turnaround_days",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "original_target_at_utc",
                schema: "lab_ops",
                table: "lab_work_orders");

            migrationBuilder.DropColumn(
                name: "accepted_at_utc",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "completed_at_utc",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "original_target_at_utc",
                schema: "lab_ops",
                table: "lab_specimens");

            migrationBuilder.DropColumn(
                name: "configured_commercial_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "entry_mode",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "lab_service_offering_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "kit_assembly_case_id",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropColumn(
                name: "kit_profile_snapshot_json",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropColumn(
                name: "kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");
        }
    }
}
