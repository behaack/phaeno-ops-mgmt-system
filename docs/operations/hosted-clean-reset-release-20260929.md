# Hosted clean database and Portal release — September 29, 2026

## Authorized scope and result

The owner authorized API and Portal UI deployment with a rebuilt production-hosted test database, preserving Chris Yourch, William Agnew, Bill Haack and the three built-in product types. All other old application data was excluded. The [hosted reset plan](../plans/HOSTED-CLEAN-DATABASE-20260929-PLAN.md) records preparation, preservation, cutover and recovery.

The release is complete. API and Portal UI use source `04e2b9a785c0b29453f067dd031b627548260693`. The clean replacement is now the canonical `phaeno_portal_green` database. The API pause during cutover was **14 seconds**. Public Website frontend, DNS, Nginx, external identities and separate Emmaus/OCIA services were unchanged. Automatic Git deployment controls remain held.

## Active release identity

| Item | Verified value |
| --- | --- |
| API source | `04e2b9a785c0b29453f067dd031b627548260693` |
| API image | `phaeno-portal-green-api:sha-04e2b9a785c0-reset-20260929` |
| API image ID | `sha256:16c2323d8e9f3b6f7531cc180a6dc7741e6b2ec55a67b00f4b118ddd592d97ca` |
| API release | `/opt/phaeno.portal-green/releases/reset-04e2b9a785c0-20260929` |
| Portal UI deployment | `dpl_GujX6kbdaxSXgHYpWP7rsenFzJ7d` — Ready |
| Portal UI deployment URL | `phaeno-ops-mgmt-system-luuuoo60e-cadexgenomics.vercel.app` |
| Portal public domain | `portal.phaenobiotech.com`, alias record points to the deployment above |
| Database service | `phaeno-portal-green-db`, PostgreSQL 18.6 |
| Database volume | `phaeno-portal-green-postgres18-data` |
| Active database | `phaeno_portal_green`, connections enabled |
| Retained original database | `phaeno_portal_green_before_20260929`, connections disabled |

The UI was built from a frozen Git archive with Production settings, staged without assigning domains, then promoted after the API/database cutover. Vercel's project production target and the public domain's own alias record independently confirm the deployment identity. The deployment detail response's alias list alone did not enumerate the custom domain.

Migration history contains exactly:

1. `20260928192920_InitialCleanPortal`
2. `20260929133348_AddKitAssemblyLabelVerification`

The candidate was created empty and received the baseline before reviewed data import and the matching additive migration. The populated original database did not receive the rebased migration. Schema verification reports **221 tables, 3,245 fields and 527 foreign keys**; PostgreSQL transaction commit timestamps remain enabled.

## Preserved accounts and types

Exactly the requested three active users retain their original internal identities, profiles, production Clerk subjects and access:

- Chris Yourch
- William Agnew
- Bill Haack

Their required access dependencies comprise one Phaeno organization, one default department, three organization memberships, three department memberships, 15 active business role assignments and 15 active Lab role assignments. All three retain Phaeno organization administrator membership. Clerk readback confirmed each saved subject, its matching verified email and an unlocked, unbanned account. No Clerk record, password or MFA setting was changed. Bootstrap administrator provisioning remains disabled.

Exactly three canonical built-in types exist, with current baseline definitions and their canonical identities: **Tube, Shipping Container and Reagent**. The obsolete Transportation kit type was excluded.

Every table has an explicit preservation or discard disposition. All discarded application tables were verified empty after API startup, including catalog products, stock and kits, laboratory/scientific work and configuration, CRM/customer/commercial data, invitations, Website correspondence and old audit activity. The reviewed package contains **57 rows**, including the retained accounts/access and required fresh system references. Current system defaults include the CRM pipeline/stages, system Trial deliverables, Phaeno supplier and Website notification processing control. These defaults are reproducible seeds, not imported operational configuration. No retention policy was imported.

Reviewed preservation package SHA-256:

