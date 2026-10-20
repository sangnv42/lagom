# Session Handoff Template

Save the active version as `docs/reference/prompts/handoff-current.md`. Update it after each phase or when pausing work. Do not paste the entire conversation history.

```markdown
# Handoff — Arch Flowers Reconstruction

Updated at:
Current phase:
Branch/commit:

## Continuing objective
- Reproduce the current version, prioritizing the theme and actual user flow.

## Status
| Area | Implemented | Functionally verified | Visually verified |
|---|---|---|---|
| Theme/shell | | | |
| Home | | | |
| Collections | | | |
| Product | | | |
| Cart/order | | | |
| Policies/routes | | | |

## New evidence
- URL/source:
- Capture date/viewport/state:
- Changes to earlier decisions:

## Code changes
- File:
- Behavior:
- Reason:

## Verification
- Command/test:
- Result:
- Reference/local screenshots, if available:

## Unverified areas
- Missing evidence:
- Impact:
- Evidence required to resolve:

## Decisions to preserve
- Theme source:
- Catalog source:
- Order adapter:
- URL/query rules:

## Next steps
1.
2.
3.

## Running the project
- Install:
- Dev:
- Build:
- Tests:
- Required environment variable names only; no secrets:
```

A useful handoff retains the decisions, evidence, and next steps needed to continue. Unverified work must not become complete merely because a new session starts.
