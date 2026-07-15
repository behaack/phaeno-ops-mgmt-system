using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationalAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "partner_reagent_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "due_at",
                schema: "portal",
                table: "partner_reagent_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "lab_service_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "due_at",
                schema: "portal",
                table: "lab_service_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "data_assembly_requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "due_at",
                schema: "portal",
                table: "data_assembly_requests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_assigned_to_user_id_due_at",
                schema: "portal",
                table: "partner_reagent_orders",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_assigned_to_user_id_due_at",
                schema: "portal",
                table: "lab_service_orders",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_assigned_to_user_id_due_at",
                schema: "portal",
                table: "data_assembly_requests",
                columns: new[] { "assigned_to_user_id", "due_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_data_assembly_requests_users_assigned_to_user_id",
                schema: "portal",
                table: "data_assembly_requests",
                column: "assigned_to_user_id",
                principalSchema: "portal",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_users_assigned_to_user_id",
                schema: "portal",
                table: "lab_service_orders",
                column: "assigned_to_user_id",
                principalSchema: "portal",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_reagent_orders_users_assigned_to_user_id",
                schema: "portal",
                table: "partner_reagent_orders",
                column: "assigned_to_user_id",
                principalSchema: "portal",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_data_assembly_requests_users_assigned_to_user_id",
                schema: "portal",
                table: "data_assembly_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_users_assigned_to_user_id",
                schema: "portal",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_orders_users_assigned_to_user_id",
                schema: "portal",
                table: "partner_reagent_orders");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_orders_assigned_to_user_id_due_at",
                schema: "portal",
                table: "partner_reagent_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_assigned_to_user_id_due_at",
                schema: "portal",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_data_assembly_requests_assigned_to_user_id_due_at",
                schema: "portal",
                table: "data_assembly_requests");

            migrationBuilder.DropColumn(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "partner_reagent_orders");

            migrationBuilder.DropColumn(
                name: "due_at",
                schema: "portal",
                table: "partner_reagent_orders");

            migrationBuilder.DropColumn(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "due_at",
                schema: "portal",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "assigned_to_user_id",
                schema: "portal",
                table: "data_assembly_requests");

            migrationBuilder.DropColumn(
                name: "due_at",
                schema: "portal",
                table: "data_assembly_requests");
        }
    }
}
