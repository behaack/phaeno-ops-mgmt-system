using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReusableLabSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_steps",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    latest_version = table.Column<int>(type: "integer", nullable: false),
                    retired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retired_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    retirement_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_steps", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_step_versions",
                schema: "lab_ops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    definition_json = table.Column<string>(type: "jsonb", nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authored_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_override_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_step_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_step_versions_lab_steps_lab_step_id",
                        column: x => x.lab_step_id,
                        principalSchema: "lab_ops",
                        principalTable: "lab_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_step_versions_lab_step_id_step_version",
                schema: "lab_ops",
                table: "lab_step_versions",
                columns: new[] { "lab_step_id", "step_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lab_steps_key",
                schema: "lab_ops",
                table: "lab_steps",
                column: "key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_step_versions",
                schema: "lab_ops");

            migrationBuilder.DropTable(
                name: "lab_steps",
                schema: "lab_ops");
        }
    }
}
