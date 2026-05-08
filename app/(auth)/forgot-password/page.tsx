import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import UserModel from "@/models/User";
import OtpTokenModel from "@/models/OtpToken";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

    // Always return the same response to avoid user-enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: "If that email exists, an OTP has been sent.",
      });
    }

    // Invalidate any previous OTPs for this email
    await OtpTokenModel.deleteMany({ email: email.toLowerCase().trim() });

    // Generate a 6-digit OTP
    const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
    const otpHash = await hash(otp, 10);

    await OtpTokenModel.create({
      email: email.toLowerCase().trim(),
      otp: otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await sendOtpEmail(user.email, otp);

    return NextResponse.json({ message: "If that email exists, an OTP has been sent." });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
