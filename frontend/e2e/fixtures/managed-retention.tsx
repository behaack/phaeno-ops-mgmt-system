// Synthetic browser fixture; not an application route.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LabManagedResultReleases } from '../../src/features/orders/LabManagedResultReleases'
import { managedFile, managedRelease } from '../../src/test-helpers/managed-retention'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode('auto')
const longFile = { ...managedFile, fileName: 'sample-transcript-isoform-expression-results-for-review-and-interpretation.txt' }
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><main className="page-wrap px-4 py-8">
  <h1 className="mb-5 text-2xl font-semibold">Laboratory result downloads</h1>
  <LabManagedResultReleases orderId="synthetic" files={[longFile]} releases={[
    managedRelease,
    { ...managedRelease, id: 'grace', releaseVersion: 2, retention: { ...managedRelease.retention!, graceActivatedAtUtc: managedRelease.retention!.standardDeletionAtUtc } },
    { ...managedRelease, id: 'closed', releaseVersion: 3, retention: { ...managedRelease.retention!, downloadAccessClosedAtUtc: managedRelease.retention!.potentialFinalDeletionAtUtc } },
  ]} />
</main></QueryClientProvider>)
