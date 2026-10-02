# Accession sample directory evidence — October 2, 2026

The actual LabReceiptAccessionPanel, LabShipmentQueue, LabAccessionedSamplesPanel and shared PillToggle were rendered in an isolated local Chrome preview. Synthetic API responses provided 42 sample records; the unrelated inactive kit-request view was stubbed. No operational shipment, specimen or freezer-box writes occurred. This is UI/client-state evidence, not connected PostgreSQL, live authorization or physical placement acceptance.

- `directory-desktop.png`: compact accession-view toggle, search and intake-status filter, matching sample rows, expanded tube decisions/storage and pagination footer.
- `directory-mobile-dark.png`: the same filtered directory at a 390 × 844 dark viewport, captured through the full page. The tube disclosure is focused, so its table viewport is horizontally scrolled to the tube details. Table overflow remains contained within the card.

The received-packages view retained its current lookup/card and barcode draft when switching to and from the directory. Keyboard focus and Enter activation selected the views; Enter expanded tube details. The directory showed 20 records on page one, 20 on page two and two on page three, with correctly disabled boundaries. Intake status/search changes reset to page one. On hold returned 14 samples; combining it with `FB-1` returned three. An expanded row retained its held tube's saved location and a rejected tube marked Not stored. Detail links carried the current search, status and page; specimen-detail return navigation was reviewed in source and regression coverage rather than followed through the synthetic harness.

Filtered-empty, loading, API error with Retry, and disconnected states were distinct. Desktop filter controls measured equal 32 px heights and 402 px vertical centers. At 390 px the pill measured 331.7 × 42 px and stayed on one row; input/select remained 32 px tall, page scroll width was 390 px, and the table's own viewport/scroll widths were 308/448 px.

The backend solution build passed with zero warnings/errors. Frontend TypeScript, scoped ESLint and guide generation/freshness checks passed (56 guides; short corpus version `b010eadc8a15`). Regression sources were updated, but automated tests were not requested or executed. No Git mutation or deployment was performed.

The temporary preview server/tab, harness, dedicated Vite cache and isolated build output were removed; the viewport override was restored. Only retained verification screenshots and this README remain in the directory.

## Connected local API refresh

`live-after-api-restart.png` records the owner's signed-in local Portal page after the requested API rebuild/restart. The old October 1 executable served health successfully but did not contain the new directory route (404). The normal API project build passed with zero warnings/errors, and the verified IIS Express site was restarted using its current executable and existing local configuration. Health then returned 200; the new route returned 401 without authentication. The signed-in page's Retry action loaded five accepted samples for H7QS6TY8 and Page 1 of 1.

This is connected default-query/read evidence, not a full live search/paging/role matrix or physical accession acceptance. No operational intake decisions, migrations, data repairs, Git operations or deployments were performed. The restarted API's normal build output remains in use.
