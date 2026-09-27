using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleKitSpecificationsPerProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "finished_kit_product_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_finished_kit_product_id",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "finished_kit_product_id",
                unique: true);
        }
    }
}
