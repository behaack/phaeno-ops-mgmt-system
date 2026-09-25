using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class CloseMasterMixGaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ingredients_json",
                schema: "lab_ops",
                table: "lab_master_mix_workflows",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<DateTime>(
                name: "voided_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "voided_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ingredients_json",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<DateTime>(
                name: "recipe_deviation_approved_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "recipe_deviation_approved_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "recipe_deviation_approved_ingredient_count",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "recipe_deviation_reason",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "use_by_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_master_mix_preparations
                SET use_by_utc = ((date_trunc('day', started_at_utc AT TIME ZONE 'America/Los_Angeles')
                    + interval '1 day') AT TIME ZONE 'America/Los_Angeles')
                """);
            migrationBuilder.AlterColumn<DateTime>(
                name: "use_by_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "voided_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "voided_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_master_mix_corrections",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    preparation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    action = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_corrections", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_corrections_lab_master_mix_preparations_prep~",
                        column: x => x.preparation_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_preparations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_corrections_preparation_id_recorded_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_corrections",
                columns: new[] { "preparation_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_master_mix_corrections_preparation_id_target_entry_id",
                schema: "lab_ops",
                table: "lab_master_mix_corrections",
                columns: new[] { "preparation_id", "target_entry_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_master_mix_corrections",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "ingredients_json",
                schema: "lab_ops",
                table: "lab_master_mix_workflows");

            migrationBuilder.DropColumn(
                name: "voided_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses");

            migrationBuilder.DropColumn(
                name: "voided_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_tray_uses");

            migrationBuilder.DropColumn(
                name: "ingredients_json",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "recipe_deviation_approved_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "recipe_deviation_approved_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "recipe_deviation_approved_ingredient_count",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "recipe_deviation_reason",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "use_by_utc",
                schema: "lab_ops",
                table: "lab_master_mix_preparations");

            migrationBuilder.DropColumn(
                name: "voided_at_utc",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients");

            migrationBuilder.DropColumn(
                name: "voided_by_user_id",
                schema: "lab_ops",
                table: "lab_master_mix_ingredients");
        }
    }
}
