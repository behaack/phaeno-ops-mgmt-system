using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class MoveContactTitleToCompanyRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "job_title",
                schema: "commercial_ops",
                table: "crm_contacts",
                newName: "legacy_job_title");

            migrationBuilder.AddColumn<string>(
                name: "job_title",
                schema: "commercial_ops",
                table: "crm_company_contacts",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.crm_company_contacts AS association
                SET job_title = contact.legacy_job_title
                FROM commercial_ops.crm_contacts AS contact
                WHERE association.contact_id = contact.id
                  AND contact.legacy_job_title IS NOT NULL
                  AND (
                    (association.is_active = TRUE AND association.is_primary_company = TRUE)
                    OR (
                      SELECT COUNT(*)
                      FROM commercial_ops.crm_company_contacts AS candidate
                      WHERE candidate.contact_id = contact.id
                    ) = 1
                  );

                COMMENT ON COLUMN commercial_ops.crm_contacts.legacy_job_title IS
                  'Read-only preservation of the former contact-level title. Current titles belong to company-contact relationships.';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE commercial_ops.crm_contacts AS contact
                SET legacy_job_title = association.job_title
                FROM commercial_ops.crm_company_contacts AS association
                WHERE association.contact_id = contact.id
                  AND association.is_active = TRUE
                  AND association.is_primary_company = TRUE
                  AND association.job_title IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "job_title",
                schema: "commercial_ops",
                table: "crm_company_contacts");

            migrationBuilder.RenameColumn(
                name: "legacy_job_title",
                schema: "commercial_ops",
                table: "crm_contacts",
                newName: "job_title");
        }
    }
}
