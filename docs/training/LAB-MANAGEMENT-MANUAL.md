# POMS laboratory management and trainer manual

First edition — September 11, 2026. Draft for management walkthrough and review.

Audience: lab managers, supervisors and the first person who will train laboratory staff.

## How to use this manual

Read this with a colleague who knows POMS, then use the presentation agenda to explain the same journey to someone else. Allow about one hour for the initial discussion. Detailed operating instructions are linked at the end; you do not need to read every guide before the meeting.

This edition describes the current repository's laboratory workflow. Confirm which features are available in the environment being shown. Preparation batches are implemented locally, but their owning plan still records pending production release and physical acceptance. A document-only walkthrough is sufficient to begin training the trainer.

This manual explains the application. Your laboratory procedures determine how the physical work is performed and which scientific criteria apply.

## 1. What POMS does for the laboratory

POMS means **Phaeno Operations Management System**. It connects authorized customer work to the samples, physical tubes, preparation steps, materials, equipment, quality evidence and decisions needed to deliver results.

Management should be able to answer four questions from the records:

1. What work are we authorized to perform?
2. Where is the material, and which sample does it belong to?
3. What work has actually been recorded, under which procedure, and by whom?
4. What is preventing the next step, and who must act?

The main journey is:

**Authorized job → receipt and accession → library preparation → sequencing handoff → scientific review → result release.**

Materials, equipment, controlled procedures and exception handling support that journey. A sample may pause or require rework; the records preserve what happened rather than replacing the original history.

## 2. Words the trainer should explain

| Term | Meaning in this walkthrough |
| --- | --- |
| Job / Lab work order | Authorized work and its linked laboratory record. Commercial manages the agreed scope; Lab operations manages execution. |
| Sample / specimen | The submitted scientific identity. A sample can have more than one physical tube. |
| Tube / container | A physical item with its own barcode, status, location and history. Derived containers retain their parent relationship. |
| Receipt | Recording that the expected physical shipment or material arrived. |
| Accession and intake | Connecting received tubes to their expected identities, recording inspection decisions and storage where applicable. |
| Source tube | The accepted, available tube selected for a processing attempt. Other eligible tubes may remain reserves. |
| Attempt | One processing journey using a selected source. A replacement source starts a new linked attempt. |
| Preparation batch | A tray of source tubes processed through a compatible approved preparation workflow. |
| Library | An identified prepared output linked to its source and preparation evidence. |
| Sequencing batch | A group of eligible libraries assembled for sequencing; it is separate from the preparation tray. |
| Lineage | The retained relationship from submitted sample to source tube, derived material and output. |
| Ready for release | Scientific approval has been recorded; customer publication is still a separate action. |

## 3. Who does what

| Responsibility | Typical role |
| --- | --- |
| Record receipt, accession, bench work, resources, libraries and custody | Lab Operator |
| Review material QC, handle exceptions and permitted corrections | Lab Supervisor |
| Maintain controlled protocols and service workflows | Protocol Administrator |
| Review scientific evidence and approve eligible result packages | Scientific Reviewer |
| Publish approved results to the customer | Result Release Manager, through Order operations |
| Administer laboratory access and configuration | Lab Operations Administrator and authorized administrators |

Roles determine which actions a person can perform. Some staff may hold several roles, but approval also follows the configured actor-separation rules. Plan an independent scientific reviewer and use the detailed approval guide when assigning review responsibilities. Having an administrator account does not make it an appropriate model for an operator's training session.

The initial trainer needs to explain the responsibilities and handoffs; they do not need every permission themselves.

## 4. Find your way around

Open **Lab operations**. Its main working sections are:

- **Receipt & accession** — transportation-kit tasks, incoming shipments and tube intake.
- **Library prep** — preparation batches and job/specimen history lookup.
- **Sequencing batches** — eligible libraries, batch membership and external sequencing handoffs.
- **Results & review** — jobs and their scientific review evidence.
- **Materials** and **Equipment** — resources used during work.
- **Lab configurations** — Protocols, Workflows and Tray formats.

**PSeq kits** and **Data assembly** support additional workflows. Leave their detailed training for a later session unless they are the first trainer's immediate responsibility.

Open recognizable record identifiers to inspect details. Actions depend on the record's current state and the user's permissions. A missing or disabled action may indicate a prerequisite, a role requirement or an unavailable feature; establish the reason before changing anything.

Find reference help under the user menu: **Resources → Documentation → Laboratory operations**.

## 5. Walk through one sample's journey

