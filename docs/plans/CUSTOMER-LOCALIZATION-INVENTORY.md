# Customer localization inventory

Reviewed October 11, 2026. Owning scope: [System gap closure](SYSTEM-GAP-CLOSURE-PLAN.md).
Only the Customer portal is localized. en-US remains the only published locale;
the language selector remains hidden. Prospect, Partner, Phaeno and the public
Website have no new localization obligation from this work.

| Source family | Current implementation and boundary |
| --- | --- |
| Customer routes and shared controls | Customer context, explicit message IDs and source-message adapters cover home/bell, ordering/quotes, shipping, results/data histories, organization/access and help. The current catalog has 5,780 English entries after the post-closure review. The extraction inventory records touched sources and static text, attributes and feedback. Shared controls retain English outside Customer context. |
| Validation and API feedback | Shared FieldError translates actual string errors and renders no empty alert. Touched Customer workflows translate validation and explicit API fallback messages; static domain-error vocabulary is cataloged. Unknown provider/server text stays honest rather than being guessed. Dynamic identifiers and entered text remain intact. |
| Formatting | Customer date formatters and message dictionaries use the Customer locale. Frozen commercial values, units, checksums and scientific identities retain their semantics. No translated financial calculation is introduced. |
| Help | All eight Customer MDX bodies already reside in `src/content/docs/en-US/customer`. Locale, audience, slug, title, summary, section and review date remain in the registry. Metadata/search/shell feedback use Customer catalogs; guide bodies load on demand. These en-US bodies are the current localized sources, not evidence of a second-language translation. |
| Invitation email | Existing `organization-invitation.en-US.html` and `.txt` are the current English templates. The subject now uses `backend/app/Localization/customer-documents.en-US.json`. Sending and authentication configuration are unchanged. |
| Other notices | Recorded title/body, published instructions, agreed commercial scope and administrator-authored content are retained record content, not automatically translated labels. Retention/release notice templates and their frozen timestamps/identifiers remain current English. Any additional language must include these complete notice families and audience routing before publication. |
| Invoice and quote PDFs | Current English document labels have a dedicated embedded catalog. Invoices use the existing embedded font, wrap long descriptions, retain supported Unicode and frozen numbers, and add page/continuation identifiers. Unsupported glyphs fail rather than silently changing the name. Existing quote branding, financial scope and typography remain. |
| Receipts, packets and exports | Customer-facing browser print controls share the Customer boundary. Retained manifests/checksums/identifiers and frozen commercial content remain record data. Finance CSV exports are Phaeno operational exports. Scientific byte streams and provider output are not UI translation inputs. A second-language release must review every printed document and notice as well as the UI. |

The automated inventory is an extraction record, not a claim that every future
provider error or entered string can be translated. Pseudolocale and long-text
regressions exercise Customer-only behavior; they do not establish human
scientific or financial translation approval. Market selection, complete
translations, pluralization/format review and publication authorization remain
required before adding another Customer language.

The [final verification receipt](../testing/runs/2026-10-11-system-gap-closure-final.md)
records the source inventory and actual checks. No email provider, extra locale
or deployment was activated.

The [post-closure review](../testing/runs/2026-10-11-gap-review.md) adds corrected
work-page/count feedback and current Customer home metadata. The other audience
guides are corrected in English; they acquire no localization obligation.
