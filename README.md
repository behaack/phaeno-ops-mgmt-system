# Phaeno-Portal

## Overview

Phaeno Portal is a multi-tenant application for invite-only organization access,
Phaeno-owned curated-data provisioning, Customer laboratory services, Partner
reagent orders, Partner data assembly, Phaeno operational/configuration work,
and QuickBooks Online commercial synchronization. The repository contains a
.NET API and a responsive React/TanStack frontend.

## Documentation map

- `docs/architecture.md`: implemented system shape and ownership boundaries.
- `docs/business-rules.md`: durable product and authorization rules.
- `docs/decisions.md`: settled technical and product decisions.
- `docs/glossary.md`: repository domain language.
- `docs/user-documentation.md`: role-specific MDX help authoring policy.
- `docs/operations-readiness.md`: current runtime and production-activation boundary.
- `docs/plans/`: implementation state and living backend, frontend, and E2E test plans.

## Architecture

### Backend

The backend is built using .NET 10, providing a solid foundation for enterprise-grade applications.

- **Solution Structure**:
  - `app`: API host, HTTP workflows, persistence composition, and external-system adapters
  - `modules/PSeq.Operations.Commercial`: Commercial-owned domain and application logic
  - `modules/PSeq.Operations.Laboratory`: reserved Laboratory Operations boundary
  - `test`: combined unit, integration, and architecture tests

#### Backend File Structure

The backend follows the same general folder system as the reference Phaeno API project.

```
backend/app/
├── Common/
│   └── Exceptions/
├── Features/
│   └── <FeatureName>/
│       ├── DTOs/
│       └── Endpoints/
├── Infrastructure/
│   ├── Api/
│   └── Persistence/
├── Middleware/
└── Program.cs
```

- `Common/`: Shared cross-feature primitives such as domain exceptions.
- `Features/`: API-owned DTOs, endpoint mapping, persistence access, and external-system adapters.
- Implemented feature areas are Accounts, Relationship Management, Data Provisioning, Health, and Order Management.
- `modules/PSeq.Operations.Commercial/Accounts`: account domain entities, pure authorization policy, invitation-token logic, and the invitation-delivery port.
- `modules/PSeq.Operations.Commercial/Relationships`: relationship requests, service entitlements, and service-eligibility policy.
- `modules/PSeq.Operations.Commercial/DataProvisioning`: curated-data domain entities, environment-neutral policy, deterministic manifest construction, and file/notification ports.
- `modules/PSeq.Operations.Commercial/OrderManagement`: commercial configuration/catalog, Partner kit ordering and fulfillment, commercial workflow records, durable integration/notification records, and environment-neutral QuickBooks/notification ports.
- `Infrastructure/Api/`: API response envelopes, metadata factories, error mapping, and response filters.
- `Infrastructure/Persistence/`: the single EF Core `PSeqOperationsDbContext`, PostgreSQL configuration, and design-time migration factory.
- `Middleware/`: HTTP middleware such as API exception handling.

#### Backend API Response And Error Shape