Use the fictional name **Training Sample A** in the discussion. It is an illustration, not a record that this manual creates. Use the same sample throughout so the links between stages remain clear. Later-stage examples can be shown from separate prepared synthetic records if a continuous example is unavailable; say explicitly when changing examples.

### Stage 1 — Authorized work reaches the lab

Commercial establishes the job's scope. For the standard Customer path, finalizing the compliant sample roster creates the linked laboratory work and shipment authorization. The lab begins from that authorized work and its expected specimens.

**Show or explain:** the job identity, expected samples and governing workflow. The trainer should be able to connect the laboratory record back to the work that was authorized.

**Management checkpoint:** who resolves a mismatch between requested work and the expected samples? Route the issue to the appropriate order owner; creating a second Lab work order is not a correction.

### Stage 2 — Receive, inspect and accession

In **Receipt & accession → Receive shipments**, the shipping insert identifies the arriving container. Its **PH-P-** barcode is the receipt barcode. Recording container arrival does not establish that all expected tubes arrived or passed inspection.

In **Accession samples**, open the received container and identify the expected physical tubes using their supplier barcodes. Record damaged or held tubes against their expected identities. Accept suitable identified tubes with the required inspection confirmation and actual storage locations. Missing tubes remain outstanding.

**Show or explain:** an expected-tube list, a saved intake decision and the location/history of an accessioned tube. Opening the job's **Tubes** tab provides the retained decisions; opening a tube barcode provides its details.

**Management checkpoint:** distinguish a shipment's arrival, a tube's identification and its acceptance. Scanning to identify a tube alone does not save acceptance or storage.

### Stage 3 — Prepare libraries and record evidence

In **Library prep**, assemble accepted, available source tubes into a preparation tray under the same compatible pinned workflow version. A tray may include tubes from more than one job, and it may have empty positions.

Before preparation starts, review identities and positions. Starting locks the tray membership and positions. Operators then record the approved steps in order, including material/equipment use and QC evidence.

The procedure determines which observations are shared across named tubes and which require individual measurements. A tube-specific problem must remain visible even when the shared result passes. A held tube does not automatically start a reserve.

**Show or explain:** a tray, its source identities, the current step and a QC outcome. Explain where the operator sees which tubes a shared entry covers.

**Management checkpoint:** an approved protocol describes the work; the execution records show what was performed. Shared entry is appropriate only where the configured procedure permits it.

### Stage 4 — Identify outputs and hand off sequencing


Create and identify each successful library output in the preparation workspace, retaining its source relationship, quantity, unit and storage. Confirm the output barcode. Final preparation uses the recorded QC evidence to establish library eligibility.

Account for every tray member and close preparation before placing eligible libraries in a sequencing batch. In **Sequencing batches**, review the libraries and the sendout/custody record where external sequencing applies.

**Show or explain:** a library's parent/source relationship and its sequencing membership. Contrast the preparation tray with the sequencing group.

**Management checkpoint:** shipped, received by provider, sequencing and complete represent different known events. Sending material away is not evidence that sequencing has begun. POMS records this handoff; it does not itself run the external sequencing provider or scientific processing pipeline.

### Stage 5 — Review scientific evidence

In **Results & review**, the reviewer checks the required evidence and unresolved exceptions. A listed job is not necessarily ready for approval. Trace the sample through its source, preparation, QC, library and relevant sequencing/custody evidence.

Scientific approval follows the configured evidence and reviewer-independence gates and pins the eligible result package. The detailed scientific approval guide explains the package requirements and review action.

**Show or explain:** what evidence a reviewer inspects and how a blocking exception prevents progression. The orientation does not require recording an approval.

**Management checkpoint:** who reviews the work, and what must be resolved before that person can approve it?

### Stage 6 — Hand off for customer release

**Ready for release** communicates scientific readiness to Commercial. A Result Release Manager reviews the package in **Order operations → Result release** and controls publication. Scientific approval and customer file visibility are separate decisions.

**Show or explain:** the boundary between the approved package and a published result. The management walkthrough can end with that explanation; no publication is needed.

**Management checkpoint:** identify the owner of the handoff and the place to inspect release state. Do not infer customer availability from a laboratory completion status.

## 6. Discuss the exceptions staff will encounter

