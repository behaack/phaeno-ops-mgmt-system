using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowRepeatCrmCompanyContactHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts");

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "company_id", "contact_id" },
                unique: true,
                filter: "is_active = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts");

            migrationBuilder.CreateIndex(
                name: "IX_crm_company_contacts_company_id_contact_id",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                columns: new[] { "company_id", "contact_id" },
                unique: true);
        }
    }
}
