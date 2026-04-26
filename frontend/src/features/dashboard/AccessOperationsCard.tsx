import { accessQueues } from './dashboard-data'
import { AccessQueueList } from './AccessQueueList'
import { TenantTypeGrid } from './TenantTypeGrid'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

export function AccessOperationsCard() {
  return (
    <Card className="surface-motion">
      <CardHeader>
        <CardTitle>Access operations</CardTitle>
        <CardDescription>
          Starting points for RBAC, onboarding, and security workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="onboarding">
          <TabsList>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          {Object.entries(accessQueues).map(([key, items]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <AccessQueueList items={items} />
            </TabsContent>
          ))}
        </Tabs>
        <Separator className="my-5" />
        <TenantTypeGrid />
      </CardContent>
    </Card>
  )
}
