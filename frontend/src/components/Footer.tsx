export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t px-4 pb-6 pt-6 text-muted-foreground">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} Phaeno Portal</p>
        <p className="m-0 text-sm">TanStack Start, Query, Shadcn, Axios</p>
      </div>
    </footer>
  )
}
