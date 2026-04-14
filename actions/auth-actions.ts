"use server";

import { hash } from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import UserModel from "@/models/User";
import { getTodayString } from "@/lib/utils";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  internshipSite: z.string().default(""),
  requiredTotalHours: z.coerce.number().min(1).default(486),
  startDate: z.string().default(getTodayString()),
});

export async function registerUser(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    internshipSite: formData.get("internshipSite"),
    requiredTotalHours: formData.get("requiredTotalHours"),
    startDate: formData.get("startDate"),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid input: " + parsed.error.errors[0].message };
  }

  const { name, email, password, internshipSite, requiredTotalHours, startDate } = parsed.data;

  try {
    await dbConnect();
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) return { error: "Email already registered." };

    const passwordHash = await hash(password, 12);
    await UserModel.create({ name, email, passwordHash, internshipSite, requiredTotalHours, startDate });

    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Registration failed. Please try again." };
  }
}

export async function getUserProfile(userId: string) {
  await dbConnect();
  const user = await UserModel.findById(userId).select("-passwordHash").lean();
  if (!user) return null;
  return JSON.parse(JSON.stringify(user));
}

export async function updateUserProfile(userId: string, data: {
  name?: string; internshipSite?: string; requiredTotalHours?: number;
}) {
  await dbConnect();
  await UserModel.findByIdAndUpdate(userId, data);
  return { success: true };
}
