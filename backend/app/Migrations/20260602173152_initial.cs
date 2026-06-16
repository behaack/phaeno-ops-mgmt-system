using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "portal");

            migrationBuilder.CreateTable(
                name: "audit_events",
                schema: "portal",
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
                name: "organizations",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
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
                name: "users",
                schema: "portal",
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
                name: "organization_invitations",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_organization_admin = table.Column<bool>(type: "boolean", nullable: false),
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
                        name: "FK_organization_invitations_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_memberships",
                schema: "portal",
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
                        principalSchema: "portal",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_memberships_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_actor_user_id",
                schema: "portal",
                table: "audit_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_entity_name_entity_id",
                schema: "portal",
                table: "audit_events",
                columns: new[] { "entity_name", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_occurred_at",
                schema: "portal",
                table: "audit_events",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_organization_id",
                schema: "portal",
                table: "audit_events",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_normalized_email",
                schema: "portal",
                table: "organization_invitations",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_organization_id",
                schema: "portal",
                table: "organization_invitations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_organization_id_normalized_email_s~",
                schema: "portal",
                table: "organization_invitations",
                columns: new[] { "organization_id", "normalized_email", "status" },
                unique: true,
                filter: "\"status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_token_hash",
                schema: "portal",
                table: "organization_invitations",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_organization_id",
                schema: "portal",
                table: "organization_memberships",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_user_id",
                schema: "portal",
                table: "organization_memberships",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_user_id_organization_id",
                schema: "portal",
                table: "organization_memberships",
                columns: new[] { "user_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organizations_name",
                schema: "portal",
                table: "organizations",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                schema: "portal",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "IX_users_external_identity_provider_external_subject_id",
                schema: "portal",
                table: "users",
                columns: new[] { "external_identity_provider", "external_subject_id" },
                unique: true,
                filter: "\"external_identity_provider\" IS NOT NULL AND \"external_subject_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_users_normalized_email",
                schema: "portal",
                table: "users",
                column: "normalized_email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_events",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "organization_invitations",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "organization_memberships",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "organizations",
                schema: "portal");

            migrationBuilder.DropTable(
                name: "users",
                schema: "portal");
        }
    }
}
