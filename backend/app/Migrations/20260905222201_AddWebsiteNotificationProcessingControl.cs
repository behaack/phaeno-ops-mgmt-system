using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWebsiteNotificationProcessingControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "web_notification_processing_controls",
                schema: "website",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_paused = table.Column<bool>(type: "boolean", nullable: false),
                    version = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_notification_processing_controls", x => x.id);
                    table.CheckConstraint("ck_web_notification_processing_singleton", "id = '526a3498-feb3-4a94-a5f2-9277c2bc9c97'::uuid");
                    table.ForeignKey(
                        name: "FK_web_notification_processing_controls_users_updated_by_user_~",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "website",
                table: "web_notification_processing_controls",
                columns: new[] { "id", "is_paused", "reason", "updated_at_utc", "updated_by_user_id", "version" },
                values: new object[] { new Guid("526a3498-feb3-4a94-a5f2-9277c2bc9c97"), false, null, null, null, new Guid("a6d4f4cc-c523-4a08-86f7-5d2bb44a1099") });

            migrationBuilder.CreateIndex(
                name: "IX_web_notification_processing_controls_updated_by_user_id",
                schema: "website",
                table: "web_notification_processing_controls",
                column: "updated_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "web_notification_processing_controls",
                schema: "website");
        }
    }
}
