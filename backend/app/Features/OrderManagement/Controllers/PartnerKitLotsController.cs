namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController, Authorize, Route("api/reagent-orders/{orderId:guid}/assembly-cases/{caseId:guid}/lot")]
public sealed class PartnerKitLotsController(PSeqOperationsDbContext db, OrderRequestContext context, OrderIdempotencyService idempotency) : ControllerBase
{
    [HttpPost]
    public async Task<KitLotSubmissionDto> Submit(Guid orderId, Guid caseId, SubmitPartnerKitLotRequest request, CancellationToken token)
    {
        var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, token);
        if (!await db.KitAssemblyCases.AnyAsync(x => x.Id == caseId && x.PartnerReagentOrderId == orderId
            && x.OrganizationId == tenant.Organization.Id && x.DepartmentId == tenant.Department.Id, token)) throw Missing();
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, $"kit-case:{caseId}:lot", idempotency.RequireKey(HttpContext), request, async ct =>
        {
            var included = await db.KitAssemblyCases.SingleAsync(x => x.Id == caseId && x.PartnerReagentOrderId == orderId
                && x.OrganizationId == tenant.Organization.Id && x.DepartmentId == tenant.Department.Id, ct);
            if (included.Version != request.CaseVersion) throw new DbUpdateConcurrencyException();
            if (included.IsTerminal) throw new OrderManagementException("kit_case_closed", "This assembly case is closed.", 409);
            if (included.AssemblyRequestId.HasValue)
            {
                var status = await db.DataAssemblyRequests.Where(x => x.Id == included.AssemblyRequestId).Select(x => x.Status).SingleAsync(ct);
                if (status is not (AssemblyRequestStatus.Draft or AssemblyRequestStatus.ChangesRequested))
                    throw new OrderManagementException("kit_lot_frozen", "The lot evidence is frozen with submitted inputs. Ask Phaeno to request corrections before changing it.", 409);
            }
            var kit = await db.PartnerKitUnits.SingleAsync(x => x.Id == included.CurrentKitUnitId, ct);
            if (kit.Status != KitUnitStatus.Shipped || !kit.KitLotId.HasValue)
                throw new OrderManagementException("kit_not_shipped", "Submit the lot after Phaeno has shipped the kit.", 409);
            var service = new PSeqKitLotService(db);
            var lot = await service.ReadLotAsync(kit.KitLotId.Value, true, ct);
            if (PSeqKitLot.Normalize(request.LotNumber ?? "") != lot.NormalizedLotNumber)
                throw new OrderManagementException("kit_lot_mismatch", "This lot does not match the kit assigned to this case. Check the label or contact Phaeno.");
            if (request.UsedOn.HasValue && request.UsedOn < DateOnly.FromDateTime(kit.ShippedAt!.Value))
                throw new OrderManagementException("kit_use_date_invalid", "The kit-use date cannot be before this kit was shipped.");
            var assessment = PSeqKitLotService.Assess(lot, request.UsedOn);
            var submission = await db.PartnerKitLotSubmissions.SingleOrDefaultAsync(x => x.KitAssemblyCaseId == caseId && x.KitUnitId == kit.Id, ct);
            if (submission?.Version != request.Version) throw new DbUpdateConcurrencyException();
            try
            {
                if (submission is null) { submission = new(included, kit, request.LotNumber!, request.UsedOn, PSeqKitLotService.Snapshot(assessment), DateTime.UtcNow); db.PartnerKitLotSubmissions.Add(submission); }
                else submission.Update(request.LotNumber!, request.UsedOn, PSeqKitLotService.Snapshot(assessment), DateTime.UtcNow);
            }
            catch (ArgumentException error) { throw new OrderManagementException("kit_lot_invalid", error.Message); }
            await db.SaveChangesAsync(ct);
            return PSeqKitLotService.Map(submission, lot);
        }, cancellationToken: token, concurrencyScope: $"kit-case:{caseId}");
        return result.Response;
    }
    private static OrderManagementException Missing() => new("kit_case_not_found", "The kit case was not found.", 404);
}
