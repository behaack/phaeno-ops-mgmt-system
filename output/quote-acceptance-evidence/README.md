# Quote acceptance transition — October 2, 2026

Manual browser inspection used the actual LabServiceDetailPage, real TanStack
router blockers, shared dialogs and phase shipping task. All API calls used an
in-memory Axios adapter; no saved order or kit request was changed.

- Before the correction, accepting a confirmed synthetic quote reproduced
  `Discard unsaved order changes?` (`before-discard.png`).
- After the correction, acceptance closed the confirmation, selected Progress
  (`detailTab=phases`), and enabled Request transportation kits without a reload.
  `after-progress.png` shows one simulated acceptance and zero kit requests.
- Opening Request transportation kits immediately succeeded and initially
  focused Cancel. The request was not submitted.
- Closing an unsubmitted confirmation still asked to discard changes; choosing
  Keep reviewing retained the purchase order and checked Sample type.

Passed: TypeScript checking, scoped ESLint, documentation generation/check,
and `git diff --check`. Regression source: frontend/e2e/lab-quote-acceptance.spec.ts.
Automated tests were authored but not executed under the request-only rule.
The preview was stopped and its temporary configuration/cache removed.
This is synthetic local evidence, not live or production acceptance.
