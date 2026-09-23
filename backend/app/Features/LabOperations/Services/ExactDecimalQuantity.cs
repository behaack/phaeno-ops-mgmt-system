namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Globalization;
using System.Numerics;

public static class ExactDecimalQuantity
{
    private static readonly BigInteger MaxCoefficient = new(decimal.MaxValue);

    public static bool TryParse(string? text, out decimal quantity)
    {
        quantity = 0;
        if (string.IsNullOrEmpty(text) || text.Length > 40) return false;
        var point = text.IndexOf('.');
        if (point == 0 || point == text.Length - 1 || point != text.LastIndexOf('.')) return false;
        var fractionDigits = point < 0 ? 0 : text.Length - point - 1;
        if (fractionDigits > 28 || text.Any(c => c != '.' && !char.IsAsciiDigit(c))) return false;
        var coefficient = BigInteger.Parse(text.Replace(".", ""), CultureInfo.InvariantCulture);
        if (coefficient <= 0 || coefficient > MaxCoefficient) return false;
        return decimal.TryParse(text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out quantity)
            && quantity > 0;
    }

    public static bool CanSubtract(decimal from, decimal amount) => CanCombine(from, amount, subtract: true);
    public static bool CanAdd(decimal to, decimal amount) => CanCombine(to, amount, subtract: false);

    private static bool CanCombine(decimal left, decimal right, bool subtract)
    {
        var (leftCoefficient, leftScale) = Parts(left);
        var (rightCoefficient, rightScale) = Parts(right);
        var scale = Math.Max(leftScale, rightScale);
        var result = leftCoefficient * BigInteger.Pow(10, scale - leftScale)
            + (subtract ? -rightCoefficient : rightCoefficient) * BigInteger.Pow(10, scale - rightScale);
        while (scale > 0 && result % 10 == 0) { result /= 10; scale--; }
        return BigInteger.Abs(result) <= MaxCoefficient;
    }

    private static (BigInteger Coefficient, int Scale) Parts(decimal value)
    {
        var bits = decimal.GetBits(value);
        var coefficient = new BigInteger((uint)bits[0])
            + (new BigInteger((uint)bits[1]) << 32)
            + (new BigInteger((uint)bits[2]) << 64);
        if ((bits[3] & int.MinValue) != 0) coefficient = -coefficient;
        return (coefficient, (bits[3] >> 16) & 0xff);
    }
}
