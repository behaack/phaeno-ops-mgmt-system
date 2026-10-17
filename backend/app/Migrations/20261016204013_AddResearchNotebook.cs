using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResearchNotebook : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "research");

            migrationBuilder.CreateTable(
                name: "projects",
                schema: "research",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.id);
                    table.UniqueConstraint("AK_projects_organization_id_id", x => new { x.organization_id, x.id });
                });

            migrationBuilder.CreateTable(
                name: "revisions",
                schema: "research",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    record_kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<long>(type: "bigint", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revisions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "experiments",
                schema: "research",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    research_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    experiment_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    search_text = table.Column<string>(type: "text", nullable: false),
                    last_activity_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experiments", x => x.id);
                    table.UniqueConstraint("AK_experiments_organization_id_id", x => new { x.organization_id, x.id });
                    table.ForeignKey(
                        name: "FK_experiments_projects_organization_id_research_project_id",
                        columns: x => new { x.organization_id, x.research_project_id },
                        principalSchema: "research",
                        principalTable: "projects",
                        principalColumns: new[] { "organization_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "entries",
                schema: "research",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    research_experiment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    entry_date = table.Column<DateOnly>(type: "date", nullable: false),
                    content_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entries", x => x.id);
                    table.UniqueConstraint("AK_entries_organization_id_research_experiment_id_id", x => new { x.organization_id, x.research_experiment_id, x.id });
                    table.ForeignKey(
                        name: "FK_entries_experiments_organization_id_research_experiment_id",
                        columns: x => new { x.organization_id, x.research_experiment_id },
                        principalSchema: "research",
                        principalTable: "experiments",
                        principalColumns: new[] { "organization_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "attachments",
                schema: "research",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    research_experiment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    research_entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    storage_key = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    recorded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attachments", x => x.id);
                    table.ForeignKey(
                        name: "FK_attachments_entries_organization_id_research_experiment_id_~",
                        columns: x => new { x.organization_id, x.research_experiment_id, x.research_entry_id },
                        principalSchema: "research",
                        principalTable: "entries",
                        principalColumns: new[] { "organization_id", "research_experiment_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attachments_organization_id_research_experiment_id_research~",
                schema: "research",
                table: "attachments",
                columns: new[] { "organization_id", "research_experiment_id", "research_entry_id" });

            migrationBuilder.CreateIndex(
                name: "IX_experiments_organization_id_research_project_id_status_last~",
                schema: "research",
                table: "experiments",
                columns: new[] { "organization_id", "research_project_id", "status", "last_activity_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_projects_organization_id_updated_at",
                schema: "research",
                table: "projects",
                columns: new[] { "organization_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_revisions_organization_id_record_kind_record_id_revision",
                schema: "research",
                table: "revisions",
                columns: new[] { "organization_id", "record_kind", "record_id", "revision" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attachments",
                schema: "research");

            migrationBuilder.DropTable(
                name: "revisions",
                schema: "research");

            migrationBuilder.DropTable(
                name: "entries",
                schema: "research");

            migrationBuilder.DropTable(
                name: "experiments",
                schema: "research");

            migrationBuilder.DropTable(
                name: "projects",
                schema: "research");
        }
    }
}
