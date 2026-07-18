# Phaeno Design System

Version 1.0 — July 2026

This system translates Phaeno's investor presentation language into a durable web product vocabulary. It is grounded in three sources: the supplied 35-slide `Design.pptx`, the current Astro codebase, and the live site at `phaenobiotech.com`.

## Brand idea

Phaeno makes hidden molecular information legible. The design should feel precise, revelatory, and credible: complex science made clear without making it simplistic.

Use these principles to resolve design choices:

1. **Reveal the signal.** Give one scientific claim, metric, or action obvious priority.
2. **Evidence over decoration.** Use data, molecular imagery, diagrams, and citations with an explicit purpose.
3. **Technical, not clinical.** The visual voice is research-grade and exact, not hospital-like or consumer-wellness oriented.
4. **Depth with restraint.** Deep RNA blue/teal creates discovery and scale; white surfaces create analytical clarity.
5. **Explain before persuading.** Headings state the conclusion, supporting content shows why it is true.

## Visual signature

The presentation establishes two complementary modes:

- **Discovery mode:** deep blue/teal molecular imagery, white type, and a single emphasized phrase or metric. Use for hero moments, vision, platform positioning, and section openers.
- **Evidence mode:** white canvas, dark text, structured tables or diagrams, and restrained green/blue accents. Use for methods, comparisons, performance, team, and detailed content.

Do not place every section on a dark molecular background. Alternating discovery and evidence modes creates the visual rhythm seen in the deck and keeps long technical pages readable.

## Logo

Use the existing Phaeno wordmark assets as the source of truth. The lowercase wordmark is the primary mark; the standalone `p` is appropriate only when the full brand name is already present or space is genuinely constrained.

- Preserve the mark's aspect ratio and clear space of at least the height of the `p` stem on all sides.
- Use Phaeno green on white, or white on a dark RNA image/field.
- Never recreate the wordmark with live text, stretch it, add effects, or place it over visually busy material without sufficient contrast.
- Use the full wordmark in headers, investor materials, and first brand impressions.

## Color

### Core palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Phaeno green | `--color-brand` | `#789946` | Wordmark, selection, large accents, data highlights |
| Accessible green | `--color-action-primary` | `#627430` | Primary controls with white text |
| Deep green | `--color-brand-strong` | `#526832` | Small text, borders, strong interaction states |
| RNA blue | `--phaeno-rna-600` | `#156082` | Scientific diagrams, comparison headers, secondary actions |
| RNA midnight | `--color-surface-rna` | `#0E2841` | Dark hero and section fields |
| Evidence amber | `--color-evidence` | `#FEC950` | Citations, key figures, evidence callouts |
| Action orange | `--color-link` | `#B35D0C` | Links and keyboard focus |
| Ink | `--color-text` | `#1D1D1D` | Primary text |
| Muted ink | `--color-text-muted` | `#595959` | Supporting copy and metadata |
| Rule | `--color-border` | `#D9D9D9` | Dividers and component borders |
| Canvas | `--color-canvas` | `#FFFFFF` | Default page background |

### Color rules

- Phaeno green `#789946` is a recognition color, not the default small-text color. It is 3.26:1 against white and therefore does not meet WCAG AA for normal text.
- Use `#627430` or darker for a white-label primary control. Use `#526832` or darker for green text on white.
- RNA blue `#156082`, action orange `#B35D0C`, and deep green `#526832` all meet AA against white for normal text.
- Amber is an emphasis fill or large-data accent. Pair it with ink, not white.
- Red and green must never be the only way a table, chart, or status communicates meaning.

## Typography

### Web

Inter is the system typeface because it is already loaded by the site, works across technical content and UI, and avoids adding a dependency. Use the token stack `--font-family-sans`.

The deck contains legacy use of Lucida Sans, Arial, Arial Black, Trebuchet MS, and Open Sans. Treat those as source-material evidence, not as a web font specification. New presentation work should use one available sans family consistently rather than reproducing the deck's font mixing.

### Hierarchy

