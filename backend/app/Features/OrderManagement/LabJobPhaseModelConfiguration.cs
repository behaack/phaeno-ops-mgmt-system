namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class LabJobPhaseModelConfiguration
{
    public static void Configure(ModelBuilder model, string schema)
    {
        var phase = model.Entity<LabJobPhase>();
        phase.ToTable("lab_job_phases", schema);
        phase.HasKey(x => x.Id);
        phase.Property(x => x.Name).HasMaxLength(150);
        phase.Property(x => x.AcceptedSubtotal).HasPrecision(18, 2);
        phase.Property(x => x.CarriedInvoicedSubtotal).HasPrecision(18, 2);
        phase.Property(x => x.PriceLinesJson).HasColumnType("jsonb");
        phase.Property(x => x.ScopeJson).HasColumnType("jsonb");
        phase.Property(x => x.ProposedUnitPrice).HasPrecision(18, 2);
        phase.Property(x => x.ProposedAdditionalRunPrice).HasPrecision(18, 2);
        phase.Property(x => x.PriceProposalNote).HasMaxLength(1000);
        model.Entity<LabServiceOrder>().Property(x => x.CommercialDraftJson).HasColumnType("jsonb");
        phase.Property(x => x.CancellationReason).HasMaxLength(2000);
        phase.HasOne<LabServiceOrder>().WithMany(x => x.Phases).HasForeignKey(x => x.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
        phase.HasIndex(x => new { x.LabServiceOrderId, x.Position }).HasFilter("superseded_at_utc IS NULL");
        model.Entity<LabServiceOrder>().Navigation(x => x.Phases).AutoInclude();
        model.Entity<LabSampleTubePair>().HasOne<LabJobPhase>().WithMany().HasForeignKey(p => p.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);
        model.Entity<LabSample>().HasOne<LabJobPhase>().WithMany().HasForeignKey(x => x.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);
        model.Entity<LabSample>().Property(x => x.LabJobPhaseId).IsRequired();
        model.Entity<LabSample>().HasIndex(x => new { x.LabJobPhaseId, x.Status });
        model.Entity<LabServiceQuote>().Property(x => x.PhasePlanSnapshotJson).HasColumnType("jsonb");

        model.Entity<PSeq.Operations.Laboratory.Domain.LabJobDeadlineChange>().HasOne<LabJobPhase>().WithMany()
            .HasForeignKey(x => x.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);

        var proposal = model.Entity<LabPhasePlanProposal>();
        proposal.ToTable("lab_phase_plan_proposals", schema);
        proposal.HasKey(x => x.Id);
        proposal.Property(x => x.BeforeJson).HasColumnType("jsonb");
        proposal.Property(x => x.AfterJson).HasColumnType("jsonb");
        proposal.Property(x => x.Reason).HasMaxLength(2000);
        proposal.Property(x => x.DecisionReason).HasMaxLength(2000);
        proposal.Property(x => x.Status).HasMaxLength(24);
        proposal.HasOne<LabServiceOrder>().WithMany().HasForeignKey(x => x.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
        proposal.HasIndex(x => x.LabServiceOrderId).IsUnique().HasFilter("status = 'Pending'");

        var cancellation = model.Entity<LabPhaseCancellationRequest>();
        cancellation.ToTable("lab_phase_cancellation_requests", schema);
        cancellation.HasKey(x => x.Id);
        cancellation.Property(x => x.Reason).HasMaxLength(2000);
        cancellation.Property(x => x.DecisionReason).HasMaxLength(2000);
        cancellation.Property(x => x.Status).HasMaxLength(24);
        cancellation.HasOne<LabJobPhase>().WithMany().HasForeignKey(x => x.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);
        cancellation.HasIndex(x => x.LabJobPhaseId).IsUnique().HasFilter("status = 'Pending'");

        var allocation = model.Entity<LabPhaseInvoiceAllocation>();
        allocation.ToTable("lab_phase_invoice_allocations", schema);
        allocation.HasKey(x => x.Id);
        allocation.Property(x => x.Subtotal).HasPrecision(18, 2);
        allocation.Property(x => x.PhaseNameSnapshot).HasMaxLength(150);
        allocation.Property(x => x.PriceLinesSnapshotJson).HasColumnType("jsonb");
        allocation.HasOne<Invoice>().WithMany().HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Restrict);
        allocation.HasOne<LabJobPhase>().WithMany().HasForeignKey(x => x.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);
        allocation.HasIndex(x => new { x.InvoiceId, x.LabJobPhaseId }).IsUnique();
        var assignment = model.Entity<LabPhaseBillingAssignment>();
        assignment.ToTable("lab_phase_billing_assignments", schema);
        assignment.HasKey(x => x.Id);
        assignment.Property(x => x.Subtotal).HasPrecision(18, 2);
        assignment.HasOne<LabPhaseInvoiceAllocation>().WithMany().HasForeignKey(x => x.LabPhaseInvoiceAllocationId).OnDelete(DeleteBehavior.Restrict);
        assignment.HasOne<LabJobPhase>().WithMany().HasForeignKey(x => x.LabJobPhaseId).OnDelete(DeleteBehavior.Restrict);
        assignment.HasIndex(x => new { x.LabJobPhaseId, x.LabPhaseInvoiceAllocationId });
        foreach (var type in new[] { typeof(LabJobPhase), typeof(LabPhasePlanProposal), typeof(LabPhaseCancellationRequest), typeof(LabPhaseInvoiceAllocation), typeof(LabPhaseBillingAssignment) })
            model.Entity(type).Property("Version").IsConcurrencyToken();
    }
}
