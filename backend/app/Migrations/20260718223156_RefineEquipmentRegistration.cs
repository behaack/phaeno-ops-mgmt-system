using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class RefineEquipmentRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_equipment_status_calibration_due_at_utc",
                schema: "lab_ops",
                table: "lab_equipment");

            migrationBuilder.Sql(
                """
                ALTER TABLE lab_ops.lab_equipment
                    RENAME COLUMN calibration_due_at_utc TO calibration_due_on;
                ALTER TABLE lab_ops.lab_equipment
                    ALTER COLUMN calibration_due_on TYPE date
                    USING ((calibration_due_on AT TIME ZONE 'UTC')::date);

                ALTER TABLE lab_ops.lab_equipment
                    RENAME COLUMN last_calibration_at_utc TO last_calibration_on;
                ALTER TABLE lab_ops.lab_equipment
                    ALTER COLUMN last_calibration_on TYPE date
                    USING ((last_calibration_on AT TIME ZONE 'UTC')::date);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_status_calibration_due_on",
                schema: "lab_ops",
                table: "lab_equipment",
                columns: new[] { "status", "calibration_due_on" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_lab_equipment_status_calibration_due_on",
                schema: "lab_ops",
                table: "lab_equipment");

            migrationBuilder.Sql(
                """
                ALTER TABLE lab_ops.lab_equipment
                    RENAME COLUMN calibration_due_on TO calibration_due_at_utc;
                ALTER TABLE lab_ops.lab_equipment
                    ALTER COLUMN calibration_due_at_utc TYPE timestamp with time zone
                    USING (calibration_due_at_utc::timestamp AT TIME ZONE 'UTC');

                ALTER TABLE lab_ops.lab_equipment
                    RENAME COLUMN last_calibration_on TO last_calibration_at_utc;
                ALTER TABLE lab_ops.lab_equipment
                    ALTER COLUMN last_calibration_at_utc TYPE timestamp with time zone
                    USING (last_calibration_at_utc::timestamp AT TIME ZONE 'UTC');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_lab_equipment_status_calibration_due_at_utc",
                schema: "lab_ops",
                table: "lab_equipment",
                columns: new[] { "status", "calibration_due_at_utc" });
        }
    }
}
