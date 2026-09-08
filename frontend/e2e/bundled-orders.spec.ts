import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  bundleAssembly,
  bundleConfiguration,
  bundleIds,
  bundleKitOrder,
  bundleLabDraft,
  bundleOffering,
  bundlePreview,
  bundleTiming,
} from '../src/test-helpers/bundled-orders'
import type { OperationalFile } from '../src/api/order-management'

test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--disable-features=LocalNetworkAccessChecks'],
  },
})

async function fixture(page: Page, screen: string) {
  const unexpected: string[] = []
  const errors: string[] = []
  const writes: Array<{
    path: string
    body: Record<string, unknown>
    key?: string
  }> = []
  let lab = structuredClone(bundleLabDraft)
  let assembly = structuredClone(bundleAssembly)
  const kit = structuredClone(bundleKitOrder)
  let uploadAttempts = 0
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname.slice(4)
      const method = request.method()
      const send = (data: unknown) =>
        route.fulfill({ json: { success: true, data, error: null } })
      const fail = (message: string) =>
        route.fulfill({
          status: 409,
          json: {
            success: false,
            data: null,
            error: { code: 'training_retry', message },
          },
        })
      const labPath = `/lab-service-orders/${bundleIds.order}`
      const assemblyPath = `/data-assembly-requests/${bundleIds.request}`
      if (method === 'GET') {
        if (path === labPath) return send(lab)
        if (path === `${labPath}/standard-preview`) return send(bundlePreview)
        if (
          path === '/order-catalog/lab-service-offerings' ||
          path === '/platform/order-configuration/lab-service-offerings'
        )
          return send([bundleOffering])
        if (
          path === '/accounts-receivable/invoices' ||
          path === `${labPath}/result-packages`
        )
          return send([])
        if (path === `/reagent-orders/${bundleIds.order}`) return send(kit)
        if (path === assemblyPath) return send(assembly)
        if (path === '/organizations')
          return send([
            {
              id: bundleIds.organization,
              name: 'Synthetic Research Partner',
              kind: 'Partner',
              isActive: true,
              version: 1,
            },
          ])
      } else {
        const body = path.endsWith('/inputs')
          ? {}
          : (request.postDataJSON() as Record<string, unknown>)
        writes.push({ path, body, key: request.headers()['idempotency-key'] })
        if (method === 'POST' && path === `${labPath}/place-standard`) {
          expect(body.reviewToken).toBe(bundlePreview.reviewToken)
          expect(body.commercialProfileVersion).toBe(7)
          lab = {
            ...lab,
            status: 'Accepted',
            version: 4,
            canEdit: false,
            canSubmit: false,
            canPlaceStandardOrder: false,
            canEditSamples: true,
            canFinalizeSamples: true,
            canWithdraw: false,
            placedAt: '2026-09-07T10:05:00Z',
            entryMode: 'ConfiguredDirect',
            standardCommercialSnapshot: {
              ...bundleOffering,
              offeringId: bundleOffering.id,
              productName: bundleOffering.name,
              specimenCount: 2,
              subtotal: 200,
              tax: 20,
              total: 220,
              committedAtUtc: '2026-09-07T10:05:00Z',
            },
          }
          return send(lab)
        }
        if (
          method === 'POST' &&
          path.endsWith(`/assembly-cases/${bundleIds.case}/request`)
        ) {
          assembly = {
            ...assembly,
            ...body,
            id: bundleIds.request,
            assemblyProfileId: bundleIds.profile,
            projectReference: String(body.projectReference),
            version: 1,
          }
          kit.assemblyCases![0] = {
            ...kit.assemblyCases![0],
            assemblyRequestId: assembly.id,
            assemblyRequestNumber: assembly.requestNumber,
            assemblyRequestStatus: 'Draft',
            status: 'PreparingInputs',
            canPrepare: false,
          }
          return send(assembly)
        }
        if (method === 'PATCH' && path === assemblyPath) {
          assembly = { ...assembly, ...body, version: assembly.version + 1 }
          return send(assembly)
        }
        if (method === 'POST' && path === `${assemblyPath}/inputs`) {
          if (uploadAttempts++ === 0)
            return fail(
              'Training upload interrupted. Retry the retained file on the same case.',
            )
          const file: OperationalFile = {
            id: bundleIds.analysis,
            parentRecordId: assembly.id,
            purpose: 'AssemblyInput',
            fileName: 'training-reads.fastq',
            fileKind: 'FASTQ',
            contentType: 'text/plain',
            sizeBytes: 17,
            scanStatus: 'Clean',
            releaseStatus: 'NotReleased',
            releasedAt: null,
            createdAt: '2026-09-07T10:10:00Z',
            version: 1,
          }
          assembly = {
            ...assembly,
            inputFiles: [file],
            version: assembly.version + 1,
          }
          return send(file)
        }
        if (method === 'POST' && path === `${assemblyPath}/submit`) {
          assembly = {
            ...assembly,
            status: 'Submitted',
            canEdit: false,
            canSubmit: false,
            version: assembly.version + 1,
          }
          return send(assembly)
        }
        if (method === 'POST' && path === '/order-catalog/custom-work')
          return send({
            opportunityId: bundleIds.catalog,
            opportunityNumber: 'TRAINING-OPP-1',
            departmentId: bundleIds.department,
            status: 'Submitted',
          })
        if (method === 'POST' && path.endsWith('/timing'))
          return send({
            ...bundleTiming,
            expectedCompletionAtUtc: body.expectedCompletionAtUtc,
          })
      }
      unexpected.push(`${method} ${path}`)
      return route.abort()
    },
  )
  const html = await readFile(
    new URL('./fixtures/bundled-orders.html', import.meta.url),
    'utf8',
  )
  await page.route('**/e2e/fixtures/bundled-orders.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  )
  await page.goto(`/e2e/fixtures/bundled-orders.html?screen=${screen}`)
  return { unexpected, errors, writes }
}
async function capture(page: Page, info: TestInfo, name: string) {
  // Inspect the settled interface, not a partially transparent dialog animation.
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))) })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true })
  if (info.project.name === 'chromium') {
    const dialog = page.getByRole('dialog')
    if (await dialog.count()) await dialog.screenshot({ path: info.outputPath(`${name}-detail.png`) })
    if (name === 'kit-included-case') await page.locator('[data-slot="card"]').filter({ has: page.getByText('Included assembly cases', { exact: true }) }).screenshot({ path: info.outputPath(`${name}-detail.png`) })
    if (name === 'kit-assembly-inputs') {
      await page.locator('[data-slot="card"]').filter({ has: page.getByText('Input files', { exact: true }) }).screenshot({ path: info.outputPath(`${name}-files.png`) })
      await page.locator('[data-slot="card"]').filter({ has: page.getByText('Assembly profile', { exact: true }) }).screenshot({ path: info.outputPath(`${name}-scope.png`) })
    }
  }
}

