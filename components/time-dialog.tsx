"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import toast from "react-hot-toast";
import { Clock, LogIn, LogOut, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { timeIn, timeOut } from "@/actions/dtr-actions";
import { IDailyRecord } from "@/types";

const PH_TZ = "Asia/Manila";

function getNowPH() { return toZonedTime(new Date(), PH_TZ); }
function fmtTime(d: Date) { return format(d, "hh:mm:ss a"); }
function fmtDate(d: Date) { return format(d, "EEEE, MMMM d, yyyy"); }
function toTimeInput(d: Date) { return format(d, "HH:mm"); }

interface TimeDialogProps {
  open: boolean;
  onClose: () => void;
  todayRecord: IDailyRecord | null;
  userId: string;
}

export function TimeDialog({ open, onClose, todayRecord, userId }: TimeDialogProps) {
  const [now, setNow] = useState(getNowPH());
  const [timeValue, setTimeValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "in" | "out"; isLate?: boolean; isEarlyOut?: boolean; hours?: number } | null>(null);

  useEffect(() => {
    if (!open) { setResult(null); return; }
    setTimeValue(toTimeInput(getNowPH()));
    const t = setInterval(() => setNow(getNowPH()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const hasTimedIn = !!todayRecord?.morningIn;
  const hasTimedOut = !!todayRecord?.afternoonOut;
  const isPending = hasTimedIn && !hasTimedOut;
  const isComplete = hasTimedOut;

  const [h, m] = timeValue.split(":").map(Number);
  const totalMins = (h || 0) * 60 + (m || 0);
  const willBeLate = !hasTimedIn && totalMins > 8 * 60;
  const willBeEarly = isPending && totalMins < 17 * 60;

  const handleTimeIn = async () => {
    setLoading(true);
    try {
      const res = await timeIn(userId, timeValue);
      if (res?.error) { toast.error(res.error); return; }
      setResult({ type: "in", isLate: res?.isLate });
      toast.success(`Timed In at ${format(now, "hh:mm a")}${res?.isLate ? " — marked as late" : ""}`);
    } finally { setLoading(false); }
  };

  const handleTimeOut = async () => {
    setLoading(true);
    try {
      const res = await timeOut(userId, timeValue);
      if (res?.error) { toast.error(res.error); return; }
      setResult({ type: "out", isEarlyOut: res?.isEarlyOut, hours: res?.hoursWorked });
      toast.success(`Timed Out at ${format(now, "hh:mm a")} — ${res?.hoursWorked?.toFixed(1)}h worked`);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Log Time
          </DialogTitle>
          <DialogDescription>{fmtDate(now)}</DialogDescription>
        </DialogHeader>

        {/* Live Clock */}
        <div className="bg-muted/40 rounded-xl p-5 text-center border">
          <p className="text-4xl font-mono font-semibold tracking-tight text-foreground">{fmtTime(now)}</p>
          <p className="text-xs text-muted-foreground mt-1">Philippines Time (PHT)</p>
        </div>

        {/* Status badges */}
        {todayRecord && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant={hasTimedIn ? "success" : "outline"}>
              {hasTimedIn ? `IN: ${format(toZonedTime(new Date(todayRecord.morningIn!), PH_TZ), "hh:mm a")}` : "Not timed in"}
            </Badge>
            <Badge variant={hasTimedOut ? "success" : isPending ? "warning" : "outline"}>
              {hasTimedOut ? `OUT: ${format(toZonedTime(new Date(todayRecord.afternoonOut!), PH_TZ), "hh:mm a")}` : isPending ? "Pending time out" : "Not timed out"}
            </Badge>
            {todayRecord.isLate && <Badge variant="danger">Late</Badge>}
            {todayRecord.isEarlyOut && <Badge variant="warning">Early Out</Badge>}
          </div>
        )}

        {result ? (
          /* Success state */
          <div className="text-center py-4 space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${result.type === "in" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {result.type === "in" ? <LogIn className="w-8 h-8 text-emerald-500" /> : <LogOut className="w-8 h-8 text-red-500" />}
            </div>
            <div>
              <p className="font-semibold text-lg">{result.type === "in" ? "Timed In!" : "Timed Out!"}</p>
              {result.type === "in" && result.isLate && (
                <p className="text-amber-500 text-sm flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Marked as late (after 8:00 AM)
                </p>
              )}
              {result.type === "out" && result.isEarlyOut && (
                <p className="text-amber-500 text-sm flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Marked as early out (before 5:00 PM)
                </p>
              )}
              {result.type === "out" && result.hours !== undefined && (
                <p className="text-muted-foreground text-sm mt-1">
                  <span className="font-semibold text-foreground">{result.hours.toFixed(2)}h</span> worked today
                </p>
              )}
              {result.type === "in" && (
                <p className="text-muted-foreground text-sm mt-1">Remember to time out at end of day!</p>
              )}
            </div>
            <Button onClick={onClose} className="w-full">Back to Dashboard</Button>
          </div>
        ) : isComplete ? (
          /* All done */
          <div className="text-center py-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold">All done for today! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hours worked: <span className="font-medium text-foreground">{todayRecord?.totalHours?.toFixed(2)}h</span>
              </p>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          /* Time input + actions */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isPending ? "Time Out" : "Time In"} — adjust if needed</Label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-xl font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {willBeLate && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                After 8:00 AM — will be marked as <strong>late</strong>
              </div>
            )}
            {willBeEarly && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                Before 5:00 PM — will be marked as <strong>early out</strong>
              </div>
            )}

            {isPending ? (
              <Button onClick={handleTimeOut} disabled={loading} className="w-full h-12 text-base gap-2 bg-red-500 hover:bg-red-600 text-white">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogOut className="w-5 h-5" />}
                Confirm Time Out
              </Button>
            ) : (
              <Button onClick={handleTimeIn} disabled={loading} className="w-full h-12 text-base gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-5 h-5" />}
                Confirm Time In
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
