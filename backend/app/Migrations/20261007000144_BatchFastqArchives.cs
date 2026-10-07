using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class BatchFastqArchives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "archive_entry_index",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_fastq_archives",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_vendor_results_draft_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    chunk_manifest_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    chunks_json = table.Column<string>(type: "jsonb", nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    manifest_json = table.Column<string>(type: "jsonb", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_fastq_archives", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_fastq_archives_lab_vendor_results_drafts_lab_vendor_res~",
                        column: x => x.lab_vendor_results_draft_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_vendor_results_drafts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_archives_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_uploads_lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                column: "lab_fastq_archive_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_archives_lab_vendor_results_draft_id_expires_at_u~",
                schema: "lab_ops",
                table: "lab_fastq_archives",
                columns: new[] { "lab_vendor_results_draft_id", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_archives_user_id",
                schema: "lab_ops",
                table: "lab_fastq_archives",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_fastq_uploads_lab_fastq_archives_lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                column: "lab_fastq_archive_id",
                principalSchema: "lab_ops",
                principalTable: "lab_fastq_archives",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_fastq_uploads_lab_fastq_archives_lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads");

            migrationBuilder.DropTable(
                name: "lab_fastq_archives",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_fastq_uploads_lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads");

            migrationBuilder.DropColumn(
                name: "archive_entry_index",
                schema: "lab_ops",
                table: "lab_fastq_uploads");

            migrationBuilder.DropColumn(
                name: "lab_fastq_archive_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads");
        }
    }
}
