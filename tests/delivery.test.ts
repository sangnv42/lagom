import { describe, expect, it } from 'vitest';
import { dateIsOpen, firstOpenDate, isHolidayDate, slotIsPast, slotsForDate, validateSelection } from '../src/features/order/delivery';
import { vnDateISO } from '../src/lib/vntime';

const utc = (iso: string) => new Date(iso);

describe('delivery policy (D01/D02/D03, Asia/Ho_Chi_Minh)', () => {
  it('D01: dates follow the Vietnam clock, not UTC', () => {
    // 2026-11-19T17:30:00Z = 2026-11-20 00:30 in Vietnam
    expect(vnDateISO(utc('2026-11-19T17:30:00Z'))).toBe('2026-11-20');
    expect(vnDateISO(utc('2026-11-19T16:59:00Z'))).toBe('2026-11-19');
    // at 00:30 VN the first window (cutoff 06:00) is still open for the VN date
    expect(dateIsOpen('2026-11-20', utc('2026-11-19T17:30:00Z'))).toBe(true);
  });

  it('same-day slots close 2h before window start', () => {
    const noonVn = utc('2026-11-20T05:00:00Z'); // 12:00 VN
    expect(slotIsPast('2026-11-20', '08:00 – 11:00', noonVn)).toBe(true); // cutoff 06:00
    expect(slotIsPast('2026-11-20', '11:00 – 14:00', noonVn)).toBe(true); // cutoff 09:00
    expect(slotIsPast('2026-11-20', '15:00 – 18:00', noonVn)).toBe(false); // cutoff 13:00
    // tomorrow's slots are never "past"
    expect(slotIsPast('2026-11-21', '08:00 – 11:00', noonVn)).toBe(false);
  });

  it('holiday window is gated by date (D03)', () => {
    expect(isHolidayDate('2026-10-20')).toBe(true);
    expect(isHolidayDate('2026-11-18')).toBe(false);
    const morning = utc('2026-10-19T20:00:00Z'); // 2026-10-20 03:00 VN
    const hol = slotsForDate('2026-10-20', morning).find((s) => s.label.startsWith('18:00 – 20:00'));
    const reg = slotsForDate('2026-11-18', morning).find((s) => s.label.startsWith('18:00 – 20:00'));
    expect(hol?.disabled).toBe(false);
    expect(reg?.disabled).toBe(true);
    expect(reg?.reason).toBe('holiday');
  });

  it('firstOpenDate skips a fully elapsed day', () => {
    const lateNightVn = utc('2026-11-20T11:30:00Z'); // 18:30 VN: last cutoff was 13:00
    expect(dateIsOpen('2026-11-20', lateNightVn)).toBe(false);
    expect(firstOpenDate(lateNightVn)).toBe('2026-11-21');
  });

  it('D02: a slot chosen before the cutoff is rejected after it expires (submit-time check)', () => {
    const before = utc('2026-11-20T01:00:00Z'); // 08:00 VN — 11:00–14:00 window still open (cutoff 09:00)
    expect(validateSelection('2026-11-20', '11:00 – 14:00', before)).toBeNull();
    const after = utc('2026-11-20T07:30:00Z'); // 14:30 VN — window elapsed
    expect(validateSelection('2026-11-20', '11:00 – 14:00', after)).toMatch(/đã qua/);
    expect(validateSelection('', '08:00 – 11:00', before)).toMatch(/Chọn ngày/);
  });

  it('holiday-only slot cannot be selected on a regular date', () => {
    const t = utc('2026-11-17T22:00:00Z'); // 2026-11-18 05:00 VN (regular day)
    expect(validateSelection('2026-11-18', '18:00 – 20:00 (ngày lễ)', t)).toMatch(/chỉ áp dụng ngày lễ/);
  });
});
