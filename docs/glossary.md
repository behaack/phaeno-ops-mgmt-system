# Glossary

| Term | Meaning in this repository |
| --- | --- |
| External identity | The Clerk-authenticated provider and subject pair presented by a bearer token. |
| User | The portal-owned account record linked to an external identity. |
| Organization | A tenant or platform organization. Current kinds are `Phaeno` and `Customer`. |
| Organization membership | The access link between a user and an organization, including administrative grants. |
| Platform administrator | A user whose active membership grants platform-wide administration. |
| Organization administrator | A membership-level administrator who can manage an eligible organization's members and invitations. |
| Invitation | A time-limited, organization-scoped offer to create or connect a user account. |
| API envelope | The standard `success`, `data`, `error`, and `meta` response shape. |
| Audit event | An append-only record of a persisted entity change and its actor/request context. |
| Concurrency version | The numeric version used to reject stale updates. |
| Partner / Distributor | Planned external-organization vocabulary; not yet a current `OrganizationKind`. |
| Provisioning package | A proposed, not yet implemented, versioned dataset delivery concept in the data-provisioning plan. |
