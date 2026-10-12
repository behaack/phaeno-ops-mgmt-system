import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t px-4 pb-6 pt-6 text-muted-foreground">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm"><CustomerSourceText source={"Copyright ©"} /> {year} <CustomerSourceText source={"Phaeno Inc."} /></p>
        <p className="m-0 text-sm"><a href="/docs" className="text-primary underline underline-offset-4"><CustomerSourceText source={"Help and documentation"} /></a></p>
      </div>
    </footer>
  )
}
