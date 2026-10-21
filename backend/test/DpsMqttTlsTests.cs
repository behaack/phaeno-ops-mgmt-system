namespace PhaenoPortal.Test;

using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using MQTTnet;
using MQTTnet.Formatter;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed class DpsMqttTlsTests
{
    [Fact]
    public async Task Supplied_pfx_authenticates_with_private_ca_and_tunnel_server_name()
    {
        using var certificates = new Certificates();
        await using var broker = new TlsBroker(certificates);
        var settings = certificates.Options(broker.Port);
        using var tls = new DpsMqttTls(settings, TimeProvider.System);
        using var client = new MqttClientFactory().CreateMqttClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var response = await client.ConnectAsync(Build(settings, tls), timeout.Token);
        Assert.True(client.IsConnected);
        Assert.Equal("Success", response.ResultCode.ToString());
        Assert.True(broker.ClientAuthenticated);
    }

    [Theory]
    [InlineData("wrong_hostname", SslPolicyErrors.RemoteCertificateNameMismatch)]
    [InlineData("wrong_ca", SslPolicyErrors.RemoteCertificateChainErrors)]
    public async Task Invalid_server_identity_is_rejected(string failure, SslPolicyErrors expected)
    {
        using var certificates = new Certificates();
        using var unrelated = new Certificates();
        await using var broker = new TlsBroker(certificates);
        var settings = certificates.Options(broker.Port);
        if (failure == "wrong_hostname") settings.TlsServerName = "wrong-hostname.invalid";
        else settings.CaCertificatePath = unrelated.CaPath;
        using var tls = new DpsMqttTls(settings, TimeProvider.System);
        var options = Build(settings, tls);
        SslPolicyErrors? observed = null;
        options.ChannelOptions.TlsOptions.CertificateValidationHandler = validation => {
            observed = validation.SslPolicyErrors;
            return validation.SslPolicyErrors == SslPolicyErrors.None;
        };
        using var client = new MqttClientFactory().CreateMqttClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await Assert.ThrowsAnyAsync<Exception>(() => client.ConnectAsync(options, timeout.Token));
        Assert.False(client.IsConnected);
        Assert.True(observed.HasValue && observed.Value.HasFlag(expected));
    }

    [Fact]
    public async Task Broker_requiring_mutual_tls_rejects_missing_client_certificate()
    {
        using var certificates = new Certificates();
        await using var broker = new TlsBroker(certificates);
        var settings = certificates.Options(broker.Port);
        settings.ClientCertificatePath = ""; settings.ClientCertificatePassword = "";
        using var tls = new DpsMqttTls(settings, TimeProvider.System);
        using var client = new MqttClientFactory().CreateMqttClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var failure = await Assert.ThrowsAnyAsync<Exception>(() => client.ConnectAsync(Build(settings, tls), timeout.Token));
        Assert.False(failure is OperationCanceledException);
        Assert.False(client.IsConnected);
        Assert.False(broker.ClientAuthenticated);
    }

    [Theory]
    [InlineData("wrong_password")]
    [InlineData("no_private_key")]
    [InlineData("expired")]
    [InlineData("server_only")]
    public void Unusable_client_identity_fails_before_connecting(string failure)
    {
        using var certificates = new Certificates();
        var settings = certificates.Options(18883);
        if (failure == "wrong_password") settings.ClientCertificatePassword = "incorrect-fixture-password";
        else certificates.WriteClient(failure);
        Assert.ThrowsAny<CryptographicException>(() => new DpsMqttTls(settings, TimeProvider.System));
    }

    [Fact]
    public void Server_leaf_cannot_be_configured_as_the_trusted_authority()
    {
        using var certificates = new Certificates();
        File.WriteAllText(certificates.CaPath, certificates.Server.ExportCertificatePem());
        Assert.Throws<CryptographicException>(() => new DpsMqttTls(certificates.Options(18883), TimeProvider.System));
    }

    private static MqttClientOptions Build(DpsOptions settings, DpsMqttTls tls)
    {
        var builder = new MqttClientOptionsBuilder().WithClientId("isolated-dps-tls-" + Guid.NewGuid().ToString("N"))
            .WithTcpServer(settings.Host, settings.Port).WithProtocolVersion(MqttProtocolVersion.V311)
            .WithCleanSession().WithoutPacketFragmentation();
        tls.Configure(builder);
        return builder.Build();
    }

    private sealed class Certificates : IDisposable
    {
        private const string Password = "isolated-fixture-password";
        private readonly string directory = Path.Combine(Path.GetTempPath(), "phaeno-dps-tls-tests-" + Guid.NewGuid().ToString("N"));
        public X509Certificate2 Authority { get; }
        public X509Certificate2 Server { get; }
        public string CaPath => Path.Combine(directory, "ca.crt");
        private string ClientPath => Path.Combine(directory, "client.pfx");

        public Certificates()
        {
            Directory.CreateDirectory(directory);
            try {
                using var key = RSA.Create(2048);
                var request = new CertificateRequest("CN=isolated-test-ca", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
                request.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, false, 0, true));
                request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign, true));
                Authority = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-7), DateTimeOffset.UtcNow.AddYears(1));
                File.WriteAllText(CaPath, Authority.ExportCertificatePem());
                Server = Issue(false, false, true);
                WriteClient("valid");
            } catch { Dispose(); throw; }
        }

        public DpsOptions Options(int port) => new() {
            Host = "127.0.0.1", Port = port, UseTls = true, TlsServerName = "localhost",
            CaCertificatePath = CaPath, ClientCertificatePath = ClientPath, ClientCertificatePassword = Password,
        };

        public void WriteClient(string kind)
        {
            using var certificate = Issue(kind != "server_only", kind == "expired", kind != "no_private_key");
            File.WriteAllBytes(ClientPath, certificate.Export(X509ContentType.Pkcs12, Password));
        }

        private X509Certificate2 Issue(bool client, bool expired, bool privateKey)
        {
            using var key = RSA.Create(2048);
            var request = new CertificateRequest(client ? "CN=isolated-test-client" : "CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
            request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, true));
            request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(new OidCollection {
                new(client ? "1.3.6.1.5.5.7.3.2" : "1.3.6.1.5.5.7.3.1"),
            }, true));
            if (!client) {
                var names = new SubjectAlternativeNameBuilder(); names.AddDnsName("localhost"); names.AddIpAddress(IPAddress.Loopback);
                request.CertificateExtensions.Add(names.Build());
            }
            var from = DateTimeOffset.UtcNow.AddDays(-2);
            var to = DateTimeOffset.UtcNow.AddDays(expired ? -1 : 1);
            using var issued = request.Create(Authority, from, to, RandomNumberGenerator.GetBytes(16));
            if (!privateKey) return X509CertificateLoader.LoadCertificate(issued.RawData);
            using var keyed = issued.CopyWithPrivateKey(key);
            return X509CertificateLoader.LoadPkcs12(keyed.Export(X509ContentType.Pkcs12, Password), Password,
                (OperatingSystem.IsWindows() ? X509KeyStorageFlags.UserKeySet : X509KeyStorageFlags.EphemeralKeySet) | X509KeyStorageFlags.Exportable);
        }

        public void Dispose()
        {
            Server?.Dispose(); Authority?.Dispose();
            // This exact, generated directory contains only this fixture's synthetic certificates.
            if (Directory.Exists(directory)) {
                var absolute = Path.GetFullPath(directory);
                var parent = Path.TrimEndingDirectorySeparator(Path.GetFullPath(Path.GetTempPath()));
                if (Directory.GetParent(absolute)?.FullName != parent || !Path.GetFileName(absolute).StartsWith("phaeno-dps-tls-tests-", StringComparison.Ordinal))
                    throw new InvalidOperationException("Unexpected test-certificate cleanup path.");
                Directory.Delete(absolute, true);
            }
        }
    }

    private sealed class TlsBroker : IAsyncDisposable
    {
        private readonly TcpListener listener = new(IPAddress.Loopback, 0);
        private readonly CancellationTokenSource lifetime = new(TimeSpan.FromSeconds(12));
        private readonly Task serving;
        public int Port { get; }
        public bool ClientAuthenticated { get; private set; }

        public TlsBroker(Certificates certificates)
        {
            listener.Start(); Port = ((IPEndPoint)listener.LocalEndpoint).Port;
            serving = Serve(certificates);
        }

        private async Task Serve(Certificates certificates)
        {
            using var tcp = await listener.AcceptTcpClientAsync(lifetime.Token);
            using var stream = new SslStream(tcp.GetStream(), false, (_, certificate, _, _) => {
                if (certificate is null) return false;
                using var leaf = X509CertificateLoader.LoadCertificate(certificate.GetRawCertData());
                using var chain = new X509Chain();
                chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
                chain.ChainPolicy.CustomTrustStore.Add(certificates.Authority);
                chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
                chain.ChainPolicy.ApplicationPolicy.Add(new Oid("1.3.6.1.5.5.7.3.2"));
                ClientAuthenticated = chain.Build(leaf);
                return ClientAuthenticated;
            });
            await stream.AuthenticateAsServerAsync(new SslServerAuthenticationOptions {
                ServerCertificate = certificates.Server, ClientCertificateRequired = true,
                EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
            }, lifetime.Token);
            var next = new byte[1];
            await stream.ReadExactlyAsync(next, lifetime.Token);
            if (next[0] != 0x10) throw new InvalidDataException("Expected only an MQTT CONNECT packet.");
            var length = 0; var multiplier = 1;
            for (var i = 0; i < 4; i++) {
                await stream.ReadExactlyAsync(next, lifetime.Token);
                length += (next[0] & 127) * multiplier;
                if ((next[0] & 128) == 0) break;
                if (i == 3) throw new InvalidDataException("Invalid MQTT packet length.");
                multiplier *= 128;
            }
            if (length is < 1 or > 4096) throw new InvalidDataException("Unexpected MQTT CONNECT size.");
            await stream.ReadExactlyAsync(new byte[length], lifetime.Token);
            await stream.WriteAsync(new byte[] { 0x20, 0x02, 0x00, 0x00 }, lifetime.Token);
            await Task.Delay(Timeout.Infinite, lifetime.Token);
        }

        public async ValueTask DisposeAsync()
        {
            lifetime.Cancel(); listener.Stop();
            try { await serving; }
            catch (Exception error) when (error is OperationCanceledException or IOException or AuthenticationException or SocketException) { }
            lifetime.Dispose();
        }
    }
}
