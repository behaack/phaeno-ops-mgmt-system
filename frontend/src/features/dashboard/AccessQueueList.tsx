type AccessQueueListProps = {
  items: readonly string[]
}

export function AccessQueueList({ items }: AccessQueueListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="surface-motion flex items-start gap-3 rounded-lg border bg-background p-3"
        >
          <span className="mt-1 size-2 rounded-full bg-[var(--status-ready)]" />
          <p className="m-0 text-sm leading-6">{item}</p>
        </div>
      ))}
    </div>
  )
}
