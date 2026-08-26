using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCrmCompanyFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    table.PrimaryKey("PK_crm_companies", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_companies_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "IX_crm_companies_name",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_crm_companies_owner_user_id",
                schema: "commercial_ops",
                table: "crm_companies",
                column: "owner_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "crm_companies",
                schema: "commercial_ops");
        }
    }
}
