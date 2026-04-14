"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Edit3, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormPeriod } from "@/lib/dtr-logic";
import { getTodayString } from "@/lib/utils";

export default function OverridePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const startDate = session?.user?.startDate || getTodayString();
  const period = getFormPeriod(selectedDate, startDate);

  const handleOpen = () => {
    router.push(`/forms/${period.start}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Edit3 className="w-6 h-6 text-primary" />
          Override DTR
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manually edit or correct any past or current DTR entry
        </p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <p className="font-medium">How Override works</p>
            <p className="text-xs opacity-80">
              Pick any date and the system will open the corresponding 15-day form where you can edit any field — time in, time out, accomplishments, and verified by. All changes are saved directly to the database.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select a Date to Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getTodayString()}
              min={startDate}
            />
            <p className="text-xs text-muted-foreground">
              Select any date from your OJT start date to today
            </p>
          </div>

          {selectedDate && (
            <div className="p-4 bg-muted/40 rounded-xl border space-y-1">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">This date falls in the period:</p>
              <p className="font-semibold text-sm">{period.start} → {period.end}</p>
              <p className="text-xs text-muted-foreground">
                Opening this form will let you edit all 15 days in this period
              </p>
            </div>
          )}

          <Button onClick={handleOpen} className="w-full gap-2" size="lg">
            Open DTR Form
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Quick links to recent periods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Or go directly to</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2">
          {[0, 15, 30, 45].map((daysBack) => {
            const d = new Date();
            d.setDate(d.getDate() - daysBack);
            const dateStr = d.toISOString().split("T")[0];
            if (dateStr < startDate) return null;
            const p = getFormPeriod(dateStr, startDate);
            return (
              <Button
                key={daysBack}
                variant="outline"
                size="sm"
                className="justify-between font-normal"
                onClick={() => router.push(`/forms/${p.start}`)}
              >
                <span>{daysBack === 0 ? "Current period" : `~${daysBack} days ago`}</span>
                <span className="text-xs text-muted-foreground font-mono">{p.start} → {p.end}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
