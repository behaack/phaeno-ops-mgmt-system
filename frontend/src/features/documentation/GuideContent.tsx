import { Component, Suspense, type ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { useCustomerText } from '#/features/customer-i18n/customer-text'

class GuideLoadBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function GuideContent({ children, identity, title }: { children: ReactNode; identity: string; title: string }) {
  const text = useCustomerText()
  const heading = <h1 className="text-3xl font-semibold">{title}</h1>
  return <GuideLoadBoundary key={identity} fallback={<div className="space-y-4">{heading}<Alert variant="destructive"><AlertDescription>
    <p>{text('guide_unavailable')}</p><Button variant="outline" onClick={() => window.location.reload()}>{text('guide_reload')}</Button>
  </AlertDescription></Alert></div>}><Suspense fallback={<div className="space-y-4">{heading}<p role="status">{text('guide_loading')}</p></div>}>{children}</Suspense></GuideLoadBoundary>
}
