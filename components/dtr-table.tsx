// components/dtr-table.tsx
"use client";
import { useState } from "react";
import { format, parseISO, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import toast from "react-hot-toast";
import { Save, Printer, Zap, Eraser, UserMinus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { upsertRecord } from "@/actions/dtr-actions";
import { saveFormSignatures } from "@/actions/form-actions";
import type { IDailyRecord, IDTRForm } from "@/types";

const PH_TZ = "Asia/Manila";

function isoToTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return format(toZonedTime(parseISO(iso), PH_TZ), "HH:mm"); } 
  catch { return ""; }
}

function fmtDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return format(toZonedTime(parseISO(iso), PH_TZ), "hh:mm a"); } 
  catch { return ""; }
}

const getMins = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

interface DTRTableProps {
  userId: string;
  days: string[];
  records: Record<string, IDailyRecord>;
  form: IDTRForm | null;
  userName: string;
  internshipSite: string;
  periodTitle: string;
  requiredTotalHours: number;
  readOnly?: boolean;
  startDate: string;
}

interface RowData {
  morningIn: string; morningOut: string;
  afternoonIn: string; afternoonOut: string;
  overtimeIn: string; overtimeOut: string;
  accomplishments: string; verifiedBy: string;
}

export function DTRTable({
  userId, days, records, form, userName, internshipSite,
  periodTitle, requiredTotalHours, readOnly = false, startDate,
}: DTRTableProps) {
  const [rows, setRows] = useState<Record<string, RowData>>(() => {
    const init: Record<string, RowData> = {};
    days.forEach((d) => {
      const r = records[d];
      init[d] = {
        morningIn: isoToTime(r?.morningIn), morningOut: isoToTime(r?.morningOut),
        afternoonIn: isoToTime(r?.afternoonIn), afternoonOut: isoToTime(r?.afternoonOut),
        overtimeIn: isoToTime(r?.overtimeIn), overtimeOut: isoToTime(r?.overtimeOut),
        accomplishments: r?.accomplishments || "", verifiedBy: r?.verifiedBy || "",
      };
    });
    return init;
  });

  const [supervisorSig, setSupervisorSig] = useState(form?.supervisorSignature || "");
  const [studentSig, setStudentSig] = useState(form?.studentSignature || "");
  const [supervisorDate, setSupervisorDate] = useState(form?.supervisorSignDate || "");
  const [studentDate, setStudentDate] = useState(form?.studentSignDate || "");
  const [saving, setSaving] = useState(false);

  const update = (date: string, field: keyof RowData, val: string) => {
    setRows((prev) => ({ ...prev, [date]: { ...prev[date], [field]: val } }));
  };

  const calcRowHours = (row: RowData): number => {
    let totalMins = 0;

    // Legacy Fallback
    if (row.morningIn && !row.morningOut && !row.afternoonIn && row.afternoonOut) {
      totalMins = Math.max(0, getMins(row.afternoonOut) - getMins(row.morningIn) - 60);
    } else {
      // Smart Block Calculation
      if (row.morningIn && row.morningOut) {
        totalMins += Math.max(0, getMins(row.morningOut) - getMins(row.morningIn));
      }
      if (row.afternoonIn && row.afternoonOut) {
        totalMins += Math.max(0, getMins(row.afternoonOut) - getMins(row.afternoonIn));
      }
      if (row.overtimeIn && row.overtimeOut) {
        totalMins += Math.max(0, getMins(row.overtimeOut) - getMins(row.overtimeIn));
      }
    }
    
    return Math.min(parseFloat((totalMins / 60).toFixed(2)), 8);
  };

  // --- QUICK ACTION LOGIC ---
  const handleQuickFillRow = (date: string) => {
    setRows(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        morningIn: "08:00", morningOut: "12:00",
        afternoonIn: "13:00", afternoonOut: "17:00",
      }
    }));
  };

  const handleClearRow = (date: string) => {
    setRows(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        morningIn: "", morningOut: "",
        afternoonIn: "", afternoonOut: "",
        overtimeIn: "", overtimeOut: "",
        accomplishments: "",
      }
    }));
  };

  const handleMarkStatus = (date: string, status: string) => {
    setRows(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        morningIn: "", morningOut: "",
        afternoonIn: "", afternoonOut: "",
        overtimeIn: "", overtimeOut: "",
        accomplishments: status,
      }
    }));
  };

  const handleFillAllEmpty = () => {
    setRows(prev => {
      const next = { ...prev };
      days.forEach(d => {
        if (!isWeekend(parseISO(d)) && calcRowHours(next[d]) === 0 && !next[d].accomplishments) {
          next[d] = {
            ...next[d],
            morningIn: "08:00", morningOut: "12:00",
            afternoonIn: "13:00", afternoonOut: "17:00",
          };
        }
      });
      return next;
    });
    toast.success("Standard schedule filled for empty weekdays!");
  };

  const totalHoursThisForm = days.reduce((s, d) => s + calcRowHours(rows[d]), 0);
  const previousHours = form?.previousHours || 0;
  const totalWorked = previousHours + totalHoursThisForm;
  const remaining = Math.max(0, requiredTotalHours - totalWorked);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(days.map((d) => upsertRecord(userId, { date: d, ...rows[d] })));
      await saveFormSignatures(userId, startDate, {
        supervisorSignature: supervisorSig, studentSignature: studentSig,
        supervisorSignDate: supervisorDate, studentSignDate: studentDate,
      });
      toast.success("DTR form saved!");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      {!readOnly && (
        <div className="flex gap-2 justify-end print:hidden flex-wrap">
          <Button variant="secondary" onClick={handleFillAllEmpty} className="gap-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">
            <Zap className="w-4 h-4" /> Auto-Fill Empty Weekdays (8h)
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </Button>
        </div>
      )}

      {/* DTR Form */}
      <div id="dtr-form" className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Student Name</p>
              <p className="font-bold text-lg">{userName}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Internship Site</p>
              <p className="font-bold text-lg">{internshipSite || "—"}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Period: </span>{periodTitle}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-2 py-2 text-left font-semibold min-w-[190px]">Date</th>
                <th className="border border-border px-2 py-2 text-center font-semibold" colSpan={2}>Morning</th>
                <th className="border border-border px-2 py-2 text-center font-semibold" colSpan={2}>Afternoon</th>
                <th className="border border-border px-2 py-2 text-center font-semibold" colSpan={2}>Overtime</th>
                <th className="border border-border px-2 py-2 text-left font-semibold min-w-[180px]">Accomplishments</th>
                <th className="border border-border px-2 py-2 text-center font-semibold w-16">Hrs</th>
                <th className="border border-border px-2 py-2 text-left font-semibold w-28">Verified By</th>
              </tr>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="border border-border px-2 py-1"></th>
                <th className="border border-border px-2 py-1 text-center font-normal">IN</th>
                <th className="border border-border px-2 py-1 text-center font-normal">OUT</th>
                <th className="border border-border px-2 py-1 text-center font-normal">IN</th>
                <th className="border border-border px-2 py-1 text-center font-normal">OUT</th>
                <th className="border border-border px-2 py-1 text-center font-normal">IN</th>
                <th className="border border-border px-2 py-1 text-center font-normal">OUT</th>
                <th className="border border-border px-2 py-1"></th>
                <th className="border border-border px-2 py-1"></th>
                <th className="border border-border px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {days.map((date) => {
                const row = rows[date];
                const parsedDate = parseISO(date);
                const weekend = isWeekend(parsedDate);
                const dateLabel = format(parsedDate, "EEE, MMM d");
                const hours = calcRowHours(row);
                const rec = records[date];

                const timeCell = (field: keyof RowData, iso?: string | null) =>
                  readOnly ? (
                    <td className="border border-border px-2 py-2 text-center font-mono text-xs text-muted-foreground">{fmtDisplay(iso)}</td>
                  ) : (
                    <td className="border border-border p-0.5">
                      <input
                        type="time" value={row[field]}
                        onChange={(e) => update(date, field, e.target.value)}
                        disabled={weekend && !row[field]} // Allow editing if data already exists on weekend
                        className="w-full text-xs px-0.5 py-1.5 bg-transparent focus:bg-accent rounded font-mono disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring text-center"
                      />
                    </td>
                  );

                return (
                  <tr key={date} className={`${weekend ? "bg-slate-50 dark:bg-slate-800/50 opacity-60" : "hover:bg-muted/20"} transition-colors`}>
                    <td className="border border-border px-2 py-2 whitespace-nowrap flex items-center justify-between group">
                      <div className="flex items-center gap-1.5">
                        <span className={weekend ? "text-muted-foreground" : "font-medium"}>{dateLabel}</span>
                        {weekend && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">WE</Badge>}
                        {rec?.isLate && !readOnly && <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">Late</Badge>}
                      </div>
                      
                      {/* ROW ACTION BUTTONS (Hover Reveal) */}
                      {!readOnly && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-2 transition-all">
                          {!weekend && (
                            <button onClick={() => handleQuickFillRow(date)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-500 rounded" title="Auto-fill 8h shift">
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleMarkStatus(date, "Absent")} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 rounded" title="Mark Absent">
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleMarkStatus(date, "Holiday")} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 rounded" title="Mark Holiday">
                            <Coffee className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleClearRow(date)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded" title="Clear record">
                            <Eraser className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    {timeCell("morningIn", rec?.morningIn)}
                    {timeCell("morningOut", rec?.morningOut)}
                    {timeCell("afternoonIn", rec?.afternoonIn)}
                    {timeCell("afternoonOut", rec?.afternoonOut)}
                    {timeCell("overtimeIn", rec?.overtimeIn)}
                    {timeCell("overtimeOut", rec?.overtimeOut)}
                    <td className="border border-border p-0.5">
                      {readOnly ? (
                        <p className="px-2 py-1.5 text-xs">{row.accomplishments || ""}</p>
                      ) : (
                        <textarea
                          value={row.accomplishments}
                          onChange={(e) => update(date, "accomplishments", e.target.value)}
                          rows={1}
                          disabled={weekend && !row.accomplishments}
                          className="w-full text-xs px-1.5 py-1 bg-transparent focus:bg-accent rounded resize-none disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
                          placeholder={weekend ? "" : "Tasks..."}
                        />
                      )}
                    </td>
                    <td className="border border-border px-2 py-2 text-center font-mono font-semibold">
                      {hours > 0 ? <span className="text-emerald-600 dark:text-emerald-400">{hours.toFixed(1)}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="border border-border p-0.5">
                      {readOnly ? (
                        <p className="px-2 py-1.5 text-xs">{row.verifiedBy}</p>
                      ) : (
                        <input
                          type="text" value={row.verifiedBy}
                          onChange={(e) => update(date, "verifiedBy", e.target.value)}
                          disabled={weekend && !row.verifiedBy}
                          className="w-full text-xs px-1.5 py-1.5 bg-transparent focus:bg-accent rounded disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="Sign"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- FULLY UPGRADED 5-COLUMN SUMMARY ROW --- */}
        <div className="border-t border-border bg-muted/20 px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Previous Hours</p>
              <p className="font-mono text-lg font-bold">{previousHours.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Hours This Form</p>
              <p className="font-mono text-lg font-bold text-primary">{totalHoursThisForm.toFixed(2)}h</p>
            </div>
            <div className="border-l-2 border-emerald-500/20 pl-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Total (Prev + Current)</p>
              <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalWorked.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Required Hours</p>
              <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{requiredTotalHours}h</p>
            </div>
            <div className="border-l-2 border-amber-500/20 pl-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Remaining Hours</p>
              <p className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400">{remaining.toFixed(2)}h</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="border-t border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Signatures</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Company Supervisor</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Signature / Printed Name</p>
                  {readOnly ? (
                    <div className="h-9 border-b border-dashed border-border flex items-end pb-1"><span className="text-sm">{supervisorSig}</span></div>
                  ) : (<Input value={supervisorSig} onChange={(e) => setSupervisorSig(e.target.value)} placeholder="Supervisor name" />)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  {readOnly ? (
                    <div className="h-9 border-b border-dashed border-border flex items-end pb-1"><span className="text-sm">{supervisorDate}</span></div>
                  ) : (<Input type="date" value={supervisorDate} onChange={(e) => setSupervisorDate(e.target.value)} />)}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Student Intern</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Signature / Printed Name</p>
                  {readOnly ? (
                    <div className="h-9 border-b border-dashed border-border flex items-end pb-1"><span className="text-sm">{studentSig}</span></div>
                  ) : (<Input value={studentSig} onChange={(e) => setStudentSig(e.target.value)} placeholder="Your name" />)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  {readOnly ? (
                    <div className="h-9 border-b border-dashed border-border flex items-end pb-1"><span className="text-sm">{studentDate}</span></div>
                  ) : (<Input type="date" value={studentDate} onChange={(e) => setStudentDate(e.target.value)} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}