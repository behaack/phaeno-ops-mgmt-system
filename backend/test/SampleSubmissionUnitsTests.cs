namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class SampleSubmissionUnitsTests
{
    [Theory]
    [InlineData("tube")]
    [InlineData("Tubes")]
    [InlineData("20 µL tube")]
    [InlineData("20 μL tube")]
    [InlineData("20 uL tube")]
    [InlineData("1.5 mL tube")]
    [InlineData(" 0.5mL tube ")]
    public void TubeSizesRetainTheTubeCountWorkflow(string unit) => Assert.True(SampleSubmissionUnits.IsTubeCount(unit));

    [Theory]
    [InlineData("20 µL")]
    [InlineData("block")]
    [InlineData("section")]
    [InlineData("20 µL vial")]
    [InlineData("20 mg tube")]
    [InlineData("0 mL tube")]
    [InlineData("-1 mL tube")]
    [InlineData("20 mL tube or block")]
    public void OtherSubmissionUnitsCannotEnterTubeIntake(string unit) => Assert.False(SampleSubmissionUnits.IsTubeCount(unit));
}
