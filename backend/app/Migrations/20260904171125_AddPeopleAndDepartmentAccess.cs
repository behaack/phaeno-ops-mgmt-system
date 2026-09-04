using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPeopleAndDepartmentAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sample_shipments_organization_id_status",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropIndex(
                name: "IX_partner_shipping_addresses_organization_id_is_active_label",
                schema: "commercial_ops",
                table: "partner_shipping_addresses");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_orders_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_organization_id_normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_data_assembly_requests_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "order_notifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "crm_contact_user_links",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    link_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_contact_user_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_crm_contact_user_links_crm_contacts_contact_id",
                        column: x => x.contact_id,
                        principalSchema: "commercial_ops",
                        principalTable: "crm_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_contact_user_links_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "commercial_ops",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_departments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    purchase_order_required = table.Column<bool>(type: "boolean", nullable: true),
                    billing_contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    notification_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipping_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    result_delivery_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_departments", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_departments_organizations_organization_id",
                        column: x => x.organization_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_department_memberships",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_membership_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_department_admin = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_department_memberships", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_department_memberships_organization_department~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_department_memberships_organization_membership~",
                        column: x => x.organization_membership_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_memberships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organization_invitation_departments",
                schema: "commercial_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_invitation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_department_admin = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_invitation_departments", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_invitation_departments_organization_department~",
                        column: x => x.department_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_invitation_departments_organization_invitation~",
                        column: x => x.organization_invitation_id,
                        principalSchema: "commercial_ops",
                        principalTable: "organization_invitations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO commercial_ops.organization_departments
                    (id, organization_id, code, name, description, is_default, is_active,
                     purchase_order_required, billing_contact_email, notification_email,
                     shipping_instructions, result_delivery_instructions,
                     created_at, created_by_user_id, updated_at, updated_by_user_id, version)
                SELECT gen_random_uuid(), organization.id, 'GENERAL', 'General',
                       'Default department created during department access rollout.',
                       TRUE, TRUE, NULL, NULL, NULL, NULL, NULL,
                       NOW(), NULL, NOW(), NULL, 1
                FROM commercial_ops.organizations AS organization
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM commercial_ops.organization_departments AS department
                    WHERE department.organization_id = organization.id
                );

                INSERT INTO commercial_ops.organization_department_memberships
                    (id, organization_membership_id, department_id, is_department_admin,
                     is_active, created_at, created_by_user_id, updated_at, updated_by_user_id, version)
                SELECT gen_random_uuid(), membership.id, department.id,
                       membership.is_organization_admin, membership.is_active,
                       NOW(), NULL, NOW(), NULL, 1
                FROM commercial_ops.organization_memberships AS membership
                JOIN commercial_ops.organization_departments AS department
                  ON department.organization_id = membership.organization_id
                 AND department.is_default = TRUE
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM commercial_ops.organization_department_memberships AS assignment
                    WHERE assignment.organization_membership_id = membership.id
                      AND assignment.department_id = department.id
                );

                INSERT INTO commercial_ops.organization_invitation_departments
                    (id, organization_invitation_id, department_id, is_department_admin)
                SELECT gen_random_uuid(), invitation.id, department.id,
                       invitation.is_organization_admin
                FROM commercial_ops.organization_invitations AS invitation
                JOIN commercial_ops.organization_departments AS department
                  ON department.organization_id = invitation.organization_id
                 AND department.is_default = TRUE
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM commercial_ops.organization_invitation_departments AS intent
                    WHERE intent.organization_invitation_id = invitation.id
                      AND intent.department_id = department.id
                );

                UPDATE commercial_ops.lab_service_orders AS item
                SET department_id = department.id
                FROM commercial_ops.organization_departments AS department
                WHERE department.organization_id = item.organization_id
                  AND department.is_default = TRUE;

                UPDATE commercial_ops.data_assembly_requests AS item
                SET department_id = department.id
                FROM commercial_ops.organization_departments AS department
                WHERE department.organization_id = item.organization_id
                  AND department.is_default = TRUE;

                UPDATE commercial_ops.partner_reagent_orders AS item
                SET department_id = department.id
                FROM commercial_ops.organization_departments AS department
                WHERE department.organization_id = item.organization_id
                  AND department.is_default = TRUE;

                UPDATE commercial_ops.partner_shipping_addresses AS item
                SET department_id = department.id
                FROM commercial_ops.organization_departments AS department
                WHERE department.organization_id = item.organization_id
                  AND department.is_default = TRUE;

                UPDATE commercial_ops.sample_shipments AS item
                SET department_id = department.id
                FROM commercial_ops.organization_departments AS department
                WHERE department.organization_id = item.organization_id
                  AND department.is_default = TRUE;

                UPDATE commercial_ops.order_notifications AS notification
                SET department_id = source.department_id
                FROM (
                    SELECT id, department_id, 'LabService' AS workflow_type
                    FROM commercial_ops.lab_service_orders
                    UNION ALL
                    SELECT id, department_id, 'DataAssembly' AS workflow_type
                    FROM commercial_ops.data_assembly_requests
                    UNION ALL
                    SELECT id, department_id, 'Reagent' AS workflow_type
                    FROM commercial_ops.partner_reagent_orders
                ) AS source
                WHERE source.id = notification.workflow_id
                  AND source.workflow_type = notification.workflow_type;

                ALTER TABLE commercial_ops.lab_service_orders ALTER COLUMN department_id DROP DEFAULT;
                ALTER TABLE commercial_ops.data_assembly_requests ALTER COLUMN department_id DROP DEFAULT;
                ALTER TABLE commercial_ops.partner_reagent_orders ALTER COLUMN department_id DROP DEFAULT;
                ALTER TABLE commercial_ops.partner_shipping_addresses ALTER COLUMN department_id DROP DEFAULT;
                ALTER TABLE commercial_ops.sample_shipments ALTER COLUMN department_id DROP DEFAULT;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_department_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_organization_id_department_id_status",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "organization_id", "department_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_department_id",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_organization_id_department_id_is~",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                columns: new[] { "organization_id", "department_id", "is_active", "label" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_department_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitations_crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "crm_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_notifications_department_id",
                schema: "commercial_ops",
                table: "order_notifications",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_department_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_department_id_normalized~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "department_id", "normalized_job_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_department_id_status_cre~",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_department_id",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "department_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_contact_user_links_contact_id",
                schema: "commercial_ops",
                table: "crm_contact_user_links",
                column: "contact_id",
                unique: true,
                filter: "is_active = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_crm_contact_user_links_user_id",
                schema: "commercial_ops",
                table: "crm_contact_user_links",
                column: "user_id",
                unique: true,
                filter: "is_active = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_organization_department_memberships_department_id",
                schema: "commercial_ops",
                table: "organization_department_memberships",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_department_memberships_organization_membership~",
                schema: "commercial_ops",
                table: "organization_department_memberships",
                columns: new[] { "organization_membership_id", "department_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_departments_organization_id",
                schema: "commercial_ops",
                table: "organization_departments",
                column: "organization_id",
                unique: true,
                filter: "\"is_default\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_organization_departments_organization_id_code",
                schema: "commercial_ops",
                table: "organization_departments",
                columns: new[] { "organization_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitation_departments_department_id",
                schema: "commercial_ops",
                table: "organization_invitation_departments",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_invitation_departments_organization_invitation~",
                schema: "commercial_ops",
                table: "organization_invitation_departments",
                columns: new[] { "organization_invitation_id", "department_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_data_assembly_requests_organization_departments_department_~",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_lab_service_orders_organization_departments_department_id",
                schema: "commercial_ops",
                table: "lab_service_orders",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_order_notifications_organization_departments_department_id",
                schema: "commercial_ops",
                table: "order_notifications",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_organization_invitations_crm_contacts_crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations",
                column: "crm_contact_id",
                principalSchema: "commercial_ops",
                principalTable: "crm_contacts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_reagent_orders_organization_departments_department_~",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_partner_shipping_addresses_organization_departments_departm~",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sample_shipments_organization_departments_department_id",
                schema: "commercial_ops",
                table: "sample_shipments",
                column: "department_id",
                principalSchema: "commercial_ops",
                principalTable: "organization_departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_data_assembly_requests_organization_departments_department_~",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_service_orders_organization_departments_department_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_order_notifications_organization_departments_department_id",
                schema: "commercial_ops",
                table: "order_notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_organization_invitations_crm_contacts_crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_reagent_orders_organization_departments_department_~",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_partner_shipping_addresses_organization_departments_departm~",
                schema: "commercial_ops",
                table: "partner_shipping_addresses");

            migrationBuilder.DropForeignKey(
                name: "FK_sample_shipments_organization_departments_department_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropTable(
                name: "crm_contact_user_links",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_department_memberships",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_invitation_departments",
                schema: "commercial_ops");

            migrationBuilder.DropTable(
                name: "organization_departments",
                schema: "commercial_ops");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipments_department_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropIndex(
                name: "IX_sample_shipments_organization_id_department_id_status",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropIndex(
                name: "IX_partner_shipping_addresses_department_id",
                schema: "commercial_ops",
                table: "partner_shipping_addresses");

            migrationBuilder.DropIndex(
                name: "IX_partner_shipping_addresses_organization_id_department_id_is~",
                schema: "commercial_ops",
                table: "partner_shipping_addresses");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_orders_department_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropIndex(
                name: "IX_partner_reagent_orders_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropIndex(
                name: "IX_organization_invitations_crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations");

            migrationBuilder.DropIndex(
                name: "IX_order_notifications_department_id",
                schema: "commercial_ops",
                table: "order_notifications");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_department_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_organization_id_department_id_normalized~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_lab_service_orders_organization_id_department_id_status_cre~",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropIndex(
                name: "IX_data_assembly_requests_department_id",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropIndex(
                name: "IX_data_assembly_requests_organization_id_department_id_status~",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "sample_shipments");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "partner_shipping_addresses");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "partner_reagent_orders");

            migrationBuilder.DropColumn(
                name: "crm_contact_id",
                schema: "commercial_ops",
                table: "organization_invitations");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "order_notifications");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "department_id",
                schema: "commercial_ops",
                table: "data_assembly_requests");

            migrationBuilder.CreateIndex(
                name: "IX_sample_shipments_organization_id_status",
                schema: "commercial_ops",
                table: "sample_shipments",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_shipping_addresses_organization_id_is_active_label",
                schema: "commercial_ops",
                table: "partner_shipping_addresses",
                columns: new[] { "organization_id", "is_active", "label" });

            migrationBuilder.CreateIndex(
                name: "IX_partner_reagent_orders_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "partner_reagent_orders",
                columns: new[] { "organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_normalized_job_name",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "normalized_job_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_service_orders_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "lab_service_orders",
                columns: new[] { "organization_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_data_assembly_requests_organization_id_status_created_at",
                schema: "commercial_ops",
                table: "data_assembly_requests",
                columns: new[] { "organization_id", "status", "created_at" });
        }
    }
}
