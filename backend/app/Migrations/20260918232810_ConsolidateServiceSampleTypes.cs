using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateServiceSampleTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_service_offerings_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_offerings");

            migrationBuilder.CreateTable(
                name: "lab_service_sample_types",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_service_offering_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sample_type_definition_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_service_sample_types", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_service_sample_types_lab_service_offerings_lab_service_~",
                        column: x => x.lab_service_offering_id,
                        principalSchema: "commercial_ops",
                        principalTable: "lab_service_offerings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_service_sample_types_sample_type_definitions_sample_typ~",
                        column: x => x.sample_type_definition_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_type_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_catalog_item_id_is_active_effective_f~",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                columns: new[] { "catalog_item_id", "is_active", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_sample_types_lab_service_offering_id_sample_typ~",
                schema: "commercial_ops",
                table: "lab_service_sample_types",
                columns: new[] { "lab_service_offering_id", "sample_type_definition_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_sample_types_sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_sample_types",
                column: "sample_type_definition_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_service_sample_types",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_offerings_catalog_item_id_is_active_effective_f~",
                schema: "commercial_ops",
                table: "lab_service_offerings");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_offerings_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_offerings",
                column: "catalog_item_id");
        }
    }
}
