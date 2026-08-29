using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPSeqOrderToCashGapClosure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_operational_readiness_blocked",
                schema: "commercial_ops",
                table: "organizations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "operational_readiness_block_reason",
                schema: "commercial_ops",
                table: "organizations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "approved_tax_rate",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "numeric(12,6)",
                precision: 12,
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
                name: "configuration_version",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "finance_approval_notes",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "finance_approved_at_utc",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "finance_approved_by_user_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_terms_days",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "tax_decision",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tax_exemption_evidence",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_destination_configuration_json",
                schema: "commercial_ops",
                table: "order_system_configurations",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb");

            migrationBuilder.AddColumn<string>(
                name: "sample_configuration_json",
                schema: "commercial_ops",
                table: "order_system_configurations",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb");

            migrationBuilder.AddColumn<string>(
                name: "billing_address_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_contact_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "commercial_configuration_version",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_terms_days_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tax_decision_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "result_output_package_id",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "business_role_assignments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
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
                    role = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
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
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invitation_delivery_attempts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_invitation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    protected_payload = table.Column<string>(type: "character varying(16000)", maxLength: 16000, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    queued_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    provider_accepted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    bounced_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_hard_bounce = table.Column<bool>(type: "boolean", nullable: false),
                    provider_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
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
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    issued_on = table.Column<DateOnly>(type: "date", nullable: false),
                    due_on = table.Column<DateOnly>(type: "date", nullable: false),
                    payment_terms_days = table.Column<int>(type: "integer", nullable: false),
                    billing_contact_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    billing_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    tax_decision_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    adjustment_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    applied_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    pdf_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    pdf_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    issued_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    issued_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    voided_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    voided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    void_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
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
                name: "operational_attention_items",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    next_action = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    resolution = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_attention_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_operational_attention_items_organizations_organization_id",
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
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    preview_json = table.Column<string>(type: "jsonb", nullable: false),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    previewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    confirmed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                name: "payment_processor_external_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    local_entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    local_entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_processor_external_links", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payment_receipts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    receipt_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    payer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    received_on = table.Column<DateOnly>(type: "date", nullable: false),
                    method = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    bank_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    evidence_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    memo = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    applied_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    unapplied_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reversed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reversed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    ledger_receipt_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    bank_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    difference = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_by_user_id_value = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    lab_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    package_version = table.Column<int>(type: "integer", nullable: false),
                    corrects_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    pipeline_provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    pipeline_submission_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    manifest_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    expected_artifact_count = table.Column<int>(type: "integer", nullable: false),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    scientific_approval_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scientifically_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scientifically_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    released_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    failure_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    failure_detail = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
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
                name: "invitation_delivery_webhook_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_event_id = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    invitation_delivery_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    provider_occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitation_delivery_webhook_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_invitation_delivery_webhook_events_invitation_delivery_atte~",
                        column: x => x.invitation_delivery_attempt_id,
                        principalSchema: "commercial_ops",
                        principalTable: "invitation_delivery_attempts",
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
                    kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
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
                name: "invoice_lines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    line_number = table.Column<int>(type: "integer", nullable: false),
                    source_quote_line_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_rate = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
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
                    reversal_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
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
                name: "reconciliation_batch_items",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reconciliation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    contributing_actor_user_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reconciliation_batch_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_reconciliation_batch_items_reconciliation_batches_reconcili~",
                        column: x => x.reconciliation_batch_id,
                        principalSchema: "commercial_ops",
                        principalTable: "reconciliation_batches",
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
                    logical_role = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    object_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    scan_state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    scan_completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    scan_detail = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
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
                name: "result_retention_schedules",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    warning_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    cutoff_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    grace_ends_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    delete_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_processed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_result_retention_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_result_retention_schedules_result_output_packages_result_ou~",
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
                    result_artifact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_result_delivery_evidence", x => x.id);
                    table.ForeignKey(
                        name: "FK_result_delivery_evidence_result_artifacts_result_artifact_id",
                        column: x => x.result_artifact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_artifacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_delivery_evidence_result_output_packages_result_outp~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_result_output_package_id",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                column: "result_output_package_id",
                unique: true,
                filter: "\"result_output_package_id\" IS NOT NULL");

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
                name: "IX_invitation_delivery_webhook_events_invitation_delivery_atte~",
                schema: "commercial_ops",
                table: "invitation_delivery_webhook_events",
                column: "invitation_delivery_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitation_delivery_webhook_events_provider_event_id",
                schema: "commercial_ops",
                table: "invitation_delivery_webhook_events",
                column: "provider_event_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_adjustments_invoice_id_recorded_at_utc",
                schema: "commercial_ops",
                table: "invoice_adjustments",
                columns: new[] { "invoice_id", "recorded_at_utc" });

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
                name: "IX_invoices_organization_id_status_due_on",
                schema: "commercial_ops",
                table: "invoices",
                columns: new[] { "organization_id", "status", "due_on" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_attention_items_category_source_type_source_id",
                schema: "commercial_ops",
                table: "operational_attention_items",
                columns: new[] { "category", "source_type", "source_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_attention_items_organization_id",
                schema: "commercial_ops",
                table: "operational_attention_items",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_attention_items_status_owner_user_id_created_at",
                schema: "commercial_ops",
                table: "operational_attention_items",
                columns: new[] { "status", "owner_user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_invoice_id",
                schema: "commercial_ops",
                table: "payment_allocations",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_payment_receipt_id_invoice_id_allocated~",
                schema: "commercial_ops",
                table: "payment_allocations",
                columns: new[] { "payment_receipt_id", "invoice_id", "allocated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_import_batches_source_payload_sha256",
                schema: "commercial_ops",
                table: "payment_import_batches",
                columns: new[] { "source", "payload_sha256" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_import_batches_status_previewed_at_utc",
                schema: "commercial_ops",
                table: "payment_import_batches",
                columns: new[] { "status", "previewed_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_processor_external_links_provider_key_external_id",
                schema: "commercial_ops",
                table: "payment_processor_external_links",
                columns: new[] { "provider_key", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_processor_external_links_provider_key_local_entity_~",
                schema: "commercial_ops",
                table: "payment_processor_external_links",
                columns: new[] { "provider_key", "local_entity_type", "local_entity_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_organization_id_status_received_on",
                schema: "commercial_ops",
                table: "payment_receipts",
                columns: new[] { "organization_id", "status", "received_on" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_receipt_number",
                schema: "commercial_ops",
                table: "payment_receipts",
                column: "receipt_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_receipts_source_external_id",
                schema: "commercial_ops",
                table: "payment_receipts",
                columns: new[] { "source", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_batch_items_reconciliation_batch_id_source_t~",
                schema: "commercial_ops",
                table: "reconciliation_batch_items",
                columns: new[] { "reconciliation_batch_id", "source_type", "source_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_batches_batch_number",
                schema: "commercial_ops",
                table: "reconciliation_batches",
                column: "batch_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_batches_status_period_end",
                schema: "commercial_ops",
                table: "reconciliation_batches",
                columns: new[] { "status", "period_end" });

            migrationBuilder.CreateIndex(
                name: "IX_result_artifacts_object_storage_key",
                schema: "commercial_ops",
                table: "result_artifacts",
                column: "object_storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_artifacts_result_output_package_id_logical_role_file~",
                schema: "commercial_ops",
                table: "result_artifacts",
                columns: new[] { "result_output_package_id", "logical_role", "file_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_delivery_evidence_result_artifact_id",
                schema: "commercial_ops",
                table: "result_delivery_evidence",
                column: "result_artifact_id");

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
                name: "IX_result_output_packages_idempotency_key",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_lab_sample_id_package_version",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "lab_sample_id", "package_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_lab_service_order_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "lab_service_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_organization_id_state_created_at",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "organization_id", "state", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_result_output_packages_pipeline_provider_key_pipeline_submi~",
                schema: "commercial_ops",
                table: "result_output_packages",
                columns: new[] { "pipeline_provider_key", "pipeline_submission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_result_output_package_id",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                column: "result_output_package_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_state_warning_at_utc_delete_at_u~",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                columns: new[] { "state", "warning_at_utc", "delete_at_utc" });

            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.organizations
                SET is_operational_readiness_blocked = TRUE,
                    operational_readiness_block_reason = COALESCE(
                        NULLIF(portal_readiness_note, ''),
                        'Migrated from the historical Blocked readiness value.')
                WHERE portal_readiness = 'Blocked';

                UPDATE commercial_ops.organization_commercial_profiles
                SET payment_terms_days = 30,
                    configuration_version = 1;

                INSERT INTO commercial_ops.invitation_delivery_attempts (
                    id, organization_invitation_id, state, protected_payload,
                    attempt_count, queued_at_utc, last_attempt_at_utc,
                    next_attempt_at_utc, provider_accepted_at_utc,
                    delivered_at_utc, bounced_at_utc, is_hard_bounce,
                    provider_message_id, last_error, created_at,
                    created_by_user_id, updated_at, updated_by_user_id, version)
                SELECT gen_random_uuid(), invitation.id,
                    CASE
                        WHEN invitation.last_send_error IS NOT NULL THEN 'NeedsAttention'
                        WHEN invitation.last_email_provider_message_id IS NOT NULL THEN 'Accepted'
                        ELSE 'NeedsAttention'
                    END,
                    'historical-delivery-metadata-no-token',
                    GREATEST(invitation.send_count, 1),
                    COALESCE(invitation.last_sent_at, invitation.created_at),
                    invitation.last_sent_at,
                    NULL,
                    CASE WHEN invitation.last_send_error IS NULL
                        THEN invitation.last_sent_at ELSE NULL END,
                    NULL, NULL, FALSE,
                    invitation.last_email_provider_message_id,
                    COALESCE(invitation.last_send_error,
                        CASE WHEN invitation.last_email_provider_message_id IS NULL
                            THEN 'Historical send did not retain provider correlation metadata.'
                            ELSE NULL END),
                    COALESCE(invitation.last_sent_at, invitation.created_at),
                    invitation.last_sent_by_user_id,
                    COALESCE(invitation.last_sent_at, invitation.updated_at),
                    invitation.last_sent_by_user_id,
                    1
                FROM commercial_ops.organization_invitations AS invitation
                WHERE invitation.send_count > 0
                   OR invitation.last_sent_at IS NOT NULL
                   OR invitation.last_send_error IS NOT NULL
                   OR invitation.last_email_provider_message_id IS NOT NULL;

                UPDATE commercial_ops.lab_result_releases
                SET release_status = 'CommercialReviewRequired'
                WHERE release_status = 'PaymentHold';

                UPDATE commercial_ops.managed_operational_files
                SET release_status = 'CommercialReviewRequired'
                WHERE purpose = 'LabResult'
                  AND release_status = 'PaymentHold';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "business_role_assignments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "business_role_invitation_intents",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invitation_delivery_webhook_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoice_adjustments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoice_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "operational_attention_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_allocations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_import_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_processor_external_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reconciliation_batch_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_delivery_evidence",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_retention_schedules",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invitation_delivery_attempts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoices",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_receipts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reconciliation_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_artifacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_output_packages",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_scientific_approvals_result_output_package_id",
                schema: "lab_ops",
                table: "lab_scientific_approvals");

            migrationBuilder.DropColumn(
                name: "is_operational_readiness_blocked",
                schema: "commercial_ops",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "operational_readiness_block_reason",
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
                name: "configuration_version",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "finance_approval_notes",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "finance_approved_at_utc",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "finance_approved_by_user_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "payment_terms_days",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_decision",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "tax_exemption_evidence",
                schema: "commercial_ops",
                table: "organization_commercial_profiles");

            migrationBuilder.DropColumn(
                name: "result_destination_configuration_json",
                schema: "commercial_ops",
                table: "order_system_configurations");

            migrationBuilder.DropColumn(
                name: "sample_configuration_json",
                schema: "commercial_ops",
                table: "order_system_configurations");

            migrationBuilder.DropColumn(
                name: "billing_address_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "billing_contact_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "commercial_configuration_version",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "payment_terms_days_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "tax_decision_snapshot_json",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "result_output_package_id",
                schema: "lab_ops",
                table: "lab_scientific_approvals");
        }
    }
}
