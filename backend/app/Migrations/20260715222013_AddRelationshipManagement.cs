using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationshipManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "portal_readiness",
                schema: "portal",
                table: "organizations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "NotReviewed");

            migrationBuilder.AddColumn<string>(
                name: "portal_readiness_note",
                schema: "portal",
                table: "organizations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "portal_integration_requests",
                schema: "portal",
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
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_service_entitlements",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                        name: "FK_organization_service_entitlements_organizations_organizatio~",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_service_entitlements_portal_integration_reques~",
                        column: x => x.source_request_id,
                        principalSchema: "portal",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "portal_integration_request_services",
                schema: "portal",
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
                        principalSchema: "portal",
                        principalTable: "portal_integration_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_organization_id_service_e~",
                schema: "portal",
                table: "organization_service_entitlements",
                columns: new[] { "organization_id", "service", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_service_entitlements_source_request_id",
                schema: "portal",
                table: "organization_service_entitlements",
                column: "source_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_request_services_portal_integration_requ~",
                schema: "portal",
                table: "portal_integration_request_services",
                columns: new[] { "portal_integration_request_id", "service" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_organization_id",
                schema: "portal",
                table: "portal_integration_requests",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_request_number",
                schema: "portal",
                table: "portal_integration_requests",
                column: "request_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_integration_requests_status_created_at",
                schema: "portal",
                table: "portal_integration_requests",
                columns: new[] { "status", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "organization_service_entitlements",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "portal_integration_request_services",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "portal_integration_requests",
                schema: "portal");

            migrationBuilder.DropColumn(
                name: "portal_readiness",
                schema: "portal",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "portal_readiness_note",
                schema: "portal",
                table: "organizations");
        }
    }
}
