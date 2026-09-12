using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryPreparationBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_tray_formats",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    layout_json = table.Column<string>(type: "jsonb", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_tray_formats", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_batches",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    lab_tray_format_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_workflow_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    layout_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_batches", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_batches_lab_service_workflow_versions_lab_s~",
                        column: x => x.lab_service_workflow_version_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_service_workflow_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_batches_lab_tray_formats_lab_tray_format_id",
                        column: x => x.lab_tray_format_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_tray_formats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_members",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_specimen_attempt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    confirmed_barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    removed = table.Column<bool>(type: "boolean", nullable: false),
                    output_container_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    lab_library_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_containers_output_container_id",
                        column: x => x.output_container_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_containers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_libraries_lab_library_id",
                        column: x => x.lab_library_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_libraries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_preparation_batches_lab_prepara~",
                        column: x => x.lab_preparation_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_preparation_members_lab_specimen_attempts_lab_specimen_~",
                        column: x => x.lab_specimen_attempt_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_specimen_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lab_preparation_records",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_preparation_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    details_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_preparation_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_preparation_records_lab_preparation_batches_lab_prepara~",
                        column: x => x.lab_preparation_batch_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_preparation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_consumptions_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_preparation_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_usages_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_preparation_record_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_lab_service_workflow_version_id",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "lab_service_workflow_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_batches_lab_tray_format_id",
                schema: "lab_ops",
                table: "lab_preparation_batches",
                column: "lab_tray_format_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_library_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "lab_library_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_preparation_batch_id_position",
                schema: "lab_ops",
                table: "lab_preparation_members",
                columns: new[] { "lab_preparation_batch_id", "position" },
                unique: true,
                filter: "NOT removed");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_lab_specimen_attempt_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "lab_specimen_attempt_id",
                unique: true,
                filter: "NOT removed");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_members_output_container_id",
                schema: "lab_ops",
                table: "lab_preparation_members",
                column: "output_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_preparation_records_lab_preparation_batch_id_recorded_a~",
                schema: "lab_ops",
                table: "lab_preparation_records",
                columns: new[] { "lab_preparation_batch_id", "recorded_at_utc" });

            migrationBuilder.AddForeignKey(
                name: "FK_lab_equipment_usages_lab_preparation_records_lab_preparatio~",
                schema: "lab_ops",
                table: "lab_equipment_usages",
                column: "lab_preparation_record_id",
                principalSchema: "lab_ops",
                principalTable: "lab_preparation_records",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_consumptions_lab_preparation_records_lab_prepa~",
                schema: "lab_ops",
                table: "lab_material_consumptions",
                column: "lab_preparation_record_id",
                principalSchema: "lab_ops",
                principalTable: "lab_preparation_records",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_equipment_usages_lab_preparation_records_lab_preparatio~",
                schema: "lab_ops",
                table: "lab_equipment_usages");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_material_consumptions_lab_preparation_records_lab_prepa~",
                schema: "lab_ops",
                table: "lab_material_consumptions");

            migrationBuilder.DropTable(
                name: "lab_preparation_members",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_preparation_records",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_preparation_batches",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_tray_formats",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_consumptions_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_material_consumptions");

            migrationBuilder.DropIndex(
                name: "IX_lab_equipment_usages_lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_equipment_usages");

            migrationBuilder.DropColumn(
                name: "lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_material_consumptions");

            migrationBuilder.DropColumn(
                name: "lab_preparation_record_id",
                schema: "lab_ops",
                table: "lab_equipment_usages");
        }
    }
}
