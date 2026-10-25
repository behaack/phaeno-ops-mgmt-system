using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class FreezeLabIngredientWithdrawalEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "resource_snapshot_json",
                schema: "lab_ops",
                table: "lab_reagent_material_uses",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "resource_snapshot_json",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new System.InvalidOperationException("Ingredient withdrawal evidence is retained indefinitely. Use a preserving forward migration rather than dropping historical snapshots.");
        }
    }
}
