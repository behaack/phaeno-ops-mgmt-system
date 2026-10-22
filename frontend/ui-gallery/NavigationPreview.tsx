import { useEffect, useId, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { BookOpenText, CircleDollarSign, ClipboardList, FlaskConical, Handshake, LayoutDashboard, Settings } from 'lucide-react'
import { MainNavigation } from '#/components/MainMenu'
import { MobileUserMenu } from '#/components/MobileUserMenu'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { BackLink } from '#/components/ui/back-link'
import { PageHeader } from '#/components/ui/page-header'
import { EmptyState } from '#/components/ui/content-state'
import type { ThemeMode } from '#/components/theme-mode'
import { WorkBellButton } from '#/features/work-attention/WorkBellButton'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

const workspaceItems=[{label:'Dashboard',to:'/',icon:LayoutDashboard,exact:true},{label:'Lab ops',to:'/lab-operations',icon:FlaskConical},{label:'CRM',to:'/crm',icon:Handshake}].map(item=>({...item,group:'workspace' as const}))
const moreItems=[{label:'Finance',to:'/finance',icon:CircleDollarSign,group:'more' as const}]
const settingsItems=[{label:'Lab settings',to:'/lab-settings',icon:Settings,group:'administration' as const}]
const resourceItems=[{label:'Documentation',to:'/docs',icon:BookOpenText,group:'resources' as const}]
const sections=[{value:'inputs',label:'Sequencing inputs',description:'Verified inputs and exact sample context',icon:ClipboardList},{value:'jobs',label:'Sequencing assembly',description:'Saved progress and execution evidence',icon:FlaskConical,group:'Sample processing'}]

/** The app's actual navigation components, supplied only fictional local props. */
export function NavigationPreview() {
  const [section,setSection]=useState('inputs')
  const [notificationsOpen,setNotificationsOpen]=useState(false)
  const bellId=useId()
  const pathname=useRouterState({select:state=>state.location.pathname})
  const currentPath=pathname==='/navigation-preview'?'/lab-operations':pathname
  const [mode,setMode]=useState<ThemeMode>(()=>new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light')
  useEffect(()=>{document.documentElement.classList.toggle('dark',mode==='dark');document.documentElement.style.colorScheme=mode==='dark'?'dark':'light'},[mode])
  return <div className="min-h-screen bg-background text-foreground">
    <header data-portal-header className="sticky top-0 z-50 flex min-h-[84px] flex-wrap items-center gap-3 border-b bg-background px-2 py-3 lg:px-4">
      <a href="/" className="mr-auto text-sm font-semibold no-underline">Phaeno · navigation example</a>
      <nav aria-label="Example primary navigation"><MainNavigation visibleMenuItems={workspaceItems} moreMenuItems={moreItems} pathname={currentPath} /></nav>
      <WorkBellButton id={bellId} count={3} label="Example notifications, 3 actions" aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(true)} />
      <MobileUserMenu user={null} authProvider="none" mode={mode} onModeChange={setMode} currentPath={currentPath} workspaceItems={workspaceItems} moreItems={moreItems} settingsItems={settingsItems} resourceItems={resourceItems} showUserManagement={false} />
    </header>
    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogContent onCloseAutoFocus={event=>{event.preventDefault();document.getElementById(bellId)?.focus()}}>
        <DialogHeader><DialogTitle>Example notifications</DialogTitle></DialogHeader>
        <div><DialogDescription>Three fictional actions demonstrate the header badge. No session or work feed is connected.</DialogDescription></div>
        <DialogFooter><Button variant="outline" onClick={()=>setNotificationsOpen(false)}>Close example notifications</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <WorkspaceSidebar workspaceLabel="Example laboratory" items={sections} value={section} onValueChange={setSection}>
      <main className="page-wrap space-y-5 px-4 py-8"><BackLink asChild><a href="/">Back to component gallery</a></BackLink>
        <PageHeader title={section==='inputs'?'Sequencing inputs':'Sequencing assembly'} description="Fictional navigation example using the same desktop, mobile and sidebar controls as the Portal." />
        <EmptyState title={section==='inputs'?'Example input list':'Example assembly list'}>No session or API is connected. Try the sidebar, More menu and narrow-screen user tray.</EmptyState>
      </main>
    </WorkspaceSidebar>
  </div>
}
