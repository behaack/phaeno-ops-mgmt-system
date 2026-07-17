import { Link } from '@tanstack/react-router'
import {
  BadgeCheck,
  BookOpenText,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Database,
  FlaskConical,
  KeyRound,
  Library,
  PackageCheck,
  Microscope,
  Package,
  PauseCircle,
  ReceiptText,
  RefreshCw,
  Rocket,
  ScanBarcode,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { OrganizationKind } from '#/api/session'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { ResponsiveSidebar } from '#/components/WorkspaceSidebar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import {
  getDocumentationEntries,
  getDocumentationEntry,
  isDocumentationAudience,
  type DocumentationAudience,
  type DocumentationEntry,
} from './documentation-registry'
import {
  defaultExternalDocumentationLocale,
  getDocumentationMessages,
} from './documentation-localization'
import { documentationMdxComponents } from './mdx-components'
import { cn } from '#/lib/utils'

const documentationLocale = defaultExternalDocumentationLocale
const messages = getDocumentationMessages(documentationLocale)

type DocumentationPageProps = {
  audience?: string
  slug?: string
}

export function DocumentationPage({ audience, slug }: DocumentationPageProps) {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const selectedAudience = getAudienceForOrganization(
    selectedMembership?.organizationKind,
  )
  const requestedAudience = audience
    ? isDocumentationAudience(audience)
      ? audience
      : null
    : selectedAudience

  if (
    !selectedAudience ||
    !requestedAudience ||
    requestedAudience !== selectedAudience
  ) {
    return <DocumentationUnavailable />
  }

  if (!slug) {
    return (
      <DocumentationIndex audience={requestedAudience} />
    )
  }

  const entry = getDocumentationEntry(
    requestedAudience,
    slug,
    documentationLocale,
  )
  if (!entry) {
    return <DocumentationUnavailable missingGuide />
  }

  return (
    <DocumentationArticle audience={requestedAudience} slug={slug} />
  )
}

