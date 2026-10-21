namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using MQTTnet;

/// <summary>Owns the certificates for one connection attempt, including its complete connected lifetime.</summary>
internal sealed class DpsMqttTls : IDisposable
{
    private readonly DpsOptions settings;
    private X509Certificate2? authority;
    private X509Certificate2? identity;

    public DpsMqttTls(DpsOptions settings, TimeProvider time)
    {
        this.settings = settings;
        if (!settings.IsConfigured()) throw new InvalidOperationException("DPS connection settings are invalid.");
        if (!settings.UseTls) return;
        try {
            var now = time.GetUtcNow().UtcDateTime;
            if (!string.IsNullOrEmpty(settings.CaCertificatePath)) {
                authority = X509Certificate2.CreateFromPem(File.ReadAllText(settings.CaCertificatePath));
                RequireCurrent(authority, now);
                if (authority.Extensions.OfType<X509BasicConstraintsExtension>().SingleOrDefault() is not { CertificateAuthority: true }
                    || authority.Extensions.OfType<X509KeyUsageExtension>().SingleOrDefault() is { } usage
                        && !usage.KeyUsages.HasFlag(X509KeyUsageFlags.KeyCertSign))
                    throw new CryptographicException("The DPS trust certificate is not a certificate authority.");
            }
            if (!string.IsNullOrEmpty(settings.ClientCertificatePath)) {
                // Schannel cannot use the ephemeral PFX key on Windows. Without PersistKeySet,
                // the temporary user key container is released when its certificate is disposed.
                var storage = OperatingSystem.IsWindows() ? X509KeyStorageFlags.UserKeySet : X509KeyStorageFlags.EphemeralKeySet;
                identity = X509CertificateLoader.LoadPkcs12FromFile(settings.ClientCertificatePath, settings.ClientCertificatePassword, storage);
                RequireCurrent(identity, now);
                if (!identity.HasPrivateKey) throw new CryptographicException("The DPS client certificate has no private key.");
                if (identity.Extensions.OfType<X509EnhancedKeyUsageExtension>().SingleOrDefault() is { } purposes
                    && !purposes.EnhancedKeyUsages.Cast<Oid>().Any(oid => oid.Value is "1.3.6.1.5.5.7.3.2" or "2.5.29.37.0"))
                    throw new CryptographicException("The DPS certificate does not permit client authentication.");
            }
        } catch { Dispose(); throw; }
    }

    public void Configure(MqttClientOptionsBuilder builder) => builder.WithTlsOptions(tls => {
        tls.UseTls(settings.UseTls);
        if (!settings.UseTls) return;
        if (settings.TlsServerName.Length > 0) tls.WithTargetHost(settings.TlsServerName);
        if (authority is not null) tls.WithTrustChain(new X509Certificate2Collection(authority));
        if (identity is not null) tls.WithClientCertificates(new[] { identity });
        // MQTTnet/.NET perform the chain, validity and hostname checks; no validation override.
    });

    private static void RequireCurrent(X509Certificate2 certificate, DateTime now)
    {
        if (certificate.NotBefore.ToUniversalTime() > now || certificate.NotAfter.ToUniversalTime() <= now)
            throw new CryptographicException("A DPS certificate is outside its validity period.");
    }

    public void Dispose()
    {
        identity?.Dispose(); identity = null;
        authority?.Dispose(); authority = null;
    }
}
