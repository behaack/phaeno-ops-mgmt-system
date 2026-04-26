import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/demo/tanstack-query')({
  component: TanStackQueryDemo,
})

function TanStackQueryDemo() {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: () =>
      Promise.resolve([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]),
    initialData: [],
  })

  return (
    <main className="page-wrap px-4 py-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>TanStack Query demo</CardTitle>
          <CardDescription>
            Query wiring is installed and available from the root router
            context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
          {data.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center justify-between rounded-lg border bg-background p-3"
            >
              <span className="text-sm font-medium">{todo.name}</span>
              <Badge variant="secondary">loaded</Badge>
            </li>
          ))}
        </ul>
        </CardContent>
      </Card>
    </main>
  )
}
