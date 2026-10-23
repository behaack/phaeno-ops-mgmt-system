import { trialConfiguration, trialDetail } from '#/test-helpers/trials'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import type { AssemblyQcWorkspace } from '#/api/lab-fastq'
import type { InvoiceReceivable } from '#/api/pseq-order-to-cash'
import { bundleIds, bundleLabDraft } from '#/test-helpers/bundled-orders'

export const demoInvoice: InvoiceReceivable = {
  id: 'demo-invoice', organizationId: 'demo-customer', labServiceOrderId: 'demo-order', invoiceNumber: 'DEMO-INV-001',
  status: 'Issued', issuedOn: '2026-10-20', dueOn: '2026-11-19', daysPastDue: 0, subtotal: 1200, taxTotal: 0,
  adjustmentTotal: 0, total: 1200, appliedTotal: 0, balance: 1200, currency: 'USD', version: 1,
}
export const demoQc: AssemblyQcWorkspace = {
  jobId: 'demo-job', labWorkOrderId: 'demo-work', labSpecimenId: 'demo-specimen', version: 1,
  state: 'Succeeded', labAnalysisRunId: null, canRecord: true, inputs: [], reviews: [],
  packages: [{ id: '11111111-1111-4111-8111-111111111111', packageVersion: 1, version: 1, state: 'ReadyForReview',
    artifacts: [{ id: 'demo-artifact', fileName: 'DEMO-assembly-results.txt', logicalRole: 'AssemblyResult', sizeBytes: 2048, sha256: 'a'.repeat(64), scanState: 'Clean' }] }],
}
export function workflowResponse(path: string, empty: boolean, scene = '') {
  const page = (items: unknown[]) => ({ items, page: 1, pageSize: 25, totalCount: items.length })
  if (path === '/platform/accounts-receivable/invoices') return page(empty ? [] : [demoInvoice])
  if (path === '/platform/accounts-receivable/aging') return { asOf: '2026-10-22', current: empty ? 0 : 1200, days1To30: 0, days31To60: 0, days61To90: 0, over90: 0, organizations: [] }
  if (path === '/platform/accounts-receivable/receipts' || path === '/platform/accounts-receivable/reconciliations') return page([])
  if (path === '/sample-shipping/page') return page(empty ? [] : [{ ...shippingFixture, shipmentNumber: 'DEMO-SHIP-001', organizationName: 'DEMO — Example Research', authorizationReference: 'DEMO-JOB-001' }])
  if (path === '/sample-shipping' || path.includes('/workflow/shipments')) return []
  if (path === '/trials/configuration') return { ...trialConfiguration, departments: [{ id: 'demo-department', name: 'Research', version: 1 }] }
  if (path === '/trials/trial-1') return { ...trialDetail, number: 'DEMO-TRIAL-001', companyName: 'DEMO — Example Research', scope: { ...trialDetail.scope!, name: 'DEMO — transcript evaluation', submissionOpensAtUtc: '2026-10-01T00:00:00Z', submissionClosesAtUtc: '2026-11-01T00:00:00Z' }, scopeHistory: [], samples: [], releases: [], timeline: empty ? [] : trialDetail.timeline }
  if (path === '/trials/trial-1/timeline') return page(empty ? [] : trialDetail.timeline)
  if (path === '/trials/trial-1/results/candidates') return []
  if (path === '/platform/lab-operations/assembly-jobs/demo-job/qc') return { ...demoQc, packages: empty ? [] : demoQc.packages }
  if (path.includes('/customer-options/demo-customer/departments')) return [{ id: 'demo-department', name: 'Research', isDefault: true }]
  if (path.includes('/customer-options/demo-customer/readiness')) return { canStartPricing: scene !== 'order-blocked', startPricingBlockers: scene === 'order-blocked' ? [{code:'BillingRequired',label:'Complete billing and Finance approval',nextAction:'Review Customer billing in Finance before pricing submission.'}] : [], quoteBlockers: [], invoiceBlockers: [] }
  if (path === '/platform/lab-operations/suppliers' || path === '/platform/lab-operations/kit-assembly/workflows') return []
  if (path === '/data-assembly-requests') return page([{id:'demo-assembly',number:'DEMO-ASM-001',title:'DEMO — Partner assembly case',customerReference:'DEMO — Partner assembly case',status:'Processing',createdAt:'2026-10-22T10:00:00Z',updatedAt:'2026-10-22T11:00:00Z',version:1,requestedByName:'Demo Researcher',organizationName:'DEMO — Example Research',total:null,currency:'USD'}])
  if (path === '/lab-service-orders/' + bundleIds.order) return { ...bundleLabDraft, status: 'Completed', orderNumber: 'DEMO-JOB-001', customerReference:'DEMO — transcript study', quotes: [], usesPairedPreparation:false, placedAt:null }
  if (/\/lab-service-orders\/[^/]+\/result-packages$/.test(path)) return [{id:'demo-result',labSampleId:'demo-sample',packageVersion:1,state:'Released',releasedAtUtc:'2026-10-22T12:00:00Z',retentionState:'Available',isDownloadAvailable:true,retention:null,artifacts:[{id:'demo-file',logicalRole:'Result',fileName:'DEMO-transcripts.tsv',contentType:'text/tab-separated-values',sizeBytes:2048,sha256:'a'.repeat(64),deletedAtUtc:null}]}]
  if (path === '/invoices') return []
  return undefined
}
