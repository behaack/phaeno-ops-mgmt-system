# Phaeno Portal Frontend

TanStack Start React frontend for Phaeno Portal.

## Stack

- React and TypeScript
- TanStack Start and TanStack Router
- TanStack Query
- Axios
- React Hook Form with Zod validation
- Shadcn UI components
- Tailwind CSS v4 with CSS design tokens
- Vitest
- Playwright with axe accessibility checks
- pnpm

## Commands

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

`pnpm run test:e2e` builds the app and runs Playwright against production preview so desktop, mobile, navigation, and accessibility behavior are tested against the production bundle.

Run `pnpm run lint` periodically while working to catch code quality, React hooks, and JSX accessibility issues before verification.

## File Structure

```text
src/
  api/
  components/
  features/
  integrations/
  lib/
  routes/
  shims/
  styles.css
```

- `routes/`: Thin TanStack file routes. Route files should mount feature/page components and avoid owning page complexity.
- `api/`: Axios clients, endpoint wrappers, and HTTP integration code.
- `components/`: Shared layout, navigation, primitive, and reusable UI components.
- `components/ui/`: Shadcn-generated or Shadcn-compatible UI primitives.
- `features/`: Feature-specific components, schemas, state, and workflow logic.
- `integrations/`: Library integration setup such as TanStack Query providers and devtools.
- `lib/`: Small shared utilities.
- `shims/`: Compatibility shims required by the current toolchain.

## UI Rules

- Prefer small focused components over large route or page files.
- Use Shadcn components wherever practical for consistency and accessibility.
- Make generous use of lucide icons where they improve scanning, recognition, and workflow clarity.
- Icons must not be the only accessible name for a control unless the control has an explicit `aria-label`, tooltip, or equivalent accessible text.
- Keep route files thin and place domain UI under `features/`.
- Build responsive layouts by default.
- Verify primary workflows on desktop and mobile.
- Use a modest amount of animation for orientation and feedback.
- Honor `prefers-reduced-motion`.
- Use CSS custom properties for design tokens, light/dark mode, and future reskinning.
- Avoid hard-coded one-off colors in feature components when a token or Shadcn semantic class exists.

## Accessibility

All components must comply with WCAG 2.2 Level AA.

Implementation requirements:

- Keyboard access for all interactive controls.
- Visible focus states.
- Semantic HTML and ARIA only where it improves native semantics.
- Accessible names for buttons, links, form controls, and menus.
- Correct error identification and error association for forms.
- Color contrast that meets Level AA.
- Target size that meets WCAG 2.2 expectations where applicable.
- Reduced-motion support for animated UI.
- Logical focus order across responsive layouts.

Testing requirements:

- Run `pnpm run test:e2e` before considering UI changes complete.
- Axe checks must pass for primary pages in desktop and mobile projects.
- Manually review keyboard navigation, focus order, screen reader semantics, contrast, and responsive behavior for new or changed components.

## Toolbar And Navigation

- Desktop layouts use a main menu in the toolbar for primary navigation.
- The toolbar includes a user dropdown menu.
- The user dropdown shows user identification, display settings, and secondary menu items.
- In mobile layouts, primary navigation items move into the user dropdown.
- Dropdown items must remain keyboard accessible and expose appropriate roles and names.

## Forms

Forms use React Hook Form.

Required field structure:

```text
Label*
Control
Error
```

Validation errors must be associated with their controls through `aria-describedby`, expose `aria-invalid`, and use an announced error/status pattern where appropriate.

## Styling And Motion

- Use `src/styles.css` for global tokens and shared utility classes.
- Use semantic Shadcn classes such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `ring`, and `card` colors.
- Keep animations short and purposeful.
- Shared motion should use the existing `soft-enter` and `surface-motion` utilities unless a component needs a more specific pattern.
- Motion must degrade through the global `prefers-reduced-motion` rules.
