using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkCrmHandoffsToLabServiceOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "source_request_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_source_request_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "source_request_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_portal_integration_requests_source_reque~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "source_request_id",
                principalSchema: "commercial_ops",
                principalTable: "portal_integration_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_portal_integration_requests_source_reque~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_source_request_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "source_request_id",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
