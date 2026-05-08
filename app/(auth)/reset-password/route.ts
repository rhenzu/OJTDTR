import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import UserModel from "@/models/User";
import OtpTokenModel from "@/models/OtpToken";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    const token = await OtpTokenModel.findOne({
      email: email.toLowerCase().trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!token) {
      return NextResponse.json(
        { error: "OTP is invalid or has expired." },
        { status: 400 }
      );
    }

    const valid = await compare(otp as string, token.otp);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
    }

    const passwordHash = await hash(newPassword, 12);

    await UserModel.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { passwordHash } }
    );

    // Mark OTP as used
    await OtpTokenModel.updateOne({ _id: token._id }, { $set: { used: true } });

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
