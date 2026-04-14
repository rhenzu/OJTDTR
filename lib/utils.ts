import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PH_TZ = "Asia/Manila";

export function getNowPH(): Date {
  return toZonedTime(new Date(), PH_TZ);
}

export function getTodayString(): string {
  return format(getNowPH(), "yyyy-MM-dd");
}

export function formatTimeDisplay(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "--:--";
  try {
    const d = typeof isoOrDate === "string" ? parseISO(isoOrDate) : isoOrDate;
    const ph = toZonedTime(d, PH_TZ);
    return format(ph, "hh:mm a");
  } catch {
    return "--:--";
  }
}

export function formatDateDisplay(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMM dd, yyyy"); }
  catch { return dateStr; }
}

export function formatDateLong(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMMM dd, yyyy"); }
  catch { return dateStr; }
}

export function isoToTimeInput(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    const d = parseISO(isoStr);
    const ph = toZonedTime(d, PH_TZ);
    return format(ph, "HH:mm");
  } catch { return ""; }
}

export function getCurrentTimeInput(): string {
  return format(getNowPH(), "HH:mm");
}

export function calcHours(morningIn: string | null, afternoonOut: string | null): number {
  if (!morningIn || !afternoonOut) return 0;
  try {
    const inMs = parseISO(morningIn).getTime();
    const outMs = parseISO(afternoonOut).getTime();
    const diffH = (outMs - inMs) / (1000 * 60 * 60);
    return Math.max(0, parseFloat((diffH - 1).toFixed(2)));
  } catch { return 0; }
}

export function isLate(morningIn: string | null): boolean {
  if (!morningIn) return false;
  const d = toZonedTime(parseISO(morningIn), PH_TZ);
  return d.getHours() * 60 + d.getMinutes() > 8 * 60;
}

export function isEarlyOut(afternoonOut: string | null): boolean {
  if (!afternoonOut) return false;
  const d = toZonedTime(parseISO(afternoonOut), PH_TZ);
  return d.getHours() * 60 + d.getMinutes() < 17 * 60;
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
