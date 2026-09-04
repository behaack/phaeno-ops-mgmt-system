import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { Alert } from "#/components/ui/alert"
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
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg outline-none [--dialog-inset:1rem] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
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

type DialogRegion = "header" | "feedback" | "footer"
type DialogRegionComponent = React.ElementType & {
  dialogRegion?: DialogRegion
  dialogRegionContainer?: DialogRegion
}

function dialogRegion(child: React.ReactNode): DialogRegion | undefined {
  if (!React.isValidElement(child)) return undefined
  if (
    child.type === Alert
    && (child.props as React.ComponentProps<typeof Alert>).variant === "destructive"
  ) {
    return "feedback"
  }
  return (child.type as DialogRegionComponent).dialogRegion
}

function splitDialogChildren(children: React.ReactNode) {
  const header: React.ReactNode[] = []
  const feedback: React.ReactNode[] = []
  const body: React.ReactNode[] = []
  const footer: React.ReactNode[] = []

  for (const child of React.Children.toArray(children)) {
    const region = dialogRegion(child)
    if (region === "header") header.push(child)
    else if (region === "feedback") feedback.push(child)
    else if (region === "footer") footer.push(child)
    else body.push(child)
  }

  return { header, feedback, body, footer }
}

function scrollableDialogBody(children: React.ReactNode, key: string) {
  return (
    <div
      key={key}
      data-slot="dialog-body"
      className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-[var(--dialog-inset)]"
    >
      {children}
    </div>
  )
}

function fixedDialogHeader(
  children: React.ReactNode[],
  feedback: React.ReactNode[],
  key: string,
) {
  if (children.length === 0 && feedback.length === 0) return []
  const keyedFeedback = feedback.map((child, index) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { key: `${key}-feedback-${index}` })
      : <React.Fragment key={`${key}-feedback-${index}`}>{child}</React.Fragment>,
  )
  if (
    children.length === 1
    && React.isValidElement(children[0])
    && (
      children[0].type === DialogHeader
      || (children[0].type as DialogRegionComponent).dialogRegionContainer === "header"
    )
  ) {
    const header = children[0] as React.ReactElement<React.ComponentProps<typeof DialogHeader>>
    return [React.cloneElement(
      header,
      { key },
      ...React.Children.toArray(header.props.children),
      ...keyedFeedback,
    )]
  }

  return [<DialogHeader key={key}>{children}{keyedFeedback}</DialogHeader>]
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
    return childRegions.header.length > 0
      || childRegions.feedback.length > 0
      || childRegions.footer.length > 0
      ? [{ form: child, regions: childRegions }]
      : []
  })

  if (formsWithRegions.length === 1) {
    const { form, regions: formRegions } = formsWithRegions[0]
    const formHeader = fixedDialogHeader(
      formRegions.header,
      formRegions.feedback,
      "dialog-form-header",
    )
    const scrollingChildren = regions.body.flatMap((child) =>
      child === form ? formRegions.body : [child],
    )
    const arrangedForm = React.cloneElement(
      form,
      {
        className: cn(
          form.props.className,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
        ),
      },
      ...formHeader,
      scrollableDialogBody(scrollingChildren, "dialog-form-body"),
      ...formRegions.footer,
    )

    return [
      ...fixedDialogHeader(regions.header, regions.feedback, "dialog-header"),
      arrangedForm,
      ...regions.footer,
    ]
  }

  return [
    ...fixedDialogHeader(regions.header, regions.feedback, "dialog-header"),
    ...(regions.body.length > 0
      ? [scrollableDialogBody(regions.body, "dialog-body")]
      : []),
    ...regions.footer,
  ]
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 flex-col gap-1.5 border-b bg-muted/40 px-[var(--dialog-inset)] py-4 pr-12",
        className,
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/40 px-[var(--dialog-inset)] py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function DialogFeedback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-feedback"
      className={cn("mt-2 shrink-0", className)}
      {...props}
    />
  )
}

DialogHeader.dialogRegion = "header" as const
DialogHeader.dialogRegionContainer = "header" as const
DialogFeedback.dialogRegion = "feedback" as const
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
  DialogFeedback,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
