using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScientificUploadsAndCustomerHolds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_customer_holds",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    paused_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    response = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    responded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    responded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_customer_holds", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_customer_holds_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_customer_holds_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_scientific_uploads",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    chunks_json = table.Column<string>(type: "jsonb", nullable: false),
                    completed_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_scientific_uploads", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_scientific_uploads_lab_scientific_files_completed_file_~",
                        column: x => x.completed_file_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_scientific_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_scientific_uploads_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_scientific_uploads_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_customer_holds_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_customer_holds",
                column: "lab_specimen_id",
                unique: true,
                filter: "state <> 'Released'");

            migrationBuilder.CreateIndex(
                name: "IX_lab_customer_holds_lab_work_order_id_requested_at_utc",
                schema: "lab_ops",
                table: "lab_customer_holds",
                columns: new[] { "lab_work_order_id", "requested_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_uploads_completed_file_id",
                schema: "lab_ops",
                table: "lab_scientific_uploads",
                column: "completed_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_uploads_expires_at_utc",
                schema: "lab_ops",
                table: "lab_scientific_uploads",
                column: "expires_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_uploads_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_scientific_uploads",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_scientific_uploads_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_scientific_uploads",
                column: "lab_work_order_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_customer_holds",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_scientific_uploads",
                schema: "lab_ops");
        }
    }
}
