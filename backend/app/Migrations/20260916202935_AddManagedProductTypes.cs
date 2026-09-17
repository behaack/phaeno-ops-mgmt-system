using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddManagedProductTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "product_type_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_product_types",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    kit_use = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_product_types", x => x.id);
                });

            // Preserve every existing product's classification before removing the enum column.
            migrationBuilder.Sql("""
                INSERT INTO lab_ops.lab_product_types
                    (id, name, normalized_name, description, kit_use, is_active, created_at, updated_at, version)
                VALUES
                    ('90000000-0000-4000-8000-000000000001', 'Tube', 'TUBE', 'Tubes used to transport samples.', 'Tube', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
                    ('90000000-0000-4000-8000-000000000002', 'Shipping Container', 'SHIPPING CONTAINER', 'Containers used to transport sample tubes.', 'ShippingContainer', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
                    ('90000000-0000-4000-8000-000000000003', 'Reagent', 'REAGENT', 'Reagents supplied for laboratory work.', 'Other', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);
                UPDATE lab_ops.lab_supplier_products
                SET product_type_id = CASE kind
                    WHEN 'Tube' THEN '90000000-0000-4000-8000-000000000001'::uuid
                    WHEN 'ShippingContainer' THEN '90000000-0000-4000-8000-000000000002'::uuid
                END;
                """);
            migrationBuilder.AlterColumn<Guid>(
                name: "product_type_id", schema: "lab_ops", table: "lab_supplier_products",
                type: "uuid", nullable: false, oldClrType: typeof(Guid), oldType: "uuid", oldNullable: true);
            migrationBuilder.DropColumn(
                name: "kind",
                schema: "lab_ops",
                table: "lab_supplier_products");

            migrationBuilder.CreateIndex(
                name: "IX_lab_supplier_products_product_type_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                column: "product_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_product_types_normalized_name",
                schema: "lab_ops",
                table: "lab_product_types",
                column: "normalized_name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_supplier_products_lab_product_types_product_type_id",
                schema: "lab_ops",
                table: "lab_supplier_products",
                column: "product_type_id",
                principalSchema: "lab_ops",
                principalTable: "lab_product_types",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A two-kind application cannot safely read reagent/other products.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM lab_ops.lab_supplier_products p
                               JOIN lab_ops.lab_product_types t ON t.id = p.product_type_id
                               WHERE t.kit_use NOT IN ('Tube', 'ShippingContainer')) THEN
                        RAISE EXCEPTION 'Cannot downgrade while non-kit products exist.';
                    END IF;
                END $$;
                """);
            migrationBuilder.AddColumn<string>(name: "kind", schema: "lab_ops", table: "lab_supplier_products",
                type: "character varying(30)", maxLength: 30, nullable: true);
            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_supplier_products p SET kind = t.kit_use
                FROM lab_ops.lab_product_types t WHERE t.id = p.product_type_id;
                """);
            migrationBuilder.AlterColumn<string>(name: "kind", schema: "lab_ops", table: "lab_supplier_products",
                type: "character varying(30)", maxLength: 30, nullable: false,
                oldClrType: typeof(string), oldType: "character varying(30)", oldMaxLength: 30, oldNullable: true);
            migrationBuilder.DropForeignKey(name: "FK_lab_supplier_products_lab_product_types_product_type_id", schema: "lab_ops", table: "lab_supplier_products");
            migrationBuilder.DropIndex(name: "IX_lab_supplier_products_product_type_id", schema: "lab_ops", table: "lab_supplier_products");
            migrationBuilder.DropColumn(name: "product_type_id", schema: "lab_ops", table: "lab_supplier_products");
            migrationBuilder.DropTable(name: "lab_product_types", schema: "lab_ops");
        }
    }
}
