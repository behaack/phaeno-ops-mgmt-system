using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class CloseReleasedDeliverableLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "deletion_attempt_count",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "is_quarantined",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_deletion_attempt_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "next_deletion_attempt_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "released_deliverable_preservation_holds",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    retention_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    placed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    placed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    released_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    released_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    release_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_preservation_holds", x => x.id);
                    table.ForeignKey(
                        name: "FK_released_deliverable_preservation_holds_released_deliverabl~",
                        column: x => x.retention_snapshot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_retention_snapshots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_preservation_holds_users_placed_by_use~",
                        column: x => x.placed_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_preservation_holds_users_released_by_u~",
                        column: x => x.released_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "released_deliverable_reissues",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    replacement_snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorized_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorized_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_released_deliverable_reissues", x => x.id);
                    table.ForeignKey(
                        name: "FK_released_deliverable_reissues_released_deliverable_retentio~",
                        column: x => x.original_snapshot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_retention_snapshots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_reissues_released_deliverable_retenti~1",
                        column: x => x.replacement_snapshot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "released_deliverable_retention_snapshots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_released_deliverable_reissues_users_authorized_by_user_id",
                        column: x => x.authorized_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_placed_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                column: "placed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_released_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                column: "released_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_preservation_holds_retention_snapshot_~",
                schema: "commercial_ops",
                table: "released_deliverable_preservation_holds",
                columns: new[] { "retention_snapshot_id", "released_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_authorized_by_user_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "authorized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_original_snapshot_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "original_snapshot_id");

            migrationBuilder.CreateIndex(
                name: "IX_released_deliverable_reissues_replacement_snapshot_id",
                schema: "commercial_ops",
                table: "released_deliverable_reissues",
                column: "replacement_snapshot_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM commercial_ops.released_deliverable_preservation_holds)
                    OR EXISTS (SELECT 1 FROM commercial_ops.released_deliverable_reissues)
                    OR EXISTS (SELECT 1 FROM commercial_ops.released_deliverable_retention_snapshots WHERE last_deletion_attempt_at_utc IS NOT NULL OR is_quarantined)
                  THEN RAISE EXCEPTION 'Retained lifecycle evidence prevents rollback. Use an approved forward recovery.'; END IF;
                END $$;
                """);

            migrationBuilder.DropTable(
                name: "released_deliverable_preservation_holds",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "released_deliverable_reissues",
                schema: "commercial_ops");

            migrationBuilder.DropColumn(
                name: "deletion_attempt_count",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "is_quarantined",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "last_deletion_attempt_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");

            migrationBuilder.DropColumn(
                name: "next_deletion_attempt_at_utc",
                schema: "commercial_ops",
                table: "released_deliverable_retention_snapshots");
        }
    }
}
