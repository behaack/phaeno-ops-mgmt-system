using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class FreezeReleasedDeliverableReceiptLineage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "receipt_lineage_json",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM commercial_ops.released_deliverable_retention_snapshots WHERE receipt_lineage_json IS NOT NULL)
                  THEN RAISE EXCEPTION 'Frozen receipt lineage prevents rollback. Use an approved forward recovery.'; END IF;
                END $$;
                """);

            migrationBuilder.DropColumn(
                name: "receipt_lineage_json",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");
        }
    }
}
