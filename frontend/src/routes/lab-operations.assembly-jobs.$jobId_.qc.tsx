import { createFileRoute } from '@tanstack/react-router'
import { AssemblyQcPage } from '#/features/lab-operations/AssemblyQcPage'
export const Route = createFileRoute('/lab-operations/assembly-jobs/$jobId_/qc')({ component: QcRoute })
function QcRoute() { const { jobId } = Route.useParams(); return <AssemblyQcPage jobId={jobId} /> }
