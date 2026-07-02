import { toZonedTime } from 'date-fns-tz';

export interface WeekBreak {
  start: string; // "HH:mm"
  end: string;
}

export interface WeekSlot {
  day: number; // 0=Sun … 6=Sat (matches Date.getDay())
  start: string; // "HH:mm"
  end: string;
  breaks?: WeekBreak[];
}

export interface ShiftStaff {
  isActive: boolean;
  week?: WeekSlot[];
}

export type ShiftStatus = 'on-shift' | 'on-break' | 'off';

const SALON_TZ = 'Africa/Tunis';

/** now ∈ créneau du jour ET hors pause → 'on-shift'. Timezone salon (Africa/Tunis). */
export function getShiftStatus(
  staff: ShiftStaff,
  tz: string = SALON_TZ,
  at: Date = new Date(),
): ShiftStatus {
  if (!staff.isActive) return 'off';
  const now = toZonedTime(at, tz);
  const day = now.getDay();
  const slot = staff.week?.find((w) => w.day === day);
  if (!slot) return 'off';
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm < slot.start || hhmm >= slot.end) return 'off';
  const onBreak = (slot.breaks ?? []).some((b) => hhmm >= b.start && hhmm < b.end);
  return onBreak ? 'on-break' : 'on-shift';
  // TODO V1.1 : soustraire les overrides off/leave du jour (Schedule.overrides)
}

export function isOnShift(staff: ShiftStaff, tz: string = SALON_TZ, at: Date = new Date()): boolean {
  return getShiftStatus(staff, tz, at) === 'on-shift';
}

export function countOnShift(staff: ShiftStaff[], tz: string = SALON_TZ, at: Date = new Date()): number {
  return staff.filter((s) => isOnShift(s, tz, at)).length;
}
