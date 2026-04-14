"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { registerUser } from "@/actions/auth-actions";
import { getTodayString } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const result = await registerUser(formData);
      if (result?.error) { setError(result.error); return; }
      router.push("/login?registered=1");
    } catch { setError("Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 pointer-events-none" />
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-lg relative z-10 shadow-2xl animate-fade-in">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">OJT Tracker</p>
              <p className="text-xs text-muted-foreground">Create your account</p>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Register</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Set up your OJT time record account</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="Juan dela Cruz" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="juan@email.com" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPw ? "text" : "password"} placeholder="Min. 6 characters" required minLength={6} className="pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="internshipSite">Internship / Company Name</Label>
                <Input id="internshipSite" name="internshipSite" placeholder="e.g. Acme Corporation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredTotalHours">Required Total Hours</Label>
                <Input id="requiredTotalHours" name="requiredTotalHours" type="number" defaultValue={486} min={1} max={5000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">OJT Start Date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={getTodayString()} required />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
