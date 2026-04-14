"use server";

import { dbConnect } from "@/lib/mongodb";
import DailyRecordModel from "@/models/DailyRecord";
import UserModel from "@/models/User";
import { isLate, isEarlyOut, getTodayString } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { toZonedTime } from "date-fns-tz";

const PH_TZ = "Asia/Manila";

function calculateSmartHours(
  min?: string | null, mout?: string | null,
  ain?: string | null, aout?: string | null,
  oin?: string | null, oout?: string | null
): number {
  const getMins = (t?: string | null) => {
    if (!t) return 0;
    let timeStr = t;
    if (t.includes("T") || t.includes("Z")) {
       const d = toZonedTime(new Date(t), PH_TZ);
       timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    const [h, m] = timeStr.split(":").map(Number);
    return (h * 60) + m;
  };

  let totalMins = 0;
  
  if (min && !mout && !ain && aout) {
     const diff = Math.max(0, getMins(aout) - getMins(min));
     totalMins = diff > 300 ? diff - 60 : diff;
  } else {
     if (min && mout) totalMins += Math.max(0, getMins(mout) - getMins(min));
     if (ain && aout) totalMins += Math.max(0, getMins(aout) - getMins(ain));
     if (oin && oout) totalMins += Math.max(0, getMins(oout) - getMins(oin));
  }
  
  return Math.min(parseFloat((totalMins / 60).toFixed(2)), 8);
}

export async function getUserExtraHours(userId: string) {
  await dbConnect();
  const user = await UserModel.findById(userId).lean();
  return (user as { extraHours?: number } | null)?.extraHours || 0;
}

export async function updateExtraHours(userId: string, extraHours: number) {
  await dbConnect();
  await UserModel.findByIdAndUpdate(userId, { extraHours });
  revalidatePath("/dashboard");
  revalidatePath("/forms");
  revalidatePath("/override");
  return { success: true };
}

export async function getTodayRecord(userId: string) {
  await dbConnect();
  const today = getTodayString();
  const record = await DailyRecordModel.findOne({ userId, date: today }).lean();
  return record ? JSON.parse(JSON.stringify(record)) : null;
}

export async function timeIn(userId: string, timeStr: string, dateStr?: string) {
  await dbConnect();
  const date = dateStr || getTodayString();

  const existing = await DailyRecordModel.findOne({ userId, date });
  if (existing?.morningIn) return { error: "Already timed in for today." };

  const [h, m] = timeStr.split(":").map(Number);
  const now = toZonedTime(new Date(), PH_TZ);
  now.setFullYear(parseInt(date.split("-")[0]), parseInt(date.split("-")[1]) - 1, parseInt(date.split("-")[2]));
  now.setHours(h, m, 0, 0);
  const isoStr = now.toISOString();

  const late = isLate(isoStr);

  if (existing) {
    await DailyRecordModel.findByIdAndUpdate(existing._id, {
      morningIn: isoStr, isLate: late, status: "pending",
    });
  } else {
    await DailyRecordModel.create({
      userId, date, morningIn: isoStr, isLate: late, status: "pending",
    });
  }

  revalidatePath("/dashboard");
  return { success: true, isLate: late };
}

export async function timeOut(userId: string, timeStr: string, dateStr?: string) {
  await dbConnect();
  const date = dateStr || getTodayString();
  const record = await DailyRecordModel.findOne({ userId, date });

  if (!record) return { error: "No time-in record found for today." };
  if (record.afternoonOut) return { error: "Already timed out for today." };

  const [h, m] = timeStr.split(":").map(Number);
  const now = toZonedTime(new Date(), PH_TZ);
  now.setFullYear(parseInt(date.split("-")[0]), parseInt(date.split("-")[1]) - 1, parseInt(date.split("-")[2]));
  now.setHours(h, m, 0, 0);
  const isoStr = now.toISOString();

  const early = isEarlyOut(isoStr);
  const hours = calculateSmartHours(record.morningIn, null, null, isoStr, null, null);

  await DailyRecordModel.findByIdAndUpdate(record._id, {
    afternoonOut: isoStr,
    isEarlyOut: early,
    totalHours: hours,
    status: "complete",
  });

  revalidatePath("/dashboard");
  revalidatePath("/records");
  return { success: true, isEarlyOut: early, hoursWorked: hours };
}

export async function getAllRecords(userId: string) {
  await dbConnect();
  const records = await DailyRecordModel.find({ userId }).sort({ date: -1 }).lean();
  return JSON.parse(JSON.stringify(records));
}

export async function getRecentRecords(userId: string, limit = 15) {
  await dbConnect();
  const records = await DailyRecordModel.find({ userId }).sort({ date: -1 }).limit(limit).lean();
  return JSON.parse(JSON.stringify(records));
}

export async function getDashboardStats(userId: string, requiredTotalHours: number) {
  await dbConnect();
  const records = await DailyRecordModel.find({ userId, status: "complete" }).lean();
  
  const user = await UserModel.findById(userId).lean();
  const extraHours = (user as { extraHours?: number } | null)?.extraHours || 0;

  const totalHoursWorked = records.reduce((s, r) => s + (r.totalHours || 0), 0) + extraHours;
  const remainingHours = Math.max(0, requiredTotalHours - totalHoursWorked);
  const totalDays = records.length;
  const lateDays = records.filter((r) => r.isLate).length;
  const earlyOutDays = records.filter((r) => r.isEarlyOut).length;

  let avgTimeIn = "--:--";
  let avgTimeOut = "--:--";

  if (records.length > 0) {
    const inTimes = records.filter((r) => r.morningIn).map((r) => {
      const d = toZonedTime(new Date(r.morningIn!), PH_TZ);
      return d.getHours() * 60 + d.getMinutes();
    });
    const outTimes = records.filter((r) => r.afternoonOut).map((r) => {
      const d = toZonedTime(new Date(r.afternoonOut!), PH_TZ);
      return d.getHours() * 60 + d.getMinutes();
    });

    if (inTimes.length > 0) {
      const avgIn = inTimes.reduce((a, b) => a + b, 0) / inTimes.length;
      const h = Math.floor(avgIn / 60);
      const m = Math.round(avgIn % 60);
      const period = h >= 12 ? "PM" : "AM";
      const dh = h % 12 === 0 ? 12 : h % 12;
      avgTimeIn = `${String(dh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
    }

    if (outTimes.length > 0) {
      const avgOut = outTimes.reduce((a, b) => a + b, 0) / outTimes.length;
      const h = Math.floor(avgOut / 60);
      const m = Math.round(avgOut % 60);
      const period = h >= 12 ? "PM" : "AM";
      const dh = h % 12 === 0 ? 12 : h % 12;
      avgTimeOut = `${String(dh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
    }
  }

  return {
    totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
    remainingHours: parseFloat(remainingHours.toFixed(2)),
    requiredTotalHours,
    progressPercent: Math.min(100, Math.round((totalHoursWorked / requiredTotalHours) * 100)),
    totalDays,
    lateDays,
    earlyOutDays,
    avgTimeIn,
    avgTimeOut,
    avgHoursPerDay: totalDays > 0 ? parseFloat(((totalHoursWorked - extraHours) / totalDays).toFixed(2)) : 0,
    estimatedDaysLeft: remainingHours > 0 ? Math.ceil(remainingHours / 8) : 0,
  };
}

export async function upsertRecord(userId: string, data: {
  date: string;
  morningIn?: string;
  morningOut?: string;
  afternoonIn?: string;
  afternoonOut?: string;
  overtimeIn?: string;
  overtimeOut?: string;
  accomplishments?: string;
  verifiedBy?: string;
}) {
  await dbConnect();

  const buildISO = (timeStr: string | undefined, date: string): string | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = toZonedTime(new Date(), PH_TZ);
    d.setFullYear(parseInt(date.split("-")[0]), parseInt(date.split("-")[1]) - 1, parseInt(date.split("-")[2]));
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const morningIn = buildISO(data.morningIn, data.date);
  const morningOut = buildISO(data.morningOut, data.date);
  const afternoonIn = buildISO(data.afternoonIn, data.date);
  const afternoonOut = buildISO(data.afternoonOut, data.date);
  const overtimeIn = buildISO(data.overtimeIn, data.date);
  const overtimeOut = buildISO(data.overtimeOut, data.date);

  const totalHours = calculateSmartHours(
    data.morningIn, data.morningOut,
    data.afternoonIn, data.afternoonOut,
    data.overtimeIn, data.overtimeOut
  );
  
  const late = isLate(morningIn);
  const earlyOut = isEarlyOut(afternoonOut);
  
  const hasStarted = !!(morningIn || afternoonIn);
  const hasFinished = !!(afternoonOut || morningOut);
  const status = (hasStarted && hasFinished) ? "complete" : hasStarted ? "pending" : "absent";

  const update = {
    morningIn, morningOut, afternoonIn, afternoonOut,
    overtimeIn, overtimeOut,
    accomplishments: data.accomplishments || "",
    verifiedBy: data.verifiedBy || "",
    totalHours, isLate: late, isEarlyOut: earlyOut, status,
  };

  await DailyRecordModel.findOneAndUpdate(
    { userId, date: data.date },
    { $set: update },
    { upsert: true, new: true }
  );

  revalidatePath("/dashboard");
  revalidatePath("/records");
  revalidatePath("/forms");
  return { success: true };
}