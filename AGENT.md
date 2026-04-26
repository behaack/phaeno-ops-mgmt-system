# AGENT.md

## Ground Rules for Engagement

This document outlines the ground rules and guidelines for engaging with the Phaeno-Portal project. These rules apply to all contributors, including human developers and AI agents, to ensure consistent, high-quality development practices.

### 1. Project Overview Adherence

- Always refer to the README.md for project structure and technologies
- Understand the separation between backend (.NET 10) and frontend (React with Tan Stack ecosystem)
- Maintain the two-subproject backend structure: `app` and `test`
- Implement multi-tenant security model with three user types: Phaeno (admin), Customers, Partners
- Support 2FA authentication (authenticator app and email)
- Enforce invite-only onboarding:
  - Invitations are sent via email and include a secure token
  - Invitees use the link to reach a registration page and provide required data such as password
  - Invitation tokens must expire after a configurable number of days
  - Organization Admins may invite users into their own organization
  - Phaeno users with the proper role may invite users into organizations
  - Only Phaeno users may create new organizations
  - Phaeno may assign a customer organization to a partner
  - Partners with assigned customer organizations may invite users for those customer organizations

### 2. Coding Standards

#### Backend (.NET 10)
- Follow Microsoft's C# coding conventions
- Use meaningful variable and method names
- Implement proper error handling and logging
- Write comprehensive unit tests in the `test` project
- Maintain code coverage above 80%
- Follow the backend folder system used by the reference Phaeno API:
  - `backend/app/Common`: shared primitives such as domain exceptions
  - `backend/app/Features/<FeatureName>`: feature-owned DTOs, endpoints, workflows, and feature services
  - `backend/app/Infrastructure/Api`: response envelopes, metadata, error mapping, and API filters
  - `backend/app/Infrastructure/Persistence`: EF Core DbContext, PostgreSQL configuration, and migrations
  - `backend/app/Middleware`: HTTP middleware
- Use the shared API response model for API output:
  - success envelope: `ApiResponse<T>.Ok(data, meta)`
  - failure envelope: `ApiResponse<T>.Fail(error, meta)`
  - response shape: `success`, `data`, `error`, `meta`
  - error shape: `type`, `code`, `message`, optional `details`, optional `param`
- Map domain exceptions through `ApiErrorMapper` and handle `/api` exceptions through `ApiExceptionMiddleware`
- Implement secure authentication and authorization for multi-tenant architecture
- Use role-based access control for Phaeno, Customer, and Partner user types
- Store runtime configuration in `appsettings.json` and environment-specific configuration files rather than hard-coding values
- Use PostgreSQL through EF Core for persistence
- Keep EF migrations under `backend/app/Infrastructure/Persistence/Migrations`
- Use the local `dotnet-ef` tool manifest from `backend/`; restore it with `dotnet tool restore`
- Do not hard-code non-development database credentials; use `ConnectionStrings:DefaultConnection` or `ConnectionStrings__DefaultConnection`
- Run backend build/tests after persistence changes and create migrations for model changes
- Use optimistic concurrency for mutable persisted entities:
  - Entities that participate implement `IConcurrency`
  - EF maps `Version` as a concurrency token
  - The centralized EF save interceptor increments `Version` on updates
  - API update flows must treat version conflicts as `409 Conflict`
- Centralize auditing in EF persistence:
  - Audited entities implement `IAudit`
  - The save interceptor stamps created/updated metadata and writes append-only `AuditEvent` rows
  - Audit events must include entity, operation, actor/request context when available, timestamp, and field-level changes
  - Sensitive values such as password hashes, tokens, secrets, and unnecessary PHI/PII must not be written to audit diffs
- Do not hard-delete users or organizations in normal product workflows:
  - Users are deactivated with `IsActive = false`
  - Organizations are made inactive with `IsActive = false`
  - Hard deletes are reserved for explicit administrative purge workflows with retention/privacy review
  - Organization deletion must not cascade-delete users
- Ensure secure handling of sensitive data and comply with data protection regulations

