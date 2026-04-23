"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeeklyReportCard } from "@/components/weekly-report-card";
import { generateSingleWeekReport } from "@/actions/report-actions";

interface WeekData {
  _id: string | null;
  weekNo: number;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  rawText: string;
  aiData: any | null;
}

interface Props {
  initialWeeksData: WeekData[];
  studentName: string;
  userId: string;
}

export function WeeklyReportsClient({ initialWeeksData, studentName, userId }: Props) {
  const [weeksData, setWeeksData] = useState<WeekData[]>(initialWeeksData);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleGenerate = async (weekNo: number) => {
    setGeneratingWeek(weekNo);
    setErrors((prev) => ({ ...prev, [weekNo]: "" }));

    try {
      const saved = await generateSingleWeekReport(userId, weekNo);
      setWeeksData((prev) =>
        prev.map((w) =>
          w.weekNo === weekNo
            ? { ...w, _id: saved._id, aiData: saved.aiData }
            : w
        )
      );
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [weekNo]: err.message || "Generation failed. Please try again.",
      }));
    } finally {
      setGeneratingWeek(null);
    }
  };

  const generatedCount = weeksData.filter((w) => w.aiData).length;

  return (
    <>
      {/*
        ── Print isolation ──────────────────────────────────────────────
        This <style> hides the app shell (sidebar, topbar, etc.) when the
        browser print dialog is open, so only the report cards print.
        Add print:hidden to your layout's <aside> / <nav> if you prefer
        doing it in JSX instead.
      */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }

          /* Hide everything outside our report wrapper */
          body > * { display: none !important; }
          body > #weekly-reports-print-root { display: block !important; }

          /* Common layout shell selectors — adjust to match your project */
          header, nav, aside,
          [data-sidebar], [data-radix-popper-content-wrapper],
          .sidebar, .topbar, .navbar { display: none !important; }
        }
      `}</style>

      {/* ── Wrapper used as print root ── */}
      <div id="weekly-reports-print-root">

        {/* Page header — hidden on print */}
        <div className="p-6 max-w-4xl mx-auto print:hidden">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold">AI Weekly Reports</h1>
              <p className="text-muted-foreground text-sm">
                Click <strong>Generate</strong> on each week to create its AI report.
                {generatedCount > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    {generatedCount} of {weeksData.length} generated
                  </span>
                )}
              </p>
            </div>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.print()}
              disabled={generatedCount === 0}
            >
              <Printer className="w-4 h-4" />
              Print All Reports
            </Button>
          </div>
        </div>

        {/* Report list */}
        <div className="px-6 max-w-4xl mx-auto print:max-w-none print:px-0">
          {weeksData.length === 0 ? (
            <p className="text-center text-muted-foreground mt-16 print:hidden">
              Not enough working days logged yet to generate a report.
            </p>
          ) : (
            <div className="space-y-8 print:space-y-0">
              {weeksData.map((week) => {
                const start = new Date(week.startDate);
                const end = new Date(week.endDate);
                const dateRange = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

                return (
                  <div
                    key={week.weekNo}
                    /* Each report prints on its own A4 page */
                    className="print:break-after-page print:break-inside-avoid"
                  >
                    {week.aiData ? (
                      /* ── Generated: show the printable card ── */
                      <WeeklyReportCard report={week} studentName={studentName} />
                    ) : (
                      /* ── Not yet generated: show placeholder (hidden on print) ── */
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50 print:hidden">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-700 mb-1">
                          Week {week.weekNo}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">{dateRange}</p>
                        {!week.isComplete && (
                          <p className="text-xs text-amber-600 mb-4">
                            Incomplete week — only {week.rawText.split("\n").length} day(s) logged
                          </p>
                        )}
                        {week.isComplete && <div className="mb-4" />}

                        {errors[week.weekNo] && (
                          <p className="text-sm text-red-500 mb-3">
                            ⚠ {errors[week.weekNo]}
                          </p>
                        )}

                        <Button
                          onClick={() => handleGenerate(week.weekNo)}
                          disabled={generatingWeek !== null}
                          className="gap-2"
                        >
                          {generatingWeek === week.weekNo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating Week {week.weekNo}…
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Generate Week {week.weekNo} Report
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
