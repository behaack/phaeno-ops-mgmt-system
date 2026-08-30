using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCrmOpportunityNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH numbered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS ordinal
                    FROM commercial_ops.crm_opportunities
                )
                UPDATE commercial_ops.crm_opportunities AS opportunity
                SET opportunity_number = 'OPP-LEGACY-' || LPAD(numbered.ordinal::text, 8, '0')
                FROM numbered
                WHERE opportunity.id = numbered.id;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_opportunities_opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities",
                column: "opportunity_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_crm_opportunities_opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities");

            migrationBuilder.DropColumn(
                name: "opportunity_number",
                schema: "commercial_ops",
                table: "crm_opportunities");
        }
    }
}
