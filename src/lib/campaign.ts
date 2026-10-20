import { CAMPAIGN } from '../data/business';

export type CountdownParts = { days: number; hours: number; minutes: number; expired: boolean };

/** Pure countdown computation for the campaign; clamps at zero and reports expiry (testable). */
export function campaignRemaining(now: Date = new Date()): CountdownParts {
  const end = new Date(CAMPAIGN.endsAt).getTime();
  const ms = end - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    expired: false,
  };
}
