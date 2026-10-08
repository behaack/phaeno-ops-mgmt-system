namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.LabOperations.Services;

public sealed class ExactDecimalQuantityTests
{
    [Theory]
    [InlineData("0.1234567890123456789012345678")]
    [InlineData("5.0000000000000000000000000001")]
    [InlineData("79228162514264337593543950335")]
    public void AcceptsRepresentablePositiveDecimalWithoutRounding(string input)
    {
        Assert.True(ExactDecimalQuantity.TryParse(input, out var quantity));
        Assert.Equal(input, quantity.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }

    [Theory]
    [InlineData("0.12345678901234567890123456789")]
    [InlineData("8.0000000000000000000000000000")]
    [InlineData("79228162514264337593543950336")]
    [InlineData("0")]
    [InlineData("1e-3")]
    [InlineData("1,5")]
    public void RejectsAmountsThatWouldRoundOrAreNotInvariantPositiveDecimals(string input)
    {
        Assert.False(ExactDecimalQuantity.TryParse(input, out _));
    }

    [Fact]
    public void RejectsBalancesThatWouldRequireRoundingAfterTransfer()
    {
        Assert.False(ExactDecimalQuantity.CanSubtract(20m, 5.0000000000000000000000000001m));
        Assert.True(ExactDecimalQuantity.CanSubtract(20m, 19.000000000000000000000000001m));
        Assert.False(ExactDecimalQuantity.CanAdd(20m, 5.0000000000000000000000000001m));
    }
}
