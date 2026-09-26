using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PhaenoPortal.App.Infrastructure.Persistence;

#nullable disable

namespace PSeq.Operations.Api.Migrations;

/// <summary>The old assignment matrix is intentionally discarded in the test-data reset.</summary>
[DbContext(typeof(PSeqOperationsDbContext))]
[Migration("20260925220000_RestartSampleShippingConfiguration")]
public sealed class RestartSampleShippingConfiguration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE commercial_ops.sample_shipping_container_compatibilities;
            DROP TABLE commercial_ops.sample_shipping_instruction_rules;

            ALTER TABLE commercial_ops.sample_shipping_container_types
                ADD COLUMN sample_type_anchor_id uuid NULL,
                ADD COLUMN sample_type_linked_at timestamp with time zone NULL,
                ADD COLUMN sample_type_linked_by_user_id uuid NULL;
            CREATE INDEX "IX_sample_shipping_container_types_sample_type_anchor_id"
                ON commercial_ops.sample_shipping_container_types (sample_type_anchor_id);
            CREATE INDEX "IX_sample_shipping_container_types_sample_type_linked_by_user_id"
                ON commercial_ops.sample_shipping_container_types (sample_type_linked_by_user_id);
            ALTER TABLE commercial_ops.sample_shipping_container_types
                ADD CONSTRAINT fk_transportation_kit_sample_type_anchor
                    FOREIGN KEY (sample_type_anchor_id) REFERENCES commercial_ops.sample_type_definitions (id) ON DELETE RESTRICT,
                ADD CONSTRAINT fk_transportation_kit_link_actor
                    FOREIGN KEY (sample_type_linked_by_user_id) REFERENCES commercial_ops.users (id) ON DELETE RESTRICT;

            ALTER TABLE commercial_ops.sample_shipping_container_definitions
                ADD COLUMN dry_ice_quantity numeric(18,3) NULL,
                ADD COLUMN dry_ice_unit character varying(30) NULL,
                ADD COLUMN temperature_control_instructions character varying(2000) NULL;
            ALTER TABLE commercial_ops.sample_shipping_container_definitions
                ADD CONSTRAINT ck_transportation_kit_dry_ice_pair CHECK
                    ((dry_ice_quantity IS NULL AND dry_ice_unit IS NULL) OR
                     (dry_ice_quantity > 0 AND dry_ice_unit IS NOT NULL AND length(btrim(dry_ice_unit)) > 0));

            ALTER TABLE commercial_ops.lab_service_orders
                ADD COLUMN shipping_destination_id uuid NULL,
                ADD COLUMN shipping_destination_assigned_at timestamp with time zone NULL;
            CREATE INDEX "IX_lab_service_orders_shipping_destination_id"
                ON commercial_ops.lab_service_orders (shipping_destination_id);
            ALTER TABLE commercial_ops.lab_service_orders
                ADD CONSTRAINT fk_lab_service_order_ship_to_revision
                    FOREIGN KEY (shipping_destination_id) REFERENCES commercial_ops.sample_shipping_destinations (id) ON DELETE RESTRICT;

            ALTER TABLE commercial_ops.sample_shipping_stock_kits
                ADD COLUMN withdrawn_at timestamp with time zone NULL,
                ADD COLUMN withdrawn_by_user_id uuid NULL,
                ADD COLUMN withdrawal_reason character varying(1000) NULL;
            CREATE INDEX "IX_sample_shipping_stock_kits_withdrawn_by_user_id"
                ON commercial_ops.sample_shipping_stock_kits (withdrawn_by_user_id);
            ALTER TABLE commercial_ops.sample_shipping_stock_kits
                ADD CONSTRAINT fk_stock_kit_withdraw_actor
                    FOREIGN KEY (withdrawn_by_user_id) REFERENCES commercial_ops.users (id) ON DELETE RESTRICT;

            CREATE TABLE commercial_ops.sample_type_procedure_links (
                id uuid NOT NULL PRIMARY KEY,
                sample_type_anchor_id uuid NOT NULL,
                procedure_anchor_id uuid NOT NULL,
                changed_at timestamp with time zone NOT NULL,
                changed_by_user_id uuid NOT NULL,
                created_at timestamp with time zone NOT NULL,
                created_by_user_id uuid NULL,
                updated_at timestamp with time zone NOT NULL,
                updated_by_user_id uuid NULL,
                version bigint NOT NULL,
                CONSTRAINT fk_sample_type_procedure_link_sample_anchor
                    FOREIGN KEY (sample_type_anchor_id) REFERENCES commercial_ops.sample_type_definitions (id) ON DELETE RESTRICT,
                CONSTRAINT fk_sample_type_procedure_link_procedure_anchor
                    FOREIGN KEY (procedure_anchor_id) REFERENCES commercial_ops.sample_shipping_procedures (id) ON DELETE RESTRICT,
                CONSTRAINT fk_sample_type_procedure_link_actor
                    FOREIGN KEY (changed_by_user_id) REFERENCES commercial_ops.users (id) ON DELETE RESTRICT
            );
            CREATE UNIQUE INDEX "IX_sample_type_procedure_links_sample_type_anchor_id"
                ON commercial_ops.sample_type_procedure_links (sample_type_anchor_id);
            CREATE INDEX "IX_sample_type_procedure_links_procedure_anchor_id"
                ON commercial_ops.sample_type_procedure_links (procedure_anchor_id);
            CREATE INDEX "IX_sample_type_procedure_links_changed_by_user_id"
                ON commercial_ops.sample_type_procedure_links (changed_by_user_id);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Restore the verified pre-reset database backup to roll back this destructive test-data migration.");
}
