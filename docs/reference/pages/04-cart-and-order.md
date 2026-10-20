# Cart and Ordering

## Verification status

S14 states that cart and buyer information are stored in the browser. S03/S08 mention delivery dates/slots. S13 describes COD/bank transfer and shipping fees confirmed by the shop. **The cart UI, checkout form, submission request, success page, and payment mechanism were not observed.** Probed cart/checkout URLs were unreadable; this does not establish that the features are absent.

The following is **PROPOSED — a functional contract for the reconstruction**, with layout and integration to be adjusted after capture.

## Cart lines

Each line stores product/variant IDs, quantity, display snapshots, delivery configuration, and messages. Do not merge the same variant when date, recipient, or message differs. Decide which fields belong at order level after observing the actual flow.

```typescript
type CartLine = {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  configuration: {
    deliveryDate?: string; // YYYY-MM-DD in the shop timezone
    slotId?: string;
    cardMessage?: string;
    specialRequest?: string;
  };
};
type ShippingQuote =
  | { status: 'unknown'; amountVnd: null }
  | { status: 'quoted'; amountVnd: number; quoteId: string };
```

Display prices are calculated from the current catalog; snapshots are not a trusted server-side price source. Quantity is a positive integer with a configurable limit. Do not infer its maximum from the number of flowers in a bouquet.

## Proposed persistence

- Use a versioned schema, such as `af.cart.v1`. This is a reconstruction key; the original key is unknown.
- Validate JSON on hydration; corrupt data must not crash the app.
- Handle blocked/full localStorage and allow in-memory operation.
- If catalog prices change or variants disappear, show the change before order handoff.
- Clearing the cart removes its lines. If buyer details should also be cleared, make that behavior explicit and consistent with the policy.
- Do not store secrets, payment tokens, or card details. Do not send contact drafts to analytics.

## Field groups

| Group | Fields | Evidence/proposal |
|---|---|---|
| Buyer | Name, phone | S14 |
| Recipient | Name, phone, address | S14 |
| Delivery | Date, time slot | S03/S08 copy; control placement unknown |
| Gift message | Card message, banner request | S04 copy; field schema proposed |
| Payment | COD, bank transfer | S13 copy; UI/confirmation unknown |
| Totals | Flower subtotal, shipping if known, known total | Proposed implementation |

Do not add mandatory email, invoicing, account, or coupon fields unless the reference establishes them.

## Delivery scheduling

Public content mentions ordinary delivery between 08:00 and 18:00, with an additional 18:00–20:00 holiday window, advance ordering, and specific cutoffs. This does not define every slot, closed date, or capacity. Obtain the slot configuration through capture or owner confirmation.

Proposed implementation:

1. Use `Asia/Ho_Chi_Minh`; store delivery dates as local dates. Do not parse `YYYY-MM-DD` as UTC and accidentally change the day.
2. Configure slots with `startLocal`, `endLocal`, `cutoffLocal`, `leadTimeMinutes`, applicable dates, and capacity if needed.
3. Calculate eligibility using current shop-local time; reject past dates.
4. Revalidate a slot at submission if it expires while the form is open.
5. Holiday windows are date-specific overrides, not daily defaults.
6. If no slots remain, offer another date or contact. Do not silently reschedule.

## Shipping and payment

- VND amounts are integers. Unknown shipping must be described as awaiting confirmation using approved copy.
- Do not present a final confirmed total when shipping is still unknown.
- A one-kilometer free-delivery rule needs a verified shop location and distance method. Do not decide eligibility from district names or address-string length.
- Do not invent the shop's bank account or payment QR. Use confirmed configuration.
- COD does not mean paid. Opening Zalo does not mean the order was submitted successfully.

## Adapter options to select after capture

| Adapter | When appropriate | Correct final state |
|---|---|---|
| Contact handoff | The reference only prepares information or opens Zalo | Information prepared; customer still needs to send/confirm |
| Reconstruction order API | The reference submits an order, or the owner explicitly adds a backend | Server-issued order ID; pending confirmation |

Do not switch adapters silently to conceal a failure. If a Zalo deep link does not support prefilled text, a copy-summary button plus a contact link can be proposed as a documented fallback; it is not a verified original behavior.

For an API adapter, validate server-side, recalculate price/availability, use an idempotency key, and ensure retries do not create duplicate orders. Report success only after a real adapter acknowledgment.

## Acceptance

- Two bouquets with the same code but different messages remain separate lines.
- Reload preserves the cart; corrupt state and expired variants are handled.
- Totals update correctly when quantity/variant changes.
- An order cannot be submitted without a valid recipient and delivery slot.
- Double-click/retry does not create duplicates in API mode.
- Test submission locally or with mocks, not by creating real reference-site orders.
