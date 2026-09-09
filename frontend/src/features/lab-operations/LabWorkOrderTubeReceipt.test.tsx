import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LabWorkOrderPage } from './LabWorkOrderPage'
const mocks = vi.hoisted(() => ({ work: vi.fn(), dashboard: vi.fn(), packet: vi.fn(), tube: vi.fn(), receive: vi.fn(), accession: vi.fn() }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabWorkOrder: mocks.work, getLabOperationsDashboard: mocks.dashboard, receiveLabSpecimen: mocks.receive, accessionLabSpecimen: mocks.accession }))
vi.mock('#/api/sample-shipping', () => ({ scanSampleShippingPacket: mocks.packet, scanRegisteredSampleTube: mocks.tube }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), Link: ({children}:{children:ReactNode}) => <a href="#lab">{children}</a> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider:'clerk',session:{capabilities:{canManageLabOperations:true,canOperateLabWork:true}} }) }))
const specimen = { id:'specimen-1', submittedSpecimenId:'submitted-1', accessionNumber:'ACC-1', receivedAtUtc:'2026-09-07T10:00:00Z', intakeDisposition:'Received', receiptCondition:'Intact', intakeReasonCode:null, currentLocation:'Freezer A',version:3 }
const detail = {workOrder:{id:'work-1',commercialOrderNumber:'JOB-1',serviceKey:'pseq-lab-service',status:'Processing',version:4,labServiceWorkflowVersionId:null},specimens:[specimen],containers:[],executions:[],libraries:[],exceptions:[],scientificApprovals:[]}
beforeEach(()=>{vi.clearAllMocks();mocks.work.mockResolvedValue(detail);mocks.dashboard.mockResolvedValue({serviceWorkflows:[],materialLots:[],equipment:[],roleAssignments:[]});mocks.packet.mockResolvedValue({labWorkOrderId:'work-1',isVoided:false,packetNumber:'PACKET-1',crosswalk:[{submittedSpecimenId:'submitted-1',customerSampleId:'RNA-1',supplierTubeBarcode:'TUBE-2',tubeCount:1,totalSampleTubeCount:2,receivedTubeCount:1,quantity:1,quantityUnit:'tubes'}]});mocks.tube.mockResolvedValue({isExpected:true,isAccessioned:false,isReceived:false,supplierTubeBarcode:'TUBE-2'});mocks.receive.mockResolvedValue(detail)})
function show(){ const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});const invalidate=vi.spyOn(client,'invalidateQueries');render(<QueryClientProvider client={client}><LabWorkOrderPage workOrderId="work-1" packetBarcode="PACKET-1" supplierTubeBarcode="TUBE-2"/></QueryClientProvider>);return invalidate }
describe('physical tube receipt within split samples',()=>{
  it('records a later tube receipt even when the specimen already has a first-receipt timestamp',async()=>{
    const invalidate=show()
    fireEvent.click(await screen.findByRole('button',{name:/^Record receipt$/}))
    expect(screen.getByText('1 of 2 tubes received for this sample across all shipments.')).toBeTruthy()
    const dialog=screen.getByRole('dialog',{name:'Receipt'})
    fireEvent.change(within(dialog).getByLabelText(/Receipt condition/),{target:{value:'Second tube intact'}})
    fireEvent.click(within(dialog).getByRole('button',{name:/^Save$/}))
    await waitFor(()=>expect(mocks.receive).toHaveBeenCalledWith('work-1','specimen-1',expect.objectContaining({sampleShippingPacketBarcode:'PACKET-1',supplierTubeBarcode:'TUBE-2',receiptCondition:'Second tube intact',version:3})))
    await waitFor(()=>expect(invalidate).toHaveBeenCalledWith({queryKey:['lab-receipt-context','PACKET-1']}))
    expect(invalidate).toHaveBeenCalledWith({queryKey:['lab-tube-context','PACKET-1','TUBE-2']})
  })
  it('offers accession only when the scanned physical tube itself is received',async()=>{
    mocks.tube.mockResolvedValue({isExpected:true,isAccessioned:false,isReceived:true,supplierTubeBarcode:'TUBE-2'})
    show()
    expect(await screen.findByRole('button',{name:/^Confirm accession$/})).toBeTruthy()
    expect(screen.queryByRole('button',{name:/^Record receipt$/})).toBeNull()
  })
})
