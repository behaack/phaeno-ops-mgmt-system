import { Link } from '@tanstack/react-router'
import { BookOpenText, ChevronLeft, ChevronRight } from 'lucide-react'

import type { OrganizationKind } from '#/api/session'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
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
  documentationAudienceKeys,
  documentationAudiences,
  getDocumentationEntries,
  getDocumentationEntry,
  isDocumentationAudience,
  type DocumentationAudience,
} from './documentation-registry'
import {
  defaultExternalDocumentationLocale,
  getDocumentationMessages,
} from './documentation-localization'
import { documentationMdxComponents } from './mdx-components'

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
  const canViewAllAudiences = selectedAudience === 'phaeno'
  const requestedAudience = audience
    ? isDocumentationAudience(audience)
      ? audience
      : null
    : selectedAudience

  if (
    !selectedAudience ||
    !requestedAudience ||
    (!canViewAllAudiences && requestedAudience !== selectedAudience)
  ) {
    return <DocumentationUnavailable />
  }

  if (!slug) {
    return (
      <DocumentationIndex
        audience={requestedAudience}
        canViewAllAudiences={canViewAllAudiences}
      />
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
    <DocumentationArticle
      audience={requestedAudience}
      slug={slug}
      canViewAllAudiences={canViewAllAudiences}
    />
  )
}

function DocumentationIndex({
  audience,
  canViewAllAudiences,
}: {
  audience: DocumentationAudience
  canViewAllAudiences: boolean
}) {
  const entries = getDocumentationEntries(audience, documentationLocale)
  const audienceDetails = messages.audiences[audience]

  return (
    <main className="page-wrap px-4 py-8">
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

      {canViewAllAudiences ? <AudienceSwitcher activeAudience={audience} /> : null}

      <section aria-labelledby="guide-list-heading" className="mt-7">
        <h2 id="guide-list-heading" className="mb-4 text-lg font-semibold">
          {messages.guides}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <Link
              key={entry.slug}
              to="/docs/$audience/$slug"
              params={{ audience, slug: entry.slug }}
              className="rounded-xl text-inherit no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <BookOpenText aria-hidden="true" className="size-4" />
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
          ))}
        </div>
      </section>
    </main>
  )
}

function DocumentationArticle({
  audience,
  slug,
  canViewAllAudiences,
}: {
  audience: DocumentationAudience
  slug: string
  canViewAllAudiences: boolean
}) {
  const entries = getDocumentationEntries(audience, documentationLocale)
  const entryIndex = entries.findIndex((candidate) => candidate.slug === slug)
  const entry = entries[entryIndex]
  const previousEntry = entries[entryIndex - 1]
  const nextEntry = entries[entryIndex + 1]
  const Content = entry.Content

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mb-6">
        <Link
          to="/docs"
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground no-underline hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {messages.documentation}
        </Link>
      </div>

      {canViewAllAudiences ? <AudienceSwitcher activeAudience={audience} /> : null}

      <div className="mt-7 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <nav aria-label={messages.guidesNavigationLabel(messages.audiences[audience].label)}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {messages.guidesNavigationLabel(messages.audiences[audience].label)}
            </p>
            <ul className="m-0 space-y-1 p-0">
              {entries.map((candidate) => (
                <li key={candidate.slug} className="list-none">
                  <Link
                    to="/docs/$audience/$slug"
                    params={{ audience, slug: candidate.slug }}
                    aria-current={candidate.slug === slug ? 'page' : undefined}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    {candidate.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

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
    </main>
  )
}

function AudienceSwitcher({
  activeAudience,
}: {
  activeAudience: DocumentationAudience
}) {
  return (
    <nav aria-label={messages.documentationAudience}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {messages.viewGuidesAs}
      </p>
      <div className="flex flex-wrap gap-2">
        {documentationAudienceKeys.map((audience) => (
          <Link
            key={audience}
            to="/docs/$audience/$slug"
            params={{
              audience,
              slug: documentationAudiences[audience].landingSlug,
            }}
            aria-current={audience === activeAudience ? 'page' : undefined}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
          >
            {messages.audiences[audience].label}
          </Link>
        ))}
      </div>
    </nav>
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

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
    new Date(`${value}T00:00:00`),
  )
}
