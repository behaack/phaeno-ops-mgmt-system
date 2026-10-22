import { PageTitle } from '#/components/ui/page-header'
import { CustomerText } from '#/features/customer-i18n/customer-text'
import { Link } from '@tanstack/react-router'

export function SampleShippingSettingsHeader() {


  return <header className="mb-6">
    <PageTitle><CustomerText message="m_47bf3dab14cb" /></PageTitle>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"><CustomerText message="m_4fa90c9e4a78" /></p>
    <details className="mt-3 max-w-3xl rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium"><CustomerText message="m_a007f401a741" /></summary><ol className="mt-3 list-decimal space-y-2 pl-5">
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "sample-types" }}><CustomerText message="m_bd4e8f4f92d0" /></Link><CustomerText message="m_93dc94a296eb" /></li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "destinations" }}><CustomerText message="m_ebb6ab028a88" /></Link><CustomerText message="m_cd1da8dd2846" /></li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "procedures" }}><CustomerText message="m_818f11904b30" /></Link><CustomerText message="m_e6905475863e" /></li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "containers" }}><CustomerText message="m_79cda409e9a4" /></Link><CustomerText message="m_78c56adac3a2" /></li>
    </ol><p className="mt-3 text-muted-foreground"><CustomerText message="m_0616f45a73ba" /></p></details>
  </header>
}
