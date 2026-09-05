using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWebsiteNotificationRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "web_notification_deliveries",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    web_contact_id = table.Column<Guid>(type: "uuid", nullable: true),
                    web_order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    state = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_attempt_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    accepted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lease_expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lease_token = table.Column<Guid>(type: "uuid", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    attempts_since_recovery = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    last_recovery_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    last_recovery_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_deliveries", x => x.id);
                    table.CheckConstraint("ck_web_notification_target", "(web_contact_id IS NOT NULL AND web_order_id IS NULL AND kind IN ('MailingListAlert', 'TechnicalBrief')) OR (web_order_id IS NOT NULL AND web_contact_id IS NULL AND kind = 'DemoRequestAlert')");
                    table.ForeignKey(
                        name: "FK_web_notification_deliveries_web_contacts_web_contact_id",
                        column: x => x.web_contact_id,
                        principalSchema: "website",
                        principalTable: "web_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_web_notification_deliveries_web_orders_web_order_id",
                        column: x => x.web_order_id,
                        principalSchema: "website",
                        principalTable: "web_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "web_notification_attempts",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    web_notification_delivery_id = table.Column<Guid>(type: "uuid", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: false),
                    started_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    finished_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    outcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    recovery_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_web_notification_attempts_web_notification_deliveries_web_n~",
                        column: x => x.web_notification_delivery_id,
                        principalSchema: "website",
                        principalTable: "web_notification_deliveries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_attempts_web_notification_delivery_id_atte~",
                schema: "website",
                table: "web_notification_attempts",
                columns: new[] { "web_notification_delivery_id", "attempt_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_state_next_attempt_at_utc",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "state", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_web_contact_id_kind",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "web_contact_id", "kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_deliveries_web_order_id_kind",
                schema: "website",
                table: "web_notification_deliveries",
                columns: new[] { "web_order_id", "kind" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "web_notification_attempts",
                schema: "website");

            migrationBuilder.DropTable(
                name: "web_notification_deliveries",
                schema: "website");
        }
    }
}
