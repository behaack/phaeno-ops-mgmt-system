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

Release verification and staging remain in progress. No new API/UI activation or
hosted migration has occurred at this checkpoint. Final regression results,
source SHA, staged deployment and activation identities will be recorded here.
Physical printer/scanner, measured-volume, scientific and real-provider
acceptance remain separate from automated synthetic checks.
