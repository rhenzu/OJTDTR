import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import OtpTokenModel from "@/models/OtpToken";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    await dbConnect();

    const token = await OtpTokenModel.findOne({
      email: email.toLowerCase().trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!token) {
      return NextResponse.json({ error: "OTP is invalid or has expired." }, { status: 400 });
    }

    const valid = await compare(otp as string, token.otp);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
    }

    // Do NOT mark as used yet — that happens on the reset step
    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
