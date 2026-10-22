import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { accessTones } from '#/features/organizations/access-status'
import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Send, UserPlus } from 'lucide-react'

import { mockInvites } from './dashboard-data'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function InvitePanel() {
  return (
    <Card className="surface-motion">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Invite preview</CardTitle>
          <Badge variant="outline">Mock data</Badge>
        </div>
        <CardDescription>
          UI-only invite setup for reviewing fields, roles, and draft states.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3">
          <PortalField >
            <Label htmlFor="mock-email">Email address</Label>
            <Input
              id="mock-email"
              readOnly
              value="new.admin@northline.example"
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="mock-role">Access role</Label>
            <NativeSelect
              id="mock-role"

              value="Organization Admin"
              aria-label="Mock access role"
              onChange={() => undefined}
            >
              <option>Organization Admin</option>
              <option>Member</option>
            </NativeSelect>
          </PortalField>
          <Button type="button" variant="secondary" className="w-full">
            <Send data-icon="inline-start" />
            Preview invite
          </Button>
        </div>

        <div className="space-y-3">
          {mockInvites.map((invite) => (
            <div
              key={invite.email}
              className="flex items-start gap-3 rounded-lg border bg-background p-3"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserPlus aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-medium">{invite.email}</p>
                <p className="m-0 text-xs text-muted-foreground">
                  {invite.role} - {invite.organization}
                </p>
              </div>
              <DomainStatusBadge status={invite.state} tones={accessTones}>{invite.state}</DomainStatusBadge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
