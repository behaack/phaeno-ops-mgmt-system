import { createFileRoute } from '@tanstack/react-router'
import { ResearchProjectsPage } from '#/features/research/ResearchLists'
export const Route = createFileRoute('/research/')({ component: ResearchProjectsPage })
