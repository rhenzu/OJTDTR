import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllRecords } from "@/actions/dtr-actions";
import { format, parseISO, isWeekend } from "date-fns";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeDisplay, formatHours } from "@/lib/utils";

export default async function RecordsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const records = await getAllRecords(session.user.id);
  const totalHours = records.reduce((s: number, r: any) => s + (r.totalHours || 0), 0);
  const completeDays = records.filter((r: any) => r.status === "complete").length;
  const lateDays = records.filter((r: any) => r.isLate).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Time Records
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Complete history of all DTR entries</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="text-center">
            <p className="font-bold text-lg text-primary">{completeDays}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="font-bold text-lg">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="font-bold text-lg text-amber-600">{lateDays}</p>
            <p className="text-xs text-muted-foreground">Lates</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No records yet. Start logging your time!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Morning IN", "Morning OUT", "Afternoon IN", "Afternoon OUT", "Total Hours", "Status", "Flags", "Accomplishments"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((r: any) => {
                    const parsed = parseISO(r.date);
                    const weekend = isWeekend(parsed);
                    return (
                      <tr key={r._id} className={`hover:bg-muted/20 transition-colors ${weekend ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {format(parsed, "EEE, MMM d, yyyy")}
                          {weekend && <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 h-4">WE</Badge>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{formatTimeDisplay(r.morningIn) || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatTimeDisplay(r.morningOut) || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatTimeDisplay(r.afternoonIn) || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-red-500 dark:text-red-400">{formatTimeDisplay(r.afternoonOut) || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{r.totalHours > 0 ? `${r.totalHours.toFixed(2)}h` : "—"}</td>
                        <td className="px-4 py-3">
                          {r.status === "complete" && <Badge variant="success" className="text-[10px]">Complete</Badge>}
                          {r.status === "pending" && <Badge variant="warning" className="text-[10px]">Pending</Badge>}
                          {r.status === "absent" && <Badge variant="outline" className="text-[10px]">—</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {r.isLate && <Badge variant="danger" className="text-[9px] px-1.5 h-4">Late</Badge>}
                            {r.isEarlyOut && <Badge variant="warning" className="text-[9px] px-1.5 h-4">Early</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.accomplishments || "—"}</td>
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
