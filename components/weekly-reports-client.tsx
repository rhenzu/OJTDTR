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

// ─────────────────────────────────────────────────────────────
// Grabs every <style> tag and <link rel="stylesheet"> from the
// live page so the print iframe inherits Tailwind + all CSS.
// ─────────────────────────────────────────────────────────────
function collectPageStyles(): string {
  const parts: string[] = [];
  document.querySelectorAll("style").forEach((s) => parts.push(s.outerHTML));
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(
    (l) => { if (l.href) parts.push(`<link rel="stylesheet" href="${l.href}" />`); }
  );
  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Builds the full HTML for the print document.
//
// Fix for uneven top margins across pages:
//  • @page margin: 10mm 12mm  →  the browser applies these
//    margins on EVERY printed page uniformly, including page 2+.
//    This is the only reliable way to get consistent margins.
//  • body padding: 0  →  no extra offset on just the first page.
//  • .print-page height: 277mm (297mm A4 − 10mm top − 10mm
//    bottom @page margin) to fill exactly one sheet.
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
      size: A4 portrait;
      /* Margins here are applied uniformly to every printed page,
         unlike body padding which only affects the first page. */
      margin: 10mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: white;
    }

    /* ── One report = one A4 page ── */
    /* @page margin: 10mm top + 10mm bottom = 20mm consumed.
       277mm = 297mm A4 height − 20mm margins. */
    .print-page {
      height: 277mm;
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

    /* Force the cloned card to fill the full 277mm as a flex
       column so the spacer inside can push the signature down. */
    .print-page > * {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 277mm !important;
      box-sizing: border-box !important;
      /* Strip screen-only decorations */
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

// ─────────────────────────────────────────────────────────────
// Injects a hidden <iframe>, writes the print HTML into it,
// then calls print() on that frame.
// ─────────────────────────────────────────────────────────────
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
  // Fallback in case onload already fired before we set the handler.
  setTimeout(doPrint, 800);
}

// ─────────────────────────────────────────────────────────────

export function WeeklyReportsClient({ initialWeeksData, studentName, userId }: Props) {
  const [weeksData, setWeeksData] = useState<WeekData[]>(initialWeeksData);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // weekNo → the printable card DOM element
  const printRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerPrintRef = useCallback(
    (weekNo: number) => (el: HTMLElement | null) => {
      if (el) printRefs.current.set(weekNo, el);
      else printRefs.current.delete(weekNo);
    },
    []
  );

  // ── Print one week ───────────────────────────────────────────
  const handlePrintOne = (weekNo: number) => {
    const el = printRefs.current.get(weekNo);
    if (!el) return;
    printViaIframe(`<div class="print-page">${el.outerHTML}</div>`);
  };

  // ── Print all generated weeks ────────────────────────────────
  const handlePrintAll = () => {
    const sorted = Array.from(printRefs.current.entries()).sort(([a], [b]) => a - b);
    if (!sorted.length) return;
    const allHtml = sorted
      .map(([, el]) => `<div class="print-page">${el.outerHTML}</div>`)
      .join("\n");
    printViaIframe(allHtml);
  };

  // ── Generate AI for one week ─────────────────────────────────
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
      {/* Page header */}
      <div className="flex justify-between items-center mb-3">
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

      {/* Tip banner about browser headers/footers */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-md px-3 py-2 mb-6">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          <strong>For clean prints:</strong> In the browser print dialog, set{" "}
          <strong>Margins → None</strong> and uncheck{" "}
          <strong>Headers and footers</strong> to remove the date/time and page
          URL from the output.
        </span>
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
