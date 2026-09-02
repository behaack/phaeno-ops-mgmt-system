using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class FoldPortalAccountsIntoCrmCompanies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "crm_portal_account_links",
                schema: "commercial_ops");

            migrationBuilder.AddColumn<Guid>(
                name: "access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "access_organization_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_crm_companies_organizations_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "access_organization_id",
                principalSchema: "commercial_ops",
                principalTable: "organizations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_crm_companies_organizations_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropIndex(
                name: "IX_crm_companies_access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.DropColumn(
                name: "access_organization_id",
                schema: "commercial_ops",
                table: "crm_companies");

            migrationBuilder.CreateTable(
                name: "crm_portal_account_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    linked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_portal_account_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_crm_companies_company_id",
                        column: x => x.company_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_portal_account_links_users_linked_by_user_id",
                        column: x => x.linked_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_company_id_organization_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                columns: new[] { "company_id", "organization_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_linked_by_user_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                column: "linked_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_crm_portal_account_links_organization_id",
                schema: "commercial_ops",
                table: "crm_portal_account_links",
                column: "organization_id");
        }
    }
}
