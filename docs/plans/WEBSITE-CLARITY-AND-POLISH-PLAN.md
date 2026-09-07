# Website clarity and polish

## Execution status

Implemented and verified locally on 2026-09-06 after Product Owner
authorization. The recommendation below records the original review; its
inspection statement describes that review. The Product Owner subsequently
authorized commit, push, and a reversible Website production deployment; the
release record below supersedes the original Git/deployment hold.

## Recommendation

Retain the current navy, green, imagery, and prominent demo buttons. The strongest improvements are tighter layouts, easier navigation, and clearer labels.

This recommendation follows inspection of the [live website](https://www.phaenobiotech.com/), representative desktop and phone layouts, and current source. No files were changed.

## Recommended changes, in priority order

1. **Shorten the homepage’s mobile feature cards.**
   At a 390px viewport, all four cards are approximately 320px tall—even those with less content. Let each card fit its content on phones, reduce internal padding, and preserve the desktop two-column arrangement. Keep all scientific copy.

2. **Improve typography and spacing on science pages.**
   Reduce oversized introductory headings on phones and add clearer separation between headings and supporting paragraphs. Use existing typography and spacing tokens consistently.

3. **Make technical content easier to navigate.**
   Add a compact, non-sticky “On this page” navigation to the three technology pages, linking to existing section anchors and wrapping on phones. Put White Papers before Blog in the Media menu and add a direct white-paper link from the PSeq platform page.

4. **Make contact destinations match their links.**
   “Request Technical Brief” currently leads to “Stay Updated on Phaeno.” Rename that section “Phaeno updates and technical brief,” explain the optional brief checkbox clearly, and reflect its selection in the submit-button label. Use “Request a demo” consistently for links to the demo form. Preserve existing fields, consent, and submission behavior.

5. **Clarify the presentation of scientific qualifications.**
   Place the existing preliminary-data qualification beside the homepage performance highlights, with a link to comparison notes. Give “validation pending” a neutral visual treatment instead of a green checkmark. Preserve every numerical value and scientific statement.

6. **Make button emphasis consistent.**
   Reserve the filled orange treatment for demo requests. Use the existing secondary treatment for technology exploration links, including the orange technology button in the homepage performance band.

## Verification and documentation

During implementation:

- Run the Website production build and inspect affected pages at desktop, tablet, 390px, and 320px widths.
- Check keyboard navigation, visible focus, anchor destinations, text enlargement, and form labels.
- Confirm shorter mobile cards, no clipped text or horizontal page overflow, and preservation of the expandable comparison.
- Update the existing website polish plan and Website README to describe delivered behavior.

## Boundaries

This is a presentation improvement for prospective research teams and technical readers. Retain current positioning, scientific claims, public routes, and publication boundaries. No API, database, authentication, dependency, Git, or deployment changes are included.

## Delivered behavior

- Homepage cards use content-sized rows and smaller padding on phones, while
  desktop and tablet retain the two-column grid. At 390px the four cards measure
  approximately 304, 265, 215, and 215px, instead of uniformly about 320px.
- The three technology pages use smaller phone headings and explicit spacing
  between headings and supporting copy. A shared `OnThisPage.astro` component
  wraps native links to 14 existing section anchors; it is not sticky and is
  excluded from search indexing. The PSeq page links to the existing Part 1
  platform-overview white-paper landing page.
- The active header and footer list White Papers before Blog. Demo links read
  “Request a demo”. The updates heading and optional brief explanation match
  their destination; the submit label switches between “Get updates” and
  “Get updates and technical brief”. Fields, validation, consent, request
  payloads, and submission behavior are preserved.
- The existing preliminary-performance and RUO qualifications appear below
  the homepage highlights with a comparison-notes link. “validation pending”
  is neutral text with no success checkmark. All scientific statements and
  numerical values are preserved.
- The homepage technology action and PSeq technical-brief action use secondary
  treatments. Demo requests retain the filled orange treatment.
- Required enlargement checks exposed existing intrinsic-width constraints.
  Bounded reflow fixes let contact bands, science cards, the sequencing
  timeline, comparison labels, and long text fit. At enlarged phone text the
  header places the demo action on a second row within its existing height;
  expanded menus and footer links wrap. Reduced-motion users receive immediate
  anchor scrolling.
- Website README and the existing Website UI polish plan describe this
  follow-up. Portal audience guides are unaffected.

## Verification results — 2026-09-06

- Final `pnpm build` passed: 17 pages, 10.68 seconds. Existing empty Blog and
  Jobs collection warnings remain. `git diff --check` passed.
- The production build was served locally at `http://127.0.0.1:4322` and
  checked with Chromium. Homepage, all three technology pages, and Contact
  passed at 1440, 768, 390, and 320px. All five also passed at 320px with the
  root text size set to 200%: document width equals viewport width. Screenshots
  and targeted text-bound checks confirmed readable, unclipped content.
- All 14 section links activate by keyboard, retain visible focus, and land
  on their existing targets within the viewport. Comparison notes and the
  PSeq white-paper link reach their intended destinations. Section navigation
  wraps in compact rows and remains non-sticky. Reduced-motion scrolling was
  exercised during keyboard checks.
- Phone comparison expands from 3 to 14 rows with Space and collapses with
  Enter. Desktop and JavaScript-disabled phone views show all 14 rows.
- Keyboard Space toggles the brief checkbox in both directions and updates
  the submit label; helper text and visible focus remain associated. Empty
  submissions show all four updates-form and five demo-form errors, with
  labeled required controls and focus on the first invalid field. No contact
  or demo submission was sent.
- Header and footer pass normal-width checks and 200% text at 320/390px.
  Technology and Media menus open by keyboard, fit their panels, and close
  with Escape while restoring focus. White Papers precedes Blog.
- No page JavaScript exceptions were captured. Local-preview console 404s
  were traced to `/_vercel/insights/script.js`, which is not served by Astro's
  local preview; they are separate from application behavior.
- Scientific-copy and existing-anchor preservation were reviewed against the
  starting source. The published white-paper destination exists; public URLs,
  publication boundaries, APIs, database, authentication, and dependencies are
  unchanged.
- Local evidence is retained under ignored `tmp/website-clarity/`, including
  `build.log`, `inspection.json`, `interactions.json`, header/footer checks,
  science/contact text checks, and screenshots. Ad hoc verification used
  already-installed browser tooling; no test dependencies were added.

Public deployment, real form delivery, and a full accessibility audit were not
part of this local presentation change.

## Reversible Website release — 2026-09-06

The Product Owner authorized commit, push, and deployment after reviewing the
local result. Deploy only the production `phaeno-website` Vercel project
(`prj_74BUPcAQrif32FkYoH6gI5c0Qlqm`, team `cadexgenomics`, root `website/`).
Do not promote Portal, run the API workflow, apply migrations, or change
authentication, dependencies, publication policy, or project environment settings.

Preflight confirmed that all repository workflows require manual dispatch.
Vercel's linked projects use `main` as their production branch. Push the
reviewed commit on `codex/portal-documentation-search-release`; leave `main`
unchanged, then explicitly build only the Website from that exact Git revision
with production environment settings and automatic domain assignment disabled.
Promote after verification. Preview builds use review-mode settings and must
not be promoted as production artifacts.

The live Website is older than the reviewed local baseline: commit `541c875`
already introduced the signup error decoder, entry preservation on failed
requests, and truthful queued-email confirmation. These existing changes are
part of the reviewed Website source and accompany this release. Their two
focused Node tests passed during release preflight. No additional submission
changes were made by this polish pass.

### Rollback checkpoint

- Previous production deployment: `dpl_Brc3zjaNtumUsoCZ1T6y7PWQFzJ7`, confirmed
  `READY`, assigned to `www.phaenobiotech.com` and `phaenobiotech.com`.
- Retained deployment URL:
  `https://phaeno-website-hijns4bjq-cadexgenomics.vercel.app`.
- Previous production source: `a70eccf4f857aba1402bfc46c987963c70aeb754`.
- Preserve that source with annotated Git tag
  `website/before-clarity-polish-2026-09-06` before promotion.
- Pre-release homepage returned HTTP 200. Keep the prior deployment and
  production settings intact; no data migration is involved.

Immediate operational rollback, using an authenticated Vercel CLI:

```powershell
vercel rollback dpl_Brc3zjaNtumUsoCZ1T6y7PWQFzJ7 --scope cadexgenomics --yes
```

Verify that both public domain aliases again point to the retained deployment,
then check the homepage, contact page, and technology pages. Rollback restores
the complete previous Website artifact. A Git revert of the polish commit
undoes only this pass and retains the earlier `541c875` signup fix; use the
saved production tag if a full source restoration is required. Avoid force
pushes and history rewrites.

Release completion and public verification will be recorded after promotion.
