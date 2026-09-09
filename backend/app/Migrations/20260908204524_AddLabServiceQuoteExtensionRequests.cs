using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddLabServiceQuoteExtensionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_service_quote_extension_requests",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quote_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    replacement_quote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_quote_extension_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_orders_lab~",
                        column: x => x.lab_service_order_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_quotes_quo~",
                        column: x => x.quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_lab_service_quotes_rep~",
                        column: x => x.replacement_quote_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_quote_extension_requests_users_requested_by_use~",
                        column: x => x.requested_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_lab_service_order_id_r~",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                columns: new[] { "lab_service_order_id", "resolved_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_quote_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "quote_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_replacement_quote_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "replacement_quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quote_extension_requests_requested_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quote_extension_requests",
                column: "requested_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_service_quote_extension_requests",
                schema: "commercial_ops");
        }
    }
}
