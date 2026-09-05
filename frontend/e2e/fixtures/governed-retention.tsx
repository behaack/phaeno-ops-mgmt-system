// Browser-only fixture; never imported by production application routes.
import { createRoot } from 'react-dom/client'
import { GovernedResultPackagePanel } from '../../src/features/orders/GovernedResultPackagePanel'
import { governedRetentionPackage as fixture } from '../../src/test-helpers/governed-retention'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
createRoot(document.getElementById('root')!).render(<main className="page-wrap px-4 py-8">
  <h1 className="mb-5 text-2xl font-semibold">Released result retention</h1>
  <div className="divide-y">
    <GovernedResultPackagePanel resultPackage={fixture} sampleName="Before deadline" isDownloading={false} onDownload={() => undefined} />
    <GovernedResultPackagePanel resultPackage={{ ...fixture, retentionState: 'Grace', retention: { ...fixture.retention!,
      graceActivatedAtUtc: fixture.retention!.standardDeletionAtUtc,
      download: { totalFileCount: 1, downloadedFileCount: 1, activeAttemptCount: 0, status: 'Downloaded', completedAtUtc: '2026-09-01T12:00:00Z' },
    } }} sampleName="During grace" isDownloading={false} onDownload={() => undefined} />
    <GovernedResultPackagePanel resultPackage={{ ...fixture, isDownloadAvailable: false, retentionState: 'Cutoff', retention: {
      ...fixture.retention!, graceActivatedAtUtc: fixture.retention!.standardDeletionAtUtc,
      downloadAccessClosedAtUtc: fixture.retention!.potentialFinalDeletionAtUtc,
    } }} sampleName="After cutoff" isDownloading={false} onDownload={() => undefined} />
  </div>
</main>)
