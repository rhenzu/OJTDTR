// lib/dtr-logic.ts
import { 
  addDays, 
  format, 
  parseISO, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  setDate, 
  max 
} from "date-fns";

/** * Get the calendar-based period (1-15 or 16-EOM) that contains a given date.
 * If the period starts before the user's actual start date, clamp it to the user's start date. 
 */
export function getFormPeriod(dateStr: string, startDateStr: string): { start: string; end: string } {
  const date = parseISO(dateStr);
  const userStart = parseISO(startDateStr);

  const day = date.getDate();
  let periodStart: Date;
  let periodEnd: Date;

  // Check if the date falls in the first half or second half of the month
  if (day <= 15) {
    periodStart = startOfMonth(date); // 1st of the month
    periodEnd = setDate(date, 15);    // 15th of the month
  } else {
    periodStart = setDate(date, 16);  // 16th of the month
    periodEnd = endOfMonth(date);     // Last day of the month (28, 29, 30, or 31)
  }

  // If the standard period start is BEFORE the user's actual start date,
  // clamp it so it doesn't show days before they even started (e.g., Jan 28 to Jan 31)
  const actualStart = max([periodStart, userStart]);

  return {
    start: format(actualStart, "yyyy-MM-dd"),
    end: format(periodEnd, "yyyy-MM-dd"),
  };
}

/** Generate all dates in the calculated period */
export function getDaysInPeriod(startStr: string, endStr: string): string[] {
  return eachDayOfInterval({
    start: parseISO(startStr),
    end: parseISO(endStr),
  }).map((d) => format(d, "yyyy-MM-dd"));
}

/** Get a human-readable period title */
export function getPeriodTitle(startStr: string, endStr: string): string {
  const s = parseISO(startStr);
  const e = parseISO(endStr);
  const sf = format(s, "MMMM d, yyyy");
  const ef = format(e, "MMMM d, yyyy");
  return `${sf} - ${ef}`;
}

/** Get all periods from the user's start date up to today */
export function getAllPeriods(startDateStr: string, today: string): Array<{ start: string; end: string; title: string }> {
  const periods: Array<{ start: string; end: string; title: string }> = [];
  const endDate = parseISO(today);

  let currentEvalDate = parseISO(startDateStr);

  // Generate periods sequentially until we pass today's date
  while (currentEvalDate <= endDate) {
    const period = getFormPeriod(format(currentEvalDate, "yyyy-MM-dd"), startDateStr);

    periods.push({
      start: period.start,
      end: period.end,
      title: getPeriodTitle(period.start, period.end),
    });

    // Move to the next period by adding 1 day to the end of the current period
    currentEvalDate = addDays(parseISO(period.end), 1);
  }

  return periods.reverse(); // Return latest first for the dashboard UI
}