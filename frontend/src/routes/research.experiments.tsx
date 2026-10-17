import { createFileRoute } from '@tanstack/react-router'
import { ResearchExperimentsPage } from '#/features/research/ResearchLists'
export const Route = createFileRoute('/research/experiments')({ component: ResearchExperimentsPage })
