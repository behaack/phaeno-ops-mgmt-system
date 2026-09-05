import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

export type CrmCollectionQueryState = {
  isPending: boolean
  isError: boolean
  isFetching: boolean
  data: unknown
  refetch: () => Promise<unknown>
}

export function CrmCollectionFeedback({ name, query }: { name: string; query: CrmCollectionQueryState }) {
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading {name}…</p>
  if (!query.isError) return null
  return <Alert variant="destructive">
    <AlertTitle>Could not load {name}</AlertTitle>
    <AlertDescription>
      {query.data !== undefined
        ? 'Previously loaded records are shown and may be out of date. Retry to load the current records.'
        : 'Retry to load the records before continuing.'}
      <Button type="button" size="sm" variant="outline" className="text-foreground" disabled={query.isFetching} onClick={() => void query.refetch()}>
        {query.isFetching ? `Retrying ${name}…` : `Retry ${name}`}
      </Button>
    </AlertDescription>
  </Alert>
}
