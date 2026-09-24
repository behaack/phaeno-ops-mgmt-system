using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedPhaenoInternalSupplier : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_internal_producer",
                schema: "lab_ops",
                table: "lab_suppliers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_lab_suppliers_is_internal_producer",
                schema: "lab_ops",
                table: "lab_suppliers",
                column: "is_internal_producer",
                unique: true,
                filter: "is_internal_producer = true");

            migrationBuilder.Sql("""
                INSERT INTO lab_ops.lab_suppliers
                    (id, name, normalized_name, is_active, is_internal_producer,
                     created_at, updated_at, version)
                VALUES
                    ('1e739efa-20d6-462d-a954-b12721fcfb20', 'Phaeno', 'PHAENO',
                     TRUE, TRUE, now(), now(), 1)
                ON CONFLICT (normalized_name) DO UPDATE
                    SET name = 'Phaeno', is_active = TRUE, is_internal_producer = TRUE,
                        updated_at = now(), version = lab_suppliers.version + 1;

                UPDATE lab_ops.lab_material_lots AS lot
                SET supplier_id = producer.id, updated_at = now(), version = lot.version + 1
                FROM lab_ops.lab_suppliers AS producer
                WHERE producer.is_internal_producer = TRUE
                  AND lot.kind = 'PreparedReagent' AND lot.supplier_id IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_material_lots AS lot
                SET supplier_id = NULL, updated_at = now(), version = lot.version + 1
                FROM lab_ops.lab_suppliers AS producer
                WHERE producer.is_internal_producer = TRUE
                  AND lot.kind = 'PreparedReagent' AND lot.supplier_id = producer.id;
                """);
            migrationBuilder.DropIndex(
                name: "IX_lab_suppliers_is_internal_producer",
                schema: "lab_ops",
                table: "lab_suppliers");

            migrationBuilder.DropColumn(
                name: "is_internal_producer",
                schema: "lab_ops",
                table: "lab_suppliers");
        }
    }
}