`396a10e6bcbc68bfeca75b2cecb473e0582950c2ee79f71fe51d5e28a600a8a6`

Final post-cutover snapshot SHA-256:

`61d561171a93dbb095abf0416e049f6aeecfbfa1d28a84635bfd41ab18835621`

Private exports, exact account IDs and runtime files remain in protected ignored artifacts; they are not committed with this record.

## Recovery evidence

The coordinated encrypted database/private-file backup is:

`snapshot-20260929T153258Z-87f8f956-22ce-4e8b-a1c9-14f677741927`

Its disposable restore, encryption round trip and cleanup receipts passed. The encrypted archive and key envelope were copied off-server with matching checksums. The managed file reference inventory was empty: zero referenced files and zero referenced bytes. Existing file volumes were retained.

After stopping the API, the final preservation snapshot matched the reviewed package. A second backup under the write freeze passed disposable restore and cleanup, was encrypted, and was copied off-server. Verified encrypted file hashes:

| File | SHA-256 |
| --- | --- |
| `final-before.dump.enc` | `492bee08c1fc814f8f1b3faf551ce6701207d27d2f96be5b53e4117e0f93cfac` |
| `final-before.key.enc` | `19c4729538bd3fe0eb9d10b217b4482292cf500a80b4a52b077e2f31458c7ccd` |

Protected evidence is under `/opt/phaeno.portal-green/reset-20260929` and local ignored `artifacts/hosted-clean-reset-20260929/`, including `recovery/`. The original database, prior image, prior UI deployment and protected runtime copies remain available. No recovery volume or image was deleted.

Rollback identities:

- API source `4e0ee32b251d2a31aee2cb91ed8c2d1af1fcdbca` and image `phaeno-portal-green-api:sha-4e0ee32b251d-run-36292180801-1`.
- Prior image ID `sha256:8186a899477d1737b5c790879c502c39816019c017118c473c27ea7ef65789d1`.
- Prior API release `/opt/phaeno.portal-green/releases/4e0ee32b251d2a31aee2cb91ed8c2d1af1fcdbca-36292180801-1`.
- Prior Portal UI deployment `dpl_FV4dV2nSGsSBez6Ar7y9FdssFtE9`.

Use the plan's matched database/API/UI recovery sequence. Writes have reopened; preserve and assess any new records before rollback. Retained recovery material requires separate cleanup authorization.

## Verification and remaining acceptance

Preparation passed exact-target, fresh-baseline, manifest-hash, foreign-key and every-table checks. Wrong-target, raw-snapshot, conflicting-replay and populated-baseline attempts were refused; exact replay was accepted without duplication. Maintenance-tool Linux publish, isolated API image build and Production UI build passed. Full application test evidence for this source is recorded in the [backend](../plans/BACKEND-TEST-PLAN.md#publication-verification--september-29-2026), frontend and E2E living test plans; no broad suite was repeated for the maintenance seed allowlist correction.

After activation:

- Exact preservation comparison and all excluded-table emptiness checks passed.
- Three production Clerk bindings and all retained membership/role counts passed.
- API and scanner are healthy; Portal PostgreSQL and separate OCIA services remain healthy.
- API health returned HTTP 200; database ping returned HTTP 204.
- Portal and public Website roots returned HTTP 200.
- Public Website search with valid `search=sequencing` returned HTTP 200. The initial probe omitted the required query and received expected validation failure; the corrected read probe passed.
- The public Portal sign-in form rendered with Production Clerk and no warning/error browser console entries.
- A bounded recent API log scan found no failure, fatal or unhandled-exception entries.
- Runtime storage/scanning/processing/provider selections were retained; bootstrap provisioning remains disabled.

No authenticated operator session was available for this release check. Fresh sign-in by each person, signed-in workflow acceptance, physical printing/scanning and scientific/provider execution were not performed. These are distinct from the confirmed account bindings, schema/data checks and public sign-in rendering.