API responses use the same envelope model as the reference API:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "request-id",
    "timestampUtc": "2026-04-25T00:00:00+00:00"
  }
}
```

- Successful responses use `ApiResponse<T>.Ok(data, meta)`.
- Failed responses use `ApiResponse<T>.Fail(error, meta)`.
- Errors use `ApiError` with `type`, `code`, `message`, optional `details`, and optional `param`.
- Domain exceptions map through `ApiErrorMapper`; unhandled exceptions return an `api_error/internal_error` envelope.
- API exception handling is applied under `/api` through `ApiExceptionMiddleware`.

#### Backend Persistence And Migrations

The backend uses Entity Framework Core with PostgreSQL through the Npgsql provider.

- Runtime DbContext: `Infrastructure/Persistence/PSeqOperationsDbContext.cs`
- Design-time migrations factory: `Infrastructure/Persistence/DesignTimePSeqOperationsDbContextFactory.cs`
- Migrations folder: `Migrations`
- Current business-model target: every implemented entity is explicitly mapped to `commercial_ops`; no default schema is used
- Reserved Laboratory schema setting: `lab_ops` (the schema is created by the pending clean initial migration)
- EF migrations history table: `public.__ef_migrations_history`
- Connection string key: `ConnectionStrings:DefaultConnection`

The context/schema code is ahead of the disposable development database during
the approved reset sequence. Do not run the API or Reference Journey against
the old `portal` database until the old database and migrations have been
replaced by the clean baseline.

Use environment configuration for non-development database credentials. In ASP.NET Core configuration, the connection string can be supplied with `ConnectionStrings__DefaultConnection`.

#### Concurrency, Auditing, And Entity Lifecycle

Mutable persisted entities use optimistic concurrency. Entities that participate implement `IConcurrency` and expose a numeric `Version` property. EF Core maps `Version` as a concurrency token, and the centralized save interceptor increments it on updates. API responses should include `Version` so clients can send the version they last read when update endpoints are added. EF concurrency failures map to `409 Conflict` with a reload-and-retry message.

Auditing is centralized in EF persistence, not endpoint code. Audited entities implement `IAudit`; the save interceptor stamps `CreatedAt`, `CreatedByUserId`, `UpdatedAt`, and `UpdatedByUserId`, and writes append-only `AuditEvent` rows in the same transaction as the business change. Audit events capture entity name, entity id, operation, organization id when available, actor user id when available, request id, timestamp, and field-level changes in PostgreSQL `jsonb`. Sensitive fields such as password hashes must be omitted from audit diffs.

Users and organizations are not hard-deleted in normal product workflows. Users are deactivated with `IsActive = false`; organizations are made inactive with `IsActive = false`. Hard deletion is reserved for explicit administrative purge workflows that account for retention, privacy, and referential integrity. Organization-to-user relationships must not cascade delete users.

Common migration commands from `backend/`:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef migrations add <MigrationName> --project .\app\PSeq.Operations.Api.csproj --startup-project .\app\PSeq.Operations.Api.csproj --output-dir Migrations
dotnet tool run dotnet-ef database update --project .\app\PSeq.Operations.Api.csproj --startup-project .\app\PSeq.Operations.Api.csproj
dotnet tool run dotnet-ef migrations list --project .\app\PSeq.Operations.Api.csproj --startup-project .\app\PSeq.Operations.Api.csproj
```

### Frontend

The frontend utilizes cutting-edge React technologies for a seamless user experience.

- **Framework**: Tan Stack Start for full-stack React applications
- **Data Fetching**: Tan Stack Query for efficient server state management
- **HTTP Client**: Axios for making API requests
- **Form Handling**: React Hook Form for performant and flexible form management
- **UI Components**: Shadcn for beautiful, accessible, and customizable UI components
- **Package Manager**: pnpm

#### Frontend File Structure

The frontend is organized around thin routes, reusable shared components, feature modules, and a dedicated API layer.

```
frontend/src/
├── api/
├── components/
├── content/docs/
├── features/
├── integrations/
├── lib/
├── routes/
├── shims/
└── styles.css
```

- `routes/`: TanStack file routes only; route files should stay thin and delegate page UI to features.
- `api/`: API clients and HTTP integration code.
- `components/`: Shared layout, navigation, primitive, and reusable UI components.
- `content/docs/`: Portable MDX help content organized by external locale and audience, plus US-English Phaeno guides.
- `features/`: Feature-specific UI, schema, state, and workflow components.
- `integrations/`: Framework and library integration setup.
- `lib/`: Small shared utilities that are not feature-specific.

#### Frontend UI Standards

- Build with small focused components wherever practical.
- Use Shadcn components for consistent, accessible UI primitives.
- All components must comply with WCAG 2.2 Level AA.
- UI must be responsive by default and verified on mobile and desktop for primary workflows.
- Use a modest amount of purposeful animation for feedback and orientation.
- Respect `prefers-reduced-motion` for motion-sensitive users.
- Use token-based CSS variables for theming, reskinning, and light/dark mode support.
- Make generous use of lucide icons where they improve scanning, recognition, and workflow clarity.
- Icons must not be the only accessible name for a control unless the control has an explicit `aria-label`, tooltip, or equivalent accessible text.
- Forms must use React Hook Form and follow the required field structure: Label*, Control, Error.

#### Toolbar And Navigation Standards

- The application toolbar includes a main menu for primary navigation on desktop layouts.
- The toolbar includes a user dropdown menu for user identification, display settings, and secondary menu items.
- In mobile layouts, primary navigation items move into the user dropdown menu.
- Navigation and menu controls must be keyboard accessible and expose appropriate roles, names, and focus states.

## Security Model

The application implements tenant-scoped authorization with invite-only
onboarding. Clerk authenticates the person and issues the JWT; the API resolves
that external subject to its own active `User`, memberships, selected
organization, and capabilities. Frontend visibility is not an authorization
boundary.

