namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using System.Globalization;
using System.Text.RegularExpressions;

public static class SampleSubmissionUnits
{
    // A sized tube still counts physical tubes. Volume-only units and other containers
    // must not enter the tube roster, packing, or barcode workflow.
    public static bool IsTubeCount(string unit)
    {
        var match = Regex.Match(unit.Trim(), @"\A(?:(?<volume>(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))\s*(?:[µμu]L|mL)\s+)?tubes?\z",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));
        return match.Success && (!match.Groups["volume"].Success
            || decimal.TryParse(match.Groups["volume"].Value, NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out var volume) && volume > 0);
    }
}
