using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowRejectedTubeWithoutStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "location",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);
            // Preserve the recorded decision while correcting its physical-availability flag.
            migrationBuilder.Sql("UPDATE lab_ops.lab_containers SET status = 'Rejected' WHERE intake_disposition = 'Rejected' AND status = 'Available';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback must never manufacture storage for rejected receipts.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM lab_ops.lab_containers WHERE location IS NULL) THEN
                        RAISE EXCEPTION 'Cannot require storage while non-stored tube receipts exist.';
                    END IF;
                END $$;
                """);
            migrationBuilder.Sql("UPDATE lab_ops.lab_containers SET status = 'Available' WHERE status = 'Rejected';");
            migrationBuilder.AlterColumn<string>(
                name: "location",
                schema: "lab_ops",
                table: "lab_containers",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);
        }
    }
}
