using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkMaterialLotsToSupplierProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_product_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_material_lot_product_kind",
                schema: "lab_ops",
                table: "lab_material_lots",
                sql: "supplier_product_id IS NULL OR kind = 'SupplierLot'");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_lots_lab_supplier_products_supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_product_id",
                principalSchema: "lab_ops",
                principalTable: "lab_supplier_products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_material_lots_lab_supplier_products_supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropCheckConstraint(
                name: "ck_material_lot_product_kind",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "supplier_product_id",
                schema: "lab_ops",
                table: "lab_material_lots");
        }
    }
}
