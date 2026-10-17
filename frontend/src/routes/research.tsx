import { createFileRoute } from '@tanstack/react-router'
import { ResearchShell } from '#/features/research/ResearchShell'
import { parseResearchSearch } from '#/features/research/research-search'
export const Route = createFileRoute('/research')({ validateSearch: parseResearchSearch, component: ResearchShell })
