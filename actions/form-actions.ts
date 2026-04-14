// actions/form-actions.ts
"use server";

import { dbConnect } from "@/lib/mongodb";
import DTRFormModel from "@/models/DTRForm";
import DailyRecordModel from "@/models/DailyRecord";
import { getAllPeriods, getDaysInPeriod, getPeriodTitle } from "@/lib/dtr-logic";
import { getTodayString } from "@/lib/utils";
import UserModel from "@/models/User";
import { revalidatePath } from "next/cache";

export async function getAllForms(userId: string, startDate: string) {
  await dbConnect();
  const today = getTodayString();
  const periods = getAllPeriods(startDate, today);

  const user = await UserModel.findById(userId).lean();
  const reqHours = (user as { requiredTotalHours?: number } | null)?.requiredTotalHours || 486;
  const extraHours = (user as { extraHours?: number } | null)?.extraHours || 0;

  const allRecords = await DailyRecordModel.find({ userId }).lean();
  const forms = await DTRFormModel.find({ userId }).lean();
  const formMap = new Map(forms.map((f) => [f.startDate, f]));

  return periods.map((p) => {
    const existing = formMap.get(p.start);
    let currentTotal = 0;
    let prevTotal = 0;

    allRecords.forEach((r) => {
      if (r.date < p.start) prevTotal += (r.totalHours || 0);
      if (r.date >= p.start && r.date <= p.end) currentTotal += (r.totalHours || 0);
    });

    // Subtracted extraHours here
    const remainingHours = Math.max(0, reqHours - prevTotal - currentTotal - extraHours);

    return {
      startDate: p.start,
      endDate: p.end,
      periodTitle: p.title,
      formId: existing?.formId || null,
      totalHoursThisForm: parseFloat(currentTotal.toFixed(2)),
      previousHours: parseFloat(prevTotal.toFixed(2)),
      extraHours: parseFloat(extraHours.toFixed(2)),
      remainingHours: parseFloat(remainingHours.toFixed(2)),
      supervisorSignature: existing?.supervisorSignature || "",
      studentSignature: existing?.studentSignature || "",
      supervisorSignDate: existing?.supervisorSignDate || "",
      studentSignDate: existing?.studentSignDate || "",
      _id: existing?._id?.toString() || null,
    };
  });
}

export async function getFormWithRecords(userId: string, startDate: string, endDate: string) {
  await dbConnect();
  const days = getDaysInPeriod(startDate, endDate);

  const records = await DailyRecordModel.find({ userId, date: { $in: days } }).lean();
  const recordMap: Record<string, unknown> = {};
  let currentTotal = 0;
  records.forEach((r) => { 
    recordMap[r.date] = r; 
    currentTotal += (r.totalHours || 0);
  });

  const prevRecords = await DailyRecordModel.find({ userId, date: { $lt: startDate } }).lean();
  const previousTotal = prevRecords.reduce((s, r) => s + (r.totalHours || 0), 0);

  const user = await UserModel.findById(userId).lean();
  const reqHours = (user as { requiredTotalHours?: number } | null)?.requiredTotalHours || 486;
  const extraHours = (user as { extraHours?: number } | null)?.extraHours || 0;
  
  // Subtracted extraHours here
  const remainingHours = Math.max(0, reqHours - previousTotal - currentTotal - extraHours);

  const form = await DTRFormModel.findOne({ userId, startDate }).lean();

  const dynamicForm = {
    ...(form ? JSON.parse(JSON.stringify(form)) : {}),
    totalHoursThisForm: parseFloat(currentTotal.toFixed(2)),
    previousHours: parseFloat(previousTotal.toFixed(2)),
    extraHours: parseFloat(extraHours.toFixed(2)),
    remainingHours: parseFloat(remainingHours.toFixed(2)),
  };

  return { form: dynamicForm, records: JSON.parse(JSON.stringify(recordMap)), days };
}

export async function saveFormSignatures(userId: string, startDate: string, data: any) {
  await dbConnect();
  const today = getTodayString();
  const allPeriods = getAllPeriods(startDate, today);
  const period = allPeriods.find((p) => p.start === startDate) || allPeriods[0];
  if (!period) return { error: "Period not found" };

  const days = getDaysInPeriod(period.start, period.end);
  const records = await DailyRecordModel.find({ userId, date: { $in: days } }).lean();
  const totalHoursThisForm = records.reduce((s, r) => s + (r.totalHours || 0), 0);

  const prevRecords = await DailyRecordModel.find({ userId, date: { $lt: period.start } }).lean();
  const previousHours = prevRecords.reduce((s, r) => s + (r.totalHours || 0), 0);

  const user = await UserModel.findById(userId).lean();
  const reqHours = (user as { requiredTotalHours?: number } | null)?.requiredTotalHours || 486;
  const extraHours = (user as { extraHours?: number } | null)?.extraHours || 0;
  
  const remainingHours = Math.max(0, reqHours - previousHours - totalHoursThisForm - extraHours);
  const formId = `${userId}-${period.start}`;

  await DTRFormModel.findOneAndUpdate(
    { userId, startDate: period.start },
    { $set: { userId, formId, startDate: period.start, endDate: period.end, periodTitle: getPeriodTitle(period.start, period.end), totalHoursThisForm, previousHours, remainingHours, ...data } },
    { upsert: true, new: true }
  );

  revalidatePath("/forms");
  revalidatePath(`/forms/${period.start}`);
  return { success: true };
}