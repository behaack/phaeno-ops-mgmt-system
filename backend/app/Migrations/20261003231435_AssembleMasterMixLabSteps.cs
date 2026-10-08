using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AssembleMasterMixLabSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_workflows)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_preparations)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_steps)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_ingredients)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_tray_uses)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_corrections)
                  THEN
                    RAISE EXCEPTION 'Master-mix records require an explicitly approved conversion or disposable-data reset before changing the step model.';
                  END IF;
                END $$;
                """);
            migrationBuilder.DropIndex(
                name: "IX_lab_master_mix_steps_preparation_id_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_steps");

            migrationBuilder.AddColumn<string>(
                name: "evidence_json",
                schema: "lab_ops",
                table: "lab_master_mix_steps",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "input_json",
                schema: "lab_ops",
                table: "lab_master_mix_steps",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "evidence_json",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "field_key",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false);

            migrationBuilder.AddColumn<int>(
                name: "step_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                type: "integer",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_steps_preparation_id_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_steps",
                columns: new[] { "preparation_id", "sequence" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_workflows)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_preparations)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_steps)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_ingredients)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_tray_uses)
                    OR EXISTS (SELECT 1 FROM lab_ops.lab_master_mix_corrections)
                  THEN
                    RAISE EXCEPTION 'Master-mix records require an explicitly approved conversion or disposable-data reset before changing the step model.';
                  END IF;
                END $$;
                """);
            migrationBuilder.DropIndex(
                name: "IX_lab_master_mix_steps_preparation_id_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_steps");

            migrationBuilder.DropColumn(
                name: "evidence_json",
                schema: "lab_ops",
                table: "lab_master_mix_steps");

            migrationBuilder.DropColumn(
                name: "input_json",
                schema: "lab_ops",
                table: "lab_master_mix_steps");

            migrationBuilder.DropColumn(
                name: "evidence_json",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "field_key",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients");

            migrationBuilder.DropColumn(
                name: "step_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients");

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_steps_preparation_id_sequence",
                schema: "lab_ops",
                table: "lab_master_mix_steps",
                columns: new[] { "preparation_id", "sequence" },
                unique: true);
        }
    }
}
