namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    private sealed partial class ShippingTestScope
    {
        private readonly HashSet<Guid> physicalFixtureBoxIds = [];
        public async Task RegisterTestBoxAsync(string barcode)
        {
            if (await DbContext.Set<LabStorageBox>().AnyAsync(b => b.Barcode == barcode)) return;
            var box = new LabStorageBox(barcode, "TEST ONLY room", "TEST ONLY freezer", "TEST ONLY rack", "TEST ONLY shelf");
            DbContext.Add(box); await DbContext.SaveChangesAsync(); physicalFixtureBoxIds.Add(box.Id);
        }
    }
}

public partial class LabOperationsCommercialHandoffPostgresTests
{
    private sealed partial class HandoffTestScope
    {
        public async Task RegisterTestBoxAsync(string barcode)
        {
            if (await DbContext.Set<LabStorageBox>().AnyAsync(b => b.Barcode == barcode)) return;
            DbContext.Add(new LabStorageBox(barcode, "TEST ONLY room", "TEST ONLY freezer", "TEST ONLY rack", "TEST ONLY shelf"));
            await DbContext.SaveChangesAsync();
        }
    }
}
