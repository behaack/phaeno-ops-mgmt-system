import { Badge } from '#/components/ui/badge'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'

export function OrderingAuthorizationField({
  checked,
  disabled = false,
  id,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  id: string
  onCheckedChange: (checked: boolean) => void
}) {
  const descriptionId = `${id}-description`

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={id} className="cursor-pointer">
              Ordering authorized
            </Label>
            <Badge variant={checked ? 'secondary' : 'outline'}>
              {checked ? 'On' : 'Off'}
            </Badge>
          </div>
          <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
            When on, account creation adds a ready PSeq Lab Service entitlement.
            Turn off to create the account without ordering access.
          </p>
        </div>
      </div>
    </div>
  )
}
