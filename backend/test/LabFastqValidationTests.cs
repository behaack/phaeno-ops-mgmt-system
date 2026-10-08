namespace PhaenoPortal.Test;

using System.Text;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabFastqValidationTests
{
    [Fact]
    public async Task ReadRolesNormalizeToTheSameOrderedPairIdentity()
    {
        using var r1 = new MemoryStream(Encoding.ASCII.GetBytes("@read-a/1\nACGT\n+\nIIII\n@read-b/1\nNNNN\n+\n####\n"));
        using var r2 = new MemoryStream(Encoding.ASCII.GetBytes("@read-a/2\nTGCA\n+\nIIII\n@read-b/2\nNNNN\n+\n####\n"));
        var first = await LabFastqValidation.ValidateAsync(r1, false, 1, new(), default);
        var second = await LabFastqValidation.ValidateAsync(r2, false, 2, new(), default);
        Assert.Equal(2, first.ReadCount); Assert.Equal(first.ReadIdentifiersSha256, second.ReadIdentifiersSha256);
    }

    [Theory]
    [InlineData("@x/1\nACGT\n+\nIII\n")]
    [InlineData("@x/2\nACGT\n+\nIIII\n")]
    [InlineData("@x/1\nACGT\n+\n")]
    [InlineData("")]
    public async Task InvalidOrIncompleteContentIsNotAdmitted(string input)
    {
        using var bytes = new MemoryStream(Encoding.ASCII.GetBytes(input));
        await Assert.ThrowsAsync<OrderManagementException>(() => LabFastqValidation.ValidateAsync(bytes, false, 1, new(), default));
    }

    [Fact]
    public void PairedSetCannotCompleteWithMissingMateOrDifferentReadOrder()
    {
        var set = new LabFastqSet(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1,
            "NewPreparation", "PairedEnd", 1, "{}", Guid.NewGuid(), DateTime.UtcNow);
        LabFastqUpload File(int read, string ids) { var u = new LabFastqUpload(Guid.NewGuid(), set.Id, "test.fastq", "test.fastq", 1, read, 1,
            "SIMULATED flowcell/lane", 10, new string('A', 64), Guid.NewGuid(), DateTime.UtcNow.AddDays(1)); u.Complete(Guid.NewGuid(), 2, ids); return u; }
        var r1 = File(1, new string('A', 64)); var wrong = File(2, new string('B', 64));
        Assert.Throws<OrderManagementException>(() => LabFastqValidation.RequireComplete(set, [r1], new()));
        Assert.Throws<OrderManagementException>(() => LabFastqValidation.RequireComplete(set, [r1, wrong], new()));
        LabFastqValidation.RequireComplete(set, [r1, File(2, new string('A', 64))], new());
    }
}
