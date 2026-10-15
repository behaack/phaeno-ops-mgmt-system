using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPSeqKitLotTraceability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing kit evidence needs a separately reviewed conversion; never invent lot lineage.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM commercial_ops.reagent_shipment_lines)
                       OR EXISTS (SELECT 1 FROM commercial_ops.partner_kit_units WHERE status IN ('Shipped', 'Replaced'))
                       OR EXISTS (SELECT 1 FROM commercial_ops.assembly_input_revisions WHERE kit_unit_id IS NOT NULL)
                    THEN
                        RAISE EXCEPTION 'PSeq kit lot traceability requires reviewed conversion of existing kit shipment/input evidence before migration. No records have been changed.';
                    END IF;
                END $$;
                """);
            migrationBuilder.AddColumn<Guid>(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "kit_lot_assessment_json",
                schema: "commercial_ops",
                table: "assembly_processing_runs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "kit_lot_assessment_json",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "kit_lot_submission_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "kit_used_on",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "pseq_kit_lots",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    catalog_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lot_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    normalized_lot_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_recalled = table.Column<bool>(type: "boolean", nullable: false),
                    recall_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    recall_changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pseq_kit_lots", x => x.id);
                    table.ForeignKey(
                        name: "FK_pseq_kit_lots_qbo_catalog_items_catalog_item_id",
                        column: x => x.catalog_item_id,
                        principalSchema: "commercial_ops",
                        principalTable: "qbo_catalog_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pseq_kit_lots_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pseq_kit_lots_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "partner_kit_lot_submissions",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_assembly_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kit_lot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entered_lot_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    used_on = table.Column<DateOnly>(type: "date", nullable: true),
                    checked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    assessment_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_kit_lot_submissions", x => x.id);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_kit_assembly_cases_kit_assembly~",
                        column: x => x.kit_assembly_case_id,
                        principalSchema: "commercial_ops",
                        principalTable: "kit_assembly_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_organization_departments_depart~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_partner_kit_units_kit_unit_id",
                        column: x => x.kit_unit_id,
                        principalSchema: "commercial_ops",
                        principalTable: "partner_kit_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_pseq_kit_lots_kit_lot_id",
                        column: x => x.kit_lot_id,
                        principalSchema: "commercial_ops",
                        principalTable: "pseq_kit_lots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_kit_lot_submissions_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reagent_shipment_lines_kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines",
                column: "kit_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_units_kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "kit_lot_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_partner_kit_units_shipped_lot",
                schema: "commercial_ops",
                table: "partner_kit_units",
                sql: "status NOT IN ('Shipped', 'Replaced') OR kit_lot_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_assembly_input_revisions_kit_lot_submission_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_lot_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_created_by_user_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_department_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_kit_assembly_case_id_kit_unit_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                columns: new[] { "kit_assembly_case_id", "kit_unit_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                column: "kit_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_kit_unit_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                column: "kit_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_organization_id_department_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                columns: new[] { "organization_id", "department_id" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_kit_lot_submissions_updated_by_user_id",
                schema: "commercial_ops",
                table: "partner_kit_lot_submissions",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_pseq_kit_lots_catalog_item_id_normalized_lot_number",
                schema: "commercial_ops",
                table: "pseq_kit_lots",
                columns: new[] { "catalog_item_id", "normalized_lot_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pseq_kit_lots_created_by_user_id",
                schema: "commercial_ops",
                table: "pseq_kit_lots",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_pseq_kit_lots_updated_by_user_id",
                schema: "commercial_ops",
                table: "pseq_kit_lots",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_input_revisions_partner_kit_lot_submissions_kit_lo~",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_lot_submission_id",
                principalSchema: "commercial_ops",
                principalTable: "partner_kit_lot_submissions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_assembly_input_revisions_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions",
                column: "kit_lot_id",
                principalSchema: "commercial_ops",
                principalTable: "pseq_kit_lots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_kit_units_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units",
                column: "kit_lot_id",
                principalSchema: "commercial_ops",
                principalTable: "pseq_kit_lots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_reagent_shipment_lines_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines",
                column: "kit_lot_id",
                principalSchema: "commercial_ops",
                principalTable: "pseq_kit_lots",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assembly_input_revisions_partner_kit_lot_submissions_kit_lo~",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropForeignKey(
                name: "FK_assembly_input_revisions_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_kit_units_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units");

            migrationBuilder.DropForeignKey(
                name: "FK_reagent_shipment_lines_pseq_kit_lots_kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines");

            migrationBuilder.DropTable(
                name: "partner_kit_lot_submissions",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "pseq_kit_lots",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_reagent_shipment_lines_kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines");

            migrationBuilder.DropIndex(
                name: "IX_partner_kit_units_kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units");

            migrationBuilder.DropCheckConstraint(
                name: "ck_partner_kit_units_shipped_lot",
                schema: "commercial_ops",
                table: "partner_kit_units");

            migrationBuilder.DropIndex(
                name: "IX_assembly_input_revisions_kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropIndex(
                name: "IX_assembly_input_revisions_kit_lot_submission_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropColumn(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "reagent_shipment_lines");

            migrationBuilder.DropColumn(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "partner_kit_units");

            migrationBuilder.DropColumn(
                name: "kit_lot_assessment_json",
                schema: "commercial_ops",
                table: "assembly_processing_runs");

            migrationBuilder.DropColumn(
                name: "kit_lot_assessment_json",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropColumn(
                name: "kit_lot_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropColumn(
                name: "kit_lot_submission_id",
                schema: "commercial_ops",
                table: "assembly_input_revisions");

            migrationBuilder.DropColumn(
                name: "kit_used_on",
                schema: "commercial_ops",
                table: "assembly_input_revisions");
        }
    }
}
