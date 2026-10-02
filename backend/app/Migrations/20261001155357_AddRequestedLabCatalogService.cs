using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestedLabCatalogService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "requested_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_requested_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "requested_catalog_item_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_qbo_catalog_items_requested_catalog_item~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "requested_catalog_item_id",
                principalSchema: "commercial_ops",
                principalTable: "qbo_catalog_items",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_qbo_catalog_items_requested_catalog_item~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_requested_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "requested_catalog_item_id",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
