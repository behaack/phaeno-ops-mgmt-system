import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "#/lib/utils"

function Dialog({
  modal = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" modal={modal} {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  children,
  className,
  onInteractOutside,
  onPointerDownOutside,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const arrangedChildren = arrangeDialogChildren(children)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(event) => {
          onInteractOutside?.(event)
          event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          event.preventDefault()
        }}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
          "overflow-hidden",
        )}
        {...props}
      >
        {arrangedChildren}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Close"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

type DialogRegion = "header" | "footer"
type DialogRegionComponent = React.ElementType & {
  dialogRegion?: DialogRegion
}

function dialogRegion(child: React.ReactNode): DialogRegion | undefined {
  if (!React.isValidElement(child)) return undefined
  return (child.type as DialogRegionComponent).dialogRegion
}

function splitDialogChildren(children: React.ReactNode) {
  const header: React.ReactNode[] = []
  const body: React.ReactNode[] = []
  const footer: React.ReactNode[] = []

  for (const child of React.Children.toArray(children)) {
    const region = dialogRegion(child)
    if (region === "header") header.push(child)
    else if (region === "footer") footer.push(child)
    else body.push(child)
  }

  return { header, body, footer }
}

function scrollableDialogBody(children: React.ReactNode, key: string) {
  return (
    <div
      key={key}
      data-slot="dialog-body"
      className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain"
    >
      {children}
    </div>
  )
}

function arrangeDialogChildren(children: React.ReactNode) {
  const regions = splitDialogChildren(children)
  const formsWithRegions = regions.body.flatMap((child) => {
    if (
      !React.isValidElement<React.ComponentProps<"form">>(child) ||
      child.type !== "form"
    ) {
      return []
    }

    const childRegions = splitDialogChildren(child.props.children)
    return childRegions.header.length > 0 || childRegions.footer.length > 0
      ? [{ form: child, regions: childRegions }]
      : []
  })

  if (formsWithRegions.length === 1) {
    const { form, regions: formRegions } = formsWithRegions[0]
    const scrollingChildren = regions.body.flatMap((child) =>
      child === form ? formRegions.body : [child],
    )
    const arrangedForm = React.cloneElement(
      form,
      {
        className: cn(
          form.props.className,
          "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden",
        ),
      },
      ...formRegions.header,
      scrollableDialogBody(scrollingChildren, "dialog-form-body"),
      ...formRegions.footer,
    )

    return [...regions.header, arrangedForm, ...regions.footer]
  }

  return [
    ...regions.header,
    scrollableDialogBody(regions.body, "dialog-body"),
    ...regions.footer,
  ]
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

DialogHeader.dialogRegion = "header" as const
DialogFooter.dialogRegion = "footer" as const

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

DialogTitle.dialogRegion = "header" as const
DialogDescription.dialogRegion = "header" as const

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
