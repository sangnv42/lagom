import { describe, expect, it } from 'vitest';
import { campaignRemaining } from '../src/lib/campaign';

describe('campaign countdown (clamps at zero, expires)', () => {
  const endsAt = new Date('2026-10-19T17:00:00Z'); // 2026-10-20 00:00 VN
  it('counts down before the deadline', () => {
    const before = new Date(endsAt.getTime() - (6 * 86_400_000 + 3_600_000 * 2 + 60_000 * 5));
    const c = campaignRemaining(before);
    expect(c.expired).toBe(false);
    expect(c.days).toBe(6);
    expect(c.hours).toBe(2);
    expect(c.minutes).toBe(5);
  });
  it('clamps at zero and reports expired (never negative/frozen)', () => {
    expect(campaignRemaining(endsAt).expired).toBe(true);
    const after = campaignRemaining(new Date(endsAt.getTime() + 10 * 86_400_000));
    expect(after).toEqual({ days: 0, hours: 0, minutes: 0, expired: true });
  });
});
