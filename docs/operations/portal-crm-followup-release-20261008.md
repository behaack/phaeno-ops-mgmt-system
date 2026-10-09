# Company Contact follow-up — released October 8, 2026

The Owner-authorized API and Portal UI deployment is complete. Both run
application source [c10c622e](https://github.com/behaack/phaeno-ops-mgmt-system/commit/c10c622e5768cd1a3640161b2fb1e1fc7bb32b56)
from `codex/recover-october6` at the established hosted-test Portal endpoints.

Company People now lets staff create a missing Contact from a successful empty
association search, retaining job title, relationship role, primary designation
and effective date. The API saves the new Contact and its Company association
together. Creation grants no Portal access. Edited drafts show a Portal discard
confirmation; Keep editing retains the values and Discard changes returns focus
to the invoking action. The original billing scrolling, tax controls and fixed
Save action remain available.

Source lint, TypeScript, API/UI builds and generated documentation checks pass.
The hosted preview renders sign-in, the Production UI is Ready, and the API
release workflow and independent source/health checks pass. Signed-in live
checks verify missing-contact creation mode, retained relationship fields,
required identity validation, dirty-draft confirmation, Keep editing, discard
and focus return. Browser error capture is empty for the final CRM smoke.
Public API/Portal/proxy/Website health and anonymous CRM authorization checks
pass. Automated component and full regression suites were not requested or run.

Verified encrypted database/private-file recovery is retained separately. The
applied migration count remains 25; no migration, reset, holiday seed, identity
cutover or provider change was performed. Deployment smoke saved no Contact,
billing record, tax approval, invitation or order. Existing user-entered records
and Finance approval are preserved. The protected backup and deployment workflow
holds are restored, and Vercel Git deployment settings remain untouched.

An existing browser page retained an older build during acceptance; a fresh page
loaded the current bundle and verified the final behavior. Detailed operational
and recovery evidence remains locally outside tracked release documentation.
