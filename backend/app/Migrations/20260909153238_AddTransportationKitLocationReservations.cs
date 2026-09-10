using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTransportationKitLocationReservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "reserved_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reserved_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reserved_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "departure_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_organization_id_department_id_cu~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                columns: new[] { "organization_id", "department_id", "customer_delivery_location_id" });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_reserved_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_stock_kits_reserved_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_sample_shipment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_departure_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "departure_delivery_location_id");

            migrationBuilder.AddForeignKey(
                name: "fk_sample_shipment_departure_location",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "departure_delivery_location_id",
                principalSchema: "commercial_ops",
                principalTable: "customer_delivery_locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_reserved_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_shipping_stock_reserved_shipment",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits",
                column: "reserved_sample_shipment_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_sample_shipment_departure_location",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_reserved_by",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropForeignKey(
                name: "fk_shipping_stock_reserved_shipment",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_organization_id_department_id_cu~",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_reserved_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_stock_kits_reserved_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipments_departure_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "reserved_at",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "reserved_by_user_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "reserved_sample_shipment_id",
                schema: "commercial_ops",
                table: "sample_shipping_stock_kits");

            migrationBuilder.DropColumn(
                name: "departure_delivery_location_id",
                schema: "commercial_ops",
                table: "sample_shipments");
        }
    }
}
