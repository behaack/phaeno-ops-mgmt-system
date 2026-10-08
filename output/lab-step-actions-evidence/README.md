# Consolidated Lab step actions — October 2, 2026

Live local POMS inspection of PSeq Step 1 used existing saved records and made no
configuration or laboratory writes. Approval, discard and retirement were not
submitted. The API already rejects a second Draft (`step_draft_exists`).

- Exactly one detail Actions control, one shared dropdown indicator and one
  Edit draft command; no New version while Draft v1 exists.
- Configuration preview opens the exact saved v1 definition.
- Approval and discard confirmations name version 1, include the shared dialog
  body, initially focus Cancel, and return focus to the surviving Actions button.
  The administrator self-approval override remains required.
- Enter opens the menu; Escape dismisses it and returns focus to Actions.
- Narrow DOM inspection observed a 487 CSS-pixel viewport, no horizontal overflow,
  and menu bounds of approximately 216–449 pixels. The requested temporary
  viewport override was reset. Screenshot capture returned desktop dimensions,
  so only the desktop image is retained as screenshot evidence.

Passed TypeScript, scoped ESLint, documentation generation/check and whitespace
checks. React review confirmed event-driven state, stable version identities,
unchanged query/mutation ownership and no added data requests/dependencies.
Historical/read-only/retired permissions were reviewed in code, not exercised in
the live browser; dark rendering was not exercised. Automated tests were not
added or run for this reversible presentation change. No Git mutation/deployment.
