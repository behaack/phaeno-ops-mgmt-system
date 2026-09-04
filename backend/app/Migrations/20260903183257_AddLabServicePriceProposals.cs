using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabServicePriceProposals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "pricing_decided_at",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pricing_decision",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pricing_decision_reason",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "proposed_unit_price_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "source_request_revision",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "price_proposal_note",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "price_proposed_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "proposed_unit_price",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_quotes_pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                column: "pricing_decided_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "price_proposed_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_users_price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "price_proposed_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_quotes_users_pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes",
                column: "pricing_decided_by_user_id",
                principalSchema: "commercial_ops",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_users_price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_quotes_users_pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_quotes_pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "pricing_decided_at",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "pricing_decided_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "pricing_decision",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "pricing_decision_reason",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "proposed_unit_price_snapshot",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "source_request_revision",
                schema: "commercial_ops",
                table: "lab_service_quotes");

            migrationBuilder.DropColumn(
                name: "price_proposal_note",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "price_proposed_at",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "price_proposed_by_user_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "proposed_unit_price",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
