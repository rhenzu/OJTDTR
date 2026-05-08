"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Mail, KeyRound, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("email");
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const clearError = () => setError("");

  /* ── Step 1: Request OTP ── */
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: Verify OTP ── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep("password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 3: Reset Password ── */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    clearError();
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const steps: Record<Step, number> = { email: 1, otp: 2, password: 3, done: 3 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">OJT Tracker</p>
              <p className="text-xs text-muted-foreground">Daily Time Record System</p>
            </div>
          </div>

          {/* Step indicator */}
          {step !== "done" && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    steps[step] >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{s}</div>
                  {s < 3 && <div className={`h-px flex-1 w-8 transition-colors ${steps[step] > s ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          )}

          <CardTitle className="text-2xl font-bold">
            {step === "email"    && "Forgot Password"}
            {step === "otp"     && "Enter OTP"}
            {step === "password" && "New Password"}
            {step === "done"    && "All done!"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ── Step 1 ── */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your registered email and we&apos;ll send a 6-digit OTP.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email" type="email" placeholder="juan@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required className="pl-9"
                  />
                </div>
              </div>
              {error && <ErrorBox msg={error} />}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : "Send OTP"}
              </Button>
              <BackToLogin />
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="otp" type="text" inputMode="numeric" placeholder="123456"
                    maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required className="pl-9 tracking-[0.4em] text-center font-mono text-lg"
                  />
                </div>
              </div>
              {error && <ErrorBox msg={error} />}
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <Spinner /> : "Verify OTP"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); clearError(); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Change email
              </button>
            </form>
          )}

          {/* ── Step 3 ── */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a strong new password for your account.
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password" type="password" placeholder="Min. 8 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required minLength={8} className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm" type="password" placeholder="Repeat password"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    required className="pl-9"
                  />
                </div>
              </div>
              {error && <ErrorBox msg={error} />}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : "Reset Password"}
              </Button>
            </form>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Go to Sign In
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

/* ── Small helpers ── */
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      {msg}
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

function BackToLogin() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Remember it?{" "}
      <Link href="/login" className="text-primary font-medium hover:underline">
        Sign in
      </Link>
    </p>
  );
}
