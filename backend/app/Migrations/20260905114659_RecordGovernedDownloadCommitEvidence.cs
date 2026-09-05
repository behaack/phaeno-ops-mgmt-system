using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class RecordGovernedDownloadCommitEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "operational_download_commit_evidence",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operational_file_download_id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_transaction_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    admission_cutoff_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    committed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_download_commit_evidence", x => x.id);
                    table.ForeignKey(
                        name: "FK_operational_download_commit_evidence_operational_file_downl~",
                        column: x => x.operational_file_download_id,
                        principalSchema: "commercial_ops",
                        principalTable: "operational_file_downloads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_operational_download_commit_evidence_operational_file_downl~",
                schema: "commercial_ops",
                table: "operational_download_commit_evidence",
                columns: new[] { "operational_file_download_id", "phase" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operational_download_commit_evidence_recorded_at_utc",
                schema: "commercial_ops",
                table: "operational_download_commit_evidence",
                column: "recorded_at_utc",
                filter: "committed_at_utc IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                LOCK TABLE commercial_ops.operational_download_commit_evidence IN ACCESS EXCLUSIVE MODE;
                DO $guard$
                BEGIN
                    IF EXISTS (SELECT 1 FROM commercial_ops.operational_download_commit_evidence) THEN
                        RAISE EXCEPTION 'Download commit evidence exists; use a reviewed forward fix instead of discarding timing evidence.';
                    END IF;
                END $guard$;
                """);
            migrationBuilder.DropTable(
                name: "operational_download_commit_evidence",
                schema: "commercial_ops");
        }
    }
}
