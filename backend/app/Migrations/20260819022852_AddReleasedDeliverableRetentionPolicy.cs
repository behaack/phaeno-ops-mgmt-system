using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReleasedDeliverableRetentionPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "organization_released_deliverable_policy_overrides",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_policy_defaults",
                schema: "commercial_ops");
        }
    }
}
