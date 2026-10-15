namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Buffers.Binary;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private const long IllustrationLimit = 10 * 1024 * 1024;

    [HttpPost("configuration-assets")]
    [Consumes("application/octet-stream")]
    [RequestSizeLimit(IllustrationLimit)]
    public async Task<object> UploadConfigurationAsset([FromQuery] string fileName,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var name = Path.GetFileName((fileName ?? "").Replace('\\', '/'));
        if (name.Length is < 1 or > 255 || name.Any(char.IsControl) || Request.ContentLength is <= 0 or > IllustrationLimit)
            throw Invalid("illustration_invalid", "Choose a nonempty PNG, JPEG or WebP illustration of at most 10 MiB.");
        var stored = await storage.SaveScopedAsync(Request.Body, ".bin", IllustrationLimit, "configuration/illustrations", ct);
        var saving = false;
        try {
            if (stored.SizeBytes <= 0 || Request.ContentLength.HasValue && Request.ContentLength != stored.SizeBytes)
                throw Invalid("illustration_incomplete", "The illustration upload was incomplete.");
            var scan = await scanner.ScanAsync(stored.StorageKey, ct);
            if (scan.Status != OperationalFileScanStatus.Clean)
                throw Conflict("illustration_scan_required", "The illustration must pass scanning before it can be used.");
            await using var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct, IllustrationLimit);
            using var imageBytes = new MemoryStream();
            await verified.CopyToAsync(imageBytes, ct);
            var mime = IllustrationContentType(imageBytes.ToArray());
            var asset = new LabConfigurationAsset(name, mime, stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.User.Id, DateTime.UtcNow);
            dbContext.Set<LabConfigurationAsset>().Add(asset);
            saving = true;
            await dbContext.SaveChangesAsync(ct);
            return new { asset.Id, asset.FileName, asset.ContentType, asset.Sha256, asset.SizeBytes };
        } catch {
            if (!saving) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None);
            throw;
        }
    }

    internal static string IllustrationContentType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 33 && bytes[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
        {
            var ended = false;
            var imageData = false;
            for (var offset = 8; offset <= bytes.Length - 12;)
            {
                var size = BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(offset, 4));
                if (size > bytes.Length - offset - 12) break;
                var kind = bytes.Slice(offset + 4, 4);
                if (kind.SequenceEqual("acTL"u8)) throw Invalid("illustration_animation_unsupported", "Use a static illustration for screen and print.");
                if (offset == 8 && (!kind.SequenceEqual("IHDR"u8) || size != 13)) break;
                if (offset == 8) RequireIllustrationDimensions(BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(16, 4)), BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(20, 4)));
                if (kind.SequenceEqual("IDAT"u8) && size > 0) imageData = true;
                if (kind.SequenceEqual("IEND"u8)) { ended = size == 0 && offset + 12 == bytes.Length; break; }
                offset += checked((int)size + 12);
            }
            if (ended && imageData) return "image/png";
        }
        if (bytes.Length >= 4 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255
            && bytes[^2] == 255 && bytes[^1] == 217)
        {
            var frame = false;
            for (var offset = 2; offset < bytes.Length - 3;)
            {
                if (bytes[offset++] != 255) break;
                while (offset < bytes.Length && bytes[offset] == 255) offset++;
                if (offset >= bytes.Length - 2) break;
                var marker = bytes[offset++];
                var size = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset, 2));
                if (size < 2 || size > bytes.Length - offset - 2) break;
                if (marker is 0xC0 or 0xC1 or 0xC2)
                {
                    if (size < 8) break;
                    RequireIllustrationDimensions(BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset + 5, 2)), BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset + 3, 2)));
                    frame = true;
                }
                if (marker == 0xDA) { if (frame && size >= 6 && offset + size < bytes.Length - 2) return "image/jpeg"; break; }
                offset += size;
            }
        }
        if (bytes.Length >= 20 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WEBP"u8)
            && BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(4, 4)) == bytes.Length - 8)
        {
            var image = false;
            for (var offset = 12; offset <= bytes.Length - 8;)
            {
                var kind = bytes.Slice(offset, 4);
                var size = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 4, 4));
                if (size > bytes.Length - offset - 8) break;
                if (kind.SequenceEqual("ANIM"u8) || kind.SequenceEqual("ANMF"u8)
                    || kind.SequenceEqual("VP8X"u8) && size > 0 && (bytes[offset + 8] & 2) != 0)
                    throw Invalid("illustration_animation_unsupported", "Use a static illustration for screen and print.");
                if (kind.SequenceEqual("VP8 "u8) && size >= 10 && bytes.Slice(offset + 11, 3).SequenceEqual(new byte[] { 0x9D, 0x01, 0x2A }))
                {
                    RequireIllustrationDimensions((uint)(BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(offset + 14, 2)) & 0x3FFF), (uint)(BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(offset + 16, 2)) & 0x3FFF));
                    image = true;
                }
                if (kind.SequenceEqual("VP8L"u8) && size >= 5 && bytes[offset + 8] == 0x2F)
                {
                    var dimensions = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 9, 4));
                    RequireIllustrationDimensions((dimensions & 0x3FFF) + 1, ((dimensions >> 14) & 0x3FFF) + 1);
                    image = true;
                }
                offset += checked((int)size + 8 + (int)(size % 2));
                if (offset == bytes.Length && image) return "image/webp";
            }
        }
        throw Invalid("illustration_format_invalid", "Only PNG, JPEG and WebP image contents are supported. SVG and executable content are not accepted.");
    }

    private static void RequireIllustrationDimensions(uint width, uint height)
    {
        if (width is 0 or > 16384 || height is 0 or > 16384 || (ulong)width * height > 40_000_000)
            throw Invalid("illustration_dimensions_invalid", "Use an illustration with nonzero dimensions, no edge above 16,384 pixels and no more than 40 million pixels.");
    }

    [HttpGet("configuration-assets/{id:guid}")]
    public async Task<IActionResult> ReadConfigurationAsset(Guid id, [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator,
            LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer);
        var asset = await dbContext.Set<LabConfigurationAsset>().AsNoTracking().SingleOrDefaultAsync(a => a.Id == id, ct) ?? throw Missing();
        await using var content = await LabScientificFiles.OpenVerifiedAsync(storage, asset.StorageKey, asset.Sha256, asset.SizeBytes, ct, IllustrationLimit);
        using var bytes = new MemoryStream(); await content.CopyToAsync(bytes, ct);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(bytes.ToArray(), asset.ContentType);
    }

    private async Task RequireIllustrationsAsync(IReadOnlyList<LabInstructionIllustration>? images, CancellationToken ct, bool verifyContents = false)
    {
        Execute(() => LabConfigurationAsset.Validate(images));
        var ids = (images ?? []).Select(i => i.AssetId).Distinct().ToArray();
        if (ids.Length != await dbContext.Set<LabConfigurationAsset>().CountAsync(a => ids.Contains(a.Id), ct))
            throw Invalid("illustration_receipt_missing", "An illustration is unavailable. Upload it again before saving or approving this procedure.");
        if (verifyContents && ids.Length > 0)
        {
            var storage = HttpContext.RequestServices.GetRequiredService<IOperationalFileStorage>();
            foreach (var asset in await dbContext.Set<LabConfigurationAsset>().AsNoTracking().Where(a => ids.Contains(a.Id)).ToListAsync(ct))
            {
                await using var verified = await LabScientificFiles.OpenVerifiedAsync(storage, asset.StorageKey, asset.Sha256, asset.SizeBytes, ct, IllustrationLimit);
            }
        }
    }
}
