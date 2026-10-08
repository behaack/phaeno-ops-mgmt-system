# Portal workflow release — October 4, 2026

The owner requested commit, push and deployment of the pending Portal batch.
The [release plan](../plans/PORTAL-WORKFLOW-RELEASE-20261004-PLAN.md) preserves the
hosted test database, identities, private files and runtime choices. Local fake
PSeq specimens, material and Catalog configuration are not copied to hosting.

## Preparation evidence

- Current hosted API: source `5bc89d13e59b3bde9e784ab188dfec0641eb4429`, image
  `phaeno-portal-green-api:sha-5bc89d13e59b-run-37152095279-1`, healthy.
- Current UI rollback deployment: `dpl_3Q9LGPGXXqYaJJFZswkRFBi3vvae`, Ready.
- Hosted database: fourteen migrations; all six master-mix tables, sequencing
  batches/members, Jobs and submitted samples are empty.
- All four pending migrations passed twice on an isolated hosted copy. Eighteen
  migrations were recorded; all 226 existing application table counts matched.
  Reviewed SQL SHA-256:
  `322d65c524ecaa6d65133efbe5213f18602214da4e2eefeb282948ca1d24b743`.
  Disposable database and temporary unencrypted dump cleanup passed.
- Frontend unit suite: 1,428 passed in 220 files; subsequent Finance cases: 38
  passed. Lint, TypeScript and generated documentation pass: 56 guides, corpus
  `a198cfcd3c50`. Release build has zero warnings/errors and no EF model drift.
- Complete frozen desktop/mobile browser suite: 212 passed, zero failures,
  two intentional mobile print skips. Production-configured Portal UI build passes.
- Complete connected backend suite: 1,244 passed, zero failures, two intentional
  environment skips. Verification database cleanup passed. The repaired
  persistence/recovery group also passes all twelve cases independently.
- Application source committed and pushed:
  `58f2af34e989c3b7187b39d542174444c2985896`. The frozen frontend has zero
  source differences from that commit. Generated build outputs and recovery
  files are excluded from Git.

## Recovery evidence

[Protected backup run 37244067872](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37244067872)
succeeded from unchanged maintenance source
`5b222b209b5cfedcfb8c1d2ca4f57278a79072ed`. Snapshot
`snapshot-20261004T233139Z-56f5096e-af6b-4790-a74d-d6d3e3ba16f3` captures the
current API/database and private-file references. Isolated restore, envelope
encryption round trip, cleanup and API resume all passed. The referenced private
file inventory contains zero files/bytes. The backup workflow was disabled again;
the host timer was not changed.

Encrypted off-server artifact ID: `11318512037`, retained for 35 days.
Artifact digest:
`41e6168697c53739fa576df6c0c8510af4ab9ac5095f588351cf9b43b0dbc002`.
The local encrypted recovery copy matches its checksum manifest:

| File | SHA-256 |
| --- | --- |
| `snapshot.tar.enc` | `9311bc62241bc27fccba4888505aa7630f30e4b50620d4d6cc92b500c2a12b10` |
| `snapshot.key.enc` | `c63f03f470f422926859cbcd023b047a63c1e27cb6f9b17f4f9c2596ac38a176` |
| `receipt.env` | `17ccff6d4f10d529113f6d5c98e94b88a1c20b33dd3cc7828ca76dea9642f137` |

## Activation status

The preserving release completed under the owner's October 4 commit, push and
deploy instruction. Production UI `dpl_F2eTLxgsiU6ydnyYRrXNR6ztPLwY` is Ready at
`phaeno-ops-mgmt-system-dk36rhwo8-cadexgenomics.vercel.app`, with metadata matching
application source `58f2af34e989c3b7187b39d542174444c2985896`. Its isolated build uses
Production Clerk, the production API proxy and mock sessions disabled. It was
staged without changing the public alias.

[Protected API run 37246241157](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/37246241157)
succeeded from the same application commit with migrations enabled and storage,
scanning and bootstrap set to Preserve; Clerk cutover remained false. The workflow
was disabled immediately afterward. The matching UI was promoted after API health,
source identity, eighteen migrations and preserved data/runtime checks passed.
Public-domain inspection independently resolves to that exact UI deployment.

| Active component | Verified identity |
| --- | --- |
| Application source | `58f2af34e989c3b7187b39d542174444c2985896` |
| API image | `phaeno-portal-green-api:sha-58f2af34e989-run-37246241157-1` |
| API image ID | `sha256:51cec6f42565c644e04078f8ed972cd5f51d5954310ded820869c494e0daf6bb` |
| API release | `/opt/phaeno.portal-green/releases/58f2af34e989c3b7187b39d542174444c2985896-37246241157-1` |
| Portal UI | `dpl_F2eTLxgsiU6ydnyYRrXNR6ztPLwY`, Ready |
| Public Portal | `https://portal.phaenobiotech.com` |
| Database | `phaeno_portal_green`, PostgreSQL 18.6, eighteen migrations |

The deployment-lock pre-migration database backup passed isolated restore,
migration identity, encrypted checksum and cleanup verification. Its encrypted
files were copied off-server and matched the manifest:

| File | SHA-256 |
| --- | --- |
| `pre-migration-20261005T001053Z-58f2af34e989.dump.enc` | `4ed4a082c7950e4c0312ca69ee5cc04ab32fad6500d88e11df1b386582aff1fb` |
| `pre-migration-20261005T001053Z-58f2af34e989.key.enc` | `70183cb327a157cdf3c3df0eaca0c3f5023300bc294cf1853c71e893723e1897` |

All 226 existing application table counts match the precutover inventory.
Database and Portal runtime hashes and private/index mounts are preserved.
The Catalog requirement and restricted member relationship are present; the
obsolete batch-only minimum column is absent. API/scanner/database and the
independent OCIA services remain healthy. A bounded startup log check found zero
failure, fatal or unhandled-exception entries.

Live smoke checks pass: API health 200, database ping 204, accession directory
401 without credentials directly and through the Portal proxy, Website
search/root 200 and Portal root 200. An isolated production browser renders
the actual Clerk sign-in form with no console warnings or errors. No
authentication or operational form was submitted.

Both Vercel Git deployment holds remain false for automatic deployment. Both
protected GitHub workflows are disabled again. Prior recovery packages remain
retained. Temporary isolated backend builds, the frozen frontend/dependency tree,
production environment copy and source archive were removed after use. Final
test logs/TRX, public smoke evidence, SQL/inventory evidence and encrypted
recovery copies remain in ignored release storage. Local API and frontend
listeners on 44399/48056 and 3000 are preserved. Final release documentation is a subsequent source-control-only
checkpoint; the application deployment identity remains the SHA recorded above.
Physical printer/scanner, measured-volume, scientific and real-provider
acceptance remain separate from automated synthetic checks.
