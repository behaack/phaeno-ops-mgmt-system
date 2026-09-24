using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkPhaenoReagentProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_material_lot_product_kind",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.AddColumn<Guid>(
                name: "material_definition_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_products_material_definition_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                column: "material_definition_id",
                unique: true,
                filter: "material_definition_id IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_supplier_products_lab_material_definitions_material_def~",
                schema: "lab_ops",
                table: "lab_supplier_products",
                column: "material_definition_id",
                principalSchema: "lab_ops",
                principalTable: "lab_material_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_product_types
                SET name = 'Reagent', normalized_name = 'REAGENT', kit_use = 'Other',
                    is_active = TRUE, updated_at = now(), version = version + 1
                WHERE id = '90000000-0000-4000-8000-000000000003'
                  AND (name <> 'Reagent' OR normalized_name <> 'REAGENT'
                       OR kit_use <> 'Other' OR is_active = FALSE);
                """);

            // Existing prepared-reagent identities, workflows, and lots keep their IDs.
            // A product row with the same UUID gives each historical reagent exactly one
            // Phaeno catalog identity without changing its workflow or lot lineage.
            migrationBuilder.Sql("""
                WITH named_reagents AS (
                    SELECT d.id, d.name, d.default_quantity_unit, d.is_active,
                           count(*) OVER (PARTITION BY upper(d.name)) AS name_count
                    FROM lab_ops.lab_material_definitions AS d
                    WHERE d.kind = 'PreparedReagent'
                ), products AS (
                    SELECT r.*,
                           CASE WHEN length(r.name) > 100 OR r.name_count > 1
                                THEN left(r.name, 91) || '-' || right(replace(r.id::text, '-', ''), 8)
                                ELSE r.name END AS catalog_name
                    FROM named_reagents AS r
                )
                INSERT INTO lab_ops.lab_supplier_products
                    (id, supplier_id, product_number, normalized_product_number,
                     description, product_type_id, material_definition_id,
                     is_active, can_expire, default_quantity_unit,
                     created_at, updated_at, version)
                SELECT p.id, s.id, p.catalog_name, upper(p.catalog_name),
                       'Phaeno-manufactured reagent; review the product description.',
                       '90000000-0000-4000-8000-000000000003', p.id,
                       p.is_active,
                       EXISTS (SELECT 1 FROM lab_ops.lab_material_lots AS lot
                               WHERE lot.material_definition_id = p.id
                                 AND lot.expiration_or_retest_date IS NOT NULL),
                       p.default_quantity_unit, now(), now(), 1
                FROM products AS p
                CROSS JOIN lab_ops.lab_suppliers AS s
                WHERE s.is_internal_producer = TRUE;

                UPDATE lab_ops.lab_material_lots AS lot
                SET supplier_product_id = p.id, updated_at = now(), version = lot.version + 1
                FROM lab_ops.lab_supplier_products AS p
                WHERE lot.kind = 'PreparedReagent'
                  AND lot.material_definition_id = p.material_definition_id
                  AND lot.supplier_product_id IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM lab_ops.lab_supplier_products AS p
                               JOIN lab_ops.lab_suppliers AS s ON s.id = p.supplier_id
                               WHERE s.is_internal_producer = TRUE
                                 AND p.material_definition_id IS NOT NULL
                                 AND p.id <> p.material_definition_id) THEN
                        RAISE EXCEPTION 'Cannot roll back while newly configured Phaeno reagent products exist';
                    END IF;
                END $$;

                UPDATE lab_ops.lab_material_lots
                SET supplier_product_id = NULL, updated_at = now(), version = version + 1
                WHERE kind = 'PreparedReagent' AND supplier_product_id IS NOT NULL;

                DELETE FROM lab_ops.lab_supplier_products AS p
                USING lab_ops.lab_suppliers AS s
                WHERE p.supplier_id = s.id AND s.is_internal_producer = TRUE
                  AND p.id = p.material_definition_id;
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_lab_supplier_products_lab_material_definitions_material_def~",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.DropIndex(
                name: "IX_lab_supplier_products_material_definition_id",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.DropColumn(
                name: "material_definition_id",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.AddCheckConstraint(
                name: "ck_material_lot_product_kind",
                schema: "lab_ops",
                table: "lab_material_lots",
                sql: "supplier_product_id IS NULL OR kind = 'SupplierLot'");
        }
    }
}
