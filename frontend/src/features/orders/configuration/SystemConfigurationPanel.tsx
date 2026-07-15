import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage, updateOrderSystemConfiguration, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const schema = z.object({ quoteValidityDays: z.coerce.number().int().min(1).max(365), sampleSubmissionInstructions: z.string().max(8000), shippingConfigurationJson: z.string().refine(isJson, 'Shipping configuration must be valid JSON.') })
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>

export function SystemConfigurationPanel({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), values: { quoteValidityDays: configuration.system.quoteValidityDays, sampleSubmissionInstructions: configuration.system.sampleSubmissionInstructions, shippingConfigurationJson: configuration.system.shippingConfigurationJson } })
  const mutation = useMutation({ mutationFn: (values: Values) => updateOrderSystemConfiguration({ ...configuration.system, ...values }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['order-configuration'] }); form.reset(form.getValues()) } })
  return <Card><CardHeader><CardTitle>Global order defaults</CardTitle><CardDescription>Quotes default to 30 calendar days unless overridden. Sample instructions are snapshotted into each new Customer request.</CardDescription></CardHeader><CardContent><form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-5"><div><Label htmlFor="quoteValidityDays">Default quote validity (days) <Required /></Label><Input id="quoteValidityDays" type="number" className="mt-2 max-w-40" {...form.register('quoteValidityDays')} /><ErrorText message={form.formState.errors.quoteValidityDays?.message} /></div><div><Label htmlFor="sampleSubmissionInstructions">Sample submission instructions</Label><textarea id="sampleSubmissionInstructions" {...form.register('sampleSubmissionInstructions')} className="mt-2 min-h-40 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><div><Label htmlFor="shippingConfigurationJson">Partner shipping restrictions (JSON)</Label><textarea id="shippingConfigurationJson" {...form.register('shippingConfigurationJson')} className="mt-2 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /><ErrorText message={form.formState.errors.shippingConfigurationJson?.message} /></div>{mutation.error ? <Alert variant="destructive"><AlertTitle>Defaults were not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}<div className="flex justify-end"><Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save defaults'}</Button></div></form></CardContent></Card>
}

function isJson(value: string) { try { JSON.parse(value); return true } catch { return false } }
function Required() { return <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> }
function ErrorText({ message }: { message?: string }) { return message ? <p role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
