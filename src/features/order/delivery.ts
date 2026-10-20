// Delivery scheduling policy — observed rules from docs/reference/captures/app.js `product()`:
// - three 3-hour windows daily, 08:00–18:00 Vietnam time
// - holiday extra window 18:00–20:00, selectable only on configured holiday dates (MM-DD)
// - same-day orders need >= 2h lead before the window START (owner rule)
// - dates/cutoffs re-evaluated against shop-local (Asia/Ho_Chi_Minh) clock, incl. at submission

import { DELIVERY } from '../../data/business';
import { vnDateISO, vnHour, vnAddDays } from '../../lib/vntime';

export type SlotState = { label: string; disabled: boolean; reason?: 'holiday' | 'past' };

export function isHolidayDate(dateIso: string): boolean {
  return DELIVERY.holidays.includes(dateIso.slice(5));
}

/** A same-day window is past when now (VN) is within `leadHours` of its start. */
export function slotIsPast(dateIso: string, slotLabel: string, now: Date): boolean {
  const today = vnDateISO(now);
  if (dateIso !== today) return false;
  const startHour = Number(slotLabel.split('–')[0].trim().slice(0, 2));
  return vnHour(now) > startHour - DELIVERY.leadHours;
}

/** All slots for a date with disabled states (holiday window is always listed, gated by date). */
export function slotsForDate(dateIso: string, now: Date): SlotState[] {
  const hol = isHolidayDate(dateIso);
  return [...DELIVERY.slots, DELIVERY.holidaySlot].map((label) => {
    if (label === DELIVERY.holidaySlot && !hol) return { label, disabled: true, reason: 'holiday' as const };
    if (slotIsPast(dateIso, label, now)) return { label, disabled: true, reason: 'past' as const };
    return { label, disabled: false };
  });
}

/** Date is bookable when at least one slot is still open. */
export function dateIsOpen(dateIso: string, now: Date): boolean {
  return slotsForDate(dateIso, now).some((s) => !s.disabled);
}

/** Earliest bookable date: today if any window remains, else tomorrow. */
export function firstOpenDate(now: Date): string {
  const today = vnDateISO(now);
  return dateIsOpen(today, now) ? today : vnAddDays(today, 1);
}

// Observed quick-date chips on the PDP: first bookable day, the day after it, plus a
// 20/10 shortcut offered while both first bookable days still precede 20/10.
export function qDates(now: Date): { iso: string; label: string }[] {
  const today = vnDateISO(now);
  const first = firstOpenDate(now);
  const second = vnAddDays(first, 1);
  const labelFor = (iso: string) => (iso === today ? 'Hôm nay' : iso === vnAddDays(today, 1) ? 'Ngày mai' : 'Ngày kia');
  const out = [
    { iso: first, label: labelFor(first) },
    { iso: second, label: labelFor(second) },
  ];
  if (first < '2026-10-20' && second < '2026-10-20') out.push({ iso: '2026-10-20', label: '20/10' });
  return out;
}

/** Cutoff note for the date chosen (observed copy). '' when date is not today. */
export function cutoffNote(dateIso: string, now: Date): string {
  if (dateIso !== vnDateISO(now)) return '';
  const open = slotsForDate(dateIso, now).filter((s) => s.reason !== 'past');
  if (!open.length) return '';
  const last = open[open.length - 1].label;
  const hour = String(Number(last.split('–')[0].trim().slice(0, 2)) - DELIVERY.leadHours).padStart(2, '0');
  return `Hôm nay còn kịp giao: đặt trước ${hour}:00 cho khung ${last.replace(' (ngày lễ)', '')}.`;
}

/** Submission-time revalidation: slot must exist and not be disabled for the chosen date. */
export function validateSelection(dateIso: string, slot: string, now: Date): string | null {
  if (!dateIso) return 'Chọn ngày giao trước đã';
  const match = slotsForDate(dateIso, now).find((s) => s.label === slot);
  if (!match) return 'Khung giờ không hợp lệ – chọn khung giờ khác';
  if (match.disabled) {
    if (match.reason === 'holiday') return 'Khung 18:00 – 20:00 chỉ áp dụng ngày lễ – chọn khung giờ khác';
    return 'Khung giờ này đã qua – vui lòng chọn khung giờ khác hoặc ngày khác';
  }
  return null;
}
