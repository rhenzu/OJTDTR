"use server";

import { dbConnect } from "@/lib/mongodb";
import DailyRecordModel from "@/models/DailyRecord";
import UserModel from "@/models/User";
import WeeklyReportModel from "@/models/WeeklyReport";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─────────────────────────────────────────────────────────────
// FETCH only — no AI generation. Returns week structure + any
// already-saved aiData from the DB.
// ─────────────────────────────────────────────────────────────
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

  const chunks: any[][] = [];
  for (let i = 0; i < validDays.length; i += 5) {
    chunks.push(validDays.slice(i, i + 5));
  }

  const existingReports = await WeeklyReportModel.find({ userId }).lean();
  const reportMap = new Map((existingReports as any[]).map((r) => [r.weekNo, r]));

  return chunks.map((chunk, index) => {
    const weekNo = index + 1;
    const existing = reportMap.get(weekNo) as any;
    const rawText = chunk
      .map((r: any) => `Date: ${r.date} - ${r.accomplishments}`)
      .join("\n");

    return {
      _id: existing?._id?.toString() ?? null,
      weekNo,
      startDate: chunk[0].date as string,
      endDate: chunk[chunk.length - 1].date as string,
      isComplete: chunk.length === 5,
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

  const chunks: any[][] = [];
  for (let i = 0; i < validDays.length; i += 5) {
    chunks.push(validDays.slice(i, i + 5));
  }

  const chunk = chunks[weekNo - 1];
  if (!chunk) throw new Error(`No data found for Week ${weekNo}.`);

  const startDate = chunk[0].date as string;
  const endDate = chunk[chunk.length - 1].date as string;
  const isComplete = chunk.length === 5;
  const rawText = chunk
    .map((r: any) => `Date: ${r.date} - ${r.accomplishments}`)
    .join("\n");

  const aiData = await generateReportContentWithAI(rawText);
  if (!aiData) throw new Error("AI generation failed. Please try again.");

  const saved = await WeeklyReportModel.findOneAndUpdate(
    { userId, weekNo },
    { startDate, endDate, isComplete, rawText, aiData },
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
// Internal AI helper — compact output sized for A4.
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

    // Strip markdown fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(text);

    // Validate all required keys exist
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

    // Enforce max 3 bullet points
    if (Array.isArray(parsed.proposedActivities)) {
      parsed.proposedActivities = parsed.proposedActivities.slice(0, 3);
    }
    if (Array.isArray(parsed.actualAccomplishments)) {
      parsed.actualAccomplishments = parsed.actualAccomplishments.slice(0, 3);
    }

    return parsed;
  } catch (error) {
    console.error("AI Generation failed:", error);
    return null;
  }
}
