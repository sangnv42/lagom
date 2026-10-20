# Phase 9 — QA, Fidelity, and Handoff

## Goal

Assess actual completion, fix important differences, and hand over the reconstruction.

## Read first

[Validation](../engineering/03-validation.md), route/asset manifests, captures, and earlier phase handoffs.

## Tasks

1. Run build/type checks and tests for money, variants, cart identity, scheduling, and redirects.
2. Verify the end-to-end path: home → collection → PDP → cart → order handoff/mock result.
3. Check every manifest route and report failures/unverified entries separately.
4. Capture the reconstruction at matching reference viewports/states and list differences.
5. Fix fonts, assets, and geometry before small color details; check effects on other templates.
6. Check keyboard use, mobile overflow, loading/errors, and basic performance.
7. Deliver run instructions, environment setup, datasets/assets, known limitations, and deployment/rollback notes.

## Deliverables

QA report, visual comparison report, route coverage report, run/deploy README, and remaining differences.

## Acceptance

- No severe functional defects remain in the main flow.
- Implemented templates have desktop/mobile comparisons.
- Do not claim pixel-perfect fidelity with missing references or obvious mismatches.
- Claim all 292 products only after successful manifest reconciliation, not simply a matching record count.
- Production connections use owner-provided configuration; mocks never appear as real transactions.

## Implementation prompt

```text
Execute Phase 9. Evaluate evidence, functional, and visual gates separately.
Run meaningful tests and verify the main desktop/mobile flow. Compare screenshots
at matching viewports/states, fix important differences, and record unverifiable areas.
Deliver an accurate completion report; a passing build is not 100% visual fidelity.
```
