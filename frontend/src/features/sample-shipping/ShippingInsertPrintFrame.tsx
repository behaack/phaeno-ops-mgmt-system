import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { SampleShippingPacketPage } from './SampleShippingPacketPage'
import type { ShippingInsertIdentity } from './shipping-insert-acknowledgement'

const frameDocument = '<!doctype html><html><head><meta charset="utf-8"><title>Shipping insert</title></head><body></body></html>'

export function ShippingInsertPrintFrame({ shipmentId, onFinished, onFailure }: { shipmentId: string; onFinished: (insert: ShippingInsertIdentity) => void; onFailure: (message: string) => void }) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const stylesReady = useRef<Promise<unknown>>(Promise.resolve())
  const active = useRef(true)
  const printing = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    active.current = true
    timeout.current = setTimeout(() => {
      if (active.current && !printing.current) onFailure('The shipping insert could not be prepared. Check your connection and try again.')
    }, 20_000)
    return () => { active.current = false; clearTimeout(timeout.current) }
  }, [onFailure])

  const prepareFrame = () => {
    const target = iframe.current?.contentDocument
    if (!target) { onFailure('The print window could not be prepared. Try again.'); return }
    target.documentElement.className = document.documentElement.className
    target.documentElement.lang = document.documentElement.lang
    const pendingStyles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map(source => {
      const copy = source.cloneNode(true) as HTMLElement
      const ready = copy instanceof HTMLLinkElement
        ? new Promise<void>((resolve, reject) => {
          copy.onload = () => resolve()
          copy.onerror = () => reject(new Error('The shipping insert formatting could not be loaded. Try again.'))
        })
        : Promise.resolve()
      target.head.append(copy)
      return ready
    })
    stylesReady.current = Promise.all(pendingStyles)
    void stylesReady.current.catch(() => undefined)
    setBody(target.body)
  }

  const print = useCallback((insert: ShippingInsertIdentity) => {
    void (async () => {
      const target = iframe.current?.contentWindow
      const targetDocument = iframe.current?.contentDocument
      if (!target || !targetDocument) return
      try {
        await stylesReady.current
        await targetDocument.fonts?.ready
        await Promise.all([...targetDocument.images].map(image => image.decode()))
        if (!active.current) return
        const renderedInsert = targetDocument.querySelector<HTMLElement>('.shipping-packet')
        if (renderedInsert?.dataset.packetId !== insert.id || renderedInsert.dataset.packetRevision !== String(insert.revision)) throw new Error('The shipping insert changed while it was being prepared. Try again to check its current revision.')
        printing.current = true
        clearTimeout(timeout.current)
        target.addEventListener('afterprint', () => { if (active.current) onFinished(insert) }, { once: true })
        target.focus()
        target.print()
      } catch (error) {
        if (active.current) onFailure(error instanceof Error ? error.message : 'The shipping insert could not be printed. Try again.')
      }
    })()
  }, [onFailure, onFinished])

  return <>
    {/* Remove the portal before its iframe, whose removal disposes the target document. */}
    {body ? createPortal(<SampleShippingPacketPage shipmentId={shipmentId} autoPrint embedded onAutoPrint={print} onFailure={onFailure} />, body) : null}
    <iframe ref={iframe} title="Shipping insert print document" aria-hidden="true" tabIndex={-1} srcDoc={frameDocument} onLoad={prepareFrame} className="pointer-events-none fixed top-0 -left-[10000px] h-[1056px] w-[816px] border-0" />
  </>
}
