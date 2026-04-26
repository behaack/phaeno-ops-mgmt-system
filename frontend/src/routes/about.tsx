import { createFileRoute } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight">Project setup</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          This frontend is a TanStack Start app prepared for the Phaeno Portal
          security model and UI conventions.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [
            'Framework',
            'TanStack Start with Router, Query integration, TypeScript, and Vite.',
          ],
          [
            'UI',
            'Shadcn components, lucide icons, Tailwind v4, and CSS token themes.',
          ],
          [
            'Testing',
            'Vitest is configured for unit checks and Playwright for e2e flows.',
          ],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ready for the next domain-specific route and API integration.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
