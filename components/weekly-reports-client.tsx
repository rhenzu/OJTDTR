"use client";

import { useState, useRef, useCallback } from "react";
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

// ─────────────────────────────────────────────────────────────
// Collects all <style> tags and <link rel="stylesheet"> from
// the current page so the print window inherits Tailwind + any
// other CSS already loaded.
// ─────────────────────────────────────────────────────────────
function collectPageStyles(): string {
  const parts: string[] = [];

  document.querySelectorAll("style").forEach((s) => {
    parts.push(s.outerHTML);
  });

  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    if (l.href) parts.push(`<link rel="stylesheet" href="${l.href}" />`);
  });

  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Opens a clean blank window, injects the report HTML with all
// the current page's CSS, and triggers the print dialog.
// Each report is wrapped in .print-page for A4 page breaks.
// ─────────────────────────────────────────────────────────────
function openPrintWindow(bodyHtml: string, title: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow pop-ups for this site so printing works.");
    return;
  }

  const styles = collectPageStyles();

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${styles}
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    html, body { margin: 0; padding: 0; background: white; }
    .print-page { page-break-after: always; break-after: page; }
    .print-page:last-child { page-break-after: avoid; break-after: avoid; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`);

  win.document.close();

  // Primary: wait for window load before printing
  win.addEventListener("load", () => {
    win.focus();
    win.print();
    win.close();
  });

  // Fallback: some browsers fire load before the listener is attached
  setTimeout(() => {
    if (!win.closed) {
      win.focus();
      win.print();
      win.close();
    }
  }, 900);
}

// ─────────────────────────────────────────────────────────────

export function WeeklyReportsClient({ initialWeeksData, studentName, userId }: Props) {
  const [weeksData, setWeeksData] = useState<WeekData[]>(initialWeeksData);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Holds a ref to each week's printable card DOM node
  const printRefs = useRef<Map<number, HTMLElement>>(new Map());

  // WeeklyReportCard calls this with its printable <div> node
  const registerPrintRef = useCallback(
    (weekNo: number) => (el: HTMLElement | null) => {
      if (el) {
        printRefs.current.set(weekNo, el);
      } else {
        printRefs.current.delete(weekNo);
      }
    },
    []
  );

  // ── Print ONE week ───────────────────────────────────────────
  const handlePrintOne = (weekNo: number) => {
    const el = printRefs.current.get(weekNo);
    if (!el) return;
    openPrintWindow(
      `<div class="print-page">${el.outerHTML}</div>`,
      `Week ${weekNo} — Weekly Progress Report`
    );
  };

  // ── Print ALL generated weeks ────────────────────────────────
  const handlePrintAll = () => {
    const sorted = Array.from(printRefs.current.entries()).sort(
      ([a], [b]) => a - b
    );
    if (sorted.length === 0) return;

    const allHtml = sorted
      .map(([, el]) => `<div class="print-page">${el.outerHTML}</div>`)
      .join("\n");

    openPrintWindow(allHtml, "All Weekly Progress Reports");
  };

  // ── Generate AI for one week ─────────────────────────────────
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Weekly Reports</h1>
          <p className="text-muted-foreground text-sm">
            Click <strong>Generate</strong> on a week to create its AI report.
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
          onClick={handlePrintAll}
          disabled={generatedCount === 0}
        >
          <Printer className="w-4 h-4" />
          Print All ({generatedCount})
        </Button>
      </div>

      {/* Report list */}
      {weeksData.length === 0 ? (
        <p className="text-center text-muted-foreground mt-16">
          Not enough working days logged yet to generate a report.
        </p>
      ) : (
        <div className="space-y-8">
          {weeksData.map((week) => {
            const start = new Date(week.startDate);
            const end = new Date(week.endDate);
            const dateRange = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

            return (
              <div key={week.weekNo}>
                {week.aiData ? (
                  <WeeklyReportCard
                    report={week}
                    studentName={studentName}
                    onPrint={() => handlePrintOne(week.weekNo)}
                    registerRef={registerPrintRef(week.weekNo)}
                  />
                ) : (
                  /* Not yet generated */
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-1">
                      Week {week.weekNo}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">{dateRange}</p>
                    {!week.isComplete && (
                      <p className="text-xs text-amber-600 mb-4">
                        Incomplete week — fewer than 5 days logged
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
  );
}
