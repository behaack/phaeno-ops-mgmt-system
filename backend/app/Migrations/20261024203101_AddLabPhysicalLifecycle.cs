using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabPhysicalLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "physical_hold_reason",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "storage_box_id",
                schema: "lab_ops",
                table: "lab_containers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "storage_position",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_master_mix_performance_decisions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_master_mix_performance_decisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_master_mix_performance_decisions_lab_master_mix_steps_id",
                        column: x => x.id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_master_mix_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_storage_boxes",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barcode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    room = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    freezer = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    rack = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    shelf = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_storage_boxes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_physical_events",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    storage_box_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_physical_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_physical_events_lab_containers_lab_container_id",
                        column: x => x.lab_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_physical_events_lab_storage_boxes_storage_box_id",
                        column: x => x.storage_box_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_storage_boxes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_storage_box_moves",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_storage_box_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_storage_box_moves", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_storage_box_moves_lab_storage_boxes_lab_storage_box_id",
                        column: x => x.lab_storage_box_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_storage_boxes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_containers_storage_box_id_storage_position",
                schema: "lab_ops",
                table: "lab_containers",
                columns: new[] { "storage_box_id", "storage_position" },
                unique: true,
                filter: "storage_position IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_lab_physical_events_lab_container_id_recorded_at_utc",
                schema: "lab_ops",
                table: "lab_physical_events",
                columns: new[] { "lab_container_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_physical_events_storage_box_id",
                schema: "lab_ops",
                table: "lab_physical_events",
                column: "storage_box_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_box_moves_lab_storage_box_id_recorded_at_utc",
                schema: "lab_ops",
                table: "lab_storage_box_moves",
                columns: new[] { "lab_storage_box_id", "recorded_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_boxes_barcode",
                schema: "lab_ops",
                table: "lab_storage_boxes",
                column: "barcode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_containers_lab_storage_boxes_storage_box_id",
                schema: "lab_ops",
                table: "lab_containers",
                column: "storage_box_id",
                principalSchema: "lab_ops",
                principalTable: "lab_storage_boxes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_containers_lab_storage_boxes_storage_box_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropTable(
                name: "lab_master_mix_performance_decisions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_physical_events",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_storage_box_moves",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_storage_boxes",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_containers_storage_box_id_storage_position",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "physical_hold_reason",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "storage_box_id",
                schema: "lab_ops",
                table: "lab_containers");

            migrationBuilder.DropColumn(
                name: "storage_position",
                schema: "lab_ops",
                table: "lab_containers");
        }
    }
}
