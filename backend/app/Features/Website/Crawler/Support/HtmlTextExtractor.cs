using System.Text;
using System.Text.RegularExpressions;
using AngleSharp.Dom;

namespace PhaenoPortal.App.Features.Website.Crawler.Support;

public static class HtmlTextExtractor
{
    private static readonly string[] BlacklistSelectors =
    [
        "header",
        "footer",
        "nav",
        "aside",
        "script",
        "style",
        "noscript",
        "form",
        "input",
        "textarea",
        "select",
        "button",
        "label",
        "svg",
        "[hidden]",
        "[aria-hidden='true']",
        "[data-phaeno-search-ignore]",
        ".sr-only",
        ".grecaptcha-badge"
    ];

    public static string ExtractCleanText(IElement element)
    {
        var clone = (IElement)element.Clone(true);
        if (ShouldIgnore(clone))
        {
            return string.Empty;
        }

        foreach (var selector in BlacklistSelectors)
        {
            foreach (var node in clone.QuerySelectorAll(selector))
            {
                node.Remove();
            }
        }

        var builder = new StringBuilder();
        ExtractRecursive(clone, builder);
        return Regex
            .Replace(builder.ToString(), @"(\r?\n\s*){2,}", "\n\n")
            .Trim();
    }

    public static string ExtractSectionText(IElement heading)
    {
        var builder = new StringBuilder();
        builder.AppendLine(heading.TextContent.Trim());

        var scope = FindSectionScope(heading);
        var current = GetNextNodeAfterSubtree(heading, scope);
        while (current is not null)
        {
            if (current is IElement element)
            {
                if (IsSectionBoundary(element))
                {
                    break;
                }

                if (ShouldIgnore(element))
                {
                    current = GetNextNodeAfterSubtree(element, scope);
                    continue;
                }
            }

            if (current is IText text)
            {
                AppendText(builder, text.Text);
            }

            current = current.FirstChild
                ?? GetNextNodeAfterSubtree(current, scope);
        }

        return builder.ToString().Trim();
    }

    private static IElement FindSectionScope(IElement heading)
    {
        var current = heading.ParentElement;
        while (current is not null)
        {
            if (current.LocalName is "section" or "article" or "main")
            {
                return current;
            }

            current = current.ParentElement;
        }

        return heading;
    }

    private static INode? GetNextNodeAfterSubtree(INode node, INode scope)
    {
        var current = node;
        while (!ReferenceEquals(current, scope))
        {
            if (current.NextSibling is not null)
            {
                return current.NextSibling;
            }

            if (current.Parent is null)
            {
                return null;
            }

            current = current.Parent;
        }

        return null;
    }

    private static void AppendText(StringBuilder builder, string value)
    {
        value = Regex.Replace(value, @"\s+", " ").Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (builder.Length > 0 && !char.IsWhiteSpace(builder[^1]))
        {
            builder.Append(' ');
        }

        builder.Append(value);
    }

    private static void ExtractRecursive(INode node, StringBuilder builder)
    {
        if (node is IElement element && ShouldIgnore(element))
        {
            return;
        }

        if (node is IText text)
        {
            var value = text.Text.Trim();
            if (!string.IsNullOrWhiteSpace(value))
            {
                if (builder.Length > 0 && !char.IsWhiteSpace(builder[^1]))
                {
                    builder.Append(' ');
                }
                builder.Append(value);
            }
        }

        foreach (var child in node.ChildNodes)
        {
            ExtractRecursive(child, builder);
        }

        if (node is IElement block
            && block.LocalName is "p" or "div" or "section" or "article" or "main")
        {
            builder.AppendLine();
            builder.AppendLine();
        }
    }

    private static bool ShouldIgnore(IElement element) =>
        element.HasAttribute("data-phaeno-search-ignore")
        || element.HasAttribute("hidden")
        || string.Equals(
            element.GetAttribute("aria-hidden"),
            "true",
            StringComparison.OrdinalIgnoreCase)
        || element.ClassList.Contains("sr-only")
        || element.ClassList.Contains("grecaptcha-badge")
        || element.LocalName is
            "header" or
            "footer" or
            "nav" or
            "aside" or
            "script" or
            "style" or
            "noscript" or
            "form" or
            "input" or
            "textarea" or
            "select" or
            "button" or
            "label" or
            "svg";

    private static bool IsSectionBoundary(IElement element) =>
        (element.TagName.Length == 2 && element.TagName[0] == 'H')
        || (element.HasAttribute("id")
            && element.HasAttribute("data-phaeno-search"));
}
