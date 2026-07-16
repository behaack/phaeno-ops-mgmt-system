using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabProviderCommandReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_provider_command_receipts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_id = table.Column<Guid>(type: "uuid", nullable: false),
                    correlation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authorization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    command_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    disposition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    applied_authorization_version = table.Column<int>(type: "integer", nullable: true),
                    reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    outcome_json = table.Column<string>(type: "jsonb", nullable: false),
                    acknowledged_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_provider_command_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_provider_command_receipts_lab_work_orders_lab_work_orde~",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_authorization_id_acknowledged~",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                columns: new[] { "authorization_id", "acknowledged_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_command_id",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                column: "command_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_provider_command_receipts_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_provider_command_receipts",
                column: "lab_work_order_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_provider_command_receipts",
                schema: "lab_ops");
        }
    }
}
