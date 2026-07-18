import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WebOpsDashboardContent } from './WebOpsDashboardContent'
import type {
  WebOpsDemoRequest,
  WebOpsMailingListContact,
  WebOpsPage,
} from '#/api/web-ops'

const mailingListPage: WebOpsPage<WebOpsMailingListContact> = {
  page: 1,
  pageSize: 10,
  totalCount: 12,
  items: Array.from({ length: 10 }, (_, index) => ({
    id: `contact-${index + 1}`,
    firstName: index === 0 ? 'Ada' : `Contact ${index + 1}`,
    lastName: index === 0 ? 'Lovelace' : 'Example',
    organizationName: 'Analytical Engines',
    email: `contact-${index + 1}@example.com`,
    technicalBriefRequested: index === 0,
    createdAtUtc: '2026-07-17T17:00:00Z',
  })),
}

const demoRequestPage: WebOpsPage<WebOpsDemoRequest> = {
  page: 1,
  pageSize: 10,
  totalCount: 12,
  items: Array.from({ length: 10 }, (_, index) => ({
    id: `request-${index + 1}`,
    firstName: index === 0 ? 'Grace' : `Requester ${index + 1}`,
    lastName: index === 0 ? 'Hopper' : 'Example',
    organizationName: index === 0 ? 'Compiler Labs' : `Lab ${index + 1}`,
    email: `request-${index + 1}@example.com`,
    description: index === 0
      ? 'Please arrange a PSeq demonstration.'
      : `Demo request ${index + 1}`,
  })),
}

describe('WebOpsDashboardContent', () => {
  it('selects one independently paginated intake panel at a time', () => {
    render(
      <WebOpsDashboardContent
        mailingList={{
          data: mailingListPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
        }}
        demoRequests={{
          data: demoRequestPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
        }}
        isMockData
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Web Operations' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('region', { name: 'Mailing List' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('region', { name: 'Demo Requests' }),
    ).toBeNull()
    expect(screen.getByText('Mock data')).toBeTruthy()
    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Technical brief')).toBeTruthy()
    expect(
      screen.getByText('Showing 1–10 of 12 signups. Page 1 of 2.'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('tab', { name: /Demo Requests/ }),
    )

    expect(
      screen.queryByRole('region', { name: 'Mailing List' }),
    ).toBeNull()
    expect(
      screen.getByRole('region', { name: 'Demo Requests' }),
    ).toBeTruthy()
    expect(screen.getByText('Compiler Labs')).toBeTruthy()
    expect(
      screen.getByText('Please arrange a PSeq demonstration.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Showing 1–10 of 12 requests. Page 1 of 2.'),
    ).toBeTruthy()
  })

  it('changes each panel page independently', () => {
    const changeMailingListPage = vi.fn()
    const changeDemoRequestPage = vi.fn()

    render(
      <WebOpsDashboardContent
        mailingList={{
          data: mailingListPage,
          error: null,
          isLoading: false,
          onPageChange: changeMailingListPage,
          onRetry: () => undefined,
        }}
        demoRequests={{
          data: demoRequestPage,
          error: null,
          isLoading: false,
          onPageChange: changeDemoRequestPage,
          onRetry: () => undefined,
        }}
      />,
    )

    const mailingListPagination = screen.getByRole('navigation', {
      name: 'Mailing List pagination',
    })
    expect(
      within(mailingListPagination).getByRole('button', { name: 'Previous' })
        .hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.click(
      within(mailingListPagination).getByRole('button', { name: 'Next' }),
    )
    expect(changeMailingListPage).toHaveBeenCalledWith(2)
    expect(changeDemoRequestPage).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('tab', { name: /Demo Requests/ }),
    )
    const demoRequestPagination = screen.getByRole('navigation', {
      name: 'Demo Requests pagination',
    })
    fireEvent.click(
      within(demoRequestPagination).getByRole('button', { name: 'Next' }),
    )
    expect(changeDemoRequestPage).toHaveBeenCalledWith(2)
  })

  it('hides pagination when a panel has only one page', () => {
    render(
      <WebOpsDashboardContent
        mailingList={{
          data: {
            ...mailingListPage,
            items: mailingListPage.items.slice(0, 4),
            totalCount: 4,
          },
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
        }}
        demoRequests={{
          data: demoRequestPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
        }}
      />,
    )

    expect(
      screen.queryByRole('navigation', {
        name: 'Mailing List pagination',
      }),
    ).toBeNull()
  })

  it('keeps one panel available when the other cannot be loaded', () => {
    const retryMailingList = vi.fn()

    render(
      <WebOpsDashboardContent
        mailingList={{
          error: new Error('Unavailable'),
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: retryMailingList,
        }}
        demoRequests={{
          data: demoRequestPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
        }}
      />,
    )

    const mailingListPanel = screen.getByRole('region', {
      name: 'Mailing List',
    })
    expect(
      within(mailingListPanel).getByRole('alert').textContent,
    ).toContain('Mailing List could not be loaded')
    fireEvent.click(
      within(mailingListPanel).getByRole('button', { name: 'Try again' }),
    )
    expect(retryMailingList).toHaveBeenCalledOnce()

    fireEvent.click(
      screen.getByRole('tab', { name: /Demo Requests/ }),
    )
    expect(screen.getByText('Compiler Labs')).toBeTruthy()
  })

  it('confirms unsubscribe and completion actions before updating a queue', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(undefined)
    const complete = vi.fn().mockResolvedValue(undefined)

    render(
      <WebOpsDashboardContent
        mailingList={{
          data: mailingListPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
          action: {
            error: null,
            isPending: false,
            onExecute: unsubscribe,
            onReset: () => undefined,
          },
        }}
        demoRequests={{
          data: demoRequestPage,
          error: null,
          isLoading: false,
          onPageChange: () => undefined,
          onRetry: () => undefined,
          action: {
            error: null,
            isPending: false,
            onExecute: complete,
            onReset: () => undefined,
          },
        }}
      />,
    )

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Unsubscribe' })[0],
    )
    const unsubscribeDialog = screen.getByRole('dialog')
    expect(unsubscribeDialog.textContent).toContain(
      'The original Website submission remains in POMS.',
    )
    fireEvent.click(
      within(unsubscribeDialog).getByRole('button', { name: 'Unsubscribe' }),
    )

    await waitFor(() => expect(unsubscribe).toHaveBeenCalledWith(
      mailingListPage.items[0],
    ))
    expect(
      screen.getByText(
        'contact-1@example.com was unsubscribed and removed from the active list.',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /Demo Requests/ }))
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Mark complete' })[0],
    )
    const completeDialog = screen.getByRole('dialog')
    expect(completeDialog.textContent).toContain(
      'The original Website inquiry remains in POMS.',
    )
    fireEvent.click(
      within(completeDialog).getByRole('button', { name: 'Mark complete' }),
    )

    await waitFor(() => expect(complete).toHaveBeenCalledWith(
      demoRequestPage.items[0],
    ))
    expect(
      screen.getByText(
        'Compiler Labs demo request was marked complete.',
      ),
    ).toBeTruthy()
  })
})
