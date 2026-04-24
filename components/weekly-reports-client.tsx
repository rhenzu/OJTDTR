"use client";

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { FileText, Loader2, Printer, Info } from "lucide-react";
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

function collectPageStyles(): string {
  const parts: string[] = [];
  document.querySelectorAll("style").forEach((s) => parts.push(s.outerHTML));
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(
    (l) => { if (l.href) parts.push(`<link rel="stylesheet" href="${l.href}" />`); }
  );
  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// @page margin: 0  →  collapses the browser's header/footer
//   margin area, which is exactly where Chrome/Edge render the
//   URL string and date/time. No margin area = no strings.
//
// Padding on .print-page (not body)  →  uniform content margins
//   on every page, since body padding only offsets page 1.
//
// Letter size: 8.5 in × 11 in ≈ 216 mm × 279 mm.
// ─────────────────────────────────────────────────────────────
function buildPrintHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  ${collectPageStyles()}
  <style>
    @page {
      size: letter portrait;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: white;
    }

    .print-page {
      height: 279mm;
      padding: 10mm 12mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .print-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    .print-page > * {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function printViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    top: "-9999px",
    left: "-9999px",
    border: "none",
    opacity: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(buildPrintHtml(html));
  doc.close();

  const doPrint = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  iframe.onload = doPrint;
  setTimeout(doPrint, 800);
}

export function WeeklyReportsClient({ initialWeeksData, studentName, userId }: Props) {
  const [weeksData, setWeeksData] = useState<WeekData[]>(initialWeeksData);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const printRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerPrintRef = useCallback(
    (weekNo: number) => (el: HTMLElement | null) => {
      if (el) printRefs.current.set(weekNo, el);
      else printRefs.current.delete(weekNo);
    },
    []
  );

  const handlePrintOne = (weekNo: number) => {
    const el = printRefs.current.get(weekNo);
    if (!el) return;
    printViaIframe(`<div class="print-page">${el.outerHTML}</div>`);
  };

  const handlePrintAll = () => {
    const sorted = Array.from(printRefs.current.entries()).sort(([a], [b]) => a - b);
    if (!sorted.length) return;
    const allHtml = sorted
      .map(([, el]) => `<div class="print-page">${el.outerHTML}</div>`)
      .join("\n");
    printViaIframe(allHtml);
  };

  const handleGenerate = async (weekNo: number) => {
    setGeneratingWeek(weekNo);
    setErrors((prev) => ({ ...prev, [weekNo]: "" }));
    try {
      const saved = await generateSingleWeekReport(userId, weekNo);
      setWeeksData((prev) =>
        prev.map((w) =>
          w.weekNo === weekNo ? { ...w, _id: saved._id, aiData: saved.aiData } : w
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
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-1">Week {week.weekNo}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{dateRange}</p>
                    {!week.isComplete && (
                      <p className="text-xs text-amber-600 mb-4">
                        Incomplete week — fewer than 5 days logged
                      </p>
                    )}
                    {week.isComplete && <div className="mb-4" />}
                    {errors[week.weekNo] && (
                      <p className="text-sm text-red-500 mb-3">⚠ {errors[week.weekNo]}</p>
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
