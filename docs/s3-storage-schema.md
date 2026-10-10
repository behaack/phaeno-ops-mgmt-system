# Phaeno Portal S3 Storage Schema

Current implementation as of October 10, 2026

## Purpose

Phaeno Portal uses Amazon S3 to store file contents and PostgreSQL to retain their scientific meaning, ownership, integrity evidence, and workflow history.

Scientific files follow this hierarchy:

**Customer → Job → Sample → Library → Sequencing capture → Raw files and assembly attempts**

This structure supports multiple library preparations, repeated sequencing, and repeated assemblies while preserving earlier work.

## 1 Storage structure

The main scientific layout is:

```text
<bucket>/
└── customer-<organization-id>/
    └── job-<lab-work-order-id>/
        └── sample-<lab-specimen-id>/
            ├── evidence/
            │   └── <file-id>.<extension>
            │
            ├── library-<library-id>/
            │   └── sequencing-<capture-id>-run-001/
            │       ├── raw/
            │       │   ├── <file-id>.fastq.gz
            │       │   └── <file-id>.fastq.gz
            │       │
            │       └── assemblies/
            │           ├── assembly-<attempt-id>/
            │           └── assembly-<another-attempt-id>/
            │
            └── assemblies/
                └── assembly-<attempt-id>/
```

The placeholders represent immutable identifiers. In actual keys, UUIDs appear as 32 lowercase hexadecimal characters without hyphens.

S3 presents these paths as folders, but each file is an object with one complete **object key**. The folders are prefixes within that key.

An optional configured prefix can appear before `customer-...`. The current testing configuration uses an empty prefix, so scientific paths begin directly with the customer branch.

## 2 Meaning of each level

| Level | Meaning in the current implementation |
|---|---|
| Bucket | The storage destination configured for the environment. Local and hosted testing use separate buckets. |
| Customer | The submitting organization’s internal ID. The code uses `SubmittingOrganizationId`. |
| Job | The internal Lab Work Order ID. |
| Sample | The internal Lab Specimen ID. |
| Library | The prepared library’s internal ID. A new preparation receives its own library identity. |
| Sequencing capture | The immutable FASTQ file-set ID identifying a particular captured dataset. |
| Run suffix | The purchased sequencing allocation number, formatted as `run-001`, `run-002`, and so on. |
| Assembly attempt | The unique identity of an assembly execution. |

**The capture ID and run number serve different purposes.** The capture ID distinguishes datasets and corrections. The run number identifies the purchased allocation; it does not uniquely identify a physical sequencing event. Provider run references and actual times remain separate scientific records.

Names such as customer names, sample labels, and library display names do not determine the storage path. This keeps addresses stable when labels change.

## 3 Raw files and supporting evidence

Raw FASTQ files are stored beneath their exact library and sequencing capture. The following wraps one continuous object key across two lines for readability:

```text
customer-<id>/job-<id>/sample-<id>/
library-<id>/sequencing-<capture-id>-run-001/raw/<file-id>.fastq.gz
```

Portal uploads receive generated filenames. The original display filename is retained in the database receipt.

R1/R2 roles, read groups, and part numbers are recorded in the FASTQ mapping records. The application does not rely on the stored filename alone to establish those relationships.

Sample-level supporting files use:

```text
customer-<id>/job-<id>/sample-<id>/evidence/<file-id>.bin
```

A supporting document does not need to be assigned to an invented library or sequencing event.

## 4 Assembly outputs and repeated work

When the inputs resolve to one FASTQ capture and one library, the assembly destination sits beneath that sequencing branch. The following wraps one continuous prefix across two lines:

```text
.../sequencing-<capture-id>-run-001/
assemblies/assembly-<attempt-id>/
```

When an assembly cannot be attributed to one capture branch, the implementation uses a sample-level destination, shown wrapped below:

```text
customer-<id>/job-<id>/sample-<id>/
assemblies/assembly-<attempt-id>/
```

The frozen input manifest identifies the exact inputs regardless of output placement. Current rules still require inputs from one purchased sequencing run and the permitted preparation scope.

Repeated work creates separate identities:

- Preparing the sample again creates another library.
- Capturing another dataset creates another sequencing-capture branch.
- Reassembling inputs creates another assembly attempt with its own settings, inputs, outputs, and outcome.

Earlier work remains traceable. Retrying delivery of the same assembly command does not create a new scientific attempt.

The code freezes an S3 output destination for each attempt. The actual DPS processing provider remains unconfigured, so the directory layout does not establish that automated processing is operational.

## 5 Portal uploads and original S3 files

The Portal supports two ways of obtaining scientific files.

