using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class SampleTypeSharedShippingProcedure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                type: "uuid",
                nullable: true);

            // Existing assignment families may disagree about their shared procedure.
            // Carry a choice forward only when every saved assignment in the Sample
            // type family names the same procedure family and it is still Active.
            migrationBuilder.Sql("""
                WITH unambiguous_sample_procedures AS (
                    SELECT sample.definition_key AS sample_key,
                           MIN(procedure.definition_key::text)::uuid AS procedure_key
                    FROM commercial_ops.sample_shipping_instruction_rules AS assignment
                    JOIN commercial_ops.sample_type_definitions AS sample
                      ON sample.id = assignment.sample_type_definition_id
                    LEFT JOIN commercial_ops.sample_shipping_procedures AS procedure
                      ON procedure.id = assignment.shipping_procedure_id
                    GROUP BY sample.definition_key
                    HAVING COUNT(*) = COUNT(procedure.definition_key)
                       AND COUNT(DISTINCT procedure.definition_key) = 1
                ), active_procedures AS (
                    SELECT DISTINCT ON (definition_key) definition_key, id
                    FROM commercial_ops.sample_shipping_procedures
                    WHERE is_active = TRUE
                    ORDER BY definition_key, revision DESC
                )
                UPDATE commercial_ops.sample_type_definitions AS sample
                SET shipping_procedure_id = active.id
                FROM unambiguous_sample_procedures AS agreed
                JOIN active_procedures AS active ON active.definition_key = agreed.procedure_key
                WHERE sample.definition_key = agreed.sample_key;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_sample_type_definitions_shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_type_definitions",
                column: "shipping_procedure_id");

            migrationBuilder.AddForeignKey(
                name: "fk_sample_type_shipping_procedure",
                schema: "commercial_ops",
                table: "sample_type_definitions",
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
                name: "fk_sample_type_shipping_procedure",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropIndex(
                name: "IX_sample_type_definitions_shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_type_definitions");

            migrationBuilder.DropColumn(
                name: "shipping_procedure_id",
                schema: "commercial_ops",
                table: "sample_type_definitions");
        }
    }
}
