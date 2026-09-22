using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogServiceFamily : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "service_family",
                schema: "commercial_ops",
                table: "qbo_catalog_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.Sql("""
                UPDATE commercial_ops.qbo_catalog_items
                SET service_family = 'PSeqLabService'
                WHERE lower(trim(external_item_id)) = 'pseq-lab-service';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "service_family",
                schema: "commercial_ops",
                table: "qbo_catalog_items");
        }
    }
}
