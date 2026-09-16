namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    private sealed partial class HandoffTestScope
    {
        public string? RecoveryExportDirectory { get; set; }

        public async Task ExportRecoveryFixtureAsync(Guid orderId, Guid packageId, Guid artifactId, byte[] bytes)
        {
            var directory = Path.GetFullPath(RecoveryExportDirectory!);
            if (!Directory.Exists(directory)) throw new InvalidOperationException("Prepare the owned recovery export directory first.");
            var connection = new NpgsqlConnectionStringBuilder(DbContext.Database.GetConnectionString());
            if (connection.Host is not ("localhost" or "127.0.0.1") || connection.Database is null
                || !System.Text.RegularExpressions.Regex.IsMatch(connection.Database, "^pseq_handoff_test_[0-9a-f]{32}$"))
                throw new InvalidOperationException("Export only the disposable synthetic journey database.");
            var artifact = await DbContext.ResultArtifacts.SingleAsync(a => a.Id == artifactId);
            var path = Path.GetFullPath(Path.Combine(directory, "files", "order-files", artifact.ObjectStorageKey));
            if (!path.StartsWith(directory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid fixture key.");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await File.WriteAllBytesAsync(path, bytes);
            Directory.CreateDirectory(Path.Combine(directory, "files", "provisioning-files"));
            // Rehearsal-only issuer; no real provider account or access assignment is changed.
            var recoveryCustomer = await DbContext.Users.SingleAsync(u => u.Id == CustomerUser.Id);
            recoveryCustomer.RelinkExternalIdentity(customerIdentity.Provider, customerIdentity.SubjectId, "clerk", customerIdentity.SubjectId);
            await DbContext.SaveChangesAsync();
            var order = await DbContext.LabServiceOrders.SingleAsync(o => o.Id == orderId);
            var invoice = await DbContext.Invoices.SingleAsync(i => i.LabServiceOrderId == orderId);
            var package = await DbContext.ResultOutputPackages.SingleAsync(p => p.Id == packageId);
            await File.WriteAllTextAsync(Path.Combine(directory, "fixture.json"), JsonSerializer.Serialize(new {
                scope = "SIMULATED recovery fixture", orderId, packageId, artifactId,
                sampleId = package.LabSampleId, organizationId = CustomerOrganization.Id, departmentId = order.DepartmentId,
                invoiceId = invoice.Id, invoice.PdfSha256, artifact.Sha256,
                subject = customerIdentity.SubjectId, email = customerIdentity.Email
            }));
            var dump = new ProcessStartInfo("C:/Program Files/PostgreSQL/18/bin/pg_dump.exe") {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardError = true
            };
            foreach (var value in new[] { "-h", connection.Host!, "-p", connection.Port.ToString(), "-U", connection.Username!,
                "-d", connection.Database, "--no-owner", "--no-privileges", "--file", Path.Combine(directory, "database.sql") }) dump.ArgumentList.Add(value);
            dump.Environment["PGPASSWORD"] = connection.Password ?? "";
            using var process = Process.Start(dump)!;
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            Assert.True(process.ExitCode == 0, "Synthetic export failed: " + error);
        }
    }
}
