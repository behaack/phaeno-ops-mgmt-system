# Backend Test Plan

Keep this file updated as backend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `backend/test/PhaenoPortalMetadataTests.cs` - `HealthMetadataIdentifiesTheApi`.
- [x] `backend/test/PersistenceTests.cs` - `AppDbContextUsesConfiguredDefaultSchema`.
- [x] `backend/test/PersistenceTests.cs` - `AppDbContextMapsAccountEntities`.
- [x] `backend/test/ApiResponseTests.cs` - `SuccessEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `FailureEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `DomainExceptionMapsLikeReferenceApi`.
- [x] `backend/test/ApiResponseTests.cs` - `ConcurrencyExceptionMapsToConflict`.

## Deferred Tests

- [ ] Authentication services/endpoints - fully implement and cover login.
- [ ] Authentication services/endpoints - fully implement and cover change password.
- [ ] Authentication services/endpoints - fully implement and cover recover password.
- [ ] Authentication services/endpoints - fully implement and cover 2FA by email.
- [ ] Authentication services/endpoints - fully implement and cover 2FA by authenticator app.
- [ ] Authentication services/endpoints - fully implement and cover 2FA by SMS.
- [ ] Authentication services/endpoints - fully implement and cover 2FA recovery.
- [ ] Authentication services/endpoints - fully implement and cover switching 2FA back to the default email method.
- [ ] Authentication services/endpoints - fully implement and cover changing the active 2FA method.
- [ ] Account domain model - cover Phaeno and Customer organization kinds.
- [ ] Account domain model - cover invitation-first user account status and nullable password hash before invitation acceptance.
- [ ] Account domain model - cover customer users accessing only their own organization resources.
- [ ] Account domain model - cover Phaeno users accessing customer organization resources.
- [ ] Account domain model - cover organization admins managing users in their own organization.
- [ ] Account domain model - cover non-admin customer users not managing users in their own organization.
- [ ] Account domain model - cover Phaeno non-admin users managing customers and customer users.

## Requested Execution Log

- No requested backend test-plan executions recorded yet.
