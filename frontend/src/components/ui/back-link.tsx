import { Children, cloneElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Slot } from 'radix-ui'

/** Page return navigation. Use asChild with a typed router Link or an anchor. */
export function BackLink({ asChild = false, children, ...props }: Omit<ComponentProps<'button'>, 'className' | 'style'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  const child = asChild ? Children.only(children) as ReactElement<{ children?: ReactNode }> : null
  const content = <>
    <ArrowLeft aria-hidden="true" className="mt-px size-3.5" />
    <span className="min-w-0 wrap-anywhere">{child ? child.props.children : children}</span>
  </>

  return (
    <Comp
      type={asChild ? undefined : 'button'}
      {...props}
      data-slot="back-link"
      className="inline-flex min-h-7 w-fit max-w-full cursor-pointer items-start gap-1 rounded-md border border-transparent px-1.5 py-1 text-left text-[0.8rem] font-medium leading-4 text-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-default aria-disabled:opacity-50 motion-safe:transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0"
    >
      {child ? cloneElement(child, undefined, content) : content}
    </Comp>
  )
}
