using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class VendorSequencingResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "carrier",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "destination",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outcome",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "outcome_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outcome_note",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "results_received_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "sequencing_started_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tracking_reference",
                schema: "lab_ops",
                table: "lab_ngs_sendouts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_vendor_library_exceptions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_batch_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    outcome = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_vendor_library_exceptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_vendor_library_exceptions_lab_batch_members_lab_batch_m~",
                        column: x => x.lab_batch_member_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_batch_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_vendor_library_exceptions_lab_ngs_sendouts_lab_ngs_send~",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_vendor_result_references",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_batch_member_id = table.Column<Guid>(type: "uuid", nullable: true),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    storage_reference = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_vendor_result_references", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_vendor_result_references_lab_batch_members_lab_batch_me~",
                        column: x => x.lab_batch_member_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_batch_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_vendor_result_references_lab_ngs_sendouts_lab_ngs_sendo~",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_library_exceptions_lab_batch_member_id",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                column: "lab_batch_member_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_library_exceptions_lab_ngs_sendout_id_lab_batch_~",
                schema: "lab_ops",
                table: "lab_vendor_library_exceptions",
                columns: new[] { "lab_ngs_sendout_id", "lab_batch_member_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_result_references_lab_batch_member_id",
                schema: "lab_ops",
                table: "lab_vendor_result_references",
                column: "lab_batch_member_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_result_references_lab_ngs_sendout_id",
                schema: "lab_ops",
                table: "lab_vendor_result_references",
                column: "lab_ngs_sendout_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_vendor_library_exceptions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_vendor_result_references",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "carrier",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "destination",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "outcome",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "outcome_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "outcome_note",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "results_received_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "sequencing_started_at_utc",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");

            migrationBuilder.DropColumn(
                name: "tracking_reference",
                schema: "lab_ops",
                table: "lab_ngs_sendouts");
        }
    }
}