| Situation | What the trainer should explain |
| --- | --- |
| An expected tube is missing | Keep it outstanding; the expected list is not proof of physical arrival. |
| A tube arrives broken | Record its actual intake exception against the expected identity. Destroyed material need not have a fictitious storage location. Rejection alone does not record disposal. |
| A tube is held for review | Record the reason and actual retained-material location. A held tube is not an accepted processing source. |
| QC is unresolved | Follow the permitted repeat, correction or exception path. Do not record a pass to unlock the next step. |
| An attempt has failed and a reserve exists | Explicitly close the failed attempt and follow the reserve path. The replacement starts a linked attempt at the first workflow stage; in tray work it enters a new preparation batch. |
| An earlier entry is wrong | Use the supported correction with a reason and appropriate role. Used-source intake is locked; later issues require the processing hold/failure path. |
| A save response is uncertain | Inspect current state and follow the screen's recovery instructions before repeating work. Do not create a replacement job or container to resolve uncertainty. |

For the first teach-back, discuss five expected tubes: two suitable for acceptance, one damaged, one retained on hold and one missing. Ask the trainer to describe the recorded decision and storage expectation for each. No physical material or application writes are required for this discussion.

## 7. Run the first management session

| Time | Facilitator action | Intended result |
| --- | --- | --- |
| 0–10 minutes | Explain the purpose, vocabulary and responsibilities using sections 1–3. | Management understands what the records represent and who acts. |
| 10–15 minutes | Introduce the main sections and Documentation. | The trainer knows where to begin and where to find instructions. |
| 15–35 minutes | Follow the six-stage sample journey, showing suitable records read-only if available. | Management sees how the handoffs connect. |
| 35–45 minutes | Discuss the five-tube exception example. | The trainer distinguishes receipt, acceptance, storage and processing eligibility. |
| 45–55 minutes | Ask the proposed trainer to explain the journey back. | Identify understanding and gaps. |
| 55–60 minutes | Record corrections, name the first trainer and choose the first operator lesson. | Leave with one practical next step. |

Before any live view, confirm the environment, application version, suitable synthetic records and permitted access. If a section is absent, explain it from the manual and record **Not shown**. Do not create or advance real records for the presentation. Screenshots and videos are optional improvements after this first review.

## 8. First-trainer teach-back checklist

Mark each item **Explained**, **Needs follow-up** or **Not covered**. Reference help may be used; the goal is competent explanation, not memorization.

- Explain how authorized work reaches the laboratory.
- Distinguish a sample, its physical tubes and a derived library.
- Explain why receiving a container does not accept every tube.
- Describe the decisions for the five-tube example.
- Distinguish a preparation batch from a sequencing batch.
- Explain how protocol versions, resource use, QC and lineage support review.
- Explain when a supervisor or independent reviewer is needed.
- Distinguish scientific approval from customer publication.
- Find the three detailed guides for receipt, execution and scientific approval.

Complete the orientation when management and the proposed trainer can explain these points after feedback, record outstanding questions and identify the first operator lesson. This is preparation to teach the system overview; hands-on operator proficiency is a later activity.

## 9. Session record

Copy this section for the meeting notes.

- Session date:
- Facilitator:
- Lab management attendees:
- Proposed first trainer:
- Manual edition:
- Application environment/version, or Document-only:
- Sections shown live / explained only / not covered:
- Teach-back items needing follow-up:
- Workflow or terminology corrections, with owner and next action:
- Session outcome: Not started / Needs follow-up / Complete
- Named first trainer:
- First operator lesson and planned follow-up date:

## 10. Detailed reference guides

Use the application Documentation menu during training. The source links below are also available to readers of this repository edition.

| Topic | Reference |
| --- | --- |
| Orientation and access | [Laboratory operations](../../frontend/src/content/docs/phaeno/lab-operations.mdx) |
| Incoming shipments, tube decisions and storage | [Receipt and accession](../../frontend/src/content/docs/phaeno/lab-receipt-accession.mdx) |
| Preparation trays, steps and reserve use | [Protocols and execution](../../frontend/src/content/docs/phaeno/lab-protocol-execution.mdx) |
| Outputs, sequencing membership and custody | [Libraries, batches and sequencing](../../frontend/src/content/docs/phaeno/lab-libraries-batches-sequencing.mdx) |
| Resource records | [Materials and equipment](../../frontend/src/content/docs/phaeno/lab-materials-equipment.mdx) |
| Problems and recovery | [Exceptions and rework](../../frontend/src/content/docs/phaeno/lab-exceptions-rework.mdx) |
| Review and publication handoff | [Scientific approval](../../frontend/src/content/docs/phaeno/lab-scientific-approval.mdx) |

The [training plan](../plans/LAB-TRAINING-PLAN.md) records the phased approach and maintenance responsibilities. Update this manual from the first walkthrough before investing in recordings or a larger curriculum.