| Style | Token / range | Guidance |
| --- | --- | --- |
| Hero | `--font-size-hero` | 40–64px, medium weight, short conclusion, sentence case preferred |
| H1 | `--font-size-5xl` / mobile `--font-size-4xl` | One per page; describe the page outcome |
| H2 | `--font-size-3xl` | Major page sections |
| H3 | `--font-size-2xl` | Component groups or evidence blocks |
| Body | `--font-size-md` | 1.4–1.6 line height; max 44rem for sustained reading |
| Label | `--font-size-sm` | Medium or semibold; concise and literal |
| Footnote | `--font-size-xs` | Sources, caveats, timestamps, RUO statements |

- Default headings to weight 500 or 600. Reserve 700 for a figure or phrase that carries the argument.
- Avoid all caps for long headings. The current homepage hero may retain its established uppercase treatment, but new pages should prefer sentence case.
- Use italics sparingly for biological terms, publication titles, or a single emphasized phrase.
- Use tabular numerals for metrics, tables, financial figures, and performance comparisons.

## Layout and spacing

- Use a 4px spacing base and the `--space-*` scale.
- Default content width is `80rem`; sustained prose should not exceed `44rem`.
- Page gutters are fluid through `--page-gutter`.
- Major sections use `--section-space`; do not simulate hierarchy with arbitrary margins.
- Prefer one strong composition to a grid of equal cards. Use cards only for peer concepts, choices, or repeatable records.
- On mobile, preserve reading order and full-width actions. Horizontal scientific tables may scroll only when a meaningful stacked form would distort the comparison.

## Shape, border, and depth

- Technical/data surfaces: `--radius-md` to `--radius-lg`.
- Marketing cards and action groups: `--radius-xl` to `--radius-2xl`.
- Pills are reserved for tags, filters, and compact statuses.
- Use a one-pixel neutral border before adding shadow. Shadows communicate elevation or interaction, not decoration.
- Avoid glass effects, neon glows, and heavy gradients. The molecular imagery already supplies visual depth.

## Imagery

- Favor authentic molecular, sequencing, laboratory, and data imagery with visible scientific relevance.
- Apply a navy/teal field or scrim when placing text over imagery. Verify contrast against the brightest area of the final crop.
- Use macro imagery for discovery mode; use diagrams, tables, and product/process visuals for evidence mode.
- Do not use generic healthcare handshakes, abstract AI brains, stock doctors, or decorative DNA imagery unrelated to the claim.
- Keep image crops calm enough to leave a clear text field. Never rely on an image to contain critical text.

## Iconography

Use the existing Lucide/React icon set for interface controls. Icons should be simple outlines with consistent stroke weight.

- Pair unfamiliar icons with labels.
- Do not use icons as decorative substitutes for scientific evidence.
- Use the established application-category artwork only where its meaning is already defined.
- Minimum interactive target: 44 by 44 CSS pixels.

## Data visualization

Charts should answer a sentence-level question.

1. Lead with the conclusion in the chart title.
2. Highlight the Phaeno series in green or RNA blue; render comparators in neutral gray.
3. Use amber for one evidence point or annotation, not an entire categorical palette.
4. Label values directly when practical and avoid legends that force visual lookup.
5. Include units, sample size, method, source, and validation status.
6. Use patterns, labels, or markers in addition to color.
7. Avoid 3D charts, exploded pies, dual axes, and decorative gridlines.

Recommended categorical order: Phaeno green, RNA blue, amber, muted ink, light RNA blue, then neutral gray. Never imply hierarchy through color if the data is unordered.

## Components

### Header and navigation

- White evidence-mode surface with the full green wordmark.
- Selected item: Phaeno green may be used as a large fill; interactive text and focus states must retain AA contrast.
- Keep labels literal: Home, Technology, About, Contact.
- Search and menu controls require accessible names and visible keyboard focus.

### Buttons

- **Primary:** accessible green background, white label, darker green hover.
- **Secondary:** white surface, strong neutral border, ink label.
- **Tertiary/link:** text plus directional arrow; use action orange for inline links.
- Use one primary action per region. Labels begin with a verb and name the outcome: `Request a demo`, `Read the study`, `Download the brief`.
- Disabled controls must reduce emphasis without losing legibility and must expose the disabled state semantically.

