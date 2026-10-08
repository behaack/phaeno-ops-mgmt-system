import { createFileRoute } from '@tanstack/react-router'
import { ResultReleasePage } from '#/features/lab-operations/ResultReleasePage'
export const Route = createFileRoute('/lab-operations/result-release')({ validateSearch: (search: Record<string, unknown>): { resultState?: string } => ({ resultState: typeof search.resultState === 'string' ? search.resultState : undefined }), component: ResultReleasePage })
