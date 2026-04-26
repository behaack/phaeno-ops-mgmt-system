import { tenantTypes } from './dashboard-data'

export function TenantTypeGrid() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      {tenantTypes.map((tenantType) => (
        <div key={tenantType.label}>
          <p className="font-medium">{tenantType.label}</p>
          <p className="text-muted-foreground">{tenantType.description}</p>
        </div>
      ))}
    </div>
  )
}
