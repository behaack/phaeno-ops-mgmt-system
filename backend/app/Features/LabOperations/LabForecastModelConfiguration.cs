namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public static class LabForecastModelConfiguration
{
    public static void Configure(ModelBuilder model, string schema)
    {
        model.Entity<LabBusinessCalendar>(e => {
            e.ToTable("lab_business_calendars", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Version).IsConcurrencyToken(); e.HasIndex(x => x.Revision).IsUnique();
            e.Property(x => x.TimeZoneId).HasMaxLength(100); e.Property(x => x.Reason).HasMaxLength(2000);
            e.HasMany(x => x.Holidays).WithOne().HasForeignKey(x => x.LabBusinessCalendarId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabHoliday>(e => {
            e.ToTable("lab_holidays", schema); e.HasKey(x => x.Id); e.Property(x => x.Name).HasMaxLength(255);
            e.HasIndex(x => new { x.LabBusinessCalendarId, x.Date }).IsUnique();
        });
        model.Entity<LabTimingPolicy>(e => {
            e.ToTable("lab_timing_policies", schema); e.HasKey(x => x.Id); e.Property(x => x.Version).IsConcurrencyToken();
            e.Property(x => x.Reason).HasMaxLength(2000);
            e.HasIndex(x => new { x.LabServiceWorkflowVersionId, x.Revision }).IsUnique();
            e.HasOne<LabServiceWorkflowVersion>().WithMany().HasForeignKey(x => x.LabServiceWorkflowVersionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabBusinessCalendar>().WithMany().HasForeignKey(x => x.LabBusinessCalendarId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Durations).WithOne().HasForeignKey(x => x.LabTimingPolicyId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabStageDuration>(e => {
            e.ToTable("lab_stage_durations", schema); e.HasKey(x => x.Id); e.Property(x => x.StageKey).HasMaxLength(100);
            e.Property(x => x.Days).HasPrecision(7, 2); e.Property(x => x.DayBasis).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => new { x.LabTimingPolicyId, x.StageKey }).IsUnique();
        });
        model.Entity<LabJobTimingPolicy>(e => {
            e.ToTable("lab_job_timing_policies", schema); e.HasKey(x => x.Id); e.Property(x => x.Version).IsConcurrencyToken();
            e.Property(x => x.Reason).HasMaxLength(2000);
            e.HasIndex(x => new { x.LabWorkOrderId, x.Revision }).IsUnique();
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabTimingPolicy>().WithMany().HasForeignKey(x => x.LabTimingPolicyId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabForecastTransition>(e => {
            e.ToTable("lab_forecast_transitions", schema); e.HasKey(x => x.Id);
            e.Property(x => x.SourceKind).HasMaxLength(100); e.Property(x => x.State).HasMaxLength(100); e.Property(x => x.PreviousState).HasMaxLength(100);
            e.HasIndex(x => new { x.LabWorkOrderId, x.SourceKind, x.SourceId, x.EnteredAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabForecastSnapshot>(e => {
            e.ToTable("lab_forecast_snapshots", schema); e.HasKey(x => x.Id); e.Property(x => x.DetailsJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.LabWorkOrderId, x.EvaluatedAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