- **User Types**:
  - Phaeno: Internal users with administrative privileges
  - Prospects: Pre-customer/partner organizations whose users can access sample data explicitly assigned by Phaeno and manage their organization users, but cannot order
  - Customers: End users that place lab service orders, submit samples, track laboratory progress, and access resulting data
  - Partners: External organizations that order reagents or submit data to Phaeno for assembly and download the assembled data/results for their customers
- **Invite Model**:
  - Invitations are organization-scoped, email-bound, time-limited, and carry a single-use raw token only in the invitation link.
  - The invite page captures and scrubs the token, requires Clerk authentication, then verifies the authenticated email before showing organization or role details.
  - Acceptance creates or reactivates one internal organization membership; it does not collect or store a portal password.
  - The authorization model permits eligible external organization administrators to manage invitations and memberships only for their selected organization, while authorized Phaeno users manage organizations and platform access. The current organization/user administration screens are mock-backed previews and are not yet connected to those durable API workflows.
  - Users and organizations are deactivated rather than normally deleted. Reactivating an inactive membership requires a fresh invitation.
- **Authentication**: Clerk-issued bearer JWTs validated by the ASP.NET Core API.
- **Multi-factor authentication**: Owned by the configured Clerk authentication policy; the portal does not implement or claim a separate 2FA system.
- **Tenant enforcement**: Every tenant read, write, file download, and commercial action is scoped by the authenticated internal user and active selected membership.
- **Commercial boundary**: QuickBooks Online is the only implemented external commercial system. There is no ERP or LIMS integration in the running application.
- **Help boundary**: Customer and Partner help is locale-ready and audience-filtered in the UI. Because current MDX is browser-bundled, it contains no confidential procedures; future search must enforce audience and locale in the backend.
- **Testing**: Vitest for unit tests, Playwright for end-to-end (e2e) tests
- **Styling**: Token-based CSS system with light/dark mode support for easy reskinning

## Technologies Used

- **Backend**: .NET 10
- **Database**: PostgreSQL with Entity Framework Core and EF migrations
- **Frontend**: React, TypeScript, Tan Stack Start, Tan Stack Query, Axios, React Hook Form, Shadcn
- **Testing**: Vitest (frontend unit tests), xUnit/.NET testing framework (backend), Playwright (e2e tests designed for parallel execution)
- **Accessibility Testing**: Axe checks through Playwright for primary frontend pages
- **Styling**: CSS with design tokens, light/dark mode support
- **Configuration**: Backend settings stored in `appsettings.json` and environment-specific overrides, not hard coded in code
- **Build Tools**: Vite, TanStack Start, pnpm
- **Deployment**: Runtime requirements and production activation gates are recorded in `docs/operations-readiness.md`; a platform-specific production deployment runbook is not yet approved.

## Project Structure

```
phaeno-portal/
├── README.md
├── AGENTS.md
├── backend/
│   ├── app/
│   │   ├── Common/
│   │   ├── Features/
│   │   ├── Infrastructure/
│   │   │   ├── Api/
│   │   │   └── Persistence/
│   │   └── Middleware/
│   └── test/
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── features/
    │   ├── integrations/
    │   ├── lib/
    │   ├── routes/
    │   └── styles.css
    ├── e2e/
    ├── tests/
    ├── package.json
    └── pnpm-lock.yaml
```

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js (latest LTS)
- pnpm

### Backend Setup

1. Navigate to the backend directory
2. Restore dependencies: `dotnet restore PSeq.Operations.slnx`
3. Restore local tools: `dotnet tool restore`
4. Configure PostgreSQL through `ConnectionStrings:DefaultConnection`
5. Apply migrations: `dotnet tool run dotnet-ef database update --project .\app\PSeq.Operations.Api.csproj --startup-project .\app\PSeq.Operations.Api.csproj`
6. Build the solution: `dotnet build PSeq.Operations.slnx`
7. Run tests: `dotnet test PSeq.Operations.slnx`

### Frontend Setup

1. Navigate to the frontend directory
2. Install dependencies: `pnpm install`
3. Start the development server: `pnpm run dev`

## Development Guidelines

- Follow .NET coding standards for backend development
- Use TypeScript for frontend code
- Maintain test coverage above 80%
- Use meaningful commit messages
- Document API endpoints and components
- Run lint periodically during frontend work to catch code quality issues early
- Run frontend verification with `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`
- Treat automated accessibility checks as a required gate, not a substitute for manual WCAG review

## Contributing

Please read `AGENTS.md` for repository working rules and `ai/README.md` for task-specific context.

## License

(To be determined)