| File source | How it is handled |
|---|---|
| Upload through the Portal | The Portal writes a new S3 object under the authorized scientific scope and records its verified receipt. |
| Original file already in S3 | The Portal verifies the existing object and registers its exact version in place, without creating another permanent managed copy. |

Original-file selection is limited to the server-configured bucket and the authorized record’s directory. Browser callers cannot choose arbitrary buckets or supply storage credentials.

Original admission requires an exact, non-null S3 version ID. Subsequent reads request that version and apply the recorded ETag condition. The Portal also measures the complete file’s SHA-256 checksum and byte length.

Temporary local files may be used during verification. This does not create a second permanent scientific storage copy.

## 6 Physical object keys and database addresses

The database’s `StorageKey` is a typed address. It is not always identical to the physical S3 object key.

For a Portal-managed object:

```text
Physical S3 object key
customer-<id>/job-<id>/sample-<id>/evidence/<file-id>.bin

Database StorageKey
s3-managed/order-files/customer-<id>/job-<id>/sample-<id>/evidence/<file-id>.bin
```

Here, `s3-managed/order-files/` identifies the storage provider and application storage area. It is **not** an extra physical folder above Customer in S3.

For an original object:

```text
s3-original/<encoded-locator>
```

The encoded locator contains:

- Bucket
- Region
- Object key
- Exact version ID
- ETag

It contains no access credentials. Both locator formats must fit the current 1,000-character receipt limit; oversized addresses are rejected.

## 7 What PostgreSQL retains

A scientific file receipt records:

| Information | Purpose |
|---|---|
| File receipt ID | Stable application identity |
| Lab Work Order and Lab Specimen IDs | Owning Job and sample |
| Original filename | Human-readable identification |
| StorageKey | Address used to retrieve the bytes |
| SHA-256 | Independently measured content fingerprint |
| Size in bytes | Expected complete file length |
| Recording user and UTC time | Attribution and custody history |

Related records retain library, capture, read-role, sequencing, assembly, QC, approval, and release relationships.

**The database lineage is authoritative.** A file appearing in the correct folder does not, by itself, establish valid scientific input or an approved Customer result.

## 8 Uploads and ZIP bundles

Resumable uploads use temporary `staging/` branches. These objects are transport material and are excluded from original scientific-file selection.

For a ZIP bundle, the Portal:

1. Completes storage of the ZIP.
2. Reads it back, scans it, and inspects its entries.
3. Presents the entries for explicit mapping.
4. Extracts and validates the selected FASTQ files.
5. Stores each admitted FASTQ under its scientific capture.

The ZIP is temporary transport. S3 stores the objects; the Portal performs inspection and extraction.

## 9 Other Portal files

The Customer-first hierarchy applies to scoped scientific files. Other file workflows that do not provide scientific ownership context use the general pattern:

```text
<optional-prefix>/<storage-area>/<year>/<month>/<file-id>.<extension>
```

The current storage areas are:

```text
order-files/
provisioning-files/
```

Consequently, the bucket can contain both Customer-first scientific branches and general application-file branches.

## 10 Access and preservation

The backend derives scientific paths from authorized records and enforces access through existing permissions. Folder organization helps identify ownership; it does not replace authorization.

Scientific admission requires integrity checks, scanning, and applicable FASTQ validation. Downloads and assembly inputs recheck retained checksum and length evidence. Missing or changed evidence blocks the affected use.

Original scientific S3 objects are explicitly protected from Portal cleanup deletion. Their exact retained versions must remain available.

Customer download retention and cleanup are separate from internal scientific-evidence preservation. Scientific approval and Customer publication also remain separate workflow decisions.

The repository records local and hosted-test S3 activation on October 9, 2026, using separate private, versioned destinations. Coordinated S3 backup and restore remain commercial production requirements; this explanation is based on repository code and recorded operational evidence, without a fresh AWS inspection.

## Source references

Paths below are relative to the repository root. Links work from this document’s location in `docs/`.

- [Storage plan](plans/S3-STORAGE-AND-SCIENTIFIC-ACCESS-PLAN.md)
- [Scientific hierarchy](../backend/app/Features/LabOperations/Services/ScientificStorageHierarchy.cs)
- [S3 implementation](../backend/app/Infrastructure/Storage/S3FileStorage.cs)
- [Scientific original access](../backend/app/Features/LabOperations/Services/ScientificS3Access.cs)
- [Assembly destination selection](../backend/app/Features/LabOperations/Services/LabAssemblyService.cs)
- [Testing cutover record](operations/portal-s3-testing-cutover-20261009.md)
