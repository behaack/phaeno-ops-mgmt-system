using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedShippingProceduresAndContainerPacking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "destination_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "packing_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "temperature_control_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sample_shipping_procedures",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_key = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    supersedes_procedure_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    packing_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    temperature_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    carrier_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    dispatch_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    required_documents = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    exception_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    international_customs_instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sample_shipping_procedures", x => x.id);
                    table.ForeignKey(
                        name: "FK_sample_shipping_procedures_sample_shipping_procedures_super~",
                        column: x => x.supersedes_procedure_id,
                        principalSchema: "commercial_ops",
                        principalTable: "sample_shipping_procedures",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_instruction_rules_shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "shipping_procedure_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_procedures_definition_key_revision",
                schema: "commercial_ops",
                table: "sample_shipping_procedures",
                columns: new[] { "definition_key", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipping_procedures_supersedes_procedure_id",
                schema: "commercial_ops",
                table: "sample_shipping_procedures",
                column: "supersedes_procedure_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sample_shipping_instruction_rules_sample_shipping_procedure~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules",
                column: "shipping_procedure_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_shipping_procedures",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sample_shipping_instruction_rules_sample_shipping_procedure~",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules");

            migrationBuilder.DropTable(
                name: "sample_shipping_procedures",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipping_instruction_rules_shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules");

            migrationBuilder.DropColumn(
                name: "destination_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules");

            migrationBuilder.DropColumn(
                name: "shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_shipping_instruction_rules");

            migrationBuilder.DropColumn(
                name: "packing_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities");

            migrationBuilder.DropColumn(
                name: "temperature_control_instructions",
                schema: "commercial_ops",
                table: "sample_shipping_container_compatibilities");
        }
    }
}
