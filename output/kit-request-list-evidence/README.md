# Kit request list refinement - October 2, 2026

Actual Portal components rendered with synthetic read responses and write methods that reject all mutations. This is local UI evidence; it does not establish live dispatch, physical receipt, assembly completion or backend acceptance.

- `desktop.png`: compact Kit requests / Kit shipments pill, hidden filter labels, status beside request identifier and trailing top-row Actions.
- `shipments-desktop.png`: shipment search in the header and loaded shipment rows.
- `shipments-mobile-dark.png`: narrow dark presentation with the table scrolling inside its card.

Manually verified default selection, keyboard arrow selection, one visible queue, retained request filters, shipment-linked selection, search by kit/Job, filtered miss and clearing. List actions open existing bounded dialogs; fresh stock and changed cancellation permission block unavailable writes. Failed request refresh offers Retry. Cancellation initially focuses Keep request, preserves header/body/footer, and returns focus to the surviving Actions control. Closing an action leaves the page interactive. Shipment-row actions retain their existing forms and restore focus after dismissal.

At 390 px, the application body is 390 px wide and the table has a wider scrollable interior. The browser extension injected an additional off-screen host under the document root; application widths and containment were measured independently of that host.

TypeScript, scoped ESLint, generated documentation checks and whitespace checks passed. Automated suites were not run under the repository request-only policy. Preview source/cache and the helper process were cleaned up; retained screenshots are review artifacts.
