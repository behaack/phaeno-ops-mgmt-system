import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { listOrganizations } from '#/api/data-provisioning'
import { getOrderErrorMessage, saveCommercialProfile, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const schema = z.object({ organizationId: z.string().uuid('Select an organization.'), qboCustomerId: z.string().trim().max(255), labCreditApproved: z.boolean(), assemblyCreditApproved: z.boolean() })
type Values = z.infer<typeof schema>
type Profile = OrderConfiguration['commercialProfiles'][number]
const empty: Values = { organizationId: '', qboCustomerId: '', labCreditApproved: false, assemblyCreditApproved: false }

export function CommercialConfigurationPanel({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: listOrganizations })
  const [editing, setEditing] = useState<Profile | null | undefined>(undefined)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty })
  const mutation = useMutation({ mutationFn: (values: Values) => saveCommercialProfile({ ...values, qboCustomerId: values.qboCustomerId || null, version: editing?.version }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['order-configuration'] }); setEditing(undefined); form.reset(empty) } })
  function open(profile: Profile | null) { setEditing(profile); form.reset(profile ? { organizationId: profile.organizationId, qboCustomerId: profile.qboCustomerId ?? '', labCreditApproved: profile.labCreditApproved, assemblyCreditApproved: profile.assemblyCreditApproved } : empty) }
  return <><Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Credit and QuickBooks customers</CardTitle><CardDescription>Credit is approved independently for lab and assembly work. Without credit, releasable results remain held until QuickBooks reports the invoice paid.</CardDescription></div><Button type="button" onClick={() => open(null)}><Plus data-icon="inline-start" />Add profile</Button></div></CardHeader><CardContent><div className="divide-y">{configuration.commercialProfiles.map((profile) => <button type="button" key={profile.id} onClick={() => open(profile)} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><div><span className="font-medium">{profile.organizationName}</span><span className="mt-1 block text-xs text-muted-foreground">QuickBooks customer {profile.qboCustomerId ?? 'not linked'}</span></div><div className="flex flex-wrap gap-2"><Badge variant={profile.labCreditApproved ? 'secondary' : 'outline'}>Lab {profile.labCreditApproved ? 'Net 30' : 'prepay'}</Badge><Badge variant={profile.assemblyCreditApproved ? 'secondary' : 'outline'}>Assembly {profile.assemblyCreditApproved ? 'Net 30' : 'prepay'}</Badge></div></button>)}</div>{!configuration.commercialProfiles.length ? <p className="py-8 text-center text-sm text-muted-foreground">No commercial profiles configured.</p> : null}</CardContent></Card>
    <Dialog open={editing !== undefined} onOpenChange={(openState) => !openState && setEditing(undefined)}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit commercial profile' : 'Add commercial profile'}</DialogTitle><DialogDescription>Net 30 applies when credit is approved. Reagent orders always require a Partner purchase order and invoice by shipment.</DialogDescription></DialogHeader><form id="commercial-config-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-5"><div><Label htmlFor="commercialOrganization">Organization *</Label><select id="commercialOrganization" {...form.register('organizationId')} disabled={Boolean(editing)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select organization</option>{(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({organization.kind})</option>)}</select></div><div><Label htmlFor="commercialQbo">QuickBooks customer ID</Label><Input id="commercialQbo" className="mt-2" {...form.register('qboCustomerId')} /></div><div className="flex items-center gap-2"><Checkbox id="labCreditApproved" checked={form.watch('labCreditApproved')} onCheckedChange={(value) => form.setValue('labCreditApproved', value === true, { shouldDirty: true })} /><Label htmlFor="labCreditApproved" className="cursor-pointer font-normal">Approve lab-service credit (Net 30)</Label></div><div className="flex items-center gap-2"><Checkbox id="assemblyCreditApproved" checked={form.watch('assemblyCreditApproved')} onCheckedChange={(value) => form.setValue('assemblyCreditApproved', value === true, { shouldDirty: true })} /><Label htmlFor="assemblyCreditApproved" className="cursor-pointer font-normal">Approve data-assembly credit (Net 30)</Label></div></form>{mutation.error ? <Alert variant="destructive"><AlertTitle>Commercial profile was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the QuickBooks mapping and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="commercial-config-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save profile'}</Button></DialogFooter></DialogContent></Dialog></>
}
