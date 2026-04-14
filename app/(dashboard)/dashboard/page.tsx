import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardStats, getRecentRecords, getTodayRecord } from "@/actions/dtr-actions";
import { format, parseISO, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  Clock, TrendingUp, AlertTriangle, LogOut as EarlyIcon,
  CheckCircle2, Calendar, Target, BarChart3, Timer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatHours, formatTimeDisplay } from "@/lib/utils";

const PH_TZ = "Asia/Manila";

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold font-mono">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wide">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: userId, name, internshipSite, requiredTotalHours = 486, startDate } = session.user;
  const [stats, recent, todayRecord] = await Promise.all([
    getDashboardStats(userId, requiredTotalHours),
    getRecentRecords(userId, 15),
    getTodayRecord(userId),
  ]);

  const now = toZonedTime(new Date(), PH_TZ);
  const today = format(now, "EEEE, MMMM d, yyyy");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {name?.split(" ")[0]}! 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{internshipSite || "Daily Time Record"} · {today}</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2.5 shadow-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm font-semibold">{format(now, "hh:mm a")}</span>
          <span className="text-xs text-muted-foreground">PHT</span>
        </div>
      </div>

      {/* Today's status */}
      <Card className={`border-l-4 ${todayRecord?.status === "complete" ? "border-l-emerald-500" : todayRecord?.morningIn ? "border-l-amber-500" : "border-l-slate-300"}`}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Today&apos;s Record</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={todayRecord?.status === "complete" ? "success" : todayRecord?.morningIn ? "warning" : "outline"} className="text-xs px-3 py-1">
                  {todayRecord?.status === "complete" ? "✓ Complete" : todayRecord?.morningIn ? "⏳ Pending Time Out" : "No Record Yet"}
                </Badge>
                {todayRecord?.isLate && <Badge variant="danger">Late Arrival</Badge>}
                {todayRecord?.isEarlyOut && <Badge variant="warning">Early Out</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time In</p>
                <p className={`font-mono font-semibold text-lg ${todayRecord?.morningIn ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {formatTimeDisplay(todayRecord?.morningIn) || "--:--"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time Out</p>
                <p className={`font-mono font-semibold text-lg ${todayRecord?.afternoonOut ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                  {formatTimeDisplay(todayRecord?.afternoonOut) || "--:--"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hours</p>
                <p className={`font-mono font-semibold text-lg ${todayRecord?.totalHours ? "text-primary" : "text-muted-foreground"}`}>
                  {todayRecord?.totalHours ? `${todayRecord.totalHours.toFixed(1)}h` : "--"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">OJT Hours Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-mono text-2xl font-bold text-foreground">{formatHours(stats.totalHoursWorked)}</span>
                {" "}<span className="text-muted-foreground">/ {requiredTotalHours}h required</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary font-mono">{stats.progressPercent}%</p>
              <p className="text-xs text-muted-foreground">{formatHours(stats.remainingHours)} remaining</p>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700" style={{ width: `${stats.progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{stats.totalDays} days completed</span>
            <span>Est. {stats.estimatedDaysLeft} days left at 8h/day</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Avg Time In" value={stats.avgTimeIn} sub="daily average" icon={Clock} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard title="Avg Time Out" value={stats.avgTimeOut} sub="daily average" icon={Timer} color="bg-red-500/10 text-red-600 dark:text-red-400" />
        <StatCard title="Late Days" value={stats.lateDays} sub={`of ${stats.totalDays} days`} icon={AlertTriangle} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatCard title="Early Outs" value={stats.earlyOutDays} sub={`of ${stats.totalDays} days`} icon={EarlyIcon} color="bg-orange-500/10 text-orange-600 dark:text-orange-400" />
        <StatCard title="Avg Hrs/Day" value={`${stats.avgHoursPerDay}h`} sub="per working day" icon={BarChart3} color="bg-primary/10 text-primary" />
      </div>

      {/* Recent records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Recent Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No records yet. Start by logging your first time in!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time In</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time Out</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((r: any) => {
                    const parsed = parseISO(r.date);
                    const weekend = isWeekend(parsed);
                    return (
                      <tr key={r._id} className={`hover:bg-muted/20 transition-colors ${weekend ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs">
                          <span>{format(parsed, "EEE, MMM d")}</span>
                          {weekend && <Badge variant="secondary" className="ml-2 text-[9px] px-1 h-4">WE</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {formatTimeDisplay(r.morningIn) || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-red-500 dark:text-red-400">
                          {formatTimeDisplay(r.afternoonOut) || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-primary">
                          {r.totalHours > 0 ? `${r.totalHours.toFixed(1)}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.status === "complete" && <Badge variant="success" className="text-[10px]">Complete</Badge>}
                          {r.status === "pending" && <Badge variant="warning" className="text-[10px]">Pending</Badge>}
                          {r.status === "absent" && <Badge variant="outline" className="text-[10px]">Absent</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {r.isLate && <Badge variant="danger" className="text-[9px] px-1.5 h-4">Late</Badge>}
                            {r.isEarlyOut && <Badge variant="warning" className="text-[9px] px-1.5 h-4">Early</Badge>}
                            {!r.isLate && !r.isEarlyOut && r.status === "complete" && (
                              <Badge variant="success" className="text-[9px] px-1.5 h-4">On time</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
