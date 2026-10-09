# Portal billing correction — released October 8, 2026

The Owner-authorized API and Portal UI update is complete. Application source is [64c5d9dc](https://github.com/behaack/phaeno-ops-mgmt-system/commit/64c5d9dcbef45c7d15d5681c29547399c1eab187).

The billing modal now scrolls through payment terms, tax and Finance approval controls, with Save changes fixed in the footer. Its redundant inner card is removed. Shared readiness instructions and Phaeno help use More → Finance → Customer billing.

The required vendor framework security patch and compatible SSR/query integration are included. Frozen dependency installation, TypeScript, lint, builds and documentation checks pass. Actual hosted rendering, sign-in, authenticated billing-modal behavior, API/proxy health and authorization checks pass. Full automated suites were not requested or run.

Verified encrypted recovery is retained separately. No database migration or reset, identity cutover, billing save, tax approval, invoice or scientific transaction was performed by deployment smoke. Deployment controls are restored, and unrelated local work is preserved.

Detailed operational and recovery evidence remains outside this public document.
