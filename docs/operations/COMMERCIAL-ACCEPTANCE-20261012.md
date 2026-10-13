# Commercial recovery and Lab acceptance packet

Prepared October 12, 2026. Engineering preparation is authorized. The Owner
accepted a maximum one-hour data-loss window and restoration within four hours.
These are acceptance targets; no completed recovery drill, operational activation
or physical qualification is claimed. Existing hosted-test S3 backup deferral,
deployment holds and preserved recovery copies remain in force.

Owner-adopted defaults, October 12: use a named Operations primary and separate
alternate, alerts to a shared monitored Operations inbox, and a 15-minute
acknowledgment/escalation target. Engineering owns the technical setup and drill
preparation. Use an isolated temporary Linux recovery host in the existing
hosting account; preserve the live runtime and database during the drill.
The Lab supervisor leads training and qualifies the existing printer, stock
and scanner before considering replacement equipment. These choices establish
the operating design; actual responder/inbox/equipment identities and observed
acceptance remain required. No credentials, resource provisioning, schedule or
commercial activation was changed by adopting these defaults.

## Recovery acceptance

Operations supplies the named primary responder, alternate, alert destination,
approved private Unix recovery host, isolated destination, resource budget and
maintenance window. Engineering pins the current database/runtime revisions,
storage identities and worker flags in a private receipt. Keep credentials,
private manifests and scientific/customer data outside this repository.

The current daily Local-only backup and its 30-hour age check cannot satisfy
the accepted target or protect active S3 storage. Do not re-enable that timer as
evidence of S3 protection. The existing S3 capture/verify tool preserves exact
source versions but does not yet supply coordinated restoration, locator
rebinding, scheduling or notification delivery. Those engineering/install steps
must be completed and rehearsed on the approved target before activation.

Prepare coordinated recovery points at least every 30 minutes, allowing at most
ten minutes for off-server export and verification. Alert before the newest
fully verified off-server point reaches 50 minutes; exceeding 60 minutes fails
the recovery target. A failed job, incomplete object inventory, disabled schedule,
integrity failure or unsuccessful writer recovery alerts immediately. Evaluate
the existing 120-second writer interruption budget at the proposed frequency;
do not install frequent maintenance pauses without a reviewed availability and
resource assessment. Timestamp freshness alone does not prove recoverability.

For the isolated drill:

1. Retain the previous recovery copies. Snapshot the exact current database and
   all required managed and original object references under a protecting lease.
2. Include `website.web_contacts` and `website.web_orders` explicitly in the
   preservation manifest, including completed/unsubscribed history and actor
   references. Record full-record digests and counts before the drill. Preserve
   any destination intake already present; reconcile identity conflicts explicitly.
3. Capture pinned object versions with complete length and SHA-256 verification,
   preserve original provenance, encrypt the database/object/mapping set and
   verify the off-server copy. Refuse missing required objects and expired leases.
4. Start the four-hour clock at the recorded incident declaration. Restore to
   fresh isolated resources using the retained mapping; destination version IDs
   must never silently replace original scientific provenance. Keep email,
   provider submission, cleanup and commercial activation disabled in the drill.
5. Verify every required object, full Website records, scientific reports and
   lineage, Finance approval/audit evidence, tenant isolation and authorized file
   access through the application. Do not replay historical emails, subscriptions
   or completed requests.
6. Record the newest recoverable transaction time, incident time and completed
   application acceptance time. Require data loss of at most 60 minutes and
   restoration within 240 minutes, including object and application verification.
7. Observe a genuine scheduled successful off-server recovery point, inject a
   bounded synthetic failure, confirm alert delivery and responder acknowledgment,
   and record escalation and retest. Test doubles establish software behavior;
   they do not establish the schedule or human response.

| Evidence | Required record | Current state |
| --- | --- | --- |
| Recovery owner | Primary, alternate, alert destination and acknowledgment expectation | Names/destination required |
| Qualified execution environment | Unix host, isolated database/bucket, private encrypted destination and resource bounds | Target required; workstation has no running Docker/Linux recovery environment |
| Coordinated S3 recovery | Snapshot, complete object inventory, mappings, encryption, off-server copy and isolated restore | Preparation tool exists; live execution/installation pending |
| One-hour data-loss target | Verified off-server freshness plus recovered transaction timestamps | Accepted target; unproven |
| Four-hour restoration target | Timed complete drill and application acceptance | Accepted target; unproven |
| Monitoring | Observed schedule, delivered failure alert and named response | Pending target and responder |

## Physical bench and first training session

The Lab supervisor supplies the operator, trainer, workstation/browser, printer
and driver, approved stock, scanner/interface configuration, representative
tubes, approved handling/storage conditions and degraded-mode procedure. Use
clearly identified training material and isolated application records. Software
test evidence cannot qualify a printer, label, scanner or laboratory procedure.

Use the current DataMatrix and supported supplier labels. The supervising
reviewer records the date, participants, equipment/stock identifiers, application
revision, conditions, observation, defect, corrective action and retest for every
scenario in [Lab bench validation](../plans/LAB-OPERATIONS-BENCH-VALIDATION.md).
Include exact scan identity, duplicate/unknown/wrong-context recovery, parent-child
lineage, first print/reprint/failure, expected condensation/freezing/storage,
network/scanner interruption, corrections and physical sendout custody. Follow
the Lab-approved duration/temperature and inspection criteria; engineering does
not invent scientific acceptance thresholds.

Deliver the management manual's 60-minute walkthrough. The named trainer then
explains receipt, acceptance, processing QC, scientific approval and publication,
locates the relevant guides and teaches back a damaged/missing-tube example.
Record misunderstandings and application/manual mismatches, assign corrections,
name the first operator lesson and repeat any failed observation. Use the session
record in [Lab training](../plans/LAB-TRAINING-PLAN.md); its state remains Not
started until a session is actually observed.

## Signoff record

| Gate | Signatory and date | Evidence and result |
| --- | --- | --- |
| Recovery/monitoring | Operations primary and alternate: pending | Pending live drill/schedule/alert |
| Physical equipment and degraded mode | Lab supervisor: pending | Pending representative bench session |
| Trainer teach-back and first lesson | Named trainer and Lab management: pending | Pending observed session |
| Commercial activation | Product Owner: pending separate release scope | These preparations do not authorize activation |

Engineering records software results in the October 12 closure receipt. Close a
gate only when its evidence and responsible signatory exist. Preserve failures
and retest records instead of replacing them with a passing checklist.
