import { BackLink } from '#/components/ui/back-link'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/ui/page-header'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function HeaderExamples() {
  return <div className="space-y-6">
    <div className="space-y-5 rounded-lg border p-4" data-testid="company-header">
      <BackLink asChild><a href="#headers">Back to companies</a></BackLink>
      <PageHeader title="Example research company" eyebrow="Company" status={<Badge variant="outline">Active</Badge>}
        description="View the relationship, people and operational context."
        actions={<ActionMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Example company actions">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Edit example company</DropdownMenuItem><DropdownMenuItem>View example history</DropdownMenuItem></DropdownMenuContent></ActionMenu>} />
    </div>
    <div className="space-y-5 rounded-lg border p-4" data-testid="assembly-header">
      <BackLink asChild><a href="#headers">Back to sequencing assembly</a></BackLink>
      <PageHeader title="EXAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789 · Run 1" eyebrow="Sequencing assembly" status={<Badge variant="outline">Simulation completed</Badge>}
        description="Assembly attempt · example processing recipe 0.1.0" actions={<Button>Repeat example assembly</Button>} />
    </div>
  </div>
}
