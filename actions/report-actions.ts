"use server";

import { dbConnect } from "@/lib/mongodb";
import DailyRecordModel from "@/models/DailyRecord";
import UserModel from "@/models/User";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateWeeklyReports(userId: string) {
  await dbConnect();
  
  // FIX: Cast the lean() result so TypeScript knows startDate exists
  const user = await UserModel.findById(userId).lean() as { startDate?: string } | null;
  
  if (!user || !user.startDate) throw new Error("User or OJT start date not found");

  // Fetch all records from the start date chronologically
  const records = await DailyRecordModel.find({
    userId,
    date: { $gte: user.startDate },
  }).sort({ date: 1 }).lean();

  // Filter out absences, holidays, and weekends (only keep days with actual hours & accomplishments)
  const validWorkingDays = records.filter(
    (r) => r.totalHours && r.totalHours > 0 && r.accomplishments && r.accomplishments.trim() !== ""
  );

  const chunks = [];
  // Group into arrays of exactly 5 working days
  for (let i = 0; i < validWorkingDays.length; i += 5) {
    chunks.push(validWorkingDays.slice(i, i + 5));
  }

  const reports = await Promise.all(
    chunks.map(async (chunk, index) => {
      const weekNo = index + 1;
      const startDate = chunk[0].date;
      const endDate = chunk[chunk.length - 1].date;
      
      // Combine raw accomplishments from these 5 days
      const rawAccomplishments = chunk
        .map((r) => `Date: ${r.date} - ${r.accomplishments}`)
        .join("\n");

      // Generate the structured data using Gemini 2.5 Flash
      const aiData = await generateReportContentWithAI(rawAccomplishments);

      return {
        weekNo,
        startDate,
        endDate,
        isComplete: chunk.length === 5,
        aiData,
      };
    })
  );

  return JSON.parse(JSON.stringify(reports));
}

async function generateReportContentWithAI(rawText: string) {
  const prompt = `
    You are an assistant for an IT OJT student. Based on the following daily accomplishments over a week, generate a structured JSON object for their Weekly Progress Report. 
    Make the outputs concise, professional, and use bullet points where necessary.

    Raw Accomplishments:
    ${rawText}

    Return ONLY a JSON object with these exact keys:
    - "dutiesPerformed": A 1-2 sentence summary of general duties.
    - "newTrainings": A 1-2 sentence summary of new skills or tool setups (e.g., PC setup, framework usage).
    - "proposedActivities": An array of strings (3-5 short bullet points).
    - "actualAccomplishments": An array of strings (3-5 short bullet points directly corresponding to the proposed activities).
    - "problemsEncountered": 1 sentence describing a realistic challenge based on the context.
    - "solutions": 1 sentence describing how it was overcome.
    - "goalsNextWeek": 1 sentence stating a goal for next week.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean up markdown formatting if Gemini includes it
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation failed", error);
    return null;
  }
}
