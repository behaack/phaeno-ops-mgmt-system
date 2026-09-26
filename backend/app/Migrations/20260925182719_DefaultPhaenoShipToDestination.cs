using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class DefaultPhaenoShipToDestination : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "default_shipping_destination_definition_key",
                schema: "commercial_ops",
                table: "order_system_configurations",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE commercial_ops.order_system_configurations
                SET default_shipping_destination_definition_key = (
                    SELECT definition_key
                    FROM commercial_ops.sample_shipping_destinations
                    WHERE is_active = true AND effective_from <= now()
                        AND (effective_to IS NULL OR effective_to > now())
                    ORDER BY revision DESC LIMIT 1
                )
                WHERE default_shipping_destination_definition_key IS NULL
                    AND (SELECT COUNT(DISTINCT definition_key)
                         FROM commercial_ops.sample_shipping_destinations
                         WHERE is_active = true AND effective_from <= now()
                             AND (effective_to IS NULL OR effective_to > now())) = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_shipping_destination_definition_key",
                schema: "commercial_ops",
                table: "order_system_configurations");
        }
    }
}