### Cards

- Use for a repeatable set of features, publications, team members, or metrics.
- Keep heading, summary, metadata, and action in the same order across a set.
- A card should not contain more than one primary action.
- Hover motion is optional, subtle, and disabled by reduced-motion preferences.

### Callouts

- Green rule: scientific takeaway or positive result.
- RNA blue field: mechanism, platform, or technical explanation.
- Amber accent: source, caveat, or evidence that needs attention.
- Red: error or harmful/destructive state only.

### Forms

- Labels remain visible; placeholders provide examples, not labels.
- Required state is textual and not color-only.
- Focus uses `--color-focus`; errors include a message and programmatic association.
- Group fields by user intent and keep the primary submit action at the end.

### Tables and comparisons

- Keep row labels visible and use plain-language column headings.
- Phaeno may receive a subtle green tint or RNA blue header, but avoid turning the whole table into a brand block.
- Numeric cells align by decimal or right edge; text aligns left.
- Notes and preliminary validation caveats remain adjacent to the table.

## Motion

- Motion clarifies state change: 120ms for micro feedback, 200ms for ordinary transitions, 320ms for a deliberate reveal.
- Use the standard easing token and animate opacity/transform where possible.
- No autoplaying decorative motion behind technical copy.
- Honor `prefers-reduced-motion`; the token layer reduces transition durations automatically.

## Accessibility

- Target WCAG 2.2 AA.
- Body text contrast: at least 4.5:1; large text: at least 3:1; meaningful non-text boundaries: at least 3:1.
- Keyboard focus is always visible and is not communicated by color alone.
- Preserve semantic heading order, landmarks, labels, table headers, and meaningful alt text.
- Do not encode scientific quality, diagnostic status, or performance only through color or icon.
- Keep RUO, preliminary, and validation language readable and adjacent to the claim it qualifies.

## Content voice

Phaeno's voice is direct, exact, and evidence-led.

- State the result first: `Resolve full-length isoforms on short-read instruments.`
- Prefer concrete biological nouns and measurable verbs.
- Define an acronym on first use unless the audience and context make it universal.
- Avoid `revolutionary`, `groundbreaking`, and `AI-powered` without immediate proof.
- Distinguish measured, inferred, preliminary, planned, and validated claims.
- Use em dashes sparingly; prefer short sentences when a claim carries regulatory or scientific weight.

## Search and metadata contract

Every searchable page must include a meaningful title, description, and `phaeno:document-type` through the existing SEO helpers. The crawler indexes `<main>` content only.

- Preserve stable heading IDs and meaningful `data-phaeno-search` labels.
- Put the conclusion in the visible heading; put synonyms and technical variants in search metadata.
- Use `data-phaeno-search-ignore` for controls or decorative copy that would pollute snippets.
- Do not casually change document-type labels; list pages are excluded from Lucene rebuilds.

## Implementation

The canonical token source is `ui/src/styles/design-system.css`, imported by `global.css`. New CSS should use semantic roles such as `--color-text` and `--color-action-primary`, not raw palette values. Use raw palette tokens only for controlled visualizations or when defining a new semantic role.

Existing variables remain as compatibility aliases. Migrate components when they are already being changed; do not perform broad mechanical rewrites solely to replace a stable alias.

Before merging a design-system change:

- Check desktop and mobile rendering.
- Check normal, hover, focus, active, disabled, loading, empty, and error states as applicable.
- Run the Astro build.
- Verify generated metadata and `data-phaeno-search` heading anchors for affected routes.
- Confirm color contrast and reduced-motion behavior.
- Document any new token or exception here.

## Decision record

- Inter remains the web typeface; no font dependency was added.
- Phaeno green remains the brand recognition color, with darker green added for accessible interaction roles.
- RNA blue/teal from the deck becomes the scientific-storytelling family.
- Amber is reserved for evidence and emphasis.
- Existing page behavior is preserved through token aliases; component migration is incremental.