#### Frontend (React/TypeScript)
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Utilize Tan Stack Query for data fetching
- Implement forms using React Hook Form with consistent structure: Label*, Control, Error (* indicates required fields)
- Create reusable UI components leveraging Shadcn where possible
- Use Shadcn components for consistent UI
- Write unit tests with Vitest for components and logic
- Implement end-to-end tests with Playwright for critical user flows
- Design Playwright e2e tests to be parallel-safe and scalable
- Ensure all components comply with WCAG 2.2 Level AA, including keyboard access, visible focus, semantic structure, accessible names, error identification, color contrast, target size where applicable, and reduced-motion support
- Use token-based CSS variables for theming and reskinning capability
- Implement light/dark mode support using CSS custom properties
- Make generous use of lucide icons where they improve scanning, recognition, and workflow clarity
- Icons must not be the only accessible name for a control unless the control has an explicit `aria-label`, tooltip, or equivalent accessible text
- Keep route files thin and prefer small focused components under `frontend/src/components` and `frontend/src/features`
- Maintain frontend source folders by responsibility:
  - `frontend/src/routes`: thin TanStack file routes only
  - `frontend/src/api`: API clients and HTTP integration code
  - `frontend/src/components`: shared layout, navigation, primitive, and reusable UI components
  - `frontend/src/features`: feature-specific UI, schemas, state, and workflow logic
  - `frontend/src/integrations`: framework and library integration setup
  - `frontend/src/lib`: small shared utilities
- Use a main menu in the application toolbar for primary navigation on desktop layouts
- Include a user dropdown menu for user identification, display settings, and secondary menu items
- Move primary navigation items into the user dropdown menu in mobile layouts
- Build responsive UI by default and verify mobile and desktop behavior for primary workflows
- Use a modest amount of purposeful animation for feedback and orientation, and honor `prefers-reduced-motion`

### 3. File Organization

- Keep backend code in the `backend/` directory with `app/` and `test/` subprojects
- Place frontend code in the `frontend/` directory
- Use appropriate folder structures within each project
- Avoid mixing backend and frontend code

### 4. Development Workflow

- Create feature branches for new work
- Write descriptive commit messages
- Submit pull requests for code review
- Ensure all tests pass before merging
- Update documentation as needed

### 5. Communication Guidelines

- Use clear, concise language in comments and documentation
- Document API changes and new features
- Report issues with detailed reproduction steps
- Be respectful and collaborative in discussions

### 6. Tool Usage

- Use appropriate tools for each technology stack
- For .NET: Use dotnet CLI, Visual Studio or VS Code
- For React: Use pnpm and VS Code with React extensions
- Leverage Tan Stack Start for development and building
- Do not perform git operations unless asked to
- Do not perform ef migration operations unless asked to

### 7. Quality Assurance

- Run all tests (backend unit tests, frontend Vitest, e2e Playwright tests) before committing
- Maintain high test coverage: 80%+ for backend, comprehensive coverage for critical frontend paths
- Perform code reviews focusing on code quality, security, and adherence to standards
- Conduct security audits and vulnerability assessments
- Check for security vulnerabilities in dependencies
- Ensure cross-browser compatibility for frontend
- Test light/dark mode theming across all components
- Validate token-based CSS system for consistent theming and reskinning
- Test authentication flows, authorization rules, and 2FA functionality
- Run automated accessibility checks for primary frontend pages and manually review keyboard, screen reader semantics, focus order, contrast, and responsive behavior for any component changes
- Run lint periodically while working to catch code quality issues early
- For frontend changes, run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e` from `frontend/`

### 8. Continuous Learning

- Stay updated with latest versions of technologies used
- Participate in code reviews to learn from others
- Share knowledge and best practices

### 9. Ethical Considerations

- Respect user privacy and data protection
- Ensure inclusive and accessible design
- Follow responsible AI practices if applicable

### 10. Escalation

- For major architectural decisions, consult the team
- Report security issues immediately
- Seek help when unsure about implementation details

These ground rules ensure a productive, collaborative environment for the Phaeno-Portal project. All contributors are expected to follow these guidelines to maintain code quality and team harmony.
