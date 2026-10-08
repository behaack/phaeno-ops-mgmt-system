import { createFileRoute } from '@tanstack/react-router'
import { AssemblyJobPage } from '#/features/lab-operations/AssemblyJobs'

export const Route = createFileRoute('/lab-operations/assembly-jobs/$jobId')({ component: AssemblyRoute })
function AssemblyRoute() { return <AssemblyJobPage jobId={Route.useParams().jobId} /> }
