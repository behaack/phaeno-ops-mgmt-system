using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class VendorResultsVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_vendor_results_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_version = table.Column<int>(type: "integer", nullable: false),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_by_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_vendor_results_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_vendor_results_versions_lab_ngs_sendouts_lab_ngs_sendou~",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_vendor_results_versions_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_results_versions_lab_ngs_sendout_id_result_versi~",
                schema: "lab_ops",
                table: "lab_vendor_results_versions",
                columns: new[] { "lab_ngs_sendout_id", "result_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_results_versions_recorded_by_user_id",
                schema: "lab_ops",
                table: "lab_vendor_results_versions",
                column: "recorded_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_vendor_results_versions",
                schema: "lab_ops");
        }
    }
}
