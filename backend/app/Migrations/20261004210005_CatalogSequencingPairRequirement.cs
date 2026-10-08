using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhaenoPortal.App.Migrations
{
    /// <inheritdoc />
    public partial class CatalogSequencingPairRequirement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Archive configuration only; never infer a physical transfer or a Catalog requirement.
            migrationBuilder.Sql("""
                INSERT INTO commercial_ops.audit_events
                    (id, entity_name, entity_id, operation, organization_id, actor_user_id, request_id, occurred_at, changes_json)
                SELECT gen_random_uuid(), 'LabOperationalBatch', id::text, 'BatchSequencingRequirementArchived',
                    NULL, NULL, '20261004210005_CatalogSequencingPairRequirement', CURRENT_TIMESTAMP,
                    jsonb_build_object('batchNumber', batch_number, 'minimumSequencingVolumeUl', minimum_sequencing_volume_ul,
                        'reason', 'Catalog becomes authoritative; obsolete batch configuration retained for review and rollback')
                FROM lab_ops.lab_operational_batches WHERE minimum_sequencing_volume_ul IS NOT NULL;
                """);
            migrationBuilder.DropColumn(
                name: "minimum_sequencing_volume_ul",
                schema: "lab_ops",
                table: "lab_operational_batches");

            migrationBuilder.AddColumn<decimal>(
                name: "minimum_sequencing_volume_ul",
                schema: "commercial_ops",
                table: "qbo_catalog_items",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "minimum_sequencing_volume_ul",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "sequencing_catalog_item_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sequencing_catalog_name",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "sequencing_catalog_version",
                schema: "lab_ops",
                table: "lab_batch_members",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_lab_batch_members_sequencing_catalog_item_id",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "sequencing_catalog_item_id");

            migrationBuilder.AddForeignKey(
                name: "fk_lab_batch_members_sequencing_catalog",
                schema: "lab_ops",
                table: "lab_batch_members",
                column: "sequencing_catalog_item_id",
                principalSchema: "commercial_ops",
                principalTable: "qbo_catalog_items",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_lab_batch_members_sequencing_catalog",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropIndex(
                name: "ix_lab_batch_members_sequencing_catalog_item_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "minimum_sequencing_volume_ul",
                schema: "commercial_ops",
                table: "qbo_catalog_items");

            migrationBuilder.DropColumn(
                name: "minimum_sequencing_volume_ul",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "sequencing_catalog_item_id",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "sequencing_catalog_name",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.DropColumn(
                name: "sequencing_catalog_version",
                schema: "lab_ops",
                table: "lab_batch_members");

            migrationBuilder.AddColumn<decimal>(
                name: "minimum_sequencing_volume_ul",
                schema: "lab_ops",
                table: "lab_operational_batches",
                type: "numeric",
                nullable: true);
            migrationBuilder.Sql("""
                UPDATE lab_ops.lab_operational_batches AS batch
                SET minimum_sequencing_volume_ul = (archive.changes_json->>'minimumSequencingVolumeUl')::numeric
                FROM commercial_ops.audit_events AS archive
                WHERE archive.entity_id = batch.id::text AND archive.operation = 'BatchSequencingRequirementArchived'
                    AND archive.request_id = '20261004210005_CatalogSequencingPairRequirement';
                """);
        }
    }
}
