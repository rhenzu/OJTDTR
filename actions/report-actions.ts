"use server";

import { dbConnect } from "@/lib/mongodb";
import DailyRecordModel from "@/models/DailyRecord";
import UserModel from "@/models/User";
import WeeklyReportModel from "@/models/WeeklyReport";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─────────────────────────────────────────────────────────────
// Calendar-week helpers
// ─────────────────────────────────────────────────────────────

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the
 *  calendar week that contains `dateStr`. */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split("T")[0];
}



/** Returns the ISO date string of the Friday that is 4 days after
 *  the given Monday string. */
function getWeekFriday(mondayStr: string): string {
  const monday = new Date(mondayStr + "T00:00:00");
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday.toISOString().split("T")[0];
}

/** Groups an array of day records (sorted asc by date) into calendar
 *  weeks.  Returns an array of { monday, friday, days } objects,
 *  also sorted ascending. */
function groupByCalendarWeek(records: any[]): {
  monday: string;
  friday: string;
  days: any[];
}[] {
  const map = new Map<string, any[]>();
  for (const r of records) {
    const monday = getWeekMonday(r.date as string);
    if (!map.has(monday)) map.set(monday, []);
    map.get(monday)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, days]) => ({
      monday,
      friday: getWeekFriday(monday),
      days,
    }));
}

// ─────────────────────────────────────────────────────────────
// FETCH only — no AI generation.
// ─────────────────────────────────────────────────────────────
export async function saveWeeklyReport(reportId: string, aiData: object) {
  await dbConnect();

  const report = await WeeklyReportModel.findById(reportId);
  if (!report) throw new Error("Report not found.");

  report.aiData = aiData;
  await report.save();

  revalidatePath("/weekly-reports");
  return { success: true };
}
export async function getWeeksData(userId: string) {
  await dbConnect();

  const user = await UserModel.findById(userId).lean() as { startDate?: string } | null;
  if (!user?.startDate) return [];

  const records = await DailyRecordModel.find({
    userId,
    date: { $gte: user.startDate },
  })
    .sort({ date: 1 })
    .lean();

  const validDays = (records as any[]).filter(
    (r) => r.totalHours > 0 && r.accomplishments?.trim()
  );

  const weeks = groupByCalendarWeek(validDays);

  const existingReports = await WeeklyReportModel.find({ userId }).lean();
  const reportMap = new Map((existingReports as any[]).map((r) => [r.weekNo, r]));

  const today = new Date().toISOString().split("T")[0];

  return weeks.map(({ monday, friday, days }, index) => {
    const weekNo = index + 1;
    const existing = reportMap.get(weekNo) as any;
    const rawText = days
      .map((r: any) => `Date: ${r.date} - ${r.accomplishments}`)
      .join("\n");

    // A week is "complete" once its Friday has passed
    const isComplete = today > friday;

    return {
      _id: existing?._id?.toString() ?? null,
      weekNo,
      startDate: days[0].date as string,
      endDate: days[days.length - 1].date as string,
      weekStart: monday,   // actual Mon of this calendar week
      weekEnd: friday,     // actual Fri of this calendar week
      isComplete,
      rawText,
      aiData: existing?.aiData ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// GENERATE a single week on demand (called from the client).
// ─────────────────────────────────────────────────────────────
export async function generateSingleWeekReport(userId: string, weekNo: number) {
  await dbConnect();

  const user = await UserModel.findById(userId).lean() as { startDate?: string } | null;
  if (!user?.startDate) throw new Error("User not found.");

  const records = await DailyRecordModel.find({
    userId,
    date: { $gte: user.startDate },
  })
    .sort({ date: 1 })
    .lean();

  const validDays = (records as any[]).filter(
    (r) => r.totalHours > 0 && r.accomplishments?.trim()
  );

  const weeks = groupByCalendarWeek(validDays);
  const week = weeks[weekNo - 1];
  if (!week) throw new Error(`No data found for Week ${weekNo}.`);

  const { monday, friday, days } = week;
  const today = new Date().toISOString().split("T")[0];
  const isComplete = today > friday;

  const startDate = days[0].date as string;
  const endDate = days[days.length - 1].date as string;
  const rawText = days
    .map((r: any) => `Date: ${r.date} - ${r.accomplishments}`)
    .join("\n");

  const aiData = await generateReportContentWithAI(rawText);
  if (!aiData) throw new Error("AI generation failed. Please try again.");

  const saved = await WeeklyReportModel.findOneAndUpdate(
    { userId, weekNo },
    { startDate, endDate, weekStart: monday, weekEnd: friday, isComplete, rawText, aiData },
    { upsert: true, new: true }
  );

  revalidatePath("/weekly-reports");
  return JSON.parse(JSON.stringify(saved));
}

// ─────────────────────────────────────────────────────────────
// REGENERATE an existing report (with optional custom prompt).
// ─────────────────────────────────────────────────────────────
export async function regenerateWeeklyReport(reportId: string, customPrompt?: string) {
  await dbConnect();

  const report = await WeeklyReportModel.findById(reportId);
  if (!report) throw new Error("Report not found.");

  const newAiData = await generateReportContentWithAI(report.rawText, customPrompt);
  if (!newAiData) return { error: "AI generation failed. Please try again." };

  report.aiData = newAiData;
  await report.save();
  revalidatePath("/weekly-reports");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// Internal AI helper
// ─────────────────────────────────────────────────────────────
async function generateReportContentWithAI(rawText: string, customPrompt?: string) {
  const prompt = `
You are an assistant for an IT OJT (On-the-Job Training) student.
Generate a Weekly Progress Report JSON from the daily accomplishments below.

CRITICAL FORMATTING RULES (to fit on a single A4 page):
- dutiesPerformed   : exactly 1 sentence, max 20 words
- newTrainings      : exactly 1 sentence, max 20 words
- proposedActivities: exactly 3 items, each item max 10 words
- actualAccomplishments: exactly 3 items that directly match each proposed activity, each max 10 words
- problemsEncountered: exactly 1 sentence, max 20 words
- solutions         : exactly 1 sentence, max 20 words
- goalsNextWeek     : exactly 1 sentence, max 20 words

Daily Accomplishments:
${rawText}

${customPrompt ? `Additional instructions: ${customPrompt}\n` : ""}
Return ONLY a valid JSON object — no markdown fences, no explanation, no extra keys.
Example structure:
{
  "dutiesPerformed": "...",
  "newTrainings": "...",
  "proposedActivities": ["...", "...", "..."],
  "actualAccomplishments": ["...", "...", "..."],
  "problemsEncountered": "...",
  "solutions": "...",
  "goalsNextWeek": "..."
}
`.trim();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(text);

    const required = [
      "dutiesPerformed",
      "newTrainings",
      "proposedActivities",
      "actualAccomplishments",
      "problemsEncountered",
      "solutions",
      "goalsNextWeek",
    ] as const;

    for (const key of required) {
      if (!(key in parsed)) throw new Error(`AI response missing key: ${key}`);
    }

    if (Array.isArray(parsed.proposedActivities))
      parsed.proposedActivities = parsed.proposedActivities.slice(0, 3);
    if (Array.isArray(parsed.actualAccomplishments))
      parsed.actualAccomplishments = parsed.actualAccomplishments.slice(0, 3);

    return parsed;
  } catch (error) {
    console.error("AI Generation failed:", error);
    return null;
  }
}
