using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnforceLabLibraryLineage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_library_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "library_container_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_libraries_source_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "source_container_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_libraries_lab_containers_library_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "library_container_id",
                principalSchema: "lab_ops",
                principalTable: "lab_containers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_libraries_lab_containers_source_container_id",
                schema: "lab_ops",
                table: "lab_libraries",
                column: "source_container_id",
                principalSchema: "lab_ops",
                principalTable: "lab_containers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_libraries_lab_containers_library_container_id",
                schema: "lab_ops",
                table: "lab_libraries");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_libraries_lab_containers_source_container_id",
                schema: "lab_ops",
                table: "lab_libraries");

            migrationBuilder.DropIndex(
                name: "IX_lab_libraries_library_container_id",
                schema: "lab_ops",
                table: "lab_libraries");

            migrationBuilder.DropIndex(
                name: "IX_lab_libraries_source_container_id",
                schema: "lab_ops",
                table: "lab_libraries");
        }
    }
}
