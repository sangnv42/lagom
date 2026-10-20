# Phase 7 — Cart, Scheduling, and Order Handoff

## Goal

Complete the commerce flow according to the captured structure, with reliable calculations and state handling.

## Read first

[Cart/order](../pages/04-cart-and-order.md), [Validation](../engineering/03-validation.md), and the ordering interaction log.

## Tasks

1. Implement the verified cart presentation—page, drawer, or modal—rather than choosing prematurely.
2. Implement merge identity, quantity changes, removal, clearing, and subtotals.
3. Version persistence, validate hydration, and handle storage/catalog changes.
4. Place buyer/recipient details, messages, and dates/slots in the observed steps.
5. Implement timezone, lead times, cutoffs, holiday overrides, and no-slot states.
6. Select the adapter according to the reference. Mock it first; keep real connections in separate configuration.
7. Represent unknown shipping accurately and distinguish order status from payment status.
8. Test validation, retries, duplicate submissions, and returning to edit information.

## Deliverables

CartStore, cart UI, DeliveryPolicy, form schema, OrderAdapter, mock flow, and tests.

## Acceptance

- The same variant with different configurations is not merged incorrectly.
- Reload preserves the cart; malformed JSON does not crash the application.
- Timezone/cutoff eligibility is checked on submission, not only initial rendering.
- Unknown shipping does not become free; opening contact does not become order success.
- Adapter errors allow correct retries without losing entered data.
- Without actual UI/submission evidence, this phase can achieve a domain prototype but not verified flow fidelity.

## Implementation prompt

```text
Execute Phase 7 from the captured flow and the cart/order specification.
Build CartStore, DeliveryPolicy, forms, and adapters that distinguish contact handoff
from API orders. Test money, cutoffs, persistence, and duplicate submission using
local/mock data. Do not submit real reference-site orders or report success merely
because Zalo opened.
```
