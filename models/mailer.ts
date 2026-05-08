import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: `"OJT Tracker" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "Your Password Reset OTP",
    text: `Your OTP is: ${otp}\n\nIt expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 8px;font-size:20px;">Password Reset</h2>
        <p style="color:#6b7280;margin:0 0 24px;">Use the OTP below to reset your OJT Tracker password. It expires in <strong>10 minutes</strong>.</p>
        <div style="letter-spacing:8px;font-size:36px;font-weight:700;text-align:center;padding:20px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          ${otp}
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;text-align:center;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
