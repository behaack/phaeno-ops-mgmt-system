using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMembershipInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                schema: "portal",
                table: "Users");

            migrationBuilder.AddColumn<string>(
                name: "ExternalIdentityProvider",
                schema: "portal",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalSubjectId",
                schema: "portal",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedEmail",
                schema: "portal",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "portal",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Invited");

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                schema: "portal",
                table: "Organizations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Customer");

            migrationBuilder.Sql(
                "UPDATE portal.\"Users\" SET \"NormalizedEmail\" = upper(btrim(\"Email\"));");

            migrationBuilder.Sql(
                "UPDATE portal.\"Users\" SET \"Status\" = CASE WHEN \"IsActive\" THEN 'Active' ELSE 'Disabled' END;");

            migrationBuilder.CreateTable(
                name: "OrganizationInvitations",
                schema: "portal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IsOrganizationAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AcceptedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeclinedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeclinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSentByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SendCount = table.Column<int>(type: "integer", nullable: false),
                    LastEmailProviderMessageId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    LastSendError = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationInvitations_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalSchema: "portal",
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationMemberships",
                schema: "portal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsOrganizationAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationMemberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationMemberships_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalSchema: "portal",
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizationMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "portal",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO portal."OrganizationMemberships"
                    ("Id", "UserId", "OrganizationId", "IsOrganizationAdmin", "IsActive", "CreatedAt", "CreatedByUserId", "UpdatedAt", "UpdatedByUserId", "Version")
                SELECT
                    "Id",
                    "Id",
                    "OrganizationId",
                    "IsOrganizationAdmin",
                    "IsActive",
                    "CreatedAt",
                    "CreatedByUserId",
                    "UpdatedAt",
                    "UpdatedByUserId",
                    1
                FROM portal."Users";
                """);

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsOrganizationAdmin",
                schema: "portal",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "portal",
                table: "Users",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Users_ExternalIdentityProvider_ExternalSubjectId",
                schema: "portal",
                table: "Users",
                columns: new[] { "ExternalIdentityProvider", "ExternalSubjectId" },
                unique: true,
                filter: "\"ExternalIdentityProvider\" IS NOT NULL AND \"ExternalSubjectId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedEmail",
                schema: "portal",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationInvitations_NormalizedEmail",
                schema: "portal",
                table: "OrganizationInvitations",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationInvitations_OrganizationId",
                schema: "portal",
                table: "OrganizationInvitations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationInvitations_OrganizationId_NormalizedEmail_Stat~",
                schema: "portal",
                table: "OrganizationInvitations",
                columns: new[] { "OrganizationId", "NormalizedEmail", "Status" },
                unique: true,
                filter: "\"Status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationInvitations_TokenHash",
                schema: "portal",
                table: "OrganizationInvitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationMemberships_OrganizationId",
                schema: "portal",
                table: "OrganizationMemberships",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationMemberships_UserId",
                schema: "portal",
                table: "OrganizationMemberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationMemberships_UserId_OrganizationId",
                schema: "portal",
                table: "OrganizationMemberships",
                columns: new[] { "UserId", "OrganizationId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationInvitations",
                schema: "portal");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_ExternalIdentityProvider_ExternalSubjectId",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_NormalizedEmail",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ExternalIdentityProvider",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ExternalSubjectId",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NormalizedEmail",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "portal",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Kind",
                schema: "portal",
                table: "Organizations");

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "portal",
                table: "Users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "IsOrganizationAdmin",
                schema: "portal",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                schema: "portal",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE portal."Users" AS users
                SET
                    "OrganizationId" = memberships."OrganizationId",
                    "IsOrganizationAdmin" = memberships."IsOrganizationAdmin"
                FROM (
                    SELECT DISTINCT ON ("UserId")
                        "UserId",
                        "OrganizationId",
                        "IsOrganizationAdmin"
                    FROM portal."OrganizationMemberships"
                    ORDER BY "UserId", "IsActive" DESC, "CreatedAt"
                ) AS memberships
                WHERE users."Id" = memberships."UserId";
                """);

            migrationBuilder.DropTable(
                name: "OrganizationMemberships",
                schema: "portal");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "portal",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                schema: "portal",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                schema: "portal",
                table: "Users",
                column: "OrganizationId",
                principalSchema: "portal",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
