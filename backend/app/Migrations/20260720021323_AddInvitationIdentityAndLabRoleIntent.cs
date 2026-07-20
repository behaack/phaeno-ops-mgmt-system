using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvitationIdentityAndLabRoleIntent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "first_name",
                schema: "commercial_ops",
                table: "organization_invitations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "last_name",
                schema: "commercial_ops",
                table: "organization_invitations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

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

            migrationBuilder.CreateIndex(
                name: "IX_lab_role_invitation_intents_organization_invitation_id_role",
                schema: "lab_ops",
                table: "lab_role_invitation_intents",
                columns: new[] { "organization_invitation_id", "role" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_role_invitation_intents",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "first_name",
                schema: "commercial_ops",
                table: "organization_invitations");

            migrationBuilder.DropColumn(
                name: "last_name",
                schema: "commercial_ops",
                table: "organization_invitations");
        }
    }
}
