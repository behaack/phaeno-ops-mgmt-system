import { useState } from 'react'
import { Check, ClipboardList, FlaskConical } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '#/components/ui/content-state'
import { FileUploadProgress } from '#/components/ui/file-upload-progress'
import { WorkflowProgress } from '#/components/ui/workflow-progress'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

export function FeedbackExamples() {
  const [failed,setFailed]=useState(true)
  return <div className="space-y-6">
    <LoadingState label="Loading example records…" />
    <div className="rounded-lg border p-4"><p className="text-sm">Previously loaded example stays visible.</p><LoadingState label="Refreshing example records…" refreshing /></div>
    <div className="grid gap-4 @min-[40rem]:grid-cols-2">
      <EmptyState title="No example records yet">Create a record to begin.</EmptyState>
      <EmptyState kind="no-results" title="No matching example records">Adjust the search or clear the filters.</EmptyState>
      <EmptyState kind="setup" title="Example setup required">Choose an approved workflow before starting work.</EmptyState>
      <EmptyState kind="permission" title="Example access required">Ask an authorized administrator to review your access.</EmptyState>
    </div>
    {failed?<ErrorState title="Example records could not be refreshed" onRetry={()=>setFailed(false)} retryLabel="Retry example records">Your current selection is retained.</ErrorState>:<><p role="status" className="text-sm">Example records recovered.</p><Button variant="outline" onClick={()=>setFailed(true)}>Show example error again</Button></>}
    <div className="space-y-4 rounded-lg border p-4"><p className="text-sm font-medium">Measured transfer and unmeasured verification are distinct</p>
      <FileUploadProgress progress={{fileName:'example.fastq.gz',phase:'uploading',transferredBytes:512,totalBytes:1024,percentage:50,message:'Uploading example file'}} />
      <FileUploadProgress progress={{fileName:'example.zip',phase:'verifying',transferredBytes:1024,totalBytes:1024,message:'Verifying example files'}} />
      <FileUploadProgress progress={{fileName:'example-complete.zip',phase:'complete',transferredBytes:1024,totalBytes:1024,percentage:100,message:'Example transfer complete'}} />
      <div className="space-y-1"><Badge variant="outline">Transfer complete</Badge><p className="text-sm text-muted-foreground">Scientific review is a separate step.</p></div>
    </div>
    <WorkflowProgress label="Example processing stages" steps={[{id:'receive',label:'Receive example',icon:ClipboardList,complete:true},{id:'process',label:'Process example',icon:FlaskConical,complete:false,current:true,status:'In progress',metric:'1 of 2 inputs verified'},{id:'review',label:'Review evidence',icon:Check,complete:false,status:'Awaiting review'}]} />
  </div>
}
