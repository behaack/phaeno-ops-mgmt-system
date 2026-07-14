# Backend Test Plan

Keep this file updated as backend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `backend/test/PhaenoPortalMetadataTests.cs` - `HealthMetadataIdentifiesTheApi`.
- [x] `backend/test/PersistenceTests.cs` - `AppDbContextUsesConfiguredDefaultSchema`.
- [x] `backend/test/PersistenceTests.cs` - `AppDbContextMapsAccountEntities`.
- [x] `backend/test/PersistenceTests.cs` - `AppDbContextMapsDataProvisioningEntitiesAndTenantBoundaries`.
- [x] `backend/test/ApiResponseTests.cs` - `SuccessEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `FailureEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `DomainExceptionMapsLikeReferenceApi`.
- [x] `backend/test/ApiResponseTests.cs` - `ConcurrencyExceptionMapsToConflict`.
- [x] `backend/test/AccountDomainTests.cs` - `NewUserIsInvitedAndInactiveUntilAccepted`.
- [x] `backend/test/AccountDomainTests.cs` - `AcceptInvitationLinksExternalIdentityAndActivatesUser`.
- [x] `backend/test/AccountDomainTests.cs` - `PlatformAdminRequiresActiveAdminMembershipInActivePhaenoOrganization`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationExpirationIsDerivedFromPendingStatusAndExpiresAt`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationTokenServiceStoresHashSeparateFromRawToken`.
- [x] `backend/test/AccountDomainTests.cs` - `OrganizationDeactivateDoesNotDeactivateMembership`.
- [x] `backend/test/AccountDomainTests.cs` - `UserDeactivateDoesNotDeactivateMemberships`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReadsClerkSubjectAndVerifiedEmail`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReturnsNullForUnauthenticatedUser`.
- [x] `backend/test/AccountAccessTests.cs` - `PlatformAdminCanManageCustomerOrganizationMembers`.
- [x] `backend/test/AccountAccessTests.cs` - `CustomerOrgAdminCannotManagePhaenoOrganizationMembers`.
- [x] `backend/test/AccountAccessTests.cs` - `CustomerOrgAdminCanManageOwnCustomerOrganizationMembers`.
- [x] `backend/test/AccountAccessTests.cs` - `ProspectOrgAdminCanManageOwnProspectOrganizationMembers`.
- [x] `backend/test/AccountAccessTests.cs` - `ActiveProspectMemberCanViewOnlyOwnOrganizationDatasets`.
- [x] `backend/test/AccountDomainTests.cs` - `NewExternalOrganizationDefaultsToProspectAndConvertsInPlace`.
- [x] `backend/test/AccountDomainTests.cs` - `ProspectCannotConvertToPhaenoOrConvertTwice`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ReadySourceRevisionIsImmutable`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `CuratedVersionSnapshotsReadySourceAndBuildsStableChecksum`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `EligibilityAndGrantPinOnePublishedExactVersionUntilRevoked`.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production rejects
  synthetic fixtures even when incorrectly enabled.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production never trusts
  files without a scanner integration.
- [x] `backend/test/DataProvisioningProfileTests.cs` - unconfigured scientific
  file kinds are rejected.

## Deferred Tests

- [ ] Clerk JWT authentication - validate issuer, audience, signature, and expiry with integration-level test coverage.
- [ ] Session/bootstrap endpoint - cover unauthorized, disabled, no active memberships, organization unavailable, and ready states with database-backed endpoint tests.
- [ ] Invitation endpoints - cover create, resend cooldown, pending replacement, inactive organization rejection, disabled user rejection, and active membership rejection.
- [ ] Membership endpoints - cover deactivate, leave, promote, demote, cross-org denial, Phaeno-org denial for customer admins, and last-admin protection.
- [ ] Platform lifecycle endpoints - cover organization deactivate/reactivate, user disable/reactivate, platform-admin-only access, and last-platform-admin protection.
- [ ] User read/list endpoints - cover self read, platform read, org-admin organization list, active-default filtering, inactive include filter, and forbidden cross-org access.
- [ ] Invitation acceptance/decline endpoints - cover verified email match, token hash lookup, single-use behavior, expired/revoked/declined rejection, and membership activation.
- [ ] Account domain model - cover Phaeno and Customer organization kinds.
- [ ] Account domain model - cover multi-organization memberships and selected organization authorization gates.
- [ ] Account domain model - cover organization admins managing memberships in their own organization.
- [ ] Account domain model - cover non-admin customer users not managing memberships in their own organization.
- [ ] Account domain model - cover Phaeno platform admins managing customer organizations through platform admin flows.
- [ ] Account lifecycle - cover users, organizations, and memberships marked inactive rather than hard-deleted.
- [ ] Bootstrap seed - cover first Phaeno organization/admin creation and one-time Clerk identity linking with database-backed tests.
- [ ] Data provisioning endpoints - cover platform-admin-only source authoring,
  publication, eligibility, assignment, revocation, and idempotent retry with a
  database-backed API host after the migration is approved.
- [ ] Managed files - cover authoritative checksum/size calculation, configured
  file-kind rejection, scanner unavailable/rejected states, storage cleanup, and
  missing-byte behavior with isolated temporary storage.
- [ ] Tenant curated data - cover selected-organization enforcement, cross-tenant
  404/403 behavior, immediate revocation/deactivation denial, individual and
  archive audit records, and organization-admin-only download history.
- [ ] Production policy - cover synthetic rejection and empty production
  file-kind/scanner configuration at readiness, publication, eligibility, and
  grant boundaries.

## Requested Execution Log

- 2026-07-14: implementation verification ran `dotnet test
  backend/PhaenoPortal.slnx`; all 43 tests passed. The existing lowercase
  `initial` migration-name compiler warning remains unchanged.
