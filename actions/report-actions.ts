"use server";

import { dbConnect } from "@/lib/mongodb";
import DailyRecordModel from "@/models/DailyRecord";
import UserModel from "@/models/User";
import WeeklyReportModel from "@/models/WeeklyReport";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateWeeklyReports(userId: string) {
  await dbConnect();
  
  const user = await UserModel.findById(userId).lean() as { startDate?: string } | null;
  if (!user || !user.startDate) throw new Error("User or OJT start date not found");

  const records = await DailyRecordModel.find({
    userId,
    date: { $gte: user.startDate },
  }).sort({ date: 1 }).lean();

  const validWorkingDays = records.filter(
    (r) => r.totalHours && r.totalHours > 0 && r.accomplishments && r.accomplishments.trim() !== ""
  );

  const chunks = [];
  for (let i = 0; i < validWorkingDays.length; i += 5) {
    chunks.push(validWorkingDays.slice(i, i + 5));
  }

  const reports = await Promise.all(
    chunks.map(async (chunk, index) => {
      const weekNo = index + 1;
      const startDate = chunk[0].date;
      const endDate = chunk[chunk.length - 1].date;
      const isComplete = chunk.length === 5;
      
      const rawAccomplishments = chunk
        .map((r) => `Date: ${r.date} - ${r.accomplishments}`)
        .join("\n");

      // Check if this report already exists in the database
      const existingReport = await WeeklyReportModel.findOne({ userId, weekNo });

      // If it exists AND the raw accomplishments haven't changed, just return the saved version!
      if (existingReport && existingReport.rawText === rawAccomplishments) {
        return JSON.parse(JSON.stringify(existingReport));
      }

      // Otherwise, generate it via AI (either it's new, or you logged a new day making the raw text longer)
      const aiData = await generateReportContentWithAI(rawAccomplishments);

      // Save or Update in the database
      const savedReport = await WeeklyReportModel.findOneAndUpdate(
        { userId, weekNo },
        { startDate, endDate, isComplete, rawText: rawAccomplishments, aiData },
        { upsert: true, new: true }
      );

      return JSON.parse(JSON.stringify(savedReport));
    })
  );

  return reports;
}

export async function regenerateWeeklyReport(reportId: string, customPrompt?: string) {
  await dbConnect();
  const report = await WeeklyReportModel.findById(reportId);
  if (!report) throw new Error("Report not found in database.");

  const newAiData = await generateReportContentWithAI(report.rawText, customPrompt);
  
  if (newAiData) {
    report.aiData = newAiData;
    await report.save();
    revalidatePath("/weekly-reports");
    return { success: true };
  }
  return { error: "Failed to regenerate report." };
}

async function generateReportContentWithAI(rawText: string, customPrompt?: string) {
  let prompt = `
    You are an assistant for an IT OJT student. Based on the following daily accomplishments over a week, generate a structured JSON object for their Weekly Progress Report. 
    Make the outputs concise, professional, and use bullet points where necessary.

    Raw Accomplishments:
    ${rawText}

    Return ONLY a JSON object with these exact keys:
    - "dutiesPerformed": A 1-2 sentence summary of general duties.
    - "newTrainings": A 1-2 sentence summary of new skills or tool setups.
    - "proposedActivities": An array of strings (3-5 short bullet points).
    - "actualAccomplishments": An array of strings (3-5 short bullet points directly corresponding to the proposed activities).
    - "problemsEncountered": 1 sentence describing a realistic challenge based on the context.
    - "solutions": 1 sentence describing how it was overcome.
    - "goalsNextWeek": 1 sentence stating a goal for next week.
  `;

  if (customPrompt) {
    prompt += `\n\nUSER ADDITIONAL INSTRUCTIONS: ${customPrompt}\nMake sure to strictly follow these additional instructions while keeping the JSON format intact.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation failed", error);
    return null;
  }
}
