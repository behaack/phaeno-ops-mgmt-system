namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

[ApiController]
[Authorize]
[Route("api/platform/sample-shipping/container-types")]
[Route("api/platform/lab-operations/sample-shipping/container-types")]
public sealed class SampleShippingContainersAdminController(OrderRequestContext requestContext,
    SampleShippingContainerCatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> List(CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.ReadAllAsync(cancellationToken);
    }
    [HttpGet("{id:guid}")]
    public async Task<SampleShippingContainerDefinitionDto> Get(Guid id, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.ReadAsync(id, cancellationToken);
    }
    [HttpGet("{id:guid}/revisions")]
    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> Revisions(Guid id, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.ReadRevisionsAsync(id, cancellationToken);
    }
    [HttpPost]
    public async Task<SampleShippingContainerDefinitionDto> Create([FromBody] CreateSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.CreateAsync(request, cancellationToken);
    }
    [HttpPost("{id:guid}/revisions")]
    public async Task<SampleShippingContainerDefinitionDto> Revise(Guid id, [FromBody] ReviseSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.ReviseAsync(id, request, cancellationToken);
    }
    [HttpPost("recommendation")]
    public async Task<ContainerPackingPreviewDto> Preview([FromBody] ContainerPackingPreviewRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var definitions = await catalog.ReadCompatibleAsync(request.Contexts, cancellationToken, request.IncludeDraftDefinitionId);
        return SampleShippingContainerPacker.Preview(definitions, request.TubeCount, request.Availability, request.Selection);
    }
    [HttpPost("{id:guid}/deactivate")]
    public async Task<SampleShippingContainerDefinitionDto> Deactivate(Guid id, [FromBody] DeactivateSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await catalog.DeactivateAsync(id, request.Version, cancellationToken);
    }
}
