using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "commercial_document_links",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_document_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    document_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    document_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    sync_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    synchronized_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commercial_document_links", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_orders",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    submission_instructions_snapshot = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    request_revision = table.Column<int>(type: "integer", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    current_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_discarded = table.Column<bool>(type: "boolean", nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "managed_operational_files",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_record_id = table.Column<Guid>(type: "uuid", nullable: true),
                    purpose = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    file_kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    scan_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    scan_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    release_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    released_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_managed_operational_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_managed_operational_files_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_cancellation_requests",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    scope_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_cancellation_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_order_cancellation_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_cancellation_requests_users_decided_by_user_id",
                        column: x => x.decided_by_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_cancellation_requests_users_requested_by_user_id",
                        column: x => x.requested_by_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_idempotency_records",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status_code = table.Column<int>(type: "integer", nullable: false),
                    response_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_idempotency_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_order_idempotency_records_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_notifications",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipient_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_order_notifications_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_notifications_users_recipient_user_id",
                        column: x => x.recipient_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_outbox_messages",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "order_status_events",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_record_id = table.Column<Guid>(type: "uuid", nullable: true),
                    from_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    to_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_status_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_order_status_events_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_status_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_system_configurations",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quote_validity_days = table.Column<int>(type: "integer", nullable: false),
                    sample_submission_instructions = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    shipping_configuration_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_system_configurations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "organization_commercial_profiles",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_customer_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    lab_credit_approved = table.Column<bool>(type: "boolean", nullable: false),
                    assembly_credit_approved = table.Column<bool>(type: "boolean", nullable: false),
                    credit_reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    credit_reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_commercial_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_commercial_profiles_organizations_organization~",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_shipping_addresses",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recipient = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    region = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_shipping_addresses", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_shipping_addresses_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "qbo_catalog_items",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_item_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    sales_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    base_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qbo_catalog_items", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_samples",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    material_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    storage_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    safety_declaration = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    collection_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    concentration = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    analysis_definition_ids_json = table.Column<string>(type: "jsonb", nullable: false),
                    accession_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    replacement_for_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    receipt_condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    customer_shipped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_samples", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_samples_lab_samples_replacement_for_sample_id",
                        column: x => x.replacement_for_sample_id,
                        principalSchema: "portal",
                        principalTable: "lab_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_samples_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_quotes",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    purpose = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lines_json = table.Column<string>(type: "jsonb", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    superseded_by_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_quotes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_quotes_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quotes_lab_service_quotes_superseded_by_quote_id",
                        column: x => x.superseded_by_quote_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "operational_file_downloads",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    managed_operational_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    downloaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    remote_address = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_file_downloads", x => x.id);
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_managed_operational_files_manage~",
                        column: x => x.managed_operational_file_id,
                        principalSchema: "portal",
                        principalTable: "managed_operational_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_reagent_orders",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_order_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipping_address_id = table.Column<Guid>(type: "uuid", nullable: true),
                    shipping_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    requested_delivery_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    shipping_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fulfilled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_discarded = table.Column<bool>(type: "boolean", nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_reagent_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_reagent_orders_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_orders_partner_shipping_addresses_shipping_~",
                        column: x => x.shipping_address_id,
                        principalSchema: "portal",
                        principalTable: "partner_shipping_addresses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "analysis_definitions",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    submission_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    required_intake_fields_json = table.Column<string>(type: "jsonb", nullable: false),
                    result_contract_json = table.Column<string>(type: "jsonb", nullable: false),
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
                    table.PrimaryKey("PK_analysis_definitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_analysis_definitions_qbo_catalog_items_qbo_catalog_item_id",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "portal",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_profiles",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    profile_version = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    metadata_schema_json = table.Column<string>(type: "jsonb", nullable: false),
                    allowed_file_kinds_json = table.Column<string>(type: "jsonb", nullable: false),
                    output_contract_json = table.Column<string>(type: "jsonb", nullable: false),
                    maximum_file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    maximum_total_size_bytes = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_assembly_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_assembly_profiles_qbo_catalog_items_qbo_catalog_item_id",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "portal",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_reagent_offerings",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    negotiated_unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    selling_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    order_increment = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    minimum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    maximum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    shipping_restrictions_json = table.Column<string>(type: "jsonb", nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_reagent_offerings", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_reagent_offerings_organizations_partner_organizatio~",
                        column: x => x.partner_organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_offerings_qbo_catalog_items_qbo_catalog_ite~",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "portal",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_result_releases",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_sample_id = table.Column<Guid>(type: "uuid", nullable: false),
                    release_version = table.Column<int>(type: "integer", nullable: false),
                    analysis_profile = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    pipeline_version = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    provenance = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    qc_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    release_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    released_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_result_releases", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_lab_samples_lab_sample_id",
                        column: x => x.lab_sample_id,
                        principalSchema: "portal",
                        principalTable: "lab_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reagent_shipments",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    packing_slip_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    service = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    shipped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reagent_shipments", x => x.id);
                    table.ForeignKey(
                        name: "FK_reagent_shipments_partner_reagent_orders_partner_reagent_or~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_assembly_requests",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    project_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    assembly_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assembly_profile_version = table.Column<int>(type: "integer", nullable: false),
                    profile_name_snapshot = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    profile_instructions_snapshot = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: false),
                    requested_output = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    processing_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    prohibited_data_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    input_revision = table.Column<int>(type: "integer", nullable: false),
                    current_input_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    current_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    purchase_order_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_discarded = table.Column<bool>(type: "boolean", nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_assembly_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_assembly_requests_assembly_profiles_assembly_profile_id",
                        column: x => x.assembly_profile_id,
                        principalSchema: "portal",
                        principalTable: "assembly_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_assembly_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_reagent_order_lines",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    offering_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_item_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    shipped_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    cancelled_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    estimated_ship_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_reagent_order_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_partner_reagent_offerings_offer~",
                        column: x => x.offering_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_partner_reagent_orders_partner_~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_qbo_catalog_items_qbo_catalog_i~",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "portal",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_input_revisions",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    data_assembly_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    previous_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    correction_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    validation_summary_json = table.Column<string>(type: "jsonb", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assembly_input_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_assembly_input_revisions_assembly_input_revisions_previous_~",
                        column: x => x.previous_revision_id,
                        principalSchema: "portal",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_input_revisions_data_assembly_requests_data_assemb~",
                        column: x => x.data_assembly_request_id,
                        principalSchema: "portal",
                        principalTable: "data_assembly_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_input_revisions_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_assembly_quotes",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    data_assembly_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    purpose = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lines_json = table.Column<string>(type: "jsonb", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    superseded_by_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_assembly_quotes", x => x.id);
                    table.ForeignKey(
                        name: "FK_data_assembly_quotes_data_assembly_quotes_superseded_by_quo~",
                        column: x => x.superseded_by_quote_id,
                        principalSchema: "portal",
                        principalTable: "data_assembly_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_assembly_quotes_data_assembly_requests_data_assembly_r~",
                        column: x => x.data_assembly_request_id,
                        principalSchema: "portal",
                        principalTable: "data_assembly_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reagent_order_adjustments",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_line_id = table.Column<Guid>(type: "uuid", nullable: false),
                    proposed_offering_id = table.Column<Guid>(type: "uuid", nullable: false),
                    before_json = table.Column<string>(type: "jsonb", nullable: false),
                    after_json = table.Column<string>(type: "jsonb", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    total_difference = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reagent_order_adjustments", x => x.id);
                    table.ForeignKey(
                        name: "FK_reagent_order_adjustments_partner_reagent_offerings_propose~",
                        column: x => x.proposed_offering_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_order_adjustments_partner_reagent_order_lines_origi~",
                        column: x => x.original_line_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_order_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_order_adjustments_partner_reagent_orders_partner_re~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reagent_shipment_lines",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reagent_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_reagent_order_line_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    lot_batch_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reagent_shipment_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_reagent_shipment_lines_partner_reagent_order_lines_partner_~",
                        column: x => x.partner_reagent_order_line_id,
                        principalSchema: "portal",
                        principalTable: "partner_reagent_order_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_shipment_lines_reagent_shipments_reagent_shipment_id",
                        column: x => x.reagent_shipment_id,
                        principalSchema: "portal",
                        principalTable: "reagent_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_processing_runs",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    data_assembly_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    input_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_number = table.Column<int>(type: "integer", nullable: false),
                    profile_version = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    pipeline_version = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    provenance = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    qc_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    failure_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assembly_processing_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_assembly_processing_runs_assembly_input_revisions_input_rev~",
                        column: x => x.input_revision_id,
                        principalSchema: "portal",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_processing_runs_data_assembly_requests_data_assemb~",
                        column: x => x.data_assembly_request_id,
                        principalSchema: "portal",
                        principalTable: "data_assembly_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_output_releases",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    data_assembly_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    input_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    processing_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    release_version = table.Column<int>(type: "integer", nullable: false),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    pipeline_version = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    provenance = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    qc_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    release_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    released_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assembly_output_releases", x => x.id);
                    table.ForeignKey(
                        name: "FK_assembly_output_releases_assembly_input_revisions_input_rev~",
                        column: x => x.input_revision_id,
                        principalSchema: "portal",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_output_releases_assembly_processing_runs_processin~",
                        column: x => x.processing_run_id,
                        principalSchema: "portal",
                        principalTable: "assembly_processing_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_output_releases_data_assembly_requests_data_assemb~",
                        column: x => x.data_assembly_request_id,
                        principalSchema: "portal",
                        principalTable: "data_assembly_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_output_releases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_definitions_is_active_name",
                schema: "portal",
                table: "analysis_definitions",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_definitions_qbo_catalog_item_id",
                schema: "portal",
                table: "analysis_definitions",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_data_assembly_request_id_revision",
                schema: "portal",
                table: "assembly_input_revisions",
                columns: new[] { "data_assembly_request_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_previous_revision_id",
                schema: "portal",
                table: "assembly_input_revisions",
                column: "previous_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_submitted_by_user_id",
                schema: "portal",
                table: "assembly_input_revisions",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_data_assembly_request_id_release_v~",
                schema: "portal",
                table: "assembly_output_releases",
                columns: new[] { "data_assembly_request_id", "release_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_input_revision_id",
                schema: "portal",
                table: "assembly_output_releases",
                column: "input_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_organization_id_release_status",
                schema: "portal",
                table: "assembly_output_releases",
                columns: new[] { "organization_id", "release_status" });

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_processing_run_id",
                schema: "portal",
                table: "assembly_output_releases",
                column: "processing_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_processing_runs_data_assembly_request_id_run_number",
                schema: "portal",
                table: "assembly_processing_runs",
                columns: new[] { "data_assembly_request_id", "run_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_processing_runs_input_revision_id",
                schema: "portal",
                table: "assembly_processing_runs",
                column: "input_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_is_active_name",
                schema: "portal",
                table: "assembly_profiles",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_name_profile_version",
                schema: "portal",
                table: "assembly_profiles",
                columns: new[] { "name", "profile_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_qbo_catalog_item_id",
                schema: "portal",
                table: "assembly_profiles",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_document_links_external_document_id",
                schema: "portal",
                table: "commercial_document_links",
                column: "external_document_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_document_links_sync_status",
                schema: "portal",
                table: "commercial_document_links",
                column: "sync_status");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_document_links_workflow_type_workflow_id_kind",
                schema: "portal",
                table: "commercial_document_links",
                columns: new[] { "workflow_type", "workflow_id", "kind" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_quotes_data_assembly_request_id_revision",
                schema: "portal",
                table: "data_assembly_quotes",
                columns: new[] { "data_assembly_request_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_quotes_superseded_by_quote_id",
                schema: "portal",
                table: "data_assembly_quotes",
                column: "superseded_by_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_assembly_profile_id",
                schema: "portal",
                table: "data_assembly_requests",
                column: "assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_project_reference",
                schema: "portal",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "project_reference" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_status_created_at",
                schema: "portal",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_request_number",
                schema: "portal",
                table: "data_assembly_requests",
                column: "request_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_lab_sample_id_release_version",
                schema: "portal",
                table: "lab_result_releases",
                columns: new[] { "lab_sample_id", "release_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_lab_service_order_id",
                schema: "portal",
                table: "lab_result_releases",
                column: "lab_service_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_organization_id_release_status",
                schema: "portal",
                table: "lab_result_releases",
                columns: new[] { "organization_id", "release_status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_accession_id",
                schema: "portal",
                table: "lab_samples",
                column: "accession_id",
                unique: true,
                filter: "\"accession_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_lab_service_order_id_customer_sample_id",
                schema: "portal",
                table: "lab_samples",
                columns: new[] { "lab_service_order_id", "customer_sample_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_lab_service_order_id_status",
                schema: "portal",
                table: "lab_samples",
                columns: new[] { "lab_service_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_replacement_for_sample_id",
                schema: "portal",
                table: "lab_samples",
                column: "replacement_for_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_current_quote_id",
                schema: "portal",
                table: "lab_service_orders",
                column: "current_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_order_number",
                schema: "portal",
                table: "lab_service_orders",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_status_created_at",
                schema: "portal",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_lab_service_order_id_revision",
                schema: "portal",
                table: "lab_service_quotes",
                columns: new[] { "lab_service_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_superseded_by_quote_id",
                schema: "portal",
                table: "lab_service_quotes",
                column: "superseded_by_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_organization_id_workflow_type_wor~",
                schema: "portal",
                table: "managed_operational_files",
                columns: new[] { "organization_id", "workflow_type", "workflow_id" });

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_parent_record_id",
                schema: "portal",
                table: "managed_operational_files",
                column: "parent_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_storage_key",
                schema: "portal",
                table: "managed_operational_files",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_managed_operational_file_id",
                schema: "portal",
                table: "operational_file_downloads",
                column: "managed_operational_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_organization_id_downloaded_at",
                schema: "portal",
                table: "operational_file_downloads",
                columns: new[] { "organization_id", "downloaded_at" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_user_id",
                schema: "portal",
                table: "operational_file_downloads",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_decided_by_user_id",
                schema: "portal",
                table: "order_cancellation_requests",
                column: "decided_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_organization_id",
                schema: "portal",
                table: "order_cancellation_requests",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_requested_by_user_id",
                schema: "portal",
                table: "order_cancellation_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_workflow_type_workflow_id_status",
                schema: "portal",
                table: "order_cancellation_requests",
                columns: new[] { "workflow_type", "workflow_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_order_idempotency_records_actor_user_id_scope_idempotency_k~",
                schema: "portal",
                table: "order_idempotency_records",
                columns: new[] { "actor_user_id", "scope", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_idempotency_records_created_at",
                schema: "portal",
                table: "order_idempotency_records",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_organization_id_created_at",
                schema: "portal",
                table: "order_notifications",
                columns: new[] { "organization_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_recipient_user_id",
                schema: "portal",
                table: "order_notifications",
                column: "recipient_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_status_next_attempt_at",
                schema: "portal",
                table: "order_notifications",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_outbox_messages_status_next_attempt_at",
                schema: "portal",
                table: "order_outbox_messages",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_outbox_messages_workflow_type_workflow_id_operation_i~",
                schema: "portal",
                table: "order_outbox_messages",
                columns: new[] { "workflow_type", "workflow_id", "operation", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_actor_user_id",
                schema: "portal",
                table: "order_status_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_organization_id_occurred_at",
                schema: "portal",
                table: "order_status_events",
                columns: new[] { "organization_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_workflow_type_workflow_id_occurred_at",
                schema: "portal",
                table: "order_status_events",
                columns: new[] { "workflow_type", "workflow_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_commercial_profiles_organization_id",
                schema: "portal",
                table: "organization_commercial_profiles",
                column: "organization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_commercial_profiles_qbo_customer_id",
                schema: "portal",
                table: "organization_commercial_profiles",
                column: "qbo_customer_id",
                unique: true,
                filter: "\"qbo_customer_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_partner_organization_id_is_active",
                schema: "portal",
                table: "partner_reagent_offerings",
                columns: new[] { "partner_organization_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_partner_organization_id_qbo_catal~",
                schema: "portal",
                table: "partner_reagent_offerings",
                columns: new[] { "partner_organization_id", "qbo_catalog_item_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_qbo_catalog_item_id",
                schema: "portal",
                table: "partner_reagent_offerings",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_offering_id",
                schema: "portal",
                table: "partner_reagent_order_lines",
                column: "offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_partner_reagent_order_id",
                schema: "portal",
                table: "partner_reagent_order_lines",
                column: "partner_reagent_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_qbo_catalog_item_id",
                schema: "portal",
                table: "partner_reagent_order_lines",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_order_number",
                schema: "portal",
                table: "partner_reagent_orders",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_purchase_order_number",
                schema: "portal",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "purchase_order_number" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_status_created_at",
                schema: "portal",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_shipping_address_id",
                schema: "portal",
                table: "partner_reagent_orders",
                column: "shipping_address_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_organization_id_is_active_label",
                schema: "portal",
                table: "partner_shipping_addresses",
                columns: new[] { "organization_id", "is_active", "label" });

            migrationBuilder.CreateIndex(
                name: "IX_qbo_catalog_items_external_item_id",
                schema: "portal",
                table: "qbo_catalog_items",
                column: "external_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_catalog_items_is_active_name",
                schema: "portal",
                table: "qbo_catalog_items",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_original_line_id",
                schema: "portal",
                table: "reagent_order_adjustments",
                column: "original_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_partner_reagent_order_id_status",
                schema: "portal",
                table: "reagent_order_adjustments",
                columns: new[] { "partner_reagent_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_proposed_offering_id",
                schema: "portal",
                table: "reagent_order_adjustments",
                column: "proposed_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipment_lines_partner_reagent_order_line_id",
                schema: "portal",
                table: "reagent_shipment_lines",
                column: "partner_reagent_order_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipment_lines_reagent_shipment_id_partner_reagent_~",
                schema: "portal",
                table: "reagent_shipment_lines",
                columns: new[] { "reagent_shipment_id", "partner_reagent_order_line_id" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_partner_reagent_order_id",
                schema: "portal",
                table: "reagent_shipments",
                column: "partner_reagent_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_shipment_number",
                schema: "portal",
                table: "reagent_shipments",
                column: "shipment_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_tracking_number",
                schema: "portal",
                table: "reagent_shipments",
                column: "tracking_number");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analysis_definitions",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "assembly_output_releases",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "commercial_document_links",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_assembly_quotes",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "lab_result_releases",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "lab_service_quotes",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "operational_file_downloads",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_cancellation_requests",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_idempotency_records",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_notifications",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_outbox_messages",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_status_events",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "order_system_configurations",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "organization_commercial_profiles",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "reagent_order_adjustments",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "reagent_shipment_lines",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "assembly_processing_runs",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "lab_samples",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "managed_operational_files",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "partner_reagent_order_lines",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "reagent_shipments",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "assembly_input_revisions",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "lab_service_orders",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "partner_reagent_offerings",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "partner_reagent_orders",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "data_assembly_requests",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "partner_shipping_addresses",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "assembly_profiles",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "qbo_catalog_items",
                schema: "portal");
        }
    }
}
