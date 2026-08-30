using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ClosePSeqOrderToCashGaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_portal_readiness_manually_blocked",
                schema: "commercial_ops",
                table: "organizations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "approved_tax_rate",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_address_json",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_contact_email",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_contact_name",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "p_seq_billing_configuration_version",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "p_seq_tax_decision",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_terms_days",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "tax_approval_notes",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "tax_approved_at_utc",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "tax_approved_by_user_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tax_exemption_evidence_reference",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "billing_configuration_version_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_terms_days_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tax_decision_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "tax_rate_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "activated_at_utc",
                schema: "lab_ops",
                table: "lab_protocol_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "activated_by_user_id",
                schema: "lab_ops",
                table: "lab_protocol_versions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "attention_items",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    owner_role = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_action = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    first_observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    resolved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attention_items", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "business_role_assignments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_role_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_business_role_assignments_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "business_role_invitation_intents",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_invitation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_role_invitation_intents", x => x.id);
                    table.ForeignKey(
                        name: "FK_business_role_invitation_intents_organization_invitations_o~",
                        column: x => x.organization_invitation_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_invitations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dual_control_observations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    control_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conflicting_actor_ids_json = table.Column<string>(type: "jsonb", nullable: false),
                    mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    was_blocked = table.Column<bool>(type: "boolean", nullable: false),
                    observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dual_control_observations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "external_payment_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_object_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_object_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    local_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_external_payment_links", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "invitation_delivery_attempts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_invitation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipient_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    protected_payload = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    maximum_attempts = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lease_expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    provider_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    delivered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    bounced_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    bounce_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    accepted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitation_delivery_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_invitation_delivery_attempts_organization_invitations_organ~",
                        column: x => x.organization_invitation_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_invitations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invitation_delivery_attempts_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invitation_provider_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_event_identity = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    provider_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    provider_occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitation_provider_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "invoices",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    accepted_quote_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    adjustment_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    billing_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    issued_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoices_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoices_lab_service_quotes_accepted_quote_id",
                        column: x => x.accepted_quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoices_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_import_batches",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    preview_rows_json = table.Column<string>(type: "jsonb", nullable: false),
                    validation_errors_json = table.Column<string>(type: "jsonb", nullable: false),
                    valid_row_count = table.Column<int>(type: "integer", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_cash_operator_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_import_batches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payment_receipts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    receipt_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    payer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    unapplied_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    method = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    bank_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    evidence_reference = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    external_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    memo = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reversed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reversed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reversal_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_receipts_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_batches",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    period_start_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_end_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expected_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    reconciled_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    difference = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    prepared_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    included_activity_actor_ids_json = table.Column<string>(type: "jsonb", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    closeout_report_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    closeout_report_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reconciliation_batches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "result_output_packages",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    package_version = table.Column<int>(type: "integer", nullable: false),
                    corrects_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    pipeline_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    pipeline_version = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    manifest_identity = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    manifest_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    storage_provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    storage_object_prefix = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    failure_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    scientific_approval_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scientifically_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scientifically_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    released_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    withdrawn_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    withdrawn_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    withdrawal_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_result_output_packages", x => x.id);
                    table.ForeignKey(
                        name: "FK_result_output_packages_lab_samples_lab_sample_id",
                        column: x => x.lab_sample_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_output_packages_lab_service_orders_lab_service_order~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_output_packages_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_output_packages_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_output_packages_result_output_packages_corrects_pack~",
                        column: x => x.corrects_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invoice_adjustments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_adjustments", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_adjustments_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invoice_documents",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    storage_object_key = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    generated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_documents_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invoice_lines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    line_number = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    source_snapshot_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_lines_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_allocations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_receipt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    allocated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allocated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reversed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reversed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reversal_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_allocations", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_allocations_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_allocations_payment_receipts_payment_receipt_id",
                        column: x => x.payment_receipt_id,
                        principalSchema: "commercial_ops",
                        principalTable: "payment_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "result_artifacts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    artifact_identity = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    media_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    storage_object_key = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    scan_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    scan_details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    registered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    scanned_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_result_artifacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_result_artifacts_result_output_packages_result_output_packa~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "result_delivery_evidence",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    evidence_json = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_result_delivery_evidence", x => x.id);
                    table.ForeignKey(
                        name: "FK_result_delivery_evidence_result_output_packages_result_outp~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attention_items_category_source_type_source_id",
                schema: "commercial_ops",
                table: "attention_items",
                columns: new[] { "category", "source_type", "source_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attention_items_owner_role_status_first_observed_at_utc",
                schema: "commercial_ops",
                table: "attention_items",
                columns: new[] { "owner_role", "status", "first_observed_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_business_role_assignments_user_id_role",
                schema: "commercial_ops",
                table: "business_role_assignments",
                columns: new[] { "user_id", "role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_business_role_invitation_intents_organization_invitation_id~",
                schema: "commercial_ops",
                table: "business_role_invitation_intents",
                columns: new[] { "organization_invitation_id", "role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dual_control_observations_control_code_workflow_type_workfl~",
                schema: "commercial_ops",
                table: "dual_control_observations",
                columns: new[] { "control_code", "workflow_type", "workflow_id" });

            migrationBuilder.CreateIndex(
                name: "IX_external_payment_links_provider_key_external_object_type_ex~",
                schema: "commercial_ops",
                table: "external_payment_links",
                columns: new[] { "provider_key", "external_object_type", "external_object_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitation_delivery_attempts_organization_id",
                schema: "commercial_ops",
                table: "invitation_delivery_attempts",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_delivery_attempts_organization_invitation_id",
                schema: "commercial_ops",
                table: "invitation_delivery_attempts",
                column: "organization_invitation_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_delivery_attempts_provider_message_id",
                schema: "commercial_ops",
                table: "invitation_delivery_attempts",
                column: "provider_message_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_delivery_attempts_state_next_attempt_at_utc",
                schema: "commercial_ops",
                table: "invitation_delivery_attempts",
                columns: new[] { "state", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_invitation_provider_events_provider_event_identity",
                schema: "commercial_ops",
                table: "invitation_provider_events",
                column: "provider_event_identity",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitation_provider_events_provider_message_id",
                schema: "commercial_ops",
                table: "invitation_provider_events",
                column: "provider_message_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_adjustments_invoice_id_recorded_at_utc",
                schema: "commercial_ops",
                table: "invoice_adjustments",
                columns: new[] { "invoice_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_invoice_documents_invoice_id",
                schema: "commercial_ops",
                table: "invoice_documents",
                column: "invoice_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_documents_storage_object_key",
                schema: "commercial_ops",
                table: "invoice_documents",
                column: "storage_object_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_lines_invoice_id_line_number",
                schema: "commercial_ops",
                table: "invoice_lines",
                columns: new[] { "invoice_id", "line_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_accepted_quote_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "accepted_quote_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_invoice_number",
                schema: "commercial_ops",
                table: "invoices",
                column: "invoice_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_lab_service_order_id",
                schema: "commercial_ops",
                table: "invoices",
                column: "lab_service_order_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_organization_id_status_due_at_utc",
                schema: "commercial_ops",
                table: "invoices",
                columns: new[] { "organization_id", "status", "due_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_invoice_id",
                schema: "commercial_ops",
                table: "payment_allocations",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_payment_receipt_id",
                schema: "commercial_ops",
                table: "payment_allocations",
                column: "payment_receipt_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_import_batches_source_file_sha256",
                schema: "commercial_ops",
                table: "payment_import_batches",
                columns: new[] { "source", "file_sha256" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_external_id",
                schema: "commercial_ops",
                table: "payment_receipts",
                column: "external_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_organization_id_status_received_at_utc",
                schema: "commercial_ops",
                table: "payment_receipts",
                columns: new[] { "organization_id", "status", "received_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_receipt_number",
                schema: "commercial_ops",
                table: "payment_receipts",
                column: "receipt_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_batches_batch_number",
                schema: "commercial_ops",
                table: "reconciliation_batches",
                column: "batch_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_batches_status_period_end_utc",
                schema: "commercial_ops",
                table: "reconciliation_batches",
                columns: new[] { "status", "period_end_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_result_artifacts_result_output_package_id_artifact_identity",
                schema: "commercial_ops",
                table: "result_artifacts",
                columns: new[] { "result_output_package_id", "artifact_identity" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_artifacts_storage_object_key",
                schema: "commercial_ops",
                table: "result_artifacts",
                column: "storage_object_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_delivery_evidence_result_output_package_id_occurred_~",
                schema: "commercial_ops",
                table: "result_delivery_evidence",
                columns: new[] { "result_output_package_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_corrects_package_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "corrects_package_id");

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_lab_sample_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "lab_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_lab_service_order_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "lab_service_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_lab_work_order_id_lab_sample_id_pack~",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "lab_work_order_id", "lab_sample_id", "package_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_organization_id_status",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_pipeline_name_manifest_identity",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "pipeline_name", "manifest_identity" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attention_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "business_role_assignments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "business_role_invitation_intents",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "dual_control_observations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "external_payment_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invitation_delivery_attempts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invitation_provider_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoice_adjustments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoice_documents",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoice_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_allocations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_import_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reconciliation_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_artifacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_delivery_evidence",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoices",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_receipts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_output_packages",
                schema: "commercial_ops");

            migrationBuilder.DropColumn(
                name: "is_portal_readiness_manually_blocked",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "approved_tax_rate",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "billing_address_json",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "billing_contact_email",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "billing_contact_name",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "p_seq_billing_configuration_version",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "p_seq_tax_decision",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "payment_terms_days",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_approval_notes",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_approved_at_utc",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_approved_by_user_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_exemption_evidence_reference",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "billing_configuration_version_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "billing_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "payment_terms_days_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "tax_decision_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "tax_rate_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "activated_at_utc",
                schema: "lab_ops",
                table: "lab_protocol_versions");

            migrationBuilder.DropColumn(
                name: "activated_by_user_id",
                schema: "lab_ops",
                table: "lab_protocol_versions");
        }
    }
}
