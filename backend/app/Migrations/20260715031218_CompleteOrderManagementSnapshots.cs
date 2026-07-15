using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class CompleteOrderManagementSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "placement_snapshot_json",
                schema: "portal",
                table: "partner_reagent_orders",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_service_request_revisions",
                schema: "portal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    previous_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    correction_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_request_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_lab_service_orders_lab_servic~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_lab_service_request_revisions~",
                        column: x => x.previous_revision_id,
                        principalSchema: "portal",
                        principalTable: "lab_service_request_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_request_revisions_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalSchema: "portal",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_lab_service_order_id_revision",
                schema: "portal",
                table: "lab_service_request_revisions",
                columns: new[] { "lab_service_order_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_previous_revision_id",
                schema: "portal",
                table: "lab_service_request_revisions",
                column: "previous_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_request_revisions_submitted_by_user_id",
                schema: "portal",
                table: "lab_service_request_revisions",
                column: "submitted_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_service_request_revisions",
                schema: "portal");

            migrationBuilder.DropColumn(
                name: "placement_snapshot_json",
                schema: "portal",
                table: "partner_reagent_orders");
        }
    }
}