function DocumentationIndex({ audience }: { audience: DocumentationAudience }) {
  const entries = getDocumentationEntries(audience, documentationLocale)
    .filter((entry) => !entry.parentSlug)
  const audienceDetails = messages.audiences[audience]

  return (
    <main className="py-8">
      <ResponsiveSidebar
        workspaceLabel={messages.documentation}
        activeLabel={messages.guides}
        navigation={(closeSidebar) => (
          <DocumentationNavigation
            audience={audience}
            onNavigate={closeSidebar}
          />
        )}
      >
        <div className="page-wrap px-4">
          <section className="mb-7 max-w-3xl">
            <Badge variant="secondary" className="mb-3">
              {messages.helpCenter}
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight">
              {messages.documentationHeading(audienceDetails.label)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {audienceDetails.description}
            </p>
          </section>

          <section aria-labelledby="guide-list-heading">
            <h2 id="guide-list-heading" className="mb-4 text-lg font-semibold">
              {messages.guides}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => {
                const Icon = getGuideIcon(entry.slug)

                return (
                  <Link
                    key={entry.slug}
                    to="/docs/$audience/$slug"
                    params={{ audience, slug: entry.slug }}
                    className="rounded-xl text-inherit no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Card className="h-full transition-colors hover:bg-muted/30">
                      <CardHeader>
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon aria-hidden="true" className="size-4" />
                        </div>
                        <CardTitle>{entry.title}</CardTitle>
                        <CardDescription>{entry.summary}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.section}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </ResponsiveSidebar>
    </main>
  )
}

function DocumentationArticle({
  audience,
  slug,
}: {
  audience: DocumentationAudience
  slug: string
}) {
  const entries = getDocumentationEntries(audience, documentationLocale)
  const entryIndex = entries.findIndex((candidate) => candidate.slug === slug)
  const entry = entries[entryIndex]
  const previousEntry = entries[entryIndex - 1]
  const nextEntry = entries[entryIndex + 1]
  const Content = entry.Content

  return (
    <main className="py-8">
      <ResponsiveSidebar
        workspaceLabel={messages.documentation}
        activeLabel={entry.title}
        navigation={(closeSidebar) => (
          <DocumentationNavigation
            audience={audience}
            activeSlug={slug}
            onNavigate={closeSidebar}
          />
        )}
      >
        <div className="page-wrap px-4">
          <div className="mb-6">
            <Link
              to="/docs"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground no-underline hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {messages.documentation}
            </Link>
          </div>

          <article className="min-w-0">
            <div className="mb-6 border-b pb-4">
              <Badge variant="outline">{entry.section}</Badge>
              <p className="mt-3 text-xs text-muted-foreground">
                {messages.reviewed(
                  formatReviewDate(entry.reviewedAt, documentationLocale),
                )}
              </p>
            </div>

            <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-primary prose-code:text-foreground">
              <Content components={documentationMdxComponents} />
            </div>

            <nav
              aria-label={messages.previousAndNextGuides}
              className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2"
            >
              {previousEntry ? (
                <GuideSequenceLink
                  audience={audience}
                  slug={previousEntry.slug}
                  label={messages.previous}
                  title={previousEntry.title}
                  direction="previous"
                />
              ) : (
                <span />
              )}
              {nextEntry ? (
                <GuideSequenceLink
                  audience={audience}
                  slug={nextEntry.slug}
                  label={messages.next}
                  title={nextEntry.title}
                  direction="next"
                />
              ) : null}
            </nav>
          </article>
        </div>
      </ResponsiveSidebar>
    </main>
  )
}

function DocumentationNavigation({
  audience,
  activeSlug,
  onNavigate,
}: {
  audience: DocumentationAudience
  activeSlug?: string
  onNavigate: () => void
}) {
  const entries = getDocumentationEntries(audience, documentationLocale)
  const topLevelEntries = entries.filter((entry) => !entry.parentSlug)
  const activeEntry = entries.find((entry) => entry.slug === activeSlug)
  const activeGroupSlug = activeEntry?.parentSlug
    ?? (activeEntry && entries.some((entry) => entry.parentSlug === activeEntry.slug)
      ? activeEntry.slug
      : undefined)
  const [expandedGroup, setExpandedGroup] = useState<string | undefined>(
    activeGroupSlug,
  )

  useEffect(() => {
    if (!activeGroupSlug) return
    setExpandedGroup(activeGroupSlug)
  }, [activeGroupSlug])

  return (
    <nav aria-label={messages.guides}>
      <ul className="m-0 space-y-1 p-0">
        {topLevelEntries.map((candidate) => {
          const Icon = getGuideIcon(candidate.slug)
          const children = entries.filter(
            (entry) => entry.parentSlug === candidate.slug,
          )

          if (children.length === 0) {
            return (
              <li key={candidate.slug} className="list-none">
                <DocumentationGuideLink
                  audience={audience}
                  entry={candidate}
                  activeSlug={activeSlug}
                  onNavigate={onNavigate}
                />
              </li>
            )
          }

          const isExpanded = expandedGroup === candidate.slug
          const childListId = `documentation-topics-${candidate.slug}`

          return (
            <li key={candidate.slug} className="list-none">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={childListId}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${candidate.title} topics`}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() =>
                  setExpandedGroup((current) =>
                    current === candidate.slug ? undefined : candidate.slug,
                  )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{candidate.title}</span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    'ml-auto size-4 shrink-0 transition-transform motion-reduce:transition-none',
                    isExpanded && 'rotate-90',
                  )}
                />
              </button>
              {isExpanded ? (
                <ul
                  id={childListId}
                  className="mt-1 ml-5 space-y-1 border-l pl-2"
                >
                  <li className="list-none">
                    <DocumentationGuideLink
                      audience={audience}
                      entry={candidate}
                      title={candidate.overviewTitle ?? 'Overview'}
                      activeSlug={activeSlug}
                      onNavigate={onNavigate}
                      nested
                    />
                  </li>
                  {children.map((child) => (
                    <li key={child.slug} className="list-none">
                      <DocumentationGuideLink
                        audience={audience}
                        entry={child}
                        activeSlug={activeSlug}
                        onNavigate={onNavigate}
                        nested
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function DocumentationGuideLink({
  audience,
  entry,
  title = entry.title,
  activeSlug,
  onNavigate,
  nested = false,
}: {
  audience: DocumentationAudience
  entry: DocumentationEntry
  title?: string
  activeSlug?: string
  onNavigate: () => void
  nested?: boolean
}) {
  const Icon = nested && entry.overviewTitle
    ? BookOpenText
    : getGuideIcon(entry.slug)

  return (
    <Link
      to="/docs/$audience/$slug"
      params={{ audience, slug: entry.slug }}
      aria-current={entry.slug === activeSlug ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground',
        nested && 'text-xs leading-5',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{title}</span>
    </Link>
  )
}

function GuideSequenceLink({
  audience,
  slug,
  label,
  title,
  direction,
}: {
  audience: DocumentationAudience
  slug: string
  label: string
  title: string
  direction: 'previous' | 'next'
}) {
  return (
    <Link
      to="/docs/$audience/$slug"
      params={{ audience, slug }}
      className={`rounded-lg border p-3 text-sm no-underline hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
        direction === 'next' ? 'text-right' : ''
      }`}
    >
      <span
        className={`flex items-center gap-1 text-xs font-medium text-muted-foreground ${
          direction === 'next' ? 'justify-end' : ''
        }`}
      >
        {direction === 'previous' ? (
          <ChevronLeft aria-hidden="true" className="size-3" />
        ) : null}
        {label}
        {direction === 'next' ? (
          <ChevronRight aria-hidden="true" className="size-3" />
        ) : null}
      </span>
      <span className="mt-1 block font-medium text-foreground">{title}</span>
    </Link>
  )
}

function DocumentationUnavailable({ missingGuide = false }: { missingGuide?: boolean }) {
  return (
    <main className="page-wrap px-4 py-8">
      <Alert className="max-w-2xl">
        <BookOpenText aria-hidden="true" />
        <h1 className="font-medium">
          {missingGuide
            ? messages.guideNotFound
            : messages.documentationUnavailable}
        </h1>
        <AlertDescription>
          {missingGuide
            ? messages.missingGuideDescription
            : messages.unavailableDescription}
        </AlertDescription>
      </Alert>
    </main>
  )
}

function getAudienceForOrganization(
  kind: OrganizationKind | null | undefined,
): DocumentationAudience | null {
  switch (kind) {
    case 'Prospect':
      return 'prospect'
    case 'Customer':
      return 'customer'
    case 'Partner':
      return 'partner'
    case 'Phaeno':
      return 'phaeno'
    default:
      return null
  }
}

function getGuideIcon(slug: string): LucideIcon {
  switch (slug) {
    case 'getting-started':
      return Rocket
    case 'account-and-access':
      return KeyRound
    case 'data-library':
      return Library
    case 'data-governance-and-downloads':
      return ShieldCheck
    case 'organization-and-transition':
    case 'data-and-organization':
      return Building2
    case 'lab-services':
      return FlaskConical
    case 'results-and-billing':
      return ReceiptText
    case 'reagent-orders':
      return Package
    case 'data-assembly':
      return Workflow
    case 'organization-and-user-administration':
      return UsersRound
    case 'data-provisioning-and-accounts':
      return Database
    case 'data-source-registry':
      return Database
    case 'data-curated-publishing':
      return Library
    case 'data-organization-grants':
      return UsersRound
    case 'data-governance-recovery':
      return ShieldCheck
    case 'order-operations':
      return ClipboardList
    case 'order-customer-lab-authorization':
      return FlaskConical
    case 'order-reagent-fulfillment':
      return Package
    case 'order-data-assembly':
      return Workflow
    case 'order-holds-cancellations-adjustments':
      return PauseCircle
    case 'order-billing-payment-release':
      return ReceiptText
    case 'order-integration-recovery':
      return RefreshCw
    case 'lab-operations':
      return Microscope
    case 'lab-receipt-accession':
      return ScanBarcode
    case 'lab-protocol-execution':
      return ScrollText
    case 'lab-materials-equipment':
      return PackageCheck
    case 'lab-libraries-batches-sequencing':
      return Boxes
    case 'lab-exceptions-rework':
      return TriangleAlert
    case 'lab-scientific-approval':
      return BadgeCheck
    case 'configuration-and-recovery':
      return Settings
    case 'statuses-and-troubleshooting':
    case 'statuses-and-recovery':
      return CircleHelp
    default:
      return BookOpenText
  }
}

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
    new Date(`${value}T00:00:00`),
  )
}
