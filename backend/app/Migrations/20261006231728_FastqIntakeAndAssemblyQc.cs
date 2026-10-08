using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class FastqIntakeAndAssemblyQc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_assembly_qc",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_assembly_job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_analysis_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_output_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_version = table.Column<int>(type: "integer", nullable: false),
                    lab_scientific_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    decision = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    measurements_json = table.Column<string>(type: "jsonb", nullable: false),
                    input_coverage_json = table.Column<string>(type: "jsonb", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_assembly_qc", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_assembly_qc_lab_analysis_runs_lab_analysis_run_id",
                        column: x => x.lab_analysis_run_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_analysis_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_qc_lab_assembly_jobs_lab_assembly_job_id",
                        column: x => x.lab_assembly_job_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_assembly_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_qc_lab_scientific_files_lab_scientific_file_id",
                        column: x => x.lab_scientific_file_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_scientific_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_qc_result_output_packages_result_output_packag~",
                        column: x => x.result_output_package_id,
                        principalSchema: "commercial_ops",
                        principalTable: "result_output_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_assembly_qc_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_vendor_results_drafts",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_ngs_sendout_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sendout_version = table.Column<long>(type: "bigint", nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    saved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_vendor_results_drafts", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_vendor_results_drafts_lab_ngs_sendouts_lab_ngs_sendout_~",
                        column: x => x.lab_ngs_sendout_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_ngs_sendouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_vendor_results_drafts_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_fastq_sets",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_vendor_results_draft_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_batch_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_library_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequencing_run_number = table.Column<int>(type: "integer", nullable: false),
                    library_preparation_choice = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    read_layout = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    set_version = table.Column<int>(type: "integer", nullable: false),
                    policy_json = table.Column<string>(type: "jsonb", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lab_vendor_results_version_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_fastq_sets", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_batch_members_lab_batch_member_id",
                        column: x => x.lab_batch_member_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_batch_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_libraries_lab_library_id",
                        column: x => x.lab_library_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_libraries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_specimens_lab_specimen_id",
                        column: x => x.lab_specimen_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimens",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_vendor_results_drafts_lab_vendor_results~",
                        column: x => x.lab_vendor_results_draft_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_vendor_results_drafts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_vendor_results_versions_lab_vendor_resul~",
                        column: x => x.lab_vendor_results_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_vendor_results_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_lab_work_orders_lab_work_order_id",
                        column: x => x.lab_work_order_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_sets_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_fastq_uploads",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_fastq_set_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    group_number = table.Column<int>(type: "integer", nullable: false),
                    read_number = table.Column<int>(type: "integer", nullable: false),
                    part_number = table.Column<int>(type: "integer", nullable: false),
                    group_description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    chunk_manifest_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    chunks_json = table.Column<string>(type: "jsonb", nullable: false),
                    lab_scientific_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    read_count = table.Column<long>(type: "bigint", nullable: true),
                    read_identifiers_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_fastq_uploads", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_fastq_uploads_lab_fastq_sets_lab_fastq_set_id",
                        column: x => x.lab_fastq_set_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_fastq_sets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_uploads_lab_scientific_files_lab_scientific_file_~",
                        column: x => x.lab_scientific_file_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_scientific_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_fastq_uploads_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_qc_lab_analysis_run_id",
                schema: "lab_ops",
                table: "lab_assembly_qc",
                column: "lab_analysis_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_qc_lab_assembly_job_id",
                schema: "lab_ops",
                table: "lab_assembly_qc",
                column: "lab_assembly_job_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_qc_lab_scientific_file_id",
                schema: "lab_ops",
                table: "lab_assembly_qc",
                column: "lab_scientific_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_qc_recorded_by_user_id",
                schema: "lab_ops",
                table: "lab_assembly_qc",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_assembly_qc_result_output_package_id_review_version",
                schema: "lab_ops",
                table: "lab_assembly_qc",
                columns: new[] { "result_output_package_id", "review_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_batch_member_id_set_version",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                columns: new[] { "lab_batch_member_id", "set_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_library_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "lab_library_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_specimen_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "lab_specimen_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_vendor_results_draft_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "lab_vendor_results_draft_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_vendor_results_version_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "lab_vendor_results_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_lab_work_order_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "lab_work_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_sets_recorded_by_user_id",
                schema: "lab_ops",
                table: "lab_fastq_sets",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_uploads_lab_fastq_set_id_group_number_read_number~",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                columns: new[] { "lab_fastq_set_id", "group_number", "read_number", "part_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_uploads_lab_scientific_file_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                column: "lab_scientific_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_fastq_uploads_user_id",
                schema: "lab_ops",
                table: "lab_fastq_uploads",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_results_drafts_lab_ngs_sendout_id_user_id_create~",
                schema: "lab_ops",
                table: "lab_vendor_results_drafts",
                columns: new[] { "lab_ngs_sendout_id", "user_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_vendor_results_drafts_user_id",
                schema: "lab_ops",
                table: "lab_vendor_results_drafts",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_assembly_qc",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_fastq_uploads",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_fastq_sets",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_vendor_results_drafts",
                schema: "lab_ops");
        }
    }
}
