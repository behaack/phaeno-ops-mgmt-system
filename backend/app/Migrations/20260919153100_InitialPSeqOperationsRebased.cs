using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialPSeqOperationsRebased : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A rebase is only safe on a new database; never treat it as an upgrade.
            migrationBuilder.Sql("""
                DO $$ DECLARE previous_history boolean := false; history_name text; BEGIN
                    FOREACH history_name IN ARRAY ARRAY['public.__ef_migrations_history', 'public."__EFMigrationsHistory"'] LOOP
                        IF to_regclass(history_name) IS NOT NULL THEN
                            EXECUTE 'SELECT EXISTS (SELECT 1 FROM ' || history_name || ')' INTO previous_history;
                            EXIT WHEN previous_history;
                        END IF;
                    END LOOP;
                    IF previous_history OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname IN ('commercial_ops', 'lab_ops', 'website')) THEN
                        RAISE EXCEPTION 'The rebased initial migration requires a new empty database. Restore and selectively import into a replacement database.';
                    END IF;
                END $$;
                """);

            migrationBuilder.EnsureSchema(
                name: "commercial_ops");

            migrationBuilder.EnsureSchema(
                name: "lab_ops");

            migrationBuilder.EnsureSchema(
                name: "website");

            migrationBuilder.CreateTable(
                name: "audit_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    entity_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    operation = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    request_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    changes_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "commercial_document_links",
                schema: "commercial_ops",
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
                name: "curated_datasets",
                schema: "commercial_ops",
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
                name: "lab_authorizations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    commercial_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_version = table.Column<int>(type: "integer", nullable: false),
                    command_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    provider_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_authorizations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_business_calendars",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    coverage_from = table.Column<DateOnly>(type: "date", nullable: false),
                    coverage_to = table.Column<DateOnly>(type: "date", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_business_calendars", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_equipment",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    equipment_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    retirement_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    retired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retired_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    last_calibration_on = table.Column<DateOnly>(type: "date", nullable: true),
                    calibration_due_on = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_equipment", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_material_definitions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_material_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_operational_batches",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    batch_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_operational_batches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_operations_event_receipts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false),
                    processed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_operations_event_receipts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_product_types",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    kit_use = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_product_types", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_protocols",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    latest_version = table.Column<int>(type: "integer", nullable: false),
                    retired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retired_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    retirement_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_protocols", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_role_assignments",
                schema: "lab_ops",
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
                    table.PrimaryKey("PK_lab_role_assignments", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_role_invitation_intents",
                schema: "lab_ops",
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
                    table.PrimaryKey("PK_lab_role_invitation_intents", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_workflows",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    latest_version = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflows", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_steps",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    latest_version = table.Column<int>(type: "integer", nullable: false),
                    retired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retired_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    retirement_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_steps", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_storage_locations",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_storage_locations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_suppliers",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_suppliers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_tray_formats",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    layout_json = table.Column<string>(type: "jsonb", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_tray_formats", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_projections",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_version = table.Column<int>(type: "integer", nullable: false),
                    milestone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    schedule_health = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    expected_completion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active_customer_action_count = table.Column<int>(type: "integer", nullable: false),
                    customer_safe_summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    permitted_qc_projection_json = table.Column<string>(type: "jsonb", nullable: true),
                    last_changed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_projections", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "order_outbox_messages",
                schema: "commercial_ops",
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
                name: "order_system_configurations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quote_validity_days = table.Column<int>(type: "integer", nullable: false),
                    sample_submission_instructions = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    shipping_configuration_json = table.Column<string>(type: "jsonb", nullable: false),
                    sample_configuration_json = table.Column<string>(type: "jsonb", nullable: false),
                    result_destination_configuration_json = table.Column<string>(type: "jsonb", nullable: false),
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
                name: "organizations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    portal_readiness = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    portal_readiness_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    is_operational_readiness_blocked = table.Column<bool>(type: "boolean", nullable: false),
                    operational_readiness_block_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    default_purchase_order_required = table.Column<bool>(type: "boolean", nullable: true),
                    default_billing_contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    default_notification_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    default_shipping_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    default_result_delivery_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizations", x => x.id);
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
                name: "qbo_catalog_items",
                schema: "commercial_ops",
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
                    draft_changes_json = table.Column<string>(type: "jsonb", nullable: true),
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
                name: "released_deliverable_policy_defaults",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    standard_retention_days = table.Column<int>(type: "integer", nullable: false),
                    undownloaded_warning_lead_days = table.Column<int>(type: "integer", nullable: false),
                    undownloaded_grace_days = table.Column<int>(type: "integer", nullable: false),
                    change_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    supersedes_policy_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    deactivated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deactivated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deactivation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_policy_defaults", x => x.id);
                    table.ForeignKey(
                        name: "fk_released_policy_default_supersedes",
                        column: x => x.supersedes_policy_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_policy_defaults",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_destinations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_destination_id = table.Column<Guid>(type: "uuid", nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    recipient_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    organization_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    address_line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    address_line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    state_or_province = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    receiving_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    receiving_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    receiving_hours = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    closure_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    carrier_restrictions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    international_shipping_allowed = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_sample_shipping_destinations", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_destinations_sample_shipping_destinations_s~",
                        column: x => x.supersedes_destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_type_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_sample_type_id = table.Column<Guid>(type: "uuid", nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    material_class = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    minimum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    maximum_quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    quantity_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    primary_container_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    temperature_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    stabilizer_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    packaging_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    labeling_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    prohibited_identifiers = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    safety_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    carrier_restrictions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    maximum_transit_hours = table.Column<int>(type: "integer", nullable: true),
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
                    table.PrimaryKey("PK_sample_type_definitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_type_definitions_sample_type_definitions_supersedes_~",
                        column: x => x.supersedes_sample_type_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "source_samples",
                schema: "commercial_ops",
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
                name: "users",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    external_identity_provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    external_subject_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "web_contacts",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    last_name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    organization_name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    send_brochure = table.Column<bool>(type: "boolean", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    unsubscribed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    unsubscribed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    language = table.Column<string>(type: "character varying(35)", maxLength: 35, nullable: false, defaultValue: "en-US")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_contacts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "web_orders",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    last_name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    organization_name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    completed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    language = table.Column<string>(type: "character varying(35)", maxLength: 35, nullable: false, defaultValue: "en-US")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_orders", x => x.id);
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
                name: "lab_holidays",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_business_calendar_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_holidays", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_holidays_lab_business_calendars_lab_business_calendar_id",
                        column: x => x.lab_business_calendar_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_business_calendars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_ngs_sendouts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_operational_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    provider_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    shipped_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    provider_received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expected_completion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_ngs_sendouts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_ngs_sendouts_lab_operational_batches_lab_operational_ba~",
                        column: x => x.lab_operational_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_operational_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_protocol_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_protocol_id = table.Column<Guid>(type: "uuid", nullable: false),
                    protocol_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    definition_json = table.Column<string>(type: "jsonb", nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_protocol_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_protocol_versions_lab_protocols_lab_protocol_id",
                        column: x => x.lab_protocol_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocols",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_workflow_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    production_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    production_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    invalidated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    invalidation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflow_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_versions_lab_service_workflows_lab_ser~",
                        column: x => x.lab_service_workflow_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_step_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    definition_json = table.Column<string>(type: "jsonb", nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_step_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_step_versions_lab_steps_lab_step_id",
                        column: x => x.lab_step_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_supplier_products",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    product_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_supplier_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_supplier_products_lab_product_types_product_type_id",
                        column: x => x.product_type_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_product_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_supplier_products_lab_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "managed_operational_files",
                schema: "commercial_ops",
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
                name: "organization_commercial_profiles",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_customer_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    lab_credit_approved = table.Column<bool>(type: "boolean", nullable: false),
                    assembly_credit_approved = table.Column<bool>(type: "boolean", nullable: false),
                    credit_reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    credit_reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    billing_contact_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    billing_contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    billing_address_json = table.Column<string>(type: "jsonb", nullable: true),
                    payment_terms_days = table.Column<int>(type: "integer", nullable: false),
                    tax_decision = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    approved_tax_rate = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: true),
                    tax_exemption_evidence = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    finance_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    finance_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    finance_approval_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    configuration_version = table.Column<int>(type: "integer", nullable: false),
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
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_departments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    purchase_order_required = table.Column<bool>(type: "boolean", nullable: true),
                    billing_contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    notification_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipping_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    result_delivery_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_departments", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_departments_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_released_deliverable_policy_overrides",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    standard_retention_days = table.Column<int>(type: "integer", nullable: true),
                    undownloaded_warning_lead_days = table.Column<int>(type: "integer", nullable: true),
                    undownloaded_grace_days = table.Column<int>(type: "integer", nullable: true),
                    change_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    supersedes_override_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    deactivated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deactivated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deactivation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_released_deliverable_policy_overrides", x => x.id);
                    table.ForeignKey(
                        name: "fk_org_released_policy_override_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_org_released_policy_override_supersedes",
                        column: x => x.supersedes_override_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_released_deliverable_policy_overrides",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "portal_integration_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    candidate_organization_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    request_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    requested_organization_kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    source_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    internal_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    applied_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    applied_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    application_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_portal_integration_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_portal_integration_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "analysis_definitions",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_profiles",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
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
                name: "sample_shipping_instruction_rules",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_instruction_rule_id = table.Column<Guid>(type: "uuid", nullable: true),
                    destination_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    compatibility_group = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    packing_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    temperature_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    carrier_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    dispatch_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    required_documents = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    exception_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    international_customs_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    requires_separate_shipment = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_sample_shipping_instruction_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_shipping_destinati~",
                        column: x => x.destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_shipping_instructi~",
                        column: x => x.supersedes_instruction_rule_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_instruction_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_instruction_rules_sample_type_definitions_s~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "curated_dataset_versions",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curated_dataset_versions_source_samples_source_sample_id",
                        column: x => x.source_sample_id,
                        principalSchema: "commercial_ops",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_incidents",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "managed_files",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "source_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "crm_companies",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    website_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    domain_name = table.Column<string>(type: "character varying(253)", maxLength: 253, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    industry = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    address_line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    address_line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    region = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    postal_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    employee_count = table.Column<int>(type: "integer", nullable: true),
                    lifecycle_state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    tags = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    aliases = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]"),
                    merged_into_company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    access_organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_companies", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_companies_crm_companies_merged_into_company_id",
                        column: x => x.merged_into_company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_companies_organizations_access_organization_id",
                        column: x => x.access_organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_companies_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                    legacy_job_title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    communication_preference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    lawful_contact_basis = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    communication_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    outreach_permission_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    outreach_recorded_on = table.Column<DateOnly>(type: "date", nullable: true),
                    outreach_suppression_reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
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
                name: "order_cancellation_requests",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_cancellation_requests_users_decided_by_user_id",
                        column: x => x.decided_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_cancellation_requests_users_requested_by_user_id",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_idempotency_records",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_status_events",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_status_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_memberships",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_organization_admin = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_memberships", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_memberships_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_memberships_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_types",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_types", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_type_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_type_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "web_notification_processing_controls",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_paused = table.Column<bool>(type: "boolean", nullable: false),
                    version = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_processing_controls", x => x.id);
                    table.CheckConstraint("ck_web_notification_processing_singleton", "id = '526a3498-feb3-4a94-a5f2-9277c2bc9c97'::uuid");
                    table.ForeignKey(
                        name: "FK_web_notification_processing_controls_users_updated_by_user_~",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "web_notification_deliveries",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    web_contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    web_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    state = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_attempt_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    accepted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lease_expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lease_token = table.Column<Guid>(type: "uuid", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    attempts_since_recovery = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    last_recovery_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    last_recovery_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_deliveries", x => x.id);
                    table.CheckConstraint("ck_web_notification_target", "(web_contact_id IS NOT NULL AND web_order_id IS NULL AND kind IN ('MailingListAlert', 'TechnicalBrief')) OR (web_order_id IS NOT NULL AND web_contact_id IS NULL AND kind = 'DemoRequestAlert')");
                    table.ForeignKey(
                        name: "FK_web_notification_deliveries_web_contacts_web_contact_id",
                        column: x => x.web_contact_id,
                        principalSchema: "website",
                        principalTable: "web_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_web_notification_deliveries_web_orders_web_order_id",
                        column: x => x.web_order_id,
                        principalSchema: "website",
                        principalTable: "web_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_batches",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    tray_barcode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    lab_tray_format_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    layout_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_batches", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_batches_lab_service_workflow_versions_lab_s~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_batches_lab_tray_formats_lab_tray_format_id",
                        column: x => x.lab_tray_format_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_tray_formats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_workflow_stages",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    lab_protocol_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requirement = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    handoff_criteria = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_workflow_stages", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_stages_lab_protocol_versions_lab_proto~",
                        column: x => x.lab_protocol_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_workflow_stages_lab_service_workflow_versions_l~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_timing_policies",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_business_calendar_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    requires_sequencing = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_timing_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_timing_policies_lab_business_calendars_lab_business_cal~",
                        column: x => x.lab_business_calendar_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_business_calendars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_timing_policies_lab_service_workflow_versions_lab_servi~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_orders",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_authorization_version = table.Column<int>(type: "integer", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitting_organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    service_version = table.Column<int>(type: "integer", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tube_use_policy_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    tube_use_policy_version = table.Column<int>(type: "integer", nullable: true),
                    tube_use_policy_authorization_version = table.Column<int>(type: "integer", nullable: true),
                    turnaround_policy_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    minimum_turnaround_days = table.Column<int>(type: "integer", nullable: true),
                    maximum_turnaround_days = table.Column<int>(type: "integer", nullable: true),
                    original_target_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expected_completion_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    has_timing_override = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    original_delivery_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    adjusted_delivery_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    first_delivered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivery_due_at_first_delivery_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    opaque_submitter_reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_orders_lab_service_workflow_versions_lab_service_w~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_material_lots",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    material_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier_id = table.Column<Guid>(type: "uuid", nullable: true),
                    supplier_product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    legacy_components_json = table.Column<string>(type: "jsonb", nullable: true),
                    expiration_or_retest_date = table.Column<DateOnly>(type: "date", nullable: true),
                    storage_location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    available_quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qc_disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qc_results_json = table.Column<string>(type: "jsonb", nullable: true),
                    qc_performed_on = table.Column<DateOnly>(type: "date", nullable: true),
                    qc_failure_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    qc_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    qc_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    quantity_hold_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    quantity_history_json = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_material_lots", x => x.id);
                    table.CheckConstraint("ck_material_lot_product_kind", "supplier_product_id IS NULL OR kind = 'SupplierLot'");
                    table.ForeignKey(
                        name: "FK_lab_material_lots_lab_material_definitions_material_definit~",
                        column: x => x.material_definition_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_material_lots_lab_storage_locations_storage_location_id",
                        column: x => x.storage_location_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_storage_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_material_lots_lab_supplier_products_supplier_product_id",
                        column: x => x.supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_material_lots_lab_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_delivery_locations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recipient = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    city = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    region = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    delivery_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
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
                    table.PrimaryKey("PK_customer_delivery_locations", x => x.id);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_department",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_delivery_location_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_notifications",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        name: "FK_order_notifications_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_notifications_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_notifications_users_recipient_user_id",
                        column: x => x.recipient_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_shipping_addresses",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                        name: "FK_partner_shipping_addresses_organization_departments_departm~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_shipping_addresses_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_service_entitlements",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    service = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    configuration_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source_request_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    end_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_service_entitlements", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_service_entitlements_organization_departments_~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_service_entitlements_organizations_organizatio~",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_service_entitlements_portal_integration_reques~",
                        column: x => x.source_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "portal_integration_request_services",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    portal_integration_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_portal_integration_request_services", x => x.id);
                    table.ForeignKey(
                        name: "FK_portal_integration_request_services_portal_integration_requ~",
                        column: x => x.portal_integration_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "partner_reagent_offerings",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    included_assembly_profile_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        name: "FK_partner_reagent_offerings_assembly_profiles_included_assemb~",
                        column: x => x.included_assembly_profile_id,
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_offerings_organizations_partner_organizatio~",
                        column: x => x.partner_organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_offerings_qbo_catalog_items_qbo_catalog_ite~",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_orders",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_request_id = table.Column<Guid>(type: "uuid", nullable: true),
                    order_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_job_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    has_mixed_biological_sources = table.Column<bool>(type: "boolean", nullable: false),
                    shared_biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    requested_specimen_count = table.Column<int>(type: "integer", nullable: false),
                    tube_use_policy_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    tube_use_policy_version = table.Column<int>(type: "integer", nullable: true),
                    storage_requirements = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    safety_declaration = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    submission_instructions_snapshot = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    placement_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    entry_mode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "ManualQuote"),
                    lab_service_offering_id = table.Column<Guid>(type: "uuid", nullable: true),
                    configured_commercial_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    proposed_unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    price_proposal_note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    price_proposed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    price_proposed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    request_revision = table.Column<int>(type: "integer", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    current_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sample_roster_finalized_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sample_roster_finalized_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_discarded = table.Column<bool>(type: "boolean", nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    assigned_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    due_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                        name: "FK_lab_service_orders_lab_service_offerings_lab_service_offeri~",
                        column: x => x.lab_service_offering_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_portal_integration_requests_source_reque~",
                        column: x => x.source_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_users_assigned_to_user_id",
                        column: x => x.assigned_to_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_users_price_proposed_by_user_id",
                        column: x => x.price_proposed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_orders_users_sample_roster_finalized_by_user_id",
                        column: x => x.sample_roster_finalized_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_sample_types",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_offering_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_sample_types", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_sample_types_lab_service_offerings_lab_service_~",
                        column: x => x.lab_service_offering_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_sample_types_sample_type_definitions_sample_typ~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_dataset_grants",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    curated_dataset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    granted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    granted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revoked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    superseded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    superseded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_curated_datasets_curated_datase~",
                        column: x => x.curated_dataset_id,
                        principalSchema: "commercial_ops",
                        principalTable: "curated_datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_organization_departments_depart~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_dataset_grants_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_affected_organizations",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_organizations_organizations_organi~",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_affected_versions",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_affected_versions_data_governance_incidents~",
                        column: x => x.incident_id,
                        principalSchema: "commercial_ops",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_governance_follow_ups",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_follow_ups_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_governance_follow_ups_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "curated_dataset_version_files",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curated_dataset_version_files_managed_files_managed_file_id",
                        column: x => x.managed_file_id,
                        principalSchema: "commercial_ops",
                        principalTable: "managed_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_opportunities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    opportunity_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
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
                name: "crm_company_contacts",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
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
                name: "crm_contact_user_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    link_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_contact_user_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_contact_user_links_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_contact_user_links_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_invitations",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_organization_admin = table.Column<bool>(type: "boolean", nullable: false),
                    crm_contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    token_hash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revoked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    declined_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    declined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_sent_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    send_count = table.Column<int>(type: "integer", nullable: false),
                    last_email_provider_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    last_send_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_invitations_crm_contacts_crm_contact_id",
                        column: x => x.crm_contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_invitations_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_department_memberships",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_membership_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_department_admin = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_department_memberships", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_department_memberships_organization_department~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_department_memberships_organization_membership~",
                        column: x => x.organization_membership_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_memberships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_definitions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_definition_id = table.Column<Guid>(type: "uuid", nullable: true),
                    common_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_capacity = table.Column<int>(type: "integer", nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    supplier_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    packing_instructions = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: true),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    deactivated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_definitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_predecessor",
                        column: x => x.supersedes_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_type",
                        column: x => x.container_type_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_revision_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "web_notification_attempts",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    web_notification_delivery_id = table.Column<Guid>(type: "uuid", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: false),
                    started_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    finished_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    outcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    recovery_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_web_notification_attempts_web_notification_deliveries_web_n~",
                        column: x => x.web_notification_delivery_id,
                        principalSchema: "website",
                        principalTable: "web_notification_deliveries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_records",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_records_lab_preparation_batches_lab_prepara~",
                        column: x => x.lab_preparation_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_stage_durations",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_timing_policy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stage_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    days = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    day_basis = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_stage_durations", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_stage_durations_lab_timing_policies_lab_timing_policy_id",
                        column: x => x.lab_timing_policy_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_timing_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_attempt_command_receipts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    applied_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_attempt_command_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_attempt_command_receipts_lab_work_orders_lab_work_order~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_forecast_snapshots",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evaluated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_forecast_snapshots", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_forecast_snapshots_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_forecast_transitions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    previous_state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    entered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_forecast_transitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_forecast_transitions_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_job_deadline_changes",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_job_deadline_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_job_deadline_changes_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_job_timing_policies",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_timing_policy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_job_timing_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_job_timing_policies_lab_timing_policies_lab_timing_poli~",
                        column: x => x.lab_timing_policy_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_timing_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_job_timing_policies_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_operations_outbox_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    correlation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    published_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_operations_outbox_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_operations_outbox_events_lab_work_orders_lab_work_order~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_provider_command_receipts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_id = table.Column<Guid>(type: "uuid", nullable: false),
                    correlation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    applied_authorization_version = table.Column<int>(type: "integer", nullable: true),
                    reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    outcome_json = table.Column<string>(type: "jsonb", nullable: false),
                    acknowledged_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_provider_command_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_provider_command_receipts_lab_work_orders_lab_work_orde~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_scientific_approvals",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approval_version = table.Column<int>(type: "integer", nullable: false),
                    release_definition_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    release_definition_version = table.Column<int>(type: "integer", nullable: false),
                    permitted_qc_projection_json = table.Column<string>(type: "jsonb", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_scientific_approvals", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_scientific_approvals_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_specimens",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    accession_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    original_target_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    intake_disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    receipt_condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    intake_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    current_location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    processing_state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    processing_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    processing_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    processing_owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    processing_next_action = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    processing_updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_specimens", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_specimens_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_authorization_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_id = table.Column<Guid>(type: "uuid", nullable: false),
                    correlation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_version = table.Column<int>(type: "integer", nullable: false),
                    contract_version = table.Column<int>(type: "integer", nullable: false),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_authorization_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_authorization_versions_lab_work_orders_lab_work_or~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_prepared_reagent_components",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prepared_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    component_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_prepared_reagent_components", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_prepared_reagent_components_lab_material_lots_component~",
                        column: x => x.component_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_prepared_reagent_components_lab_material_lots_prepared_~",
                        column: x => x.prepared_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
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
                name: "partner_reagent_orders",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resume_status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_order_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipping_address_id = table.Column<Guid>(type: "uuid", nullable: true),
                    shipping_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    placement_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_kit_bundle = table.Column<bool>(type: "boolean", nullable: false),
                    requested_delivery_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    shipping_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fulfilled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_discarded = table.Column<bool>(type: "boolean", nullable: false),
                    tenant_safe_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    internal_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    assigned_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    due_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                        name: "FK_partner_reagent_orders_organization_departments_department_~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_orders_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_orders_partner_shipping_addresses_shipping_~",
                        column: x => x.shipping_address_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_shipping_addresses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_orders_users_assigned_to_user_id",
                        column: x => x.assigned_to_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_sample_import_previews",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    rows_json = table.Column<string>(type: "jsonb", nullable: false),
                    errors_json = table.Column<string>(type: "jsonb", nullable: false),
                    valid_row_count = table.Column<int>(type: "integer", nullable: false),
                    blank_row_count = table.Column<int>(type: "integer", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_sample_import_previews", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_lab_service_orders_lab_service_o~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sample_import_previews_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_samples",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "lab_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_samples_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_quotes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    purpose = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lines_json = table.Column<string>(type: "jsonb", nullable: false),
                    change_scope_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    accepted_amendment_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    change_roster_finalized_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    superseded_by_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    billing_contact_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    billing_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    payment_terms_days_snapshot = table.Column<int>(type: "integer", nullable: true),
                    tax_decision_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    commercial_configuration_version = table.Column<int>(type: "integer", nullable: true),
                    source_request_revision = table.Column<int>(type: "integer", nullable: true),
                    proposed_unit_price_snapshot = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    pricing_decision = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    pricing_decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    pricing_decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    pricing_decided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quotes_lab_service_quotes_superseded_by_quote_id",
                        column: x => x.superseded_by_quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quotes_users_pricing_decided_by_user_id",
                        column: x => x.pricing_decided_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_request_revisions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    previous_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    correction_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_request_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_lab_service_orders_lab_servic~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_lab_service_request_revisions~",
                        column: x => x.previous_revision_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_request_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_service_source_groups",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_biological_source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    specimen_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_source_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_source_groups_lab_service_orders_lab_service_or~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transportation_kit_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_address_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transportation_kit_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_lab_service_orders_lab_service_~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_organization_departments_depart~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transportation_kit_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_location",
                        column: x => x.delivery_location_id,
                        principalSchema: "commercial_ops",
                        principalTable: "customer_delivery_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_requester",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_request_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_provisioning_notices",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "data_governance_incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_provisioning_notices_organization_dataset_grants_organ~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_provisioning_notices_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dataset_download_audits",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_managed_files_managed_file_id",
                        column: x => x.managed_file_id,
                        principalSchema: "commercial_ops",
                        principalTable: "managed_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_organization_dataset_grants_organiz~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_organization_departments_department~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dataset_download_audits_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "provisioning_runs",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    curated_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    organization_dataset_grant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    previous_organization_dataset_grant_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "curated_dataset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_organization_dataset_grants_organization_~",
                        column: x => x.organization_dataset_grant_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_organization_dataset_grants_previous_orga~",
                        column: x => x.previous_organization_dataset_grant_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_dataset_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_provisioning_runs_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
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
                name: "organization_invitation_departments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_invitation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_department_admin = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_invitation_departments", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_invitation_departments_organization_department~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_invitation_departments_organization_invitation~",
                        column: x => x.organization_invitation_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_invitations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: true),
                    container_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_packing_pool = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    departure_delivery_location_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipments", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipments_organization_departments_department_id",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipments_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipments_sample_shipping_destinations_destination_id",
                        column: x => x.destination_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_destinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_sample_shipment_container_revision",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_sample_shipment_departure_location",
                        column: x => x.departure_delivery_location_id,
                        principalSchema: "commercial_ops",
                        principalTable: "customer_delivery_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_container_compatibilities",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    instruction_rule_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_container_compatibilities", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_revision",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_rule",
                        column: x => x.instruction_rule_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_instruction_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_container_compat_sample_type",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_investigation_reports",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    generated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    generated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    format_version = table.Column<int>(type: "integer", nullable: false),
                    body_json = table.Column<string>(type: "text", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_investigation_reports", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_investigation_reports_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_investigation_reports_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_work_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    event_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_work_events_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_work_events_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_reagent_order_lines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    included_assembly_profile_id = table.Column<Guid>(type: "uuid", nullable: true),
                    included_assembly_profile_version = table.Column<int>(type: "integer", nullable: true),
                    included_offering_version = table.Column<long>(type: "bigint", nullable: true),
                    included_assembly_profile_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
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
                        name: "FK_partner_reagent_order_lines_assembly_profiles_included_asse~",
                        column: x => x.included_assembly_profile_id,
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_partner_reagent_offerings_offer~",
                        column: x => x.offering_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_partner_reagent_orders_partner_~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_reagent_order_lines_qbo_catalog_items_qbo_catalog_i~",
                        column: x => x.qbo_catalog_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reagent_shipments",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_orders",
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
                name: "lab_service_quote_extension_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quote_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    replacement_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_quote_extension_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_orders_lab~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_quotes_quo~",
                        column: x => x.quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_quotes_rep~",
                        column: x => x.replacement_quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_users_requested_by_use~",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transportation_kit_request_lines",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transportation_kit_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transportation_kit_request_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_transportation_kit_line_container",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transportation_kit_line_request",
                        column: x => x.transportation_kit_request_id,
                        principalSchema: "commercial_ops",
                        principalTable: "transportation_kit_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "sample_return_kits",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tube_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tube_lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    shipper_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    shipper_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    required_tube_count = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    outbound_carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    outbound_tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    fulfilled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_return_kits", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_return_kits_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_return_kits_sample_shipments_sample_shipment_id",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_packet_revisions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    packet_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    barcode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    destination_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    instruction_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    manifest_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    issued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    voided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    void_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    replaced_by_packet_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_packet_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_packet_revisions_sample_shipments_sample_sh~",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_packet_revisions_sample_shipping_packet_rev~",
                        column: x => x.replaced_by_packet_revision_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_packet_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reagent_order_adjustments",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_order_adjustments_partner_reagent_order_lines_origi~",
                        column: x => x.original_line_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_order_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_order_adjustments_partner_reagent_orders_partner_re~",
                        column: x => x.partner_reagent_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_orders",
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
                name: "reagent_shipment_lines",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "partner_reagent_order_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reagent_shipment_lines_reagent_shipments_reagent_shipment_id",
                        column: x => x.reagent_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "reagent_shipments",
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
                name: "sample_shipping_stock_kits",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    container_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    tube_capacity = table.Column<int>(type: "integer", nullable: false),
                    tube_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tube_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tube_lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    shipper_supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    shipper_product_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tube_supplier_product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    shipper_supplier_product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tube_product_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    shipper_product_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    authorization_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    authorization_source_id = table.Column<Guid>(type: "uuid", nullable: true),
                    bound_sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reserved_sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reserved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reserved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    transportation_kit_request_line_id = table.Column<Guid>(type: "uuid", nullable: true),
                    customer_delivery_location_id = table.Column<Guid>(type: "uuid", nullable: true),
                    customer_received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    customer_received_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    outbound_carrier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    outbound_tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    fulfilled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_stock_kits", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_stock_kits_lab_supplier_products_shipper_su~",
                        column: x => x.shipper_supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipping_stock_kits_lab_supplier_products_tube_suppl~",
                        column: x => x.tube_supplier_product_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_supplier_products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_bound_shipment",
                        column: x => x.bound_sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_container_revision",
                        column: x => x.container_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_container_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_created_by",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_delivery_location",
                        column: x => x.customer_delivery_location_id,
                        principalSchema: "commercial_ops",
                        principalTable: "customer_delivery_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_department",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_organization",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_received_by",
                        column: x => x.customer_received_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_transport_request_line",
                        column: x => x.transportation_kit_request_line_id,
                        principalSchema: "commercial_ops",
                        principalTable: "transportation_kit_request_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_kit_updated_by",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_reserved_by",
                        column: x => x.reserved_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_shipping_stock_reserved_shipment",
                        column: x => x.reserved_sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "registered_sample_tubes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_return_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accessioned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registered_sample_tubes", x => x.id);
                    table.ForeignKey(
                        name: "FK_registered_sample_tubes_sample_return_kits_sample_return_ki~",
                        column: x => x.sample_return_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_return_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipping_stock_tubes",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipping_stock_kit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_stock_tubes", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipping_stock_tube_kit",
                        column: x => x.sample_shipping_stock_kit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_stock_kits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipment_items",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sample_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    registered_sample_tube_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tube_assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipment_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipment_items_registered_sample_tubes_registered_sa~",
                        column: x => x.registered_sample_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "registered_sample_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipment_items_sample_shipments_sample_shipment_id",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipment_items_sample_type_definitions_sample_type_d~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_shipment_tube_slots",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ordinal = table.Column<int>(type: "integer", nullable: false),
                    registered_sample_tube_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tube_assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipment_tube_slots", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipment_tube_slots_registered_sample_tubes_register~",
                        column: x => x.registered_sample_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "registered_sample_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_shipment_tube_slots_sample_shipment_items_sample_shi~",
                        column: x => x.sample_shipment_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipment_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sample_tube_assignment_events",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_shipment_tube_slot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    registered_sample_tube_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_sample_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_tube_assignment_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_registered_sample_tubes_regis~",
                        column: x => x.registered_sample_tube_id,
                        principalSchema: "commercial_ops",
                        principalTable: "registered_sample_tubes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_sample_shipment_items_sample_~",
                        column: x => x.sample_shipment_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipment_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_sample_shipment_tube_slots_sa~",
                        column: x => x.sample_shipment_tube_slot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipment_tube_slots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sample_tube_assignment_events_sample_shipments_sample_shipm~",
                        column: x => x.sample_shipment_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_input_revisions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_input_revisions_partner_kit_units_kit_unit_id",
                        column: x => x.kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_input_revisions_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_output_releases",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_assembly_output_releases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "assembly_processing_runs",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_input_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_assembly_quotes",
                schema: "commercial_ops",
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
                        principalSchema: "commercial_ops",
                        principalTable: "data_assembly_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "data_assembly_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_assembly_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kit_profile_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                    assigned_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    due_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                        principalSchema: "commercial_ops",
                        principalTable: "assembly_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_assembly_requests_organization_departments_department_~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_assembly_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_data_assembly_requests_users_assigned_to_user_id",
                        column: x => x.assigned_to_user_id,
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

            migrationBuilder.CreateTable(
                name: "lab_analysis_inputs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_sequencing_output_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analysis_inputs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_analysis_runs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    requirements_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    scientific_evidence_json = table.Column<string>(type: "jsonb", nullable: true),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    run_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    previous_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reanalysis_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    request_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    recorded_by_source = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analysis_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_analysis_runs_lab_analysis_runs_previous_analysis_run_id",
                        column: x => x.previous_analysis_run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_analysis_runs_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_analysis_runs_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_result_releases",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: true),
                    traceability_required = table.Column<bool>(type: "boolean", nullable: false),
                    result_locator = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                    table.CheckConstraint("ck_lab_release_required_lineage", "NOT traceability_required OR (lab_analysis_run_id IS NOT NULL AND result_locator IS NOT NULL AND length(btrim(result_locator)) > 0)");
                    table.ForeignKey(
                        name: "FK_lab_result_releases_lab_analysis_runs_lab_analysis_run_id",
                        column: x => x.lab_analysis_run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_lab_samples_lab_sample_id",
                        column: x => x.lab_sample_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_samples",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_lab_service_orders_lab_service_order_id",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_result_releases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_batch_members",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_operational_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_library_id = table.Column<Guid>(type: "uuid", nullable: false),
                    added_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_batch_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_batch_members_lab_operational_batches_lab_operational_b~",
                        column: x => x.lab_operational_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_operational_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_batch_members_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_containers",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: true),
                    parent_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    barcode_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    external_barcode_reference_id = table.Column<Guid>(type: "uuid", nullable: true),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    label_print_count = table.Column<int>(type: "integer", nullable: false),
                    last_label_printed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_label_printed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    disposition_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    retain_until_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    intake_disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    intake_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    intake_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    intake_reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    intake_reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_containers", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_containers_lab_containers_parent_container_id",
                        column: x => x.parent_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_containers_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_containers_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_custody_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    event_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location_or_party = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_custody_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_custody_events_lab_containers_lab_container_id",
                        column: x => x.lab_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_custody_events_lab_ngs_sendouts_lab_ngs_sendout_id",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_equipment_usages",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resource_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    lab_preparation_record_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_protocol_execution_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_equipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    used_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_equipment_usages", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_equipment_usages_lab_equipment_lab_equipment_id",
                        column: x => x.lab_equipment_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_equipment",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_equipment_usages_lab_preparation_records_lab_preparatio~",
                        column: x => x.lab_preparation_record_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_records",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_exceptions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_protocol_execution_id = table.Column<Guid>(type: "uuid", nullable: true),
                    audience = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    category_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    internal_description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    customer_safe_summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    is_blocking = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    response_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_exceptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_exceptions_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_exceptions_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_libraries",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    library_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_execution_id = table.Column<Guid>(type: "uuid", nullable: false),
                    library_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qc_results_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_libraries", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_libraries_lab_containers_library_container_id",
                        column: x => x.library_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_libraries_lab_containers_source_container_id",
                        column: x => x.source_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_libraries_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_libraries_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_material_consumptions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resource_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    lab_preparation_record_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_protocol_execution_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_material_consumptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_material_consumptions_lab_containers_output_container_id",
                        column: x => x.output_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_material_consumptions_lab_material_lots_lab_material_lo~",
                        column: x => x.lab_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_material_consumptions_lab_preparation_records_lab_prepa~",
                        column: x => x.lab_preparation_record_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_records",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_performance_decisions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_performance_decisions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_performance_proposals",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_protocol_execution_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    based_on_proposal_id = table.Column<Guid>(type: "uuid", nullable: true),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    performance_json = table.Column<string>(type: "jsonb", nullable: false),
                    original_performance_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_performance_proposals", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_performance_proposals_lab_performance_proposals_based_o~",
                        column: x => x.based_on_proposal_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_performance_proposals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_performance_proposals_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_performance_proposals_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_members",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    confirmed_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    removed = table.Column<bool>(type: "boolean", nullable: false),
                    output_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    lab_library_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_containers_output_container_id",
                        column: x => x.output_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_libraries_lab_library_id",
                        column: x => x.lab_library_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_libraries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_preparation_batches_lab_prepara~",
                        column: x => x.lab_preparation_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_protocol_executions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_protocol_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_stage_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assigned_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    captured_results_json = table.Column<string>(type: "jsonb", nullable: false),
                    deviation_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_protocol_executions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_protocol_executions_lab_protocol_versions_lab_protocol_~",
                        column: x => x.lab_protocol_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_protocol_executions_lab_service_workflow_stages_lab_ser~",
                        column: x => x.lab_service_workflow_stage_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_stages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_protocol_executions_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_protocol_executions_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_specimen_attempts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    previous_attempt_id = table.Column<Guid>(type: "uuid", nullable: true),
                    state = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    failure_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    failure_evidence = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    failed_execution_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hold_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    hold_owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hold_next_action = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    stage_skips_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_specimen_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_containers_source_container_id",
                        column: x => x.source_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_protocol_executions_failed_execut~",
                        column: x => x.failed_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_service_workflow_versions_lab_ser~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_specimen_attempts_previous_attemp~",
                        column: x => x.previous_attempt_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimen_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_specimen_attempts_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_sequencing_outputs",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    scientific_evidence_json = table.Column<string>(type: "jsonb", nullable: true),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_library_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    provider_run_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    sample_mapping_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    external_file_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    corrects_output_id = table.Column<Guid>(type: "uuid", nullable: true),
                    correction_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    lineage_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    request_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    external_identity_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    recorded_by_source = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_sequencing_outputs", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_containers_source_container_id",
                        column: x => x.source_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_libraries_lab_library_id",
                        column: x => x.lab_library_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_libraries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_ngs_sendouts_lab_ngs_sendout_id",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_sequencing_outputs_corrects_outp~",
                        column: x => x.corrects_output_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_sequencing_outputs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_specimen_attempts_lab_specimen_a~",
                        column: x => x.lab_specimen_attempt_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimen_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_sequencing_outputs_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "operational_download_commit_evidence",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operational_file_download_id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_transaction_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    admission_cutoff_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    committed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_download_commit_evidence", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "operational_file_downloads",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transfer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    managed_operational_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    result_artifact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    released_package_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    released_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lease_expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    terminal_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    outcome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    terminal_reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    counts_for_released_package_retention = table.Column<bool>(type: "boolean", nullable: false),
                    remote_address = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_file_downloads", x => x.id);
                    table.CheckConstraint("ck_operational_download_file_target", "(managed_operational_file_id IS NOT NULL AND result_artifact_id IS NULL AND released_package_type <> 'PSeqResult') OR (managed_operational_file_id IS NULL AND result_artifact_id IS NOT NULL AND released_package_type = 'PSeqResult')");
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_managed_operational_files_manage~",
                        column: x => x.managed_operational_file_id,
                        principalSchema: "commercial_ops",
                        principalTable: "managed_operational_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_operational_file_downloads_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "released_deliverable_preservation_holds",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    retention_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    placed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    placed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    released_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    release_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_preservation_holds", x => x.id);
                    table.ForeignKey(
                        name: "FK_released_deliverable_preservation_holds_users_placed_by_use~",
                        column: x => x.placed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_preservation_holds_users_released_by_u~",
                        column: x => x.released_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "released_deliverable_reissues",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    replacement_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorized_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorized_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_reissues", x => x.id);
                    table.ForeignKey(
                        name: "FK_released_deliverable_reissues_users_authorized_by_user_id",
                        column: x => x.authorized_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "released_deliverable_retention_snapshots",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_result_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assembly_output_release_id = table.Column<Guid>(type: "uuid", nullable: true),
                    trial_result_release_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                    warning_checkpoint_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    warning_checkpoint_outcome = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    warning_notification_id = table.Column<Guid>(type: "uuid", nullable: true),
                    standard_checkpoint_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    grace_notification_id = table.Column<Guid>(type: "uuid", nullable: true),
                    grace_activated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    download_access_closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    byte_deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deletion_outcome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    receipt_lineage_json = table.Column<string>(type: "text", nullable: true),
                    is_quarantined = table.Column<bool>(type: "boolean", nullable: false),
                    deletion_attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_deletion_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_deletion_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_retention_snapshots", x => x.id);
                    table.CheckConstraint("ck_released_retention_snapshot_one_package", "num_nonnulls(lab_result_release_id, assembly_output_release_id, trial_result_release_id) = 1");
                    table.ForeignKey(
                        name: "FK_released_deliverable_retention_snapshots_order_notification~",
                        column: x => x.grace_notification_id,
                        principalSchema: "commercial_ops",
                        principalTable: "order_notifications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_retention_snapshots_order_notificatio~1",
                        column: x => x.warning_notification_id,
                        principalSchema: "commercial_ops",
                        principalTable: "order_notifications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                    result_locator = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                });

            migrationBuilder.CreateTable(
                name: "result_output_packages",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    trial_project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    trial_sample_id = table.Column<Guid>(type: "uuid", nullable: true),
                    package_version = table.Column<int>(type: "integer", nullable: false),
                    corrects_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: true),
                    traceability_required = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.CheckConstraint("ck_result_output_package_parent", "(lab_service_order_id IS NOT NULL AND lab_sample_id IS NOT NULL AND trial_project_id IS NULL AND trial_sample_id IS NULL) OR (lab_service_order_id IS NULL AND lab_sample_id IS NULL AND trial_project_id IS NOT NULL AND trial_sample_id IS NOT NULL)");
                    table.CheckConstraint("ck_result_package_required_lineage", "NOT traceability_required OR lab_analysis_run_id IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_result_output_packages_lab_analysis_runs_lab_analysis_run_id",
                        column: x => x.lab_analysis_run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "result_retention_schedules",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    retention_snapshot_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                        name: "FK_result_retention_schedules_released_deliverable_retention_s~",
                        column: x => x.retention_snapshot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_retention_snapshots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_result_retention_schedules_result_output_packages_result_ou~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
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
                    draft_scope_json = table.Column<string>(type: "jsonb", nullable: true),
                    draft_saved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    draft_saved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                        name: "FK_trial_projects_users_draft_saved_by_user_id",
                        column: x => x.draft_saved_by_user_id,
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
                table: "crm_pipelines",
                columns: new[] { "id", "created_at", "created_by_user_id", "description", "is_active", "is_default", "name", "updated_at", "updated_by_user_id", "version" },
                values: new object[] { new Guid("20000000-0000-0000-0000-000000000001"), new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, "Default standalone commercial opportunity pipeline.", true, true, "General Sales", new DateTime(2026, 8, 26, 0, 0, 0, 0, DateTimeKind.Utc), null, 1L });

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

            migrationBuilder.InsertData(
                schema: "website",
                table: "web_notification_processing_controls",
                columns: new[] { "id", "is_paused", "reason", "updated_at_utc", "updated_by_user_id", "version" },
                values: new object[] { new Guid("526a3498-feb3-4a94-a5f2-9277c2bc9c97"), false, null, null, null, new Guid("a6d4f4cc-c523-4a08-86f7-5d2bb44a1099") });

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
                name: "IX_analysis_definitions_is_active_name",
                schema: "commercial_ops",
                table: "analysis_definitions",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_definitions_qbo_catalog_item_id",
                schema: "commercial_ops",
                table: "analysis_definitions",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_data_assembly_request_id_revision",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                columns: new[] { "data_assembly_request_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_kit_unit_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_previous_revision_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "previous_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_submitted_by_user_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_data_assembly_request_id_release_v~",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                columns: new[] { "data_assembly_request_id", "release_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_input_revision_id",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                column: "input_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_organization_id_release_status",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                columns: new[] { "organization_id", "release_status" });

            migrationBuilder.CreateIndex(
                name: "IX_assembly_output_releases_processing_run_id",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                column: "processing_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_processing_runs_data_assembly_request_id_run_number",
                schema: "commercial_ops",
                table: "assembly_processing_runs",
                columns: new[] { "data_assembly_request_id", "run_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_processing_runs_input_revision_id",
                schema: "commercial_ops",
                table: "assembly_processing_runs",
                column: "input_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_is_active_name",
                schema: "commercial_ops",
                table: "assembly_profiles",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_name_profile_version",
                schema: "commercial_ops",
                table: "assembly_profiles",
                columns: new[] { "name", "profile_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assembly_profiles_qbo_catalog_item_id",
                schema: "commercial_ops",
                table: "assembly_profiles",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_actor_user_id",
                schema: "commercial_ops",
                table: "audit_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_entity_name_entity_id",
                schema: "commercial_ops",
                table: "audit_events",
                columns: new[] { "entity_name", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_occurred_at",
                schema: "commercial_ops",
                table: "audit_events",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_organization_id",
                schema: "commercial_ops",
                table: "audit_events",
                column: "organization_id");

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
                name: "IX_commercial_document_links_external_document_id",
                schema: "commercial_ops",
                table: "commercial_document_links",
                column: "external_document_id");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_document_links_sync_status",
                schema: "commercial_ops",
                table: "commercial_document_links",
                column: "sync_status");

            migrationBuilder.CreateIndex(
                name: "IX_commercial_document_links_workflow_type_workflow_id_kind",
                schema: "commercial_ops",
                table: "commercial_document_links",
                columns: new[] { "workflow_type", "workflow_id", "kind" });

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
                name: "IX_crm_companies_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "access_organization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_domain_name",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "domain_name");

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_is_active_name",
                schema: "commercial_ops",
                table: "crm_companies",
                columns: new[] { "is_active", "name" });

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
                name: "IX_crm_companies_name",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_owner_user_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "company_id", "contact_id" },
                unique: true,
                filter: "is_active = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_contact_id_is_primary_company",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "contact_id", "is_primary_company" },
                unique: true,
                filter: "is_active = TRUE AND is_primary_company = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contact_user_links_contact_id",
                schema: "commercial_ops",
                table: "crm_contact_user_links",
                column: "contact_id",
                unique: true,
                filter: "is_active = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contact_user_links_user_id",
                schema: "commercial_ops",
                table: "crm_contact_user_links",
                column: "user_id",
                unique: true,
                filter: "is_active = TRUE");

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
                name: "IX_crm_opportunities_opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "opportunity_number",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_version_files_curated_dataset_version_id_ma~",
                schema: "commercial_ops",
                table: "curated_dataset_version_files",
                columns: new[] { "curated_dataset_version_id", "managed_file_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_version_files_managed_file_id",
                schema: "commercial_ops",
                table: "curated_dataset_version_files",
                column: "managed_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_versions_curated_dataset_id_version_number",
                schema: "commercial_ops",
                table: "curated_dataset_versions",
                columns: new[] { "curated_dataset_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curated_dataset_versions_source_sample_id_source_revision",
                schema: "commercial_ops",
                table: "curated_dataset_versions",
                columns: new[] { "source_sample_id", "source_revision" });

            migrationBuilder.CreateIndex(
                name: "IX_curated_datasets_eligible_version_id",
                schema: "commercial_ops",
                table: "curated_datasets",
                column: "eligible_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_curated_datasets_name",
                schema: "commercial_ops",
                table: "curated_datasets",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_created_by_user_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_department_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_organization_id_department_id_i~",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                columns: new[] { "organization_id", "department_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_delivery_locations_updated_by_user_id",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_customer_delivery_location_default",
                schema: "commercial_ops",
                table: "customer_delivery_locations",
                columns: new[] { "organization_id", "department_id" },
                unique: true,
                filter: "is_active = TRUE AND is_default = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_quotes_data_assembly_request_id_revision",
                schema: "commercial_ops",
                table: "data_assembly_quotes",
                columns: new[] { "data_assembly_request_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_quotes_superseded_by_quote_id",
                schema: "commercial_ops",
                table: "data_assembly_quotes",
                column: "superseded_by_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_assembly_profile_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_assigned_to_user_id_due_at",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_department_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_kit_assembly_case_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "kit_assembly_case_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_project_reference",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "project_reference" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_request_number",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "request_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_incident_id_organiza~",
                schema: "commercial_ops",
                table: "data_governance_affected_organizations",
                columns: new[] { "incident_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_organization_id",
                schema: "commercial_ops",
                table: "data_governance_affected_organizations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_organizations_status",
                schema: "commercial_ops",
                table: "data_governance_affected_organizations",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_versions_curated_dataset_version_id",
                schema: "commercial_ops",
                table: "data_governance_affected_versions",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_affected_versions_incident_id_curated_datas~",
                schema: "commercial_ops",
                table: "data_governance_affected_versions",
                columns: new[] { "incident_id", "curated_dataset_version_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_actor_user_id",
                schema: "commercial_ops",
                table: "data_governance_follow_ups",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_incident_id_occurred_at",
                schema: "commercial_ops",
                table: "data_governance_follow_ups",
                columns: new[] { "incident_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_follow_ups_organization_id",
                schema: "commercial_ops",
                table: "data_governance_follow_ups",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_incidents_source_sample_id",
                schema: "commercial_ops",
                table: "data_governance_incidents",
                column: "source_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_governance_incidents_status",
                schema: "commercial_ops",
                table: "data_governance_incidents",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_incident_id",
                schema: "commercial_ops",
                table: "data_provisioning_notices",
                column: "incident_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_organization_dataset_grant_id",
                schema: "commercial_ops",
                table: "data_provisioning_notices",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_organization_id_created_at",
                schema: "commercial_ops",
                table: "data_provisioning_notices",
                columns: new[] { "organization_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_provisioning_notices_status_next_attempt_at",
                schema: "commercial_ops",
                table: "data_provisioning_notices",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_curated_dataset_version_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_department_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_downloaded_at",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "downloaded_at");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_managed_file_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "managed_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_dataset_grant_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_organization_id_department_id_downl~",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                columns: new[] { "organization_id", "department_id", "downloaded_at" });

            migrationBuilder.CreateIndex(
                name: "IX_dataset_download_audits_user_id",
                schema: "commercial_ops",
                table: "dataset_download_audits",
                column: "user_id");

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
                name: "IX_lab_analysis_inputs_lab_analysis_run_id_lab_sequencing_outp~",
                schema: "lab_ops",
                table: "lab_analysis_inputs",
                columns: new[] { "lab_analysis_run_id", "lab_sequencing_output_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_inputs_lab_sequencing_output_id",
                schema: "lab_ops",
                table: "lab_analysis_inputs",
                column: "lab_sequencing_output_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_runs_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                column: "lab_specimen_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_runs_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_runs_lab_work_order_id_lab_specimen_id_recorde~",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                columns: new[] { "lab_work_order_id", "lab_specimen_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_runs_previous_analysis_run_id",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                column: "previous_analysis_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_runs_provider_key_run_reference_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                columns: new[] { "provider_key", "run_reference", "lab_specimen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_attempt_command_receipts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_attempt_command_receipts",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_authorizations_authorization_id",
                schema: "commercial_ops",
                table: "lab_authorizations",
                column: "authorization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_authorizations_command_id",
                schema: "commercial_ops",
                table: "lab_authorizations",
                column: "command_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_authorizations_commercial_order_id",
                schema: "commercial_ops",
                table: "lab_authorizations",
                column: "commercial_order_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_authorizations_organization_id_status",
                schema: "commercial_ops",
                table: "lab_authorizations",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_batch_members_lab_library_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "lab_library_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_batch_members_lab_operational_batch_id_lab_library_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                columns: new[] { "lab_operational_batch_id", "lab_library_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_batch_members_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_business_calendars_revision",
                schema: "lab_ops",
                table: "lab_business_calendars",
                column: "revision",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_external_barcode_reference_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "external_barcode_reference_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "lab_specimen_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_lab_work_order_id_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_containers",
                columns: new[] { "lab_work_order_id", "lab_specimen_id" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_parent_container_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "parent_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_custody_events_lab_container_id",
                schema: "lab_ops",
                table: "lab_custody_events",
                column: "lab_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_custody_events_lab_ngs_sendout_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_custody_events",
                columns: new[] { "lab_ngs_sendout_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_asset_code",
                schema: "lab_ops",
                table: "lab_equipment",
                column: "asset_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_status_calibration_due_on",
                schema: "lab_ops",
                table: "lab_equipment",
                columns: new[] { "status", "calibration_due_on" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_usages_lab_equipment_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_equipment_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_usages_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_preparation_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_usages_lab_protocol_execution_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_protocol_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_exceptions_audience_status_response_due_at_utc",
                schema: "lab_ops",
                table: "lab_exceptions",
                columns: new[] { "audience", "status", "response_due_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_exceptions_lab_protocol_execution_id",
                schema: "lab_ops",
                table: "lab_exceptions",
                column: "lab_protocol_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_exceptions_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_exceptions",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_exceptions_lab_work_order_id_status",
                schema: "lab_ops",
                table: "lab_exceptions",
                columns: new[] { "lab_work_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_forecast_snapshots_lab_work_order_id_evaluated_at_utc",
                schema: "lab_ops",
                table: "lab_forecast_snapshots",
                columns: new[] { "lab_work_order_id", "evaluated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_forecast_transitions_lab_work_order_id_source_kind_sour~",
                schema: "lab_ops",
                table: "lab_forecast_transitions",
                columns: new[] { "lab_work_order_id", "source_kind", "source_id", "entered_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_holidays_lab_business_calendar_id_date",
                schema: "lab_ops",
                table: "lab_holidays",
                columns: new[] { "lab_business_calendar_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_investigation_reports_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_investigation_reports",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_investigation_reports_lab_work_order_id_lab_specimen_id~",
                schema: "lab_ops",
                table: "lab_investigation_reports",
                columns: new[] { "lab_work_order_id", "lab_specimen_id", "generated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_deadline_changes_lab_work_order_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_job_deadline_changes",
                columns: new[] { "lab_work_order_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_timing_policies_lab_timing_policy_id",
                schema: "lab_ops",
                table: "lab_job_timing_policies",
                column: "lab_timing_policy_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_job_timing_policies_lab_work_order_id_revision",
                schema: "lab_ops",
                table: "lab_job_timing_policies",
                columns: new[] { "lab_work_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_lab_work_order_id_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_libraries",
                columns: new[] { "lab_work_order_id", "lab_specimen_id" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_library_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "library_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_library_key",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "library_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_preparation_execution_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "preparation_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_source_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "source_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_consumptions_lab_material_lot_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_consumptions_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_preparation_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_consumptions_lab_protocol_execution_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_protocol_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_consumptions_output_container_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "output_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_definitions_key",
                schema: "lab_ops",
                table: "lab_material_definitions",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_definitions_kind_is_active_name",
                schema: "lab_ops",
                table: "lab_material_definitions",
                columns: new[] { "kind", "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_material_definition_id_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "material_definition_id", "lot_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_qc_disposition_expiration_or_retest_date",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "qc_disposition", "expiration_or_retest_date" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "storage_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_ngs_sendouts_lab_operational_batch_id",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "lab_operational_batch_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_ngs_sendouts_provider_reference",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                column: "provider_reference");

            migrationBuilder.CreateIndex(
                name: "IX_lab_operational_batches_batch_number",
                schema: "lab_ops",
                table: "lab_operational_batches",
                column: "batch_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_operations_event_receipts_authorization_id_projection_v~",
                schema: "commercial_ops",
                table: "lab_operations_event_receipts",
                columns: new[] { "authorization_id", "projection_version" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_operations_event_receipts_event_id",
                schema: "commercial_ops",
                table: "lab_operations_event_receipts",
                column: "event_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_operations_outbox_events_authorization_id_projection_ve~",
                schema: "lab_ops",
                table: "lab_operations_outbox_events",
                columns: new[] { "authorization_id", "projection_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_operations_outbox_events_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_operations_outbox_events",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_operations_outbox_events_published_at_utc_occurred_at_u~",
                schema: "lab_ops",
                table: "lab_operations_outbox_events",
                columns: new[] { "published_at_utc", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_performance_proposals_based_on_proposal_id",
                schema: "lab_ops",
                table: "lab_performance_proposals",
                column: "based_on_proposal_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_performance_proposals_lab_protocol_execution_id_step_re~",
                schema: "lab_ops",
                table: "lab_performance_proposals",
                columns: new[] { "lab_protocol_execution_id", "step_record_id", "requested_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_performance_proposals_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_performance_proposals",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_performance_proposals_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_performance_proposals",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_lab_tray_format_id",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "lab_tray_format_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_tray_barcode",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "tray_barcode",
                unique: true,
                filter: "tray_barcode IS NOT NULL AND status IN ('Draft', 'InProgress')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_library_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "lab_library_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_preparation_batch_id_position",
                schema: "lab_ops",
                table: "lab_preparation_members",
                columns: new[] { "lab_preparation_batch_id", "position" },
                unique: true,
                filter: "NOT removed");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "lab_specimen_attempt_id",
                unique: true,
                filter: "NOT removed");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_output_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "output_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_records_lab_preparation_batch_id_recorded_a~",
                schema: "lab_ops",
                table: "lab_preparation_records",
                columns: new[] { "lab_preparation_batch_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_prepared_reagent_components_component_material_lot_id",
                schema: "lab_ops",
                table: "lab_prepared_reagent_components",
                column: "component_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_prepared_reagent_components_prepared_material_lot_id_co~",
                schema: "lab_ops",
                table: "lab_prepared_reagent_components",
                columns: new[] { "prepared_material_lot_id", "component_material_lot_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_product_types_normalized_name",
                schema: "lab_ops",
                table: "lab_product_types",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_protocol_version_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_protocol_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_service_workflow_stage_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_service_workflow_stage_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_specimen_attempt_id_lab_service~",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                columns: new[] { "lab_specimen_attempt_id", "lab_service_workflow_stage_id" },
                unique: true,
                filter: "lab_specimen_attempt_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_executions_lab_work_order_id_status",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                columns: new[] { "lab_work_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocol_versions_lab_protocol_id_protocol_version",
                schema: "lab_ops",
                table: "lab_protocol_versions",
                columns: new[] { "lab_protocol_id", "protocol_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_protocols_key",
                schema: "lab_ops",
                table: "lab_protocols",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_authorization_id_acknowledged~",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                columns: new[] { "authorization_id", "acknowledged_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_command_id",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                column: "command_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_lab_analysis_run_id",
                schema: "commercial_ops",
                table: "lab_result_releases",
                column: "lab_analysis_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_lab_sample_id_release_version",
                schema: "commercial_ops",
                table: "lab_result_releases",
                columns: new[] { "lab_sample_id", "release_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_lab_service_order_id",
                schema: "commercial_ops",
                table: "lab_result_releases",
                column: "lab_service_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_result_releases_organization_id_release_status",
                schema: "commercial_ops",
                table: "lab_result_releases",
                columns: new[] { "organization_id", "release_status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_role_assignments_user_id_role",
                schema: "lab_ops",
                table: "lab_role_assignments",
                columns: new[] { "user_id", "role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_role_invitation_intents_organization_invitation_id_role",
                schema: "lab_ops",
                table: "lab_role_invitation_intents",
                columns: new[] { "organization_invitation_id", "role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_actor_user_id",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_expires_at",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_lab_service_order_id_created_at",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                columns: new[] { "lab_service_order_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_sample_import_previews_organization_id",
                schema: "commercial_ops",
                table: "lab_sample_import_previews",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_accession_id",
                schema: "commercial_ops",
                table: "lab_samples",
                column: "accession_id",
                unique: true,
                filter: "\"accession_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_lab_service_order_id_customer_sample_id",
                schema: "commercial_ops",
                table: "lab_samples",
                columns: new[] { "lab_service_order_id", "customer_sample_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_lab_service_order_id_status",
                schema: "commercial_ops",
                table: "lab_samples",
                columns: new[] { "lab_service_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_samples_replacement_for_sample_id",
                schema: "commercial_ops",
                table: "lab_samples",
                column: "replacement_for_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_lab_work_order_id_approval_version",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                columns: new[] { "lab_work_order_id", "approval_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_lab_work_order_id_projection_versi~",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                columns: new[] { "lab_work_order_id", "projection_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_approvals_result_output_package_id",
                schema: "lab_ops",
                table: "lab_scientific_approvals",
                column: "result_output_package_id",
                unique: true,
                filter: "\"result_output_package_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_corrects_output_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "corrects_output_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_external_identity_sha256",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "external_identity_sha256",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_library_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "lab_library_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_ngs_sendout_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "lab_ngs_sendout_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "lab_specimen_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_lab_work_order_id_lab_specimen_id_re~",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                columns: new[] { "lab_work_order_id", "lab_specimen_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_sequencing_outputs_source_container_id",
                schema: "lab_ops",
                table: "lab_sequencing_outputs",
                column: "source_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_catalog_item_id_is_active_effective_f~",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                columns: new[] { "catalog_item_id", "is_active", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_family_id_offering_version",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                columns: new[] { "family_id", "offering_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_assigned_to_user_id_due_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_current_quote_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "current_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_department_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_lab_service_offering_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "lab_service_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_order_number",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_department_id_normalized~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "department_id", "normalized_job_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_department_id_status_cre~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "price_proposed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_sample_roster_finalized_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "sample_roster_finalized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_source_request_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "source_request_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_lab_service_order_id_r~",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                columns: new[] { "lab_service_order_id", "resolved_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_quote_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "quote_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_replacement_quote_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "replacement_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_requested_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_lab_service_order_id_revision",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                columns: new[] { "lab_service_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                column: "pricing_decided_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_superseded_by_quote_id",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                column: "superseded_by_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_lab_service_order_id_revision",
                schema: "commercial_ops",
                table: "lab_service_request_revisions",
                columns: new[] { "lab_service_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_previous_revision_id",
                schema: "commercial_ops",
                table: "lab_service_request_revisions",
                column: "previous_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_submitted_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_request_revisions",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_sample_types_lab_service_offering_id_sample_typ~",
                schema: "commercial_ops",
                table: "lab_service_sample_types",
                columns: new[] { "lab_service_offering_id", "sample_type_definition_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_sample_types_sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_sample_types",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_source_groups_lab_service_order_id_normalized_b~",
                schema: "commercial_ops",
                table: "lab_service_source_groups",
                columns: new[] { "lab_service_order_id", "normalized_biological_source" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_stages_lab_protocol_version_id",
                schema: "lab_ops",
                table: "lab_service_workflow_stages",
                column: "lab_protocol_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_stages_lab_service_workflow_version_id~",
                schema: "lab_ops",
                table: "lab_service_workflow_stages",
                columns: new[] { "lab_service_workflow_version_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflow_versions_lab_service_workflow_id_workf~",
                schema: "lab_ops",
                table: "lab_service_workflow_versions",
                columns: new[] { "lab_service_workflow_id", "workflow_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_workflows_service_key",
                schema: "lab_ops",
                table: "lab_service_workflows",
                column: "service_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_failed_execution_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "failed_execution_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_specimen_id",
                unique: true,
                filter: "state IN ('Planned', 'InProgress', 'OnHold', 'Succeeded')");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_specimen_id_sequence",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                columns: new[] { "lab_specimen_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_previous_attempt_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "previous_attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimen_attempts_source_container_id",
                schema: "lab_ops",
                table: "lab_specimen_attempts",
                column: "source_container_id",
                unique: true,
                filter: "state <> 'Cancelled'");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_accession_number",
                schema: "lab_ops",
                table: "lab_specimens",
                column: "accession_number",
                unique: true,
                filter: "\"accession_number\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_intake_disposition_received_at_utc",
                schema: "lab_ops",
                table: "lab_specimens",
                columns: new[] { "intake_disposition", "received_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_specimens_lab_work_order_id_submitted_specimen_id",
                schema: "lab_ops",
                table: "lab_specimens",
                columns: new[] { "lab_work_order_id", "submitted_specimen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_stage_durations_lab_timing_policy_id_stage_key",
                schema: "lab_ops",
                table: "lab_stage_durations",
                columns: new[] { "lab_timing_policy_id", "stage_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_step_versions_lab_step_id_step_version",
                schema: "lab_ops",
                table: "lab_step_versions",
                columns: new[] { "lab_step_id", "step_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_steps_key",
                schema: "lab_ops",
                table: "lab_steps",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_locations_is_active_name",
                schema: "lab_ops",
                table: "lab_storage_locations",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_locations_normalized_name",
                schema: "lab_ops",
                table: "lab_storage_locations",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_products_product_type_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                column: "product_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_products_supplier_id_normalized_product_number",
                schema: "lab_ops",
                table: "lab_supplier_products",
                columns: new[] { "supplier_id", "normalized_product_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_suppliers_is_active_name",
                schema: "lab_ops",
                table: "lab_suppliers",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_suppliers_normalized_name",
                schema: "lab_ops",
                table: "lab_suppliers",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_timing_policies_lab_business_calendar_id",
                schema: "lab_ops",
                table: "lab_timing_policies",
                column: "lab_business_calendar_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_timing_policies_lab_service_workflow_version_id_revision",
                schema: "lab_ops",
                table: "lab_timing_policies",
                columns: new[] { "lab_service_workflow_version_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_authorization_versions_command_id",
                schema: "lab_ops",
                table: "lab_work_authorization_versions",
                column: "command_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_authorization_versions_lab_work_order_id_authoriza~",
                schema: "lab_ops",
                table: "lab_work_authorization_versions",
                columns: new[] { "lab_work_order_id", "authorization_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_events_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_work_events",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_events_lab_work_order_id_occurred_at_utc",
                schema: "lab_ops",
                table: "lab_work_events",
                columns: new[] { "lab_work_order_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_authorization_id",
                schema: "lab_ops",
                table: "lab_work_orders",
                column: "authorization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_work_orders",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_orders_submitting_organization_id_status_created_at",
                schema: "lab_ops",
                table: "lab_work_orders",
                columns: new[] { "submitting_organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_projections_authorization_id",
                schema: "commercial_ops",
                table: "lab_work_projections",
                column: "authorization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_work_projections_lab_work_order_id",
                schema: "commercial_ops",
                table: "lab_work_projections",
                column: "lab_work_order_id",
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
                name: "IX_managed_files_source_sample_id",
                schema: "commercial_ops",
                table: "managed_files",
                column: "source_sample_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_files_storage_key",
                schema: "commercial_ops",
                table: "managed_files",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_organization_id_workflow_type_wor~",
                schema: "commercial_ops",
                table: "managed_operational_files",
                columns: new[] { "organization_id", "workflow_type", "workflow_id" });

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_parent_record_id",
                schema: "commercial_ops",
                table: "managed_operational_files",
                column: "parent_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_managed_operational_files_storage_key",
                schema: "commercial_ops",
                table: "managed_operational_files",
                column: "storage_key",
                unique: true);

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
                name: "IX_operational_download_commit_evidence_operational_file_downl~",
                schema: "commercial_ops",
                table: "operational_download_commit_evidence",
                columns: new[] { "operational_file_download_id", "phase" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_download_commit_evidence_recorded_at_utc",
                schema: "commercial_ops",
                table: "operational_download_commit_evidence",
                column: "recorded_at_utc",
                filter: "committed_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_managed_operational_file_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "managed_operational_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_organization_id_released_package~",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                columns: new[] { "organization_id", "released_package_type", "released_package_id" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_organization_id_started_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                columns: new[] { "organization_id", "started_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_outcome_lease_expires_at_utc",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                columns: new[] { "outcome", "lease_expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_result_artifact_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "result_artifact_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_transfer_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "transfer_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_file_downloads_user_id",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_decided_by_user_id",
                schema: "commercial_ops",
                table: "order_cancellation_requests",
                column: "decided_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_organization_id",
                schema: "commercial_ops",
                table: "order_cancellation_requests",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_requested_by_user_id",
                schema: "commercial_ops",
                table: "order_cancellation_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_cancellation_requests_workflow_type_workflow_id_status",
                schema: "commercial_ops",
                table: "order_cancellation_requests",
                columns: new[] { "workflow_type", "workflow_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_order_idempotency_records_actor_user_id_scope_idempotency_k~",
                schema: "commercial_ops",
                table: "order_idempotency_records",
                columns: new[] { "actor_user_id", "scope", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_idempotency_records_created_at",
                schema: "commercial_ops",
                table: "order_idempotency_records",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_department_id",
                schema: "commercial_ops",
                table: "order_notifications",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_organization_id_created_at",
                schema: "commercial_ops",
                table: "order_notifications",
                columns: new[] { "organization_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_recipient_user_id",
                schema: "commercial_ops",
                table: "order_notifications",
                column: "recipient_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_status_next_attempt_at",
                schema: "commercial_ops",
                table: "order_notifications",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_workflow_type_workflow_id_event_type",
                schema: "commercial_ops",
                table: "order_notifications",
                columns: new[] { "workflow_type", "workflow_id", "event_type" },
                unique: true,
                filter: "workflow_type = 'ReleasedDeliverableRetention'");

            migrationBuilder.CreateIndex(
                name: "IX_order_outbox_messages_status_next_attempt_at",
                schema: "commercial_ops",
                table: "order_outbox_messages",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_outbox_messages_workflow_type_workflow_id_operation_i~",
                schema: "commercial_ops",
                table: "order_outbox_messages",
                columns: new[] { "workflow_type", "workflow_id", "operation", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_actor_user_id",
                schema: "commercial_ops",
                table: "order_status_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_organization_id_occurred_at",
                schema: "commercial_ops",
                table: "order_status_events",
                columns: new[] { "organization_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_order_status_events_workflow_type_workflow_id_occurred_at",
                schema: "commercial_ops",
                table: "order_status_events",
                columns: new[] { "workflow_type", "workflow_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_commercial_profiles_organization_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                column: "organization_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_commercial_profiles_qbo_customer_id",
                schema: "commercial_ops",
                table: "organization_commercial_profiles",
                column: "qbo_customer_id",
                unique: true,
                filter: "\"qbo_customer_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_curated_dataset_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                column: "curated_dataset_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_curated_dataset_version_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_department_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_curated_dataset~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active' AND \"department_id\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_organization_dataset_grants_organization_id_department_id_c~",
                schema: "commercial_ops",
                table: "organization_dataset_grants",
                columns: new[] { "organization_id", "department_id", "curated_dataset_id" },
                unique: true,
                filter: "\"status\" = 'Active' AND \"department_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_organization_department_memberships_department_id",
                schema: "commercial_ops",
                table: "organization_department_memberships",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_department_memberships_organization_membership~",
                schema: "commercial_ops",
                table: "organization_department_memberships",
                columns: new[] { "organization_membership_id", "department_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_departments_organization_id",
                schema: "commercial_ops",
                table: "organization_departments",
                column: "organization_id",
                unique: true,
                filter: "\"is_default\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_organization_departments_organization_id_code",
                schema: "commercial_ops",
                table: "organization_departments",
                columns: new[] { "organization_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitation_departments_department_id",
                schema: "commercial_ops",
                table: "organization_invitation_departments",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitation_departments_organization_invitation~",
                schema: "commercial_ops",
                table: "organization_invitation_departments",
                columns: new[] { "organization_invitation_id", "department_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "crm_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_normalized_email",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_organization_id",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_organization_id_normalized_email_s~",
                schema: "commercial_ops",
                table: "organization_invitations",
                columns: new[] { "organization_id", "normalized_email", "status" },
                unique: true,
                filter: "\"status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_token_hash",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_organization_id",
                schema: "commercial_ops",
                table: "organization_memberships",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_user_id",
                schema: "commercial_ops",
                table: "organization_memberships",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_user_id_organization_id",
                schema: "commercial_ops",
                table: "organization_memberships",
                columns: new[] { "user_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_released_deliverable_policy_overrides_organiz~1",
                schema: "commercial_ops",
                table: "organization_released_deliverable_policy_overrides",
                columns: new[] { "organization_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_released_deliverable_policy_overrides_organiza~",
                schema: "commercial_ops",
                table: "organization_released_deliverable_policy_overrides",
                columns: new[] { "organization_id", "is_active" },
                unique: true,
                filter: "\"is_active\"");

            migrationBuilder.CreateIndex(
                name: "IX_organization_released_deliverable_policy_overrides_supersed~",
                schema: "commercial_ops",
                table: "organization_released_deliverable_policy_overrides",
                column: "supersedes_override_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_department_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_organization_id_departmen~",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                columns: new[] { "organization_id", "department_id", "service", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_source_request_id",
                schema: "commercial_ops",
                table: "organization_service_entitlements",
                column: "source_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_organizations_name",
                schema: "commercial_ops",
                table: "organizations",
                column: "name",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                column: "included_assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_partner_organization_id_is_active",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                columns: new[] { "partner_organization_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_partner_organization_id_qbo_catal~",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                columns: new[] { "partner_organization_id", "qbo_catalog_item_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_offerings_qbo_catalog_item_id",
                schema: "commercial_ops",
                table: "partner_reagent_offerings",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_included_assembly_profile_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "included_assembly_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_offering_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_partner_reagent_order_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "partner_reagent_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_order_lines_qbo_catalog_item_id",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines",
                column: "qbo_catalog_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_assigned_to_user_id_due_at",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_department_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_order_number",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_purchase_order_number",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "purchase_order_number" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_shipping_address_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                column: "shipping_address_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_department_id",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_organization_id_department_id_is~",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                columns: new[] { "organization_id", "department_id", "is_active", "label" });

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
                name: "IX_portal_integration_request_services_portal_integration_requ~",
                schema: "commercial_ops",
                table: "portal_integration_request_services",
                columns: new[] { "portal_integration_request_id", "service" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_organization_id",
                schema: "commercial_ops",
                table: "portal_integration_requests",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_request_number",
                schema: "commercial_ops",
                table: "portal_integration_requests",
                column: "request_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_status_created_at",
                schema: "commercial_ops",
                table: "portal_integration_requests",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_curated_dataset_version_id",
                schema: "commercial_ops",
                table: "provisioning_runs",
                column: "curated_dataset_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_organization_dataset_grant_id",
                schema: "commercial_ops",
                table: "provisioning_runs",
                column: "organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_organization_id_idempotency_key",
                schema: "commercial_ops",
                table: "provisioning_runs",
                columns: new[] { "organization_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provisioning_runs_previous_organization_dataset_grant_id",
                schema: "commercial_ops",
                table: "provisioning_runs",
                column: "previous_organization_dataset_grant_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_catalog_items_external_item_id",
                schema: "commercial_ops",
                table: "qbo_catalog_items",
                column: "external_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_catalog_items_is_active_name",
                schema: "commercial_ops",
                table: "qbo_catalog_items",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_original_line_id",
                schema: "commercial_ops",
                table: "reagent_order_adjustments",
                column: "original_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_partner_reagent_order_id_status",
                schema: "commercial_ops",
                table: "reagent_order_adjustments",
                columns: new[] { "partner_reagent_order_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_order_adjustments_proposed_offering_id",
                schema: "commercial_ops",
                table: "reagent_order_adjustments",
                column: "proposed_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipment_lines_partner_reagent_order_line_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines",
                column: "partner_reagent_order_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipment_lines_reagent_shipment_id_partner_reagent_~",
                schema: "commercial_ops",
                table: "reagent_shipment_lines",
                columns: new[] { "reagent_shipment_id", "partner_reagent_order_line_id" });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_partner_reagent_order_id",
                schema: "commercial_ops",
                table: "reagent_shipments",
                column: "partner_reagent_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_shipment_number",
                schema: "commercial_ops",
                table: "reagent_shipments",
                column: "shipment_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipments_tracking_number",
                schema: "commercial_ops",
                table: "reagent_shipments",
                column: "tracking_number");

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
                name: "IX_registered_sample_tubes_sample_return_kit_id_status",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                columns: new[] { "sample_return_kit_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_registered_sample_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "registered_sample_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_policy_defaults_is_active",
                schema: "commercial_ops",
                table: "released_deliverable_policy_defaults",
                column: "is_active",
                unique: true,
                filter: "\"is_active\"");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_policy_defaults_revision",
                schema: "commercial_ops",
                table: "released_deliverable_policy_defaults",
                column: "revision",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_policy_defaults_supersedes_policy_id",
                schema: "commercial_ops",
                table: "released_deliverable_policy_defaults",
                column: "supersedes_policy_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_placed_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                column: "placed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_released_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                column: "released_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_retention_snapshot_~",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                columns: new[] { "retention_snapshot_id", "released_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_authorized_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "authorized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_original_snapshot_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "original_snapshot_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_replacement_snapshot_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "replacement_snapshot_id",
                unique: true);

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
                name: "IX_released_deliverable_retention_snapshots_grace_notification~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "grace_notification_id");

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

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_trial_result_relea~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "trial_result_release_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "warning_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_retention_snapshots_warning_notificati~",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                column: "warning_notification_id");

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
                name: "IX_result_output_packages_lab_analysis_run_id",
                schema: "commercial_ops",
                table: "result_output_packages",
                column: "lab_analysis_run_id");

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

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_result_output_package_id",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                column: "result_output_package_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_retention_snapshot_id",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                column: "retention_snapshot_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_result_retention_schedules_state_warning_at_utc_delete_at_u~",
                schema: "commercial_ops",
                table: "result_retention_schedules",
                columns: new[] { "state", "warning_at_utc", "delete_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_authorization_source_authorization_sourc~",
                schema: "commercial_ops",
                table: "sample_return_kits",
                columns: new[] { "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_kit_number",
                schema: "commercial_ops",
                table: "sample_return_kits",
                column: "kit_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_organization_id_status",
                schema: "commercial_ops",
                table: "sample_return_kits",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_return_kits_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_return_kits",
                column: "sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                column: "registered_sample_tube_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_shipment_id_customer_sample_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                columns: new[] { "sample_shipment_id", "customer_sample_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_shipment_id_submitted_specimen~",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                columns: new[] { "sample_shipment_id", "submitted_specimen_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_items_sample_type_definition_id",
                schema: "commercial_ops",
                table: "sample_shipment_items",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_tube_slots_registered_sample_tube_id",
                schema: "commercial_ops",
                table: "sample_shipment_tube_slots",
                column: "registered_sample_tube_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipment_tube_slots_sample_shipment_item_id_ordinal",
                schema: "commercial_ops",
                table: "sample_shipment_tube_slots",
                columns: new[] { "sample_shipment_item_id", "ordinal" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_authorization_source_authorization_source_~",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_department_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_departure_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "departure_delivery_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_destination_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "destination_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_lab_work_order_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_organization_id_department_id_status",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "organization_id", "department_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_shipment_number",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "shipment_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_container_definit~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                columns: new[] { "container_definition_id", "sample_type_definition_id", "instruction_rule_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_instruction_rule_~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                column: "instruction_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_compatibilities_sample_type_defin~",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_container_type_id_rev~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                columns: new[] { "container_type_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_is_active_effective_f~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_supersedes_definition~",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "supersedes_definition_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_definitions_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_definitions",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "normalized_sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_code_revision",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "code", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_is_active_effective_from_effec~",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_destinations_supersedes_destination_id",
                schema: "commercial_ops",
                table: "sample_shipping_destinations",
                column: "supersedes_destination_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_destination_id_sample_typ~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "destination_id", "sample_type_definition_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_is_active_effective_from_~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_sample_type_definition_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "sample_type_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_supersedes_instruction_ru~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "supersedes_instruction_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_packet_number",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "packet_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_replaced_by_packet_revisio~",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                column: "replaced_by_packet_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_packet_revisions_sample_shipment_id_revision",
                schema: "commercial_ops",
                table: "sample_shipping_packet_revisions",
                columns: new[] { "sample_shipment_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_bound_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "bound_sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_container_definition_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_created_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_customer_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_delivery_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_customer_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "customer_received_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_department_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_kit_number",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "kit_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_organization_id_department_id_au~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                columns: new[] { "organization_id", "department_id", "authorization_source", "authorization_source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_organization_id_department_id_cu~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                columns: new[] { "organization_id", "department_id", "customer_delivery_location_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_reserved_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_reserved_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_shipper_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "shipper_supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_transportation_kit_request_line_~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "transportation_kit_request_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_tube_supplier_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "tube_supplier_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_updated_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_sample_shipping_stock_kit_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "sample_shipping_stock_kit_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_tubes_supplier_barcode",
                schema: "commercial_ops",
                table: "sample_shipping_stock_tubes",
                column: "supplier_barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_registered_sample_tube_id_occ~",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                columns: new[] { "registered_sample_tube_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_id_occurred_at",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                columns: new[] { "sample_shipment_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_item_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                column: "sample_shipment_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_tube_assignment_events_sample_shipment_tube_slot_id",
                schema: "commercial_ops",
                table: "sample_tube_assignment_events",
                column: "sample_shipment_tube_slot_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_code_revision",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "code", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_is_active_effective_from_effective_~",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                columns: new[] { "is_active", "effective_from", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_supersedes_sample_type_id",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                column: "supersedes_sample_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_samples_label",
                schema: "commercial_ops",
                table: "source_samples",
                column: "label",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_samples_status",
                schema: "commercial_ops",
                table: "source_samples",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_line_size",
                schema: "commercial_ops",
                table: "transportation_kit_request_lines",
                columns: new[] { "transportation_kit_request_id", "container_definition_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_request_lines_container_definition_id",
                schema: "commercial_ops",
                table: "transportation_kit_request_lines",
                column: "container_definition_id");

            migrationBuilder.CreateIndex(
                name: "ix_transportation_kit_request_open_job",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "lab_service_order_id",
                unique: true,
                filter: "closed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_created_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_delivery_location_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "delivery_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_department_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_organization_id_department_id_r~",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                columns: new[] { "organization_id", "department_id", "requested_at" });

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_requested_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_transportation_kit_requests_updated_by_user_id",
                schema: "commercial_ops",
                table: "transportation_kit_requests",
                column: "updated_by_user_id");

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
                name: "IX_trial_projects_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects",
                column: "draft_saved_by_user_id");

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

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                schema: "commercial_ops",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "IX_users_external_identity_provider_external_subject_id",
                schema: "commercial_ops",
                table: "users",
                columns: new[] { "external_identity_provider", "external_subject_id" },
                unique: true,
                filter: "\"external_identity_provider\" IS NOT NULL AND \"external_subject_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_users_normalized_email",
                schema: "commercial_ops",
                table: "users",
                column: "normalized_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_contacts_normalized_email",
                schema: "website",
                table: "web_contacts",
                column: "normalized_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_attempts_web_notification_delivery_id_atte~",
                schema: "website",
                table: "web_notification_attempts",
                columns: new[] { "web_notification_delivery_id", "attempt_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_state_next_attempt_at_utc",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "state", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_web_contact_id_kind",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "web_contact_id", "kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_web_order_id_kind",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "web_order_id", "kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_processing_controls_updated_by_user_id",
                schema: "website",
                table: "web_notification_processing_controls",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_input_revisions_data_assembly_requests_data_assemb~",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "data_assembly_request_id",
                principalSchema: "commercial_ops",
                principalTable: "data_assembly_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_output_releases_assembly_processing_runs_processin~",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                column: "processing_run_id",
                principalSchema: "commercial_ops",
                principalTable: "assembly_processing_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_output_releases_data_assembly_requests_data_assemb~",
                schema: "commercial_ops",
                table: "assembly_output_releases",
                column: "data_assembly_request_id",
                principalSchema: "commercial_ops",
                principalTable: "data_assembly_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_processing_runs_data_assembly_requests_data_assemb~",
                schema: "commercial_ops",
                table: "assembly_processing_runs",
                column: "data_assembly_request_id",
                principalSchema: "commercial_ops",
                principalTable: "data_assembly_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_data_assembly_quotes_data_assembly_requests_data_assembly_r~",
                schema: "commercial_ops",
                table: "data_assembly_quotes",
                column: "data_assembly_request_id",
                principalSchema: "commercial_ops",
                principalTable: "data_assembly_requests",
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
                name: "FK_lab_analysis_inputs_lab_analysis_runs_lab_analysis_run_id",
                schema: "lab_ops",
                table: "lab_analysis_inputs",
                column: "lab_analysis_run_id",
                principalSchema: "lab_ops",
                principalTable: "lab_analysis_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_analysis_inputs_lab_sequencing_outputs_lab_sequencing_o~",
                schema: "lab_ops",
                table: "lab_analysis_inputs",
                column: "lab_sequencing_output_id",
                principalSchema: "lab_ops",
                principalTable: "lab_sequencing_outputs",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_analysis_runs_lab_specimen_attempts_lab_specimen_attemp~",
                schema: "lab_ops",
                table: "lab_analysis_runs",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_batch_members_lab_libraries_lab_library_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "lab_library_id",
                principalSchema: "lab_ops",
                principalTable: "lab_libraries",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_containers_lab_specimen_attempts_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_equipment_usages_lab_protocol_executions_lab_protocol_e~",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_protocol_execution_id",
                principalSchema: "lab_ops",
                principalTable: "lab_protocol_executions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_exceptions_lab_protocol_executions_lab_protocol_executi~",
                schema: "lab_ops",
                table: "lab_exceptions",
                column: "lab_protocol_execution_id",
                principalSchema: "lab_ops",
                principalTable: "lab_protocol_executions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_libraries_lab_protocol_executions_preparation_execution~",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "preparation_execution_id",
                principalSchema: "lab_ops",
                principalTable: "lab_protocol_executions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_consumptions_lab_protocol_executions_lab_proto~",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_protocol_execution_id",
                principalSchema: "lab_ops",
                principalTable: "lab_protocol_executions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_performance_decisions_lab_performance_proposals_id",
                schema: "lab_ops",
                table: "lab_performance_decisions",
                column: "id",
                principalSchema: "lab_ops",
                principalTable: "lab_performance_proposals",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_performance_proposals_lab_protocol_executions_lab_proto~",
                schema: "lab_ops",
                table: "lab_performance_proposals",
                column: "lab_protocol_execution_id",
                principalSchema: "lab_ops",
                principalTable: "lab_protocol_executions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_preparation_members_lab_specimen_attempts_lab_specimen_~",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_protocol_executions_lab_specimen_attempts_lab_specimen_~",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_specimen_attempt_id",
                principalSchema: "lab_ops",
                principalTable: "lab_specimen_attempts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_operational_download_commit_evidence_operational_file_downl~",
                schema: "commercial_ops",
                table: "operational_download_commit_evidence",
                column: "operational_file_download_id",
                principalSchema: "commercial_ops",
                principalTable: "operational_file_downloads",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_operational_file_downloads_result_artifacts_result_artifact~",
                schema: "commercial_ops",
                table: "operational_file_downloads",
                column: "result_artifact_id",
                principalSchema: "commercial_ops",
                principalTable: "result_artifacts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_preservation_holds_released_deliverabl~",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                column: "retention_snapshot_id",
                principalSchema: "commercial_ops",
                principalTable: "released_deliverable_retention_snapshots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_reissues_released_deliverable_retentio~",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "original_snapshot_id",
                principalSchema: "commercial_ops",
                principalTable: "released_deliverable_retention_snapshots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_released_deliverable_reissues_released_deliverable_retenti~1",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "replacement_snapshot_id",
                principalSchema: "commercial_ops",
                principalTable: "released_deliverable_retention_snapshots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

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
                name: "FK_result_artifacts_result_output_packages_result_output_packa~",
                schema: "commercial_ops",
                table: "result_artifacts",
                column: "result_output_package_id",
                principalSchema: "commercial_ops",
                principalTable: "result_output_packages",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_result_delivery_evidence_result_output_packages_result_outp~",
                schema: "commercial_ops",
                table: "result_delivery_evidence",
                column: "result_output_package_id",
                principalSchema: "commercial_ops",
                principalTable: "result_output_packages",
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

            // Required system reference data previously installed by historical SQL migrations.
            // Fixed initialization times keep fresh installs reproducible; selective import restores original metadata.
            migrationBuilder.Sql("""
                INSERT INTO commercial_ops.released_deliverable_policy_defaults
                    (id, revision, standard_retention_days, undownloaded_warning_lead_days, undownloaded_grace_days,
                     change_reason, is_active, created_at, updated_at, version)
                VALUES ('6e69a578-ec2d-43bd-af95-e2e7bc4a0fc4', 1, 30, 5, 5,
                    'Initialized the approved global 30-day retention, 5-day warning, and 5-day grace defaults.',
                    true, '2026-09-19T00:00:00Z', '2026-09-19T00:00:00Z', 1);
                INSERT INTO lab_ops.lab_product_types
                    (id, name, normalized_name, description, kit_use, is_active, created_at, updated_at, version)
                VALUES
                    ('90000000-0000-4000-8000-000000000001', 'Tube', 'TUBE', 'Tubes used to transport samples.', 'Tube', true, '2026-09-19T00:00:00Z', '2026-09-19T00:00:00Z', 1),
                    ('90000000-0000-4000-8000-000000000002', 'Shipping Container', 'SHIPPING CONTAINER', 'Containers used to transport sample tubes.', 'ShippingContainer', true, '2026-09-19T00:00:00Z', '2026-09-19T00:00:00Z', 1),
                    ('90000000-0000-4000-8000-000000000003', 'Reagent', 'REAGENT', 'Reagents supplied for laboratory work.', 'Other', true, '2026-09-19T00:00:00Z', '2026-09-19T00:00:00Z', 1);
                """);

            // Preserve database defaults from the retired migration chain.
            migrationBuilder.Sql("""
                ALTER TABLE "commercial_ops"."crm_companies" ALTER COLUMN "lifecycle_state" SET DEFAULT ''::character varying;
                ALTER TABLE "commercial_ops"."lab_result_releases" ALTER COLUMN "traceability_required" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."lab_service_orders" ALTER COLUMN "has_mixed_biological_sources" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."lab_service_orders" ALTER COLUMN "requested_specimen_count" SET DEFAULT 0;
                ALTER TABLE "commercial_ops"."operational_file_downloads" ALTER COLUMN "counts_for_released_package_retention" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."operational_file_downloads" ALTER COLUMN "version" SET DEFAULT 1;
                ALTER TABLE "commercial_ops"."order_system_configurations" ALTER COLUMN "result_destination_configuration_json" SET DEFAULT '{}'::jsonb;
                ALTER TABLE "commercial_ops"."order_system_configurations" ALTER COLUMN "sample_configuration_json" SET DEFAULT '{}'::jsonb;
                ALTER TABLE "commercial_ops"."organization_commercial_profiles" ALTER COLUMN "configuration_version" SET DEFAULT 1;
                ALTER TABLE "commercial_ops"."organization_commercial_profiles" ALTER COLUMN "payment_terms_days" SET DEFAULT 30;
                ALTER TABLE "commercial_ops"."organization_invitations" ALTER COLUMN "first_name" SET DEFAULT ''::character varying;
                ALTER TABLE "commercial_ops"."organization_invitations" ALTER COLUMN "last_name" SET DEFAULT ''::character varying;
                ALTER TABLE "commercial_ops"."organizations" ALTER COLUMN "is_operational_readiness_blocked" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."partner_reagent_orders" ALTER COLUMN "is_kit_bundle" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."released_deliverable_retention_snapshots" ALTER COLUMN "deletion_attempt_count" SET DEFAULT 0;
                ALTER TABLE "commercial_ops"."released_deliverable_retention_snapshots" ALTER COLUMN "is_quarantined" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."result_output_packages" ALTER COLUMN "traceability_required" SET DEFAULT false;
                ALTER TABLE "commercial_ops"."sample_shipment_items" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE "commercial_ops"."sample_shipment_items" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE "commercial_ops"."sample_shipment_items" ALTER COLUMN "version" SET DEFAULT 1;
                ALTER TABLE "lab_ops"."lab_containers" ALTER COLUMN "barcode_source" SET DEFAULT 'PhaenoGenerated'::character varying;
                ALTER TABLE "lab_ops"."lab_work_orders" ALTER COLUMN "projection_version" SET DEFAULT 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    RAISE EXCEPTION 'The rebased database cannot be downgraded. Restore the matched application and database backup.';
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_assembly_profiles_qbo_catalog_items_qbo_catalog_item_id",
                schema: "commercial_ops",
                table: "assembly_profiles");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_offerings_qbo_catalog_items_qbo_catalog_ite~",
                schema: "commercial_ops",
                table: "partner_reagent_offerings");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_order_lines_qbo_catalog_items_qbo_catalog_i~",
                schema: "commercial_ops",
                table: "partner_reagent_order_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_kit_assembly_cases_data_assembly_requests_assembly_request_~",
                schema: "commercial_ops",
                table: "kit_assembly_cases");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_companies_users_owner_user_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_opportunities_users_owner_user_id",
                schema: "commercial_ops",
                table: "crm_opportunities");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_accepted_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_draft_saved_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_follow_up_owner_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_material_disposed_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_sales_owner_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_users_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_users_approved_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_users_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_users_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_users_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_users_released_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_users_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_samples_users_created_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_samples_users_submitted_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_samples_users_updated_by_user_id",
                schema: "commercial_ops",
                table: "trial_samples");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_companies_organizations_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropForeignKey(
                name: "FK_organization_departments_organizations_organization_id",
                schema: "commercial_ops",
                table: "organization_departments");

            migrationBuilder.DropForeignKey(
                name: "FK_portal_integration_requests_organizations_organization_id",
                schema: "commercial_ops",
                table: "portal_integration_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_organizations_organization_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_organizations_organization_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_handoffs_crm_opportunities_opportunity_id",
                schema: "commercial_ops",
                table: "crm_handoffs");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_crm_opportunities_opportunity_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_handoffs_crm_companies_company_id",
                schema: "commercial_ops",
                table: "crm_handoffs");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_crm_companies_company_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_crm_handoffs_portal_integration_requests_relationship_reque~",
                schema: "commercial_ops",
                table: "crm_handoffs");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_organization_departments_department_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_result_releases_organization_departments_department_id",
                schema: "commercial_ops",
                table: "trial_result_releases");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_containers_lab_specimen_attempts_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_protocol_executions_lab_specimen_attempts_lab_specimen_~",
                schema: "lab_ops",
                table: "lab_protocol_executions");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_samples_lab_work_orders_lab_work_order_id",
                schema: "commercial_ops",
                table: "trial_samples");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_projects_trial_result_releases_complete_release_id",
                schema: "commercial_ops",
                table: "trial_projects");

            migrationBuilder.DropForeignKey(
                name: "FK_trial_replacement_authorizations_trial_projects_trial_proje~",
                schema: "commercial_ops",
                table: "trial_replacement_authorizations");

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
                name: "analysis_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "audit_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "business_role_assignments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "business_role_invitation_intents",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "commercial_sale_summaries",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_company_contacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_contact_user_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_custom_field_values",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_export_records",
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
                name: "crm_saved_views",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_tasks",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "curated_dataset_version_files",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_assembly_quotes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_governance_affected_organizations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_governance_affected_versions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_governance_follow_ups",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_provisioning_notices",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "dataset_download_audits",
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
                name: "kit_case_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_analysis_inputs",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_attempt_command_receipts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_authorizations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_batch_members",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_custody_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_equipment_usages",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_exceptions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_forecast_snapshots",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_forecast_transitions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_holidays",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_investigation_reports",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_job_deadline_changes",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_job_timing_policies",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_material_consumptions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_operations_event_receipts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_operations_outbox_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_performance_decisions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_preparation_members",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_prepared_reagent_components",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_provider_command_receipts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_role_assignments",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_role_invitation_intents",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_sample_import_previews",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_scientific_approvals",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_quote_extension_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_request_revisions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_sample_types",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_source_groups",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_stage_durations",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_step_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_authorization_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_projections",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_work_timing_changes",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "operational_attention_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "operational_download_commit_evidence",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_cancellation_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_idempotency_records",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_outbox_messages",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_status_events",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_system_configurations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_commercial_profiles",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_department_memberships",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_invitation_departments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_service_entitlements",
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
                name: "portal_integration_request_services",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "provisioning_runs",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reagent_order_adjustments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reagent_shipment_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reconciliation_batch_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_preservation_holds",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_reissues",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_delivery_evidence",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_retention_schedules",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_compatibilities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_packet_revisions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_stock_tubes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_tube_assignment_events",
                schema: "commercial_ops");

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
                name: "web_notification_attempts",
                schema: "website");

            migrationBuilder.DropTable(
                name: "web_notification_processing_controls",
                schema: "website");

            migrationBuilder.DropTable(
                name: "crm_activities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_custom_field_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_governance_incidents",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "managed_files",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invitation_delivery_attempts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_sequencing_outputs",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_equipment",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_preparation_records",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_performance_proposals",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_material_lots",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_timing_policies",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_steps",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "operational_file_downloads",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_memberships",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "invoices",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "payment_receipts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_dataset_grants",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reconciliation_batches",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_retention_snapshots",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_instruction_rules",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_stock_kits",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipment_tube_slots",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_approval_authorities",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_scopes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "web_notification_deliveries",
                schema: "website");

            migrationBuilder.DropTable(
                name: "crm_leads",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_invitations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_libraries",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_ngs_sendouts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_preparation_batches",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_material_definitions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_storage_locations",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_business_calendars",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "managed_operational_files",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "result_artifacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_quotes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "curated_dataset_versions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "order_notifications",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "assembly_output_releases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_policy_defaults",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_result_releases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_released_deliverable_policy_overrides",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_supplier_products",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "transportation_kit_request_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipment_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "web_contacts",
                schema: "website");

            migrationBuilder.DropTable(
                name: "web_orders",
                schema: "website");

            migrationBuilder.DropTable(
                name: "crm_contacts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_operational_batches",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_tray_formats",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "result_output_packages",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "curated_datasets",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "source_samples",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "assembly_processing_runs",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_product_types",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_suppliers",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "transportation_kit_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "registered_sample_tubes",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_type_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_analysis_runs",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_samples",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "assembly_input_revisions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_return_kits",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_orders",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_service_offerings",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_destinations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_definitions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "customer_delivery_locations",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "sample_shipping_container_types",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "qbo_catalog_items",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "data_assembly_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "kit_assembly_cases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "commercial_document_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_kit_units",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_reagent_order_lines",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "reagent_shipments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_reagent_offerings",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_reagent_orders",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "assembly_profiles",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "partner_shipping_addresses",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "users",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organizations",
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

            migrationBuilder.DropTable(
                name: "crm_companies",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "portal_integration_requests",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_departments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_specimen_attempts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_containers",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocol_executions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_workflow_stages",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_specimens",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocol_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocols",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_orders",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_workflow_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_service_workflows",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "trial_result_releases",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_projects",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "crm_handoffs",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_samples",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "trial_replacement_authorizations",
                schema: "commercial_ops");
        }
    }
}
