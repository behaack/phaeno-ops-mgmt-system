using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabMaterialReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_material_key_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_qc_disposition_expires_at_utc",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.RenameColumn(
                name: "components_json",
                schema: "lab_ops",
                table: "lab_material_lots",
                newName: "legacy_components_json");

            migrationBuilder.AddColumn<DateOnly>(
                name: "expiration_or_retest_date",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "material_definition_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lab_material_definitions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_material_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_storage_locations",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_storage_locations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_suppliers",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_suppliers", x => x.id);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO lab_ops.lab_material_definitions
                    (id, key, name, kind, is_active, created_at, created_by_user_id,
                     updated_at, updated_by_user_id, version)
                SELECT DISTINCT ON (material_key)
                    id, material_key, name, kind, TRUE, created_at, created_by_user_id,
                    updated_at, updated_by_user_id, 1
                FROM lab_ops.lab_material_lots
                ORDER BY material_key, created_at, id;

                INSERT INTO lab_ops.lab_suppliers
                    (id, name, normalized_name, is_active, created_at, created_by_user_id,
                     updated_at, updated_by_user_id, version)
                SELECT DISTINCT ON (upper(btrim(supplier)))
                    id, btrim(supplier), upper(btrim(supplier)), TRUE, created_at,
                    created_by_user_id, updated_at, updated_by_user_id, 1
                FROM lab_ops.lab_material_lots
                WHERE supplier IS NOT NULL AND btrim(supplier) <> ''
                ORDER BY upper(btrim(supplier)), created_at, id;

                INSERT INTO lab_ops.lab_storage_locations
                    (id, name, normalized_name, is_active, created_at, created_by_user_id,
                     updated_at, updated_by_user_id, version)
                SELECT DISTINCT ON (upper(btrim(storage_location)))
                    id, btrim(storage_location), upper(btrim(storage_location)), TRUE,
                    created_at, created_by_user_id, updated_at, updated_by_user_id, 1
                FROM lab_ops.lab_material_lots
                ORDER BY upper(btrim(storage_location)), created_at, id;

                UPDATE lab_ops.lab_material_lots AS lot
                SET material_definition_id = definition.id
                FROM lab_ops.lab_material_definitions AS definition
                WHERE definition.key = lot.material_key;

                UPDATE lab_ops.lab_material_lots AS lot
                SET supplier_id = supplier.id
                FROM lab_ops.lab_suppliers AS supplier
                WHERE supplier.normalized_name = upper(btrim(lot.supplier));

                UPDATE lab_ops.lab_material_lots AS lot
                SET storage_location_id = location.id,
                    expiration_or_retest_date = lot.expires_at_utc::date
                FROM lab_ops.lab_storage_locations AS location
                WHERE location.normalized_name = upper(btrim(lot.storage_location));
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "material_definition_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "expires_at_utc",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "material_key",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "name",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "storage_location",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "supplier",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.CreateTable(
                name: "lab_prepared_reagent_components",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prepared_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    component_material_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    quantity_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_prepared_reagent_components", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_prepared_reagent_components_lab_material_lots_component~",
                        column: x => x.component_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lab_prepared_reagent_components_lab_material_lots_prepared_~",
                        column: x => x.prepared_material_lot_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_material_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_material_definition_id_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "material_definition_id", "lot_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_qc_disposition_expiration_or_retest_date",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "qc_disposition", "expiration_or_retest_date" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "storage_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_definitions_key",
                schema: "lab_ops",
                table: "lab_material_definitions",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_definitions_kind_is_active_name",
                schema: "lab_ops",
                table: "lab_material_definitions",
                columns: new[] { "kind", "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_prepared_reagent_components_component_material_lot_id",
                schema: "lab_ops",
                table: "lab_prepared_reagent_components",
                column: "component_material_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_prepared_reagent_components_prepared_material_lot_id_co~",
                schema: "lab_ops",
                table: "lab_prepared_reagent_components",
                columns: new[] { "prepared_material_lot_id", "component_material_lot_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_locations_is_active_name",
                schema: "lab_ops",
                table: "lab_storage_locations",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_storage_locations_normalized_name",
                schema: "lab_ops",
                table: "lab_storage_locations",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_suppliers_is_active_name",
                schema: "lab_ops",
                table: "lab_suppliers",
                columns: new[] { "is_active", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_suppliers_normalized_name",
                schema: "lab_ops",
                table: "lab_suppliers",
                column: "normalized_name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_lots_lab_material_definitions_material_definit~",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "material_definition_id",
                principalSchema: "lab_ops",
                principalTable: "lab_material_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_lots_lab_storage_locations_storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "storage_location_id",
                principalSchema: "lab_ops",
                principalTable: "lab_storage_locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_material_lots_lab_suppliers_supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots",
                column: "supplier_id",
                principalSchema: "lab_ops",
                principalTable: "lab_suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_material_lots_lab_material_definitions_material_definit~",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_material_lots_lab_storage_locations_storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_material_lots_lab_suppliers_supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropTable(
                name: "lab_prepared_reagent_components",
                schema: "lab_ops");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_material_definition_id_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_qc_disposition_expiration_or_retest_date",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropIndex(
                name: "IX_lab_material_lots_supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.AddColumn<DateTime>(
                name: "expires_at_utc",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "material_key",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "name",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "storage_location",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "supplier",
                schema: "lab_ops",
                table: "lab_material_lots",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE lab_ops.lab_material_lots AS lot
                SET material_key = definition.key,
                    name = definition.name
                FROM lab_ops.lab_material_definitions AS definition
                WHERE definition.id = lot.material_definition_id;

                UPDATE lab_ops.lab_material_lots AS lot
                SET storage_location = location.name
                FROM lab_ops.lab_storage_locations AS location
                WHERE location.id = lot.storage_location_id;

                UPDATE lab_ops.lab_material_lots AS lot
                SET supplier = supplier.name
                FROM lab_ops.lab_suppliers AS supplier
                WHERE supplier.id = lot.supplier_id;

                UPDATE lab_ops.lab_material_lots
                SET expires_at_utc =
                    expiration_or_retest_date::timestamp AT TIME ZONE 'UTC'
                WHERE expiration_or_retest_date IS NOT NULL;
                """);

            migrationBuilder.DropTable(
                name: "lab_material_definitions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_storage_locations",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_suppliers",
                schema: "lab_ops");

            migrationBuilder.DropColumn(
                name: "expiration_or_retest_date",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "material_definition_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "storage_location_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.DropColumn(
                name: "supplier_id",
                schema: "lab_ops",
                table: "lab_material_lots");

            migrationBuilder.RenameColumn(
                name: "legacy_components_json",
                schema: "lab_ops",
                table: "lab_material_lots",
                newName: "components_json");

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_material_key_lot_number",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "material_key", "lot_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_material_lots_qc_disposition_expires_at_utc",
                schema: "lab_ops",
                table: "lab_material_lots",
                columns: new[] { "qc_disposition", "expires_at_utc" });
        }
    }
}
