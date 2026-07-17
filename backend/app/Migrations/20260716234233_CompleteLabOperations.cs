using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class CompleteLabOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "projection_version",
                schema: "lab_ops",
                table: "lab_work_orders",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

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
                name: "lab_containers",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    parent_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    label_print_count = table.Column<int>(type: "integer", nullable: false),
                    last_label_printed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_label_printed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    disposition_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    retain_until_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    last_calibration_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    calibration_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                name: "lab_material_lots",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    material_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    lot_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    components_json = table.Column<string>(type: "jsonb", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    storage_location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    available_quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qc_disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qc_results_json = table.Column<string>(type: "jsonb", nullable: true),
                    qc_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    qc_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_material_lots", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_operational_batches",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    batch_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
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
                name: "lab_protocols",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
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
                    last_changed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    projection_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_work_projections", x => x.id);
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
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                name: "lab_protocol_executions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    lab_protocol_version_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "lab_equipment_usages",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
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
                        name: "FK_lab_equipment_usages_lab_protocol_executions_lab_protocol_e~",
                        column: x => x.lab_protocol_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
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
                        name: "FK_lab_exceptions_lab_protocol_executions_lab_protocol_executi~",
                        column: x => x.lab_protocol_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                        name: "FK_lab_libraries_lab_protocol_executions_preparation_execution~",
                        column: x => x.preparation_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
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
                        name: "FK_lab_material_consumptions_lab_protocol_executions_lab_proto~",
                        column: x => x.lab_protocol_execution_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_protocol_executions",
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
                        name: "FK_lab_batch_members_lab_libraries_lab_library_id",
                        column: x => x.lab_library_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_libraries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "IX_lab_containers_barcode",
                schema: "lab_ops",
                table: "lab_containers",
                column: "barcode",
                unique: true);

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
                name: "IX_lab_equipment_status_calibration_due_at_utc",
                schema: "lab_ops",
                table: "lab_equipment",
                columns: new[] { "status", "calibration_due_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_usages_lab_equipment_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_equipment_id");

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
                name: "IX_lab_material_consumptions_lab_material_lot_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_material_lot_id");

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
                name: "IX_lab_material_lots_material_key_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "material_key", "lot_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_qc_disposition_expires_at_utc",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "qc_disposition", "expires_at_utc" });

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
                name: "IX_lab_protocol_executions_lab_protocol_version_id",
                schema: "lab_ops",
                table: "lab_protocol_executions",
                column: "lab_protocol_version_id");

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
                name: "IX_lab_role_assignments_user_id_role",
                schema: "lab_ops",
                table: "lab_role_assignments",
                columns: new[] { "user_id", "role" },
                unique: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                name: "lab_material_consumptions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_operations_event_receipts",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_operations_outbox_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_role_assignments",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_work_projections",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "lab_libraries",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_ngs_sendouts",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_equipment",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_containers",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_material_lots",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocol_executions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_operational_batches",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocol_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_protocols",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "projection_version",
                schema: "lab_ops",
                table: "lab_work_orders");
        }
    }
}
