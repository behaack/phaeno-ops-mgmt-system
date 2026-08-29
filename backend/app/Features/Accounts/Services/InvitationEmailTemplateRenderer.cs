namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net;
using System.Reflection;
using PSeq.Operations.Commercial.Accounts.Application;

public sealed record RenderedInvitationEmail(string Html, string Text);

public sealed class InvitationEmailTemplateRenderer
{
    private const string DefaultLocale = "en-US";
    private const string TemplateName = "organization-invitation";
    private readonly Assembly assembly = typeof(InvitationEmailTemplateRenderer).Assembly;

    public RenderedInvitationEmail Render(InvitationEmailMessage message)
    {
        var locale = NormalizeLocale(message.Locale);
        var html = ReadTemplate(locale, "html");
        var text = ReadTemplate(locale, "txt");
        return new RenderedInvitationEmail(
            ReplaceTokens(
                html,
                WebUtility.HtmlEncode(message.OrganizationName),
                WebUtility.HtmlEncode(message.InviteUrl),
                WebUtility.HtmlEncode(message.Email)),
            ReplaceTokens(text, message.OrganizationName, message.InviteUrl, message.Email));
    }

    private string ReadTemplate(string locale, string extension)
    {
        var resourceName = $"EmailTemplates/{TemplateName}.{locale}.{extension}";
        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null && !string.Equals(locale, DefaultLocale, StringComparison.Ordinal))
        {
            resourceName = $"EmailTemplates/{TemplateName}.{DefaultLocale}.{extension}";
            stream = assembly.GetManifestResourceStream(resourceName);
        }

        if (stream == null)
            throw new InvalidOperationException($"Missing embedded email template '{resourceName}'.");

        using (stream)
        using (var reader = new StreamReader(stream))
            return reader.ReadToEnd();
    }

    private static string NormalizeLocale(string? locale)
    {
        if (string.IsNullOrWhiteSpace(locale)) return DefaultLocale;
        var normalized = locale.Trim();
        return normalized.Length <= 35
            && normalized.All(character => char.IsLetterOrDigit(character) || character == '-')
                ? normalized
                : DefaultLocale;
    }

    private static string ReplaceTokens(
        string template,
        string organizationName,
        string inviteUrl,
        string recipientEmail) => template
        .Replace("{{organization_name}}", organizationName, StringComparison.Ordinal)
        .Replace("{{invite_url}}", inviteUrl, StringComparison.Ordinal)
        .Replace("{{recipient_email}}", recipientEmail, StringComparison.Ordinal);
}
