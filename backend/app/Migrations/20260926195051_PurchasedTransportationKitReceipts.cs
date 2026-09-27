using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class PurchasedTransportationKitReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.AddColumn<string>(
                name: "purchased_kit_receipt_reference",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "purchased_kit_received_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "purchased_kit_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_kit_lot_number",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_purchased_kit_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "purchased_kit_received_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "normalized_sku",
                unique: true,
                filter: "finished_kit_product_id IS NULL");

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_kit_purchased_receipt_actor",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "purchased_kit_received_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_kit_purchased_receipt_actor",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_purchased_kit_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types");

            migrationBuilder.DropColumn(
                name: "purchased_kit_receipt_reference",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "purchased_kit_received_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "purchased_kit_received_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "supplier_kit_lot_number",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_container_types_normalized_sku",
                schema: "commercial_ops",
                table: "sample_shipping_container_types",
                column: "normalized_sku",
                unique: true);
        }
    }
}
