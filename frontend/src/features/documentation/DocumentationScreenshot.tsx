import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils'
import { documentationScreenshots } from './documentation-screenshots'

// Phrasing elements keep standalone Markdown images valid inside MDX paragraphs.
export function DocumentationScreenshot({ src, alt, title, className, ...props }: ComponentProps<'img'>) {
  const screenshot = typeof src === 'string' && Object.hasOwn(documentationScreenshots, src)
    ? documentationScreenshots[src] : undefined
  return <span className="not-prose my-5 block max-w-full">
    <span className="relative inline-block max-w-full overflow-hidden rounded-lg border align-top">
      <img {...props} src={src} alt={alt} title={title} loading="lazy" decoding="async"
        width={screenshot?.width} height={screenshot?.height}
        className={cn('m-0 block h-auto max-w-full', className)} />
      {screenshot?.points.map(point => <span key={point.number} aria-hidden="true"
        className="pointer-events-none absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md ring-2 ring-background"
        style={{ left: `clamp(1rem, ${point.x}%, calc(100% - 1rem))`, top: `clamp(1rem, ${point.y}%, calc(100% - 1rem))` }}>{point.number}</span>)}
    </span>
    {title ? <span className="mt-2 block text-sm text-muted-foreground">{title}</span> : null}
  </span>
}
