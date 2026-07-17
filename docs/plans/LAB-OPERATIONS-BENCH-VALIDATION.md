# Lab Operations Bench Validation

This record separates database-backed workflow verification from physical
bench acceptance for the initial PSeq Lab Operations workflow. It does not
authorize production activation, select barcode hardware, or approve a
laboratory procedure.

## Current Result

- Software preflight completed on 2026-07-16 against the migrated local
  `phaeno_ops` development database.
- The rollback-isolated controller journey passed from accepted Customer quote
  through Lab authorization, assigned Lab roles, receipt, accession, protocol
  execution, material and equipment use, library preparation, batching,
  provider-neutral NGS sendout and custody, exception resolution, scientific
  approval, and the customer-safe Commercial projection.
- The software preflight proved that POMS allocates and persists a unique,
  checksummed barcode for submitted and derived containers; normalizes a
  Code 39 scanner value; rejects invalid checksums; and resolves the exact
  work order, accession, parent, and library context.
- A vendor-neutral Code 39 label renders through the browser. Initial prints,
  reasoned reprints, and failed attempts retain separate outcomes. Only an
  operator-confirmed usable label increments the print count and last-print
  user/time.
- Scan-first container lookup and QC-passed-library batch entry are
  implemented. Duplicate and wrong-context batch scans are rejected without
  changing membership.
- Physical bench acceptance is **not complete**. This development session did
  not have an approved printer, scanner, label stock, representative
  containers/specimens, or an operator-observation session.

## Automated Preflight Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Commercial authorization creates Lab work atomically | Pass | PostgreSQL controller journey |
| Additive Lab roles protect operator actions | Pass | Operator journey assigns Operator, Supervisor, Protocol Administrator, and Scientific Reviewer |
| Approved and active protocol is pinned to execution | Pass | Protocol lifecycle and execution record |
| Receipt and accession preserve specimen history | Pass | Receipt/accession work events and persisted accession |
| Submitted-container barcode is unique and retained | Pass | `lab_containers` persistence and database uniqueness |
| POMS barcode allocation and normalization are deterministic | Pass | Prefix/kind, safe-character, checksum, Code 39 wrapper, case, and altered-value coverage |
| Initial print, reasoned reprint, and failed attempt are auditable | Pass | Confirmed prints count from `0` to `1` and `2`; failure remains history without incrementing |
| Exact scan lookup returns lineage context | Pass | Submitted and derived-library barcode scans resolve their work, accession, parent, and library |
| Scan-first batch entry rejects duplicate membership | Pass | First QC-passed library scan succeeds; repeated membership returns `batch_member_duplicate` |
| Parent-child physical lineage is retained | Pass | Library container points to the submitted container |
| QC-approved material and calibrated equipment gate execution | Pass | Material consumption and equipment-use records |
| Library, batch, sendout, and custody remain traceable | Pass | Library lineage, batch membership, sendout, and custody records |
| Blocking customer action must be resolved before approval | Pass | Exception is raised and resolved before scientific approval |
| Ready for release emits only permitted Commercial data | Pass | Customer-safe projection has no open action and contains reviewer-permitted QC |
| Scientific approval does not publish a file or result | Pass | Zero managed files and zero Lab result releases for the order |
| Verification leaves no journey residue | Pass | Transaction rollback restores the work order to `AwaitingSpecimens` |

## Physical Bench Prerequisites

Record the exact items before starting:

- operator and supervising reviewer
- workstation/browser and network connection
- approved label printer make, model, driver, and connection method
- approved label stock, dimensions, adhesive, and environmental rating
- scanner make, model, interface mode, and suffix/prefix configuration
- representative submitted tube, aliquot tube, and library container
- non-customer test specimens or clearly marked training material
- approved degraded-mode worksheet and recovery owner

## Physical Acceptance Scenarios

For every scenario, retain the date, participants, hardware identifiers,
observed result, defects, corrective action, and retest result.

| Scenario | Required observation | Status |
| --- | --- | --- |
| Receipt at the intake bench | Operator can capture the minimum receipt condition and location without redundant commercial entry | Pending bench |
| Accession and first label | A Phaeno barcode is allocated, the correct label renders, and exactly one physical label prints | Pending bench |
| Label quality | Text and barcode remain legible, correctly sized, adhered, and scannable after expected handling, condensation, freezing, and storage | Pending bench |
| Scanner accuracy | Scanning returns the exact stored barcode without dropped, prefixed, transposed, or duplicated characters | Pending bench |
| Unknown and duplicate scans | The operator receives an unambiguous, recoverable response without changing the wrong record | Software pass; pending bench |
| Reprint control | Reprint identifies the container, preserves prior print history, captures a reason, and produces the same current label content | Software pass; pending bench |
| Derived-container lineage | A library/derived label scans to the correct child and preserves its parent-container relationship | Pending bench |
| Batch entry | Repeated scans add the intended libraries once, expose duplicates clearly, and are faster than manual lookup | Software pass; pending bench |
| Wrong-container prevention | An ineligible or wrong-context container cannot be silently applied | Software pass; pending bench |
| Printer interruption | A failed or partial print does not falsely imply a usable label and can be recovered without duplicate identity | Software pass for operator-confirmed outcome; pending hardware |
| Scanner or network interruption | The approved degraded-mode procedure preserves identity, custody, and later reconciliation | Blocked by procedure decision |
| Exception and correction | Operator can stop, document, resolve, and resume work without overwriting the original record | Pending bench |
| Sendout custody | Container and manifest checks match the actual shipment handoff and provider acknowledgment | Pending provider session |

## Remaining Activation Gaps

The barcode software gaps found during preflight are closed. These remaining
items require representative hardware, operating procedures, or both:

1. Qualify the rendered 50 mm by 25 mm Code 39 label against the approved
   printer, driver, stock, containers, handling, storage, and scanner.
2. Verify the chosen scanner's interface mode, character handling, terminator,
   focus behavior, and sustained repeated-scan accuracy at the bench.
3. The browser cannot detect whether a physical print succeeded. The operator
   must inspect the label and explicitly record success or failure; any future
   printer-status integration requires its own approved scope.
4. Approve printer/scanner interruption, network outage, duplicate-label
   destruction, offline identity, and reconciliation procedures.

The Product Owner should participate in the physical session only to validate
the scientific workflow and operator experience. Hardware selection,
integration mechanics, retry behavior, and the technical test harness remain
engineering responsibilities once the representative equipment and operating
procedure are known.

## Completion Rule

Bench validation is complete only when every non-deferred physical scenario has
dated evidence, every blocking software/integration gap is resolved and
retested, the operator and supervising reviewer accept the workflow, and the
Lab Operations plan records the activation decision. Automated database proof
alone cannot satisfy this gate.
