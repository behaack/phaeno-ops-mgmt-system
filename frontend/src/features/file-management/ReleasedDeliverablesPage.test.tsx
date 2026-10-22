import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ReleasedDeliverablesPage } from './ReleasedDeliverablesPage'

const mocks=vi.hoisted(()=>({navigate:vi.fn(),list:vi.fn(),refetch:vi.fn(),permitted:true,options:undefined as undefined|{enabled:boolean;queryFn:()=>Promise<unknown>},query:{data:undefined as undefined|Array<{id:string;workflowNumber:string;packageType:string;sampleName:null;releasedAtUtc:string;organizationName:string;byteDeletedAtUtc:null;isQuarantined:boolean;downloadAccessClosedAtUtc:null}>,isPending:false,isFetching:false,error:null as unknown}}))
vi.mock('@tanstack/react-query',()=>({useQuery:(options:typeof mocks.options)=>{mocks.options=options;return {...mocks.query,refetch:mocks.refetch}}}))
vi.mock('@tanstack/react-router',()=>({useNavigate:()=>mocks.navigate,Link:({children,to}:{children:ReactNode;to:string})=><a href={to}>{children}</a>}))
vi.mock('#/api/released-deliverables',()=>({listRetainedReleases:mocks.list}))
vi.mock('#/features/auth/session-context',()=>({usePhaenoSession:()=>({session:{capabilities:{canManageFileManagementConfiguration:mocks.permitted}},authProvider:'clerk'})}))
beforeEach(()=>{vi.clearAllMocks();mocks.permitted=true;mocks.query={data:undefined,isPending:false,isFetching:false,error:null}})

it('preserves the API offset, URL search and zero-based page without inventing a total',async()=>{
  mocks.query.data=Array.from({length:50},(_,i)=>({id:String(i),workflowNumber:`PKG-${i}`,packageType:'Result',sampleName:null,releasedAtUtc:'2026-10-22T00:00:00Z',organizationName:'Fictional Company',byteDeletedAtUtc:null,isQuarantined:false,downloadAccessClosedAtUtc:null}))
  render(<ReleasedDeliverablesPage q="Company" page={2} />)
  await mocks.options!.queryFn();expect(mocks.list).toHaveBeenCalledWith('Company',100)
  const nav=screen.getByRole('navigation',{name:'Released package pages'});expect(nav.textContent).toContain('Page 3');expect(nav.textContent).not.toMatch(/of|records/)
  fireEvent.click(within(nav).getByRole('button',{name:'Next'}));expect(mocks.navigate).toHaveBeenLastCalledWith({to:'/released-deliverables',search:{q:'Company',page:3}})
  fireEvent.click(within(nav).getByRole('button',{name:'Previous'}));expect(mocks.navigate).toHaveBeenLastCalledWith({to:'/released-deliverables',search:{q:'Company',page:1}})
})
it('keeps failed reads distinct from an empty page and retries the same query',()=>{
  mocks.query.error=new Error('Unavailable');render(<ReleasedDeliverablesPage q="" page={0} />)
  expect(screen.getByText('Released packages could not be loaded')).toBeTruthy();expect(screen.queryByText('No retained releases yet.')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(mocks.refetch).toHaveBeenCalledOnce()
})
it('preserves the administrator gate and prevents unauthorized reads',()=>{
  mocks.permitted=false;render(<ReleasedDeliverablesPage q="" page={0} />)
  expect(mocks.options!.enabled).toBe(false);expect(screen.getByText('A Phaeno administrator is required.').closest('[data-kind="permission"]')).not.toBeNull();expect(screen.queryByRole('navigation')).toBeNull()
})
