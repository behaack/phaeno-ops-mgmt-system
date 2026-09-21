# Samples and shipping release — September 21, 2026

The owner authorized full deployment after reviewing the sample, transportation
and shipping screens. The release separates scientific sample requirements,
receiving destinations, shared shipping procedures and packing for each approved
sample/container combination. Cooling instructions support regular ice, dry ice,
cold packs, other approved methods and no cooling. Amounts belong to the entire
selected container and are never multiplied by sample or tube count.

Customers can review the frozen packing instructions in place before printing.
Common procedure steps appear once for the applicable samples; individual sample
requirements and container-specific steps remain visible. Existing standalone
instructions and historical packets retain their recorded content.

## Verification

- Frontend: 1,110 tests in 177 files pass. Full lint, TypeScript, production build
  and documentation consistency across 56 guides pass.
- Browser: 184 desktop/mobile cases pass; two duplicate mobile physical-label
  print cases are intentionally skipped. Regular-ice/no-cooling packing fixtures
  pass automated accessibility checks in both themes without page overflow.
  Letter and A4 receiving sheets remain one page in both themes.
- The screen review covered signed-in local configuration navigation, setup order,
  prerequisite links, modal validation, keyboard return focus, and narrow layout.
- Database verification uses disposable loopback databases. The new connected case
  saves an approved procedure, assigns it to a sample/destination, saves different
  small/large amounts, issues a packet and verifies its instructions remain
  unchanged after later procedure and container revisions. Full result: 977 passed,
  zero failures and one Unix-only symlink test skipped on Windows. No synthetic
  notifications remain; disposable database removal is verified.

## Recovery and activation procedure

Migration `20260921171011_AddSharedShippingProceduresAndContainerPacking` is additive:
one revisioned procedure table and nullable assignment/combination fields. Its Up
operation does not delete or rewrite scientific instructions. The configured local
development database was backed up and migrated during implementation.

Production uses the existing Hetzner `deploy-release.sh` procedure with a source-pinned
archive and image. Verify an isolated restore of the pre-migration database dump,
encrypt the recovery envelope, apply the authorized migration and check the API.
Preserve Local file storage, ClamAV, the 100 MiB scan limit, PostgreSQL 18.6 and the
blank bootstrap administrator email. Deploy the frontend from the same Git commit,
then verify Vercel's production source, API/database/Portal health and signed-in
read-only screens. Copy the encrypted recovery envelope off-host and verify hashes.
Never automatically reverse this migration after new records exist.

No synthetic records or unreviewed scientific instructions are inserted into
production. Tests establish software behavior; approved scientific content and
physical packing, carrier and printer/scanner acceptance remain operational work.
The unrelated local database-rebase note is excluded from this release.

## Activation evidence

All release checks passed. Production activation evidence is recorded after release.