for (const audience of ['lab', 'partner-lab'])
  test(`${audience}: reviewed final price commits the configured bundle before samples`, async ({
    page,
  }, info) => {
    const state = await fixture(page, audience)
    await page
      .getByRole('combobox', { name: 'Offering', exact: true })
      .selectOption(bundleIds.offering)
    await expect(
      page.getByRole('button', { name: 'Review standard order' }),
    ).toBeEnabled()
    await capture(page, info, `${audience}-offering`)
    await page.getByRole('button', { name: 'Review standard order' }).click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByText('Total $220.00', { exact: true }),
    ).toBeVisible()
    await dialog
      .getByRole('textbox', { name: /Purchase order number/ })
      .fill('TRAINING-PO')
    await dialog.getByRole('checkbox').check()
    await capture(page, info, `${audience}-price-confirmation`)
    await dialog
      .getByRole('button', { name: 'Place standard order', exact: true })
      .click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Add sample', exact: true }),
    ).toBeVisible()
    await capture(page, info, `${audience}-placed-samples`)
    expect(state.writes).toHaveLength(1)
    expect(state.unexpected).toEqual([])
    expect(state.errors).toEqual([])
  })

test('Partner Kit preparation and interrupted upload reuse the purchased assembly case', async ({
  page,
}, info) => {
  const state = await fixture(page, 'kit')
  await expect(page.getByRole('link', { name: 'Prepare inputs' })).toBeVisible()
  await capture(page, info, 'kit-included-case')
  await page.getByRole('link', { name: 'Prepare inputs' }).click()
  await page
    .getByRole('textbox', { name: /Partner project or reference/ })
    .fill('Training transcript study')
  await expect(
    page.getByRole('textbox', { name: /Requested output/ }),
  ).toHaveAttribute('readonly', '')
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'training-reads.fastq',
      mimeType: 'text/plain',
      buffer: Buffer.from('@training\nACGT\n+\n!!!!\n'),
    })
  await page.getByRole('checkbox').check()
  await capture(page, info, 'kit-assembly-inputs')
  await page
    .getByRole('button', { name: 'Submit for intake validation', exact: true })
    .click()
  await expect(
    page.getByText('Draft saved; submission needs attention', { exact: true }),
  ).toBeVisible()
  expect(
    state.writes.filter((item) => item.path.endsWith('/inputs')),
  ).toHaveLength(1)
  await expect(
    page.getByText(
      'Training upload interrupted. Retry the retained file on the same case.',
    ),
  ).toBeVisible()
  await capture(page, info, 'kit-retained-upload-retry')
  await page
    .getByRole('button', { name: 'Submit for intake validation', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Training transcript study',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Accept quote', exact: true }),
  ).toHaveCount(0)
  await capture(page, info, 'kit-submitted-included-case')
  expect(
    state.writes.filter((item) => item.path.endsWith('/request')),
  ).toHaveLength(1)
  const uploads = state.writes.filter((item) => item.path.endsWith('/inputs'))
  expect(uploads).toHaveLength(2)
  expect(uploads[0].key).toBeTruthy()
  expect(uploads[1].key).toBe(uploads[0].key)
  expect(state.unexpected).toEqual([])
  expect(state.errors).toEqual([])
})

test('configuration and operational timing use the owning panels', async ({
  page,
}, info) => {
  const state = await fixture(page, 'configuration')
  await expect(
    page.getByRole('heading', {
      name: `${bundleOffering.name} · version 2`,
      exact: true,
    }),
  ).toBeVisible()
  await capture(page, info, 'bundle-offering-configuration')
  await page
    .getByRole('button', { name: 'Create new version', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await capture(page, info, 'lab-offering-version')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  expect(state.unexpected).toEqual([])
  expect(state.errors).toEqual([])
  expect(bundleConfiguration.assemblyProfiles).toHaveLength(1)
})

test('staff timing and case decisions display original targets and reviewed impact', async ({
  page,
}, info) => {
  const state = await fixture(page, 'staff')
  await expect(
    page.getByRole('button', {
      name: 'Change expected completion',
      exact: true,
    }),
  ).toBeVisible()
  await capture(page, info, 'bundle-operational-timing')
  await page
    .getByRole('button', { name: 'Change expected completion', exact: true })
    .click()
  await capture(page, info, 'lab-timing-override')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Extend deadline', exact: true })
    .click()
  await capture(page, info, 'kit-case-extension')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Keep case', exact: true })
    .click()
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
  expect(state.errors).toEqual([])
})
