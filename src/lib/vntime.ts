// Vietnam shop-time helpers. Asia/Ho_Chi_Minh is a fixed UTC+7 offset (no DST).
// Reference implements the same via a fixed +420-minute shift (docs/reference/captures/app.js `nowVN`).

const VN_OFFSET_MIN = 420;

/** "Now" shifted into Vietnam wall-clock time; use getFullYear/getHours etc. on the result. */
export function vnNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + (now.getTimezoneOffset() + VN_OFFSET_MIN) * 60_000);
}

/** Local Vietnam date string YYYY-MM-DD for a given instant (never parses/shifts through UTC midnight). */
export function vnDateISO(now: Date = new Date()): string {
  const d = vnNow(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function vnAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days); // constructed as local calendar date, only used for formatting
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** dd/MM display for messages (reference formats dates reversed). */
export function ddMM(iso: string): string {
  return iso.split('-').reverse().join('/');
}

/** Hour of day in Vietnam wall clock (0-23) plus fractional hours. */
export function vnHour(now: Date = new Date()): number {
  const d = vnNow(now);
  return d.getHours() + d.getMinutes() / 60;
}
