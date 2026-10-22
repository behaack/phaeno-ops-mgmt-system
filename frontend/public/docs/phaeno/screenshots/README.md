# Phaeno how-to screenshots

These are actual local application captures refreshed October 22, 2026. Stable
filenames retain their original asset identities; current provenance and review
are in `frontend/ui-gallery/documentation-captures.json`.

- `customer-order-20261015.jpg`: empty New Customer order identity/service fields.
- `sample-type-20261015.jpg`: empty Add sample type dialog; visible values are defaults.
- `protocol-editor-20261015.jpg`: top of an unsaved initial editor for explicitly fictional DEMO configuration.

No Customer order, Sample type or protocol revision was saved to make these
captures. The demonstration protocol is not a scientifically qualified SOP.
Images contain no real Customer records, addresses, credentials or personal data.

Numbered callouts are rendered by the shared help image component from
`documentation-capture-metadata.json` through `documentation-screenshots.ts`. Explanations and alternative text live in ordinary
Markdown in the owning how-to guides. Re-capture from the real current UI, review
the pixels and update callout coordinates when layout or control labels change.
Do not use generated or reconstructed UI as evidence of application behavior.

Reproduce with the independent gallery and `pnpm docs:captures:refresh`, inspect
all frames, then `pnpm docs:captures:review`. `pnpm docs:captures:check` detects
missing/changed images, annotations, references or UI source dependencies.
