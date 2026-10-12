import type { WebOpsDemoRequest, WebOpsMailingListContact, WebOpsPage } from '#/api/web-ops'

export const mockMailingListPage: WebOpsPage<WebOpsMailingListContact> = {
  page: 1,
  pageSize: 10,
  totalCount: 2,
  items: [
    {
      id: 'mock-contact-1',
      firstName: 'Morgan',
      lastName: 'Lee',
      organizationName: 'Northstar Research',
      email: 'morgan.lee@example.com',
      technicalBriefRequested: true,
      createdAtUtc: '2026-07-17T17:00:00Z',
    },
    {
      id: 'mock-contact-2',
      firstName: 'Priya',
      lastName: 'Shah',
      organizationName: 'Helix Discovery',
      email: 'priya.shah@example.com',
      technicalBriefRequested: false,
      createdAtUtc: '2026-07-16T19:30:00Z',
    },
  ],
}

export const mockDemoRequestPage: WebOpsPage<WebOpsDemoRequest> = {
  page: 1,
  pageSize: 10,
  totalCount: 2,
  items: [
    {
      id: 'mock-request-1',
      firstName: 'Alex',
      lastName: 'Chen',
      organizationName: 'Atlas Bioanalytics',
      email: 'alex.chen@example.com',
      description: 'We would like a demonstration for our transcriptomics team.',
    },
    {
      id: 'mock-request-2',
      firstName: 'Sam',
      lastName: 'Rivera',
      organizationName: 'Summit Genomics',
      email: 'sam.rivera@example.com',
      description: 'Please schedule a technical overview for our research group.',
    },
  ],
}
