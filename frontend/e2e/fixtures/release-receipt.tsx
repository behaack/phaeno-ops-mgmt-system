// Synthetic browser fixture; not an application route.
import { createRoot } from 'react-dom/client'
import { ReleaseReceiptView } from '../../src/features/file-management/ReleasedDeliverableDetailPage'
import { releaseReceipt } from '../../src/test-helpers/release-receipt'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode('auto')
createRoot(document.getElementById('root')!).render(<main className="page-wrap p-4"><ReleaseReceiptView data={{ ...releaseReceipt, files: Array.from({ length: 35 }, (_, index) => ({ ...releaseReceipt.files[0], id: `file-${index}`, name: `${index + 1}-${releaseReceipt.files[0].name}` })) }} /></main>)
