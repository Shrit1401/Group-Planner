import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDayName(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDayShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function slotToTime(slotIndex: number, timeStart: number): string {
  const totalMinutes = timeStart * 60 + slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${h12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function getTotalSlots(timeStart: number, timeEnd: number): number {
  return (timeEnd - timeStart) * 2;
}

export function getDatesForRange(range: string): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (range) {
    case "today":
      return [fmt(today)];
    case "tomorrow": {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      return [fmt(t)];
    }
    case "this_weekend": {
      const day = today.getDay();
      const daysToSat = ((6 - day + 7) % 7) || 7;
      const sat = new Date(today);
      sat.setDate(today.getDate() + daysToSat);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      return [fmt(sat), fmt(sun)];
    }
    case "next_week": {
      const day = today.getDay();
      const daysToMon = ((8 - day) % 7) || 7;
      const mon = new Date(today);
      mon.setDate(today.getDate() + daysToMon);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return fmt(d);
      });
    }
    default:
      return [fmt(today)];
  }
}

export function getTimeRange(window: string): { start: number; end: number } {
  switch (window) {
    case "morning":
      return { start: 8, end: 12 };
    case "afternoon":
      return { start: 12, end: 17 };
    case "evening":
      return { start: 17, end: 23 };
    case "all_day":
      return { start: 8, end: 22 };
    default:
      return { start: 17, end: 23 };
  }
}

export type TimeWindowValue = "morning" | "afternoon" | "evening" | "all_day";

export const TIME_WINDOW_ORDER: TimeWindowValue[] = ["morning", "afternoon", "evening", "all_day"];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isTimeWindowAvailableForDate(
  dateStr: string,
  window: TimeWindowValue,
  now = new Date()
): boolean {
  const todayStr = toLocalDateStr(now);
  if (dateStr < todayStr) return false;
  if (dateStr > todayStr) return true;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  return currentHour < getTimeRange(window).start;
}

export function firstAvailableTimeWindowForDate(
  dateStr: string,
  preferred: TimeWindowValue,
  now = new Date()
): TimeWindowValue | null {
  if (isTimeWindowAvailableForDate(dateStr, preferred, now)) return preferred;
  return TIME_WINDOW_ORDER.find((window) => isTimeWindowAvailableForDate(dateStr, window, now)) ?? null;
}

export function isTimeWindowAvailableForDates(
  dates: string[],
  window: TimeWindowValue,
  now = new Date()
): boolean {
  return dates.length > 0 && dates.every((date) => isTimeWindowAvailableForDate(date, window, now));
}

export type PlanDoc = {
  hasTime: boolean;
  timeMode: "global" | "per_day";
  timeStart: number;
  timeEnd: number;
  perDayStarts?: Record<string, number>;
  perDayEnds?: Record<string, number>;
  dates: string[];
};

/** Returns the effective start/end hour for a specific date */
export function getDateRange(plan: PlanDoc, date: string): { start: number; end: number } {
  if (!plan.hasTime) return { start: 0, end: 0 };
  if (plan.timeMode === "per_day" && plan.perDayStarts && plan.perDayEnds) {
    return {
      start: plan.perDayStarts[date] ?? plan.timeStart,
      end: plan.perDayEnds[date] ?? plan.timeEnd,
    };
  }
  return { start: plan.timeStart, end: plan.timeEnd };
}

/** Returns the min start and max end across all dates (for grid layout) */
export function getGlobalRange(plan: PlanDoc): { start: number; end: number } {
  if (!plan.hasTime) return { start: 0, end: 0 };
  if (plan.timeMode !== "per_day" || !plan.perDayStarts || !plan.perDayEnds) {
    return { start: plan.timeStart, end: plan.timeEnd };
  }
  if (plan.dates.length === 0) return { start: plan.timeStart, end: plan.timeEnd };
  const starts = plan.dates.map((d) => plan.perDayStarts![d] ?? plan.timeStart);
  const ends = plan.dates.map((d) => plan.perDayEnds![d] ?? plan.timeEnd);
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

export function getHeatColor(count: number, total: number): string {
  if (total === 0 || count === 0) return "rgba(255,255,255,0.04)";
  const ratio = count / total;
  const opacity = 0.18 + ratio * 0.82;
  return `rgba(34, 197, 94, ${opacity.toFixed(2)})`;
}

export function computeBestSlots(
  participants: { slots: Record<string, number[]> }[],
  dates: string[],
  timeStart: number,
  timeEnd: number
): { date: string; slotIndex: number; count: number; names: string[] }[] {
  const totalSlots = getTotalSlots(timeStart, timeEnd);
  const results: { date: string; slotIndex: number; count: number; names: string[] }[] = [];

  for (const date of dates) {
    for (let s = 0; s < totalSlots; s++) {
      const freeParticipants = (participants as { name: string; slots: Record<string, number[]> }[]).filter(
        (p) => p.slots[date]?.includes(s)
      );
      if (freeParticipants.length > 0) {
        results.push({
          date,
          slotIndex: s,
          count: freeParticipants.length,
          names: freeParticipants.map((p) => p.name),
        });
      }
    }
  }

  return results.sort((a, b) => b.count - a.count || a.slotIndex - b.slotIndex);
}
