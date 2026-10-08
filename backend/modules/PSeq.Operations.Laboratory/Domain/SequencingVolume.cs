namespace PSeq.Operations.Laboratory.Domain;

using System.Numerics;

public static class SequencingVolume
{
    // Compare in µL without rounding or changing the recorded inventory unit.
    public static bool MeetsMinimum(decimal quantity, string? unit, decimal minimumUl)
    {
        var exponent = unit?.Trim() switch
        {
            "µL" or "μL" or "uL" => 0,
            "mL" => 3,
            "L" => 6,
            "nL" => -3,
            _ => throw new ArgumentException("Sequencing volume must use µL, uL, mL, L or nL.")
        };
        var (amount, scale) = Parts(quantity);
        var (minimum, minimumScale) = Parts(minimumUl);
        var shift = minimumScale - scale + exponent;
        return shift >= 0 ? amount * BigInteger.Pow(10, shift) >= minimum
            : amount >= minimum * BigInteger.Pow(10, -shift);
    }

    private static (BigInteger Coefficient, int Scale) Parts(decimal value)
    {
        var bits = decimal.GetBits(value);
        var coefficient = (BigInteger)(uint)bits[0] + ((BigInteger)(uint)bits[1] << 32) + ((BigInteger)(uint)bits[2] << 64);
        return ((bits[3] & int.MinValue) == 0 ? coefficient : -coefficient, (bits[3] >> 16) & 0xff);
    }
}
