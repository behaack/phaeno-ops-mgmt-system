using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class SingleSampleTypePerPSeqOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sample_type_material_class_snapshot",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "sample_type_definition_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_sample_type_definitions_sample_type_defi~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "sample_type_definition_id",
                principalSchema: "commercial_ops",
                principalTable: "sample_type_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_sample_type_definitions_sample_type_defi~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sample_type_definition_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "sample_type_material_class_snapshot",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
