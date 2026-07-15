import type { ComponentProps, ElementType } from 'react'

import { cn } from '#/lib/utils'

export const documentationMdxComponents: Record<string, ElementType> = {
  a: DocumentationLink,
  blockquote: DocumentationNote,
  table: DocumentationTable,
}

function DocumentationLink({
  className,
  children,
  ...props
}: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'rounded-sm font-medium underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

function DocumentationNote({
  className,
  ...props
}: ComponentProps<'blockquote'>) {
  return (
    <blockquote
      className={cn(
        'rounded-r-lg border-l-4 border-primary bg-muted/50 px-4 py-3 not-italic',
        className,
      )}
      {...props}
    />
  )
}

function DocumentationTable({
  className,
  ...props
}: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className={cn('m-0 min-w-full', className)} {...props} />
    </div>
  )
}
