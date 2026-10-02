# Shipment receiving views — October 2, 2026

These screenshots show the actual `LabShipmentReceiptPanel`, `LabShipmentQueue` and shared `PillToggle` with synthetic read responses. The surrounding page header/task strip is preview context. All operational writes are blocked. The fixtures are examples, not live shipment evidence.

- `receive-desktop.png`: receipt entry is the default; an unfinished scan remains after visiting both queues.
- `history-desktop.png`: compact toggle, one visible queue, arrival timestamps and partial/completed accession counts.
- `history-mobile-dark.png`: 390 px dark theme, wrapping toggle and horizontal scrolling within the table card; application body stays 390 px wide.

Manual checks passed: pointer selection, Left/Right arrow selection and visible focus, draft retention, one visible view, completed containers in history, expected-container presentation, empty history, queue failure/retry action, read-only operator messaging and disconnected-session messaging. Normal preview produced no console warnings/errors. No receipt, accession, database or deployment action was performed.

Static checkpoint: solution build (0 warnings/errors), frontend typecheck, scoped ESLint, documentation generation/check (56 guides, `6fc70e9b8dc4`) and diff whitespace check passed. Regression sources were updated and compiled where applicable; automated test suites were not run under the repository request-only policy.

The temporary preview server, preview files/cache and isolated build output were removed after verification. The screenshots are retained as review evidence.

## PH-P number follow-up — October 2, 2026

`expected-insert-number.png` shows the actual queue with a synthetic PH-P- insert number beneath the shipment link. Its computed font is 12 px (the shipment link is 14 px). A row without an insert has no extra identifier line. Desktop/light and 390 px/dark review confirmed readability and contained table scrolling, with a 390 px application body. Frontend typecheck, scoped ESLint and documentation generation/check passed (`bad06f8647a5`). No operational writes or automated tests were performed. The follow-up temporary preview and cache were removed after review.

## Pagination and accession header follow-up — October 2, 2026

The actual `LabReceiptAccessionPanel` mounts the receiving, kit and accession components with synthetic API responses. All operational writes are blocked.

- `history-search-desktop.png` and `history-search-mobile-dark.png`: received-history header search and a filtered arrival list, including small PH-P identifiers.
- `kit-shipments-paginated.png`: five rows on page three of a 45-record kit-shipment fixture, with the last-page Next control disabled.
- `kit-shipments-mobile-dark.png`: two matches on the last filtered page, with the table scrolling within the card and pagination visible.
- `accession-header-desktop.png` and `accession-header-mobile-dark.png`: one accession card with lookup in its header; mobile proof includes keyboard focus on Open container.

Both paginated lists were reviewed for 20-row intermediate pages, a 22-match Customer search across two pages, search reset, refresh retention, no matches and Clear search. Accession lookup was reviewed on an empty queue, with draft retention across outer-tab switches and a synthetic failed lookup returning focus to the barcode input. The failure recorded no arrival. Tables have a 660 px minimum width with contained scrolling; the narrow application body remains 390 px wide.

Solution build passed with zero warnings/errors. Frontend typecheck, scoped ESLint, documentation generation/check (56 guides, `c293b13e9559`) and whitespace checks passed. Regression sources were authored and compiled where applicable; automated tests and PostgreSQL query execution were not run. No real shipment, receipt, accession or deployment action was performed. Development preview hot reload produced createRoot warnings in the temporary harness; these are distinct from the rendered application checks.

The temporary preview server, preview files/cache and isolated build output were removed after this checkpoint. Screenshots remain as review evidence.
