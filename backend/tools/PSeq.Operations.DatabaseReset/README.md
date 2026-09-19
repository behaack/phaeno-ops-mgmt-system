# Reviewed database preservation

This one-time maintenance tool does not start the API, bootstrap identities, run workers, or call external providers. It is not a general database reset endpoint.

`snapshot OUTPUT EXPECTED_DATABASE` takes a read-only, consistent inventory of the three application schemas, rows, foreign keys, migration history and database objects. Supply the connection through `ConnectionStrings__DefaultConnection`; local use may explicitly read an ignored configuration with `--local-config PATH`. Keep exports and manifests in a protected, ignored directory. Never commit their personal information or credentials.

`build_packages.py ARTIFACT_DIRECTORY SELECTION_JSON` combines `local-snapshot.json`, `production-snapshot.json` and a fresh `baseline-snapshot.json`. The selection freezes exact configuration IDs and all preservation tables. It validates retained foreign keys and every target column. The local account retains its own identity binding. Shared configuration authorship is mapped only for the verified same owner; unresolved required actors fail.

`apply PACKAGE EXPECTED_DATABASE` requires the designated replacement database, exactly the reviewed initial migration, and no existing application data beyond matching built-in reference rows. The package must classify every table. A transaction and advisory lock protect the dependency-ordered import. Every row is compared before commit, including tables required to be empty. The database comment stores the exact package hash. Replaying that package verifies without overwriting staff changes; a different package is refused. `verify PACKAGE EXPECTED_DATABASE` checks the receipt and every row without writing. An explicitly recorded `activatedDatabase` permits verification after the controlled rename, never import into the source database.

The initial migration refuses populated application schemas and existing migration histories, including both EF history-table naming conventions. Downgrade is refused: restore the matched application/database recovery point instead. Required retention/product reference values and historical database defaults are included in the baseline; obsolete operational backfills are not.

See [the execution plan](../../../docs/plans/DATABASE-REBASE-AND-RESEED-PLAN.md) and [September 2026 runbook](../../../docs/operations/database-rebase-20260919.md) for the authorized scope, verification and rollback. Preserve the original databases until separately approved cleanup.
