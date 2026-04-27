"use client";

import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { regenerateWeeklyReport } from "@/actions/report-actions";

interface ReportProps {
  report: any;
  studentName: string;
  /** Called when the user clicks "Print this week" */
  onPrint: () => void;
  /** Parent passes this to register the printable DOM node */
  registerRef: (el: HTMLElement | null) => void;
}

export function WeeklyReportCard({
  report,
  studentName,
  onPrint,
  registerRef,
}: ReportProps) {
  const { _id, weekNo, startDate, endDate, aiData, isComplete } = report;

  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Date formatting
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startFmt = format(start, "MMMM d");
  const endFmt =
    start.getMonth() === end.getMonth()
      ? format(end, "d, yyyy")
      : format(end, "MMMM d, yyyy");
  const inclusiveDate = `${startFmt} – ${endFmt}`;

  const handleRegenerate = async () => {
    if (!_id) return;
    setIsGenerating(true);
    await regenerateWeeklyReport(_id, customPrompt);
    setIsGenerating(false);
    setIsOpen(false);
    setCustomPrompt("");
  };

  if (!aiData)
    return (
      <div className="text-sm text-red-500 p-4">
        Failed to load AI data for Week {weekNo}.
      </div>
    );

  return (
    <div className="relative mb-8 group">

      {/* ── Print styles: zero @page margin kills browser URL/date headers,
              padding on the card itself provides the real margins ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: letter; }
          body { margin: 0; padding: 0; }
          #weekly-print-document {
            padding: 0.5in 0.5in 0.5in 1in !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}} />

      {/* ── Controls bar (visible on hover, never printed) ────── */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">

        {/* Print this week */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-white/80 backdrop-blur shadow-sm"
          onClick={onPrint}
        >
          <Printer className="w-4 h-4" />
          Print week
        </Button>

        {/* Regenerate */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-white/80 backdrop-blur shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate AI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Week {weekNo} Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Give the AI specific instructions (e.g., "Focus on networking
                tasks"). Leave blank for a standard rewrite.
              </p>
              <Textarea
                placeholder="Optional custom instructions…"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegenerate} disabled={isGenerating}>
                {isGenerating ? "Generating…" : "Regenerate Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─────────────────────────────────────────────────────────
          THE PRINTABLE CARD
          `ref={registerRef}` lets the parent clone this exact
          element into the print window — completely isolated from
          the app shell (sidebar, nav, etc.).
          A4 width on screen = 794 px @ 96 dpi.
      ──────────────────────────────────────────────────────────── */}
      <div
        id="weekly-print-document"
        ref={registerRef}
        className="bg-white border border-gray-300 shadow-sm rounded-md mx-auto w-full max-w-[794px]"
        style={{ fontFamily: '"Century Gothic", "Century Gothic Paneuropean", sans-serif' }}
      >
        <div className="p-6">

          {/* Incomplete warning (informational only, won't show in print window) */}
          {!isComplete && (
            <div className="mb-3 text-xs font-sans font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded print:hidden">
              This week has fewer than 5 logged days. Keep logging to complete it.
            </div>
          )}

          {/* Title */}
          <h1 className="text-center font-bold text-[13pt] mb-4 tracking-wide">
            WEEKLY PROGRESS REPORT
          </h1>

          {/* Header block */}
          <div className="mb-4 space-y-0.5 text-[10pt]">
            <p className="font-bold">{studentName.toUpperCase()}</p>
            <p>Week #: {weekNo}</p>
            <p>{inclusiveDate}</p>
          </div>

          {/* ── Report table ── */}
          <table className="w-full border-collapse text-[9pt] mb-8">
            <tbody>

              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">Duties Performed this week:</span>
                  <span className="leading-snug">{aiData.dutiesPerformed}</span>
                </td>
              </tr>

              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    What new training/s took place this week?
                  </span>
                  <span className="leading-snug">{aiData.newTrainings}</span>
                </td>
              </tr>

              <tr>
                <td
                  colSpan={2}
                  className="border border-black p-2 bg-gray-100 text-center font-bold text-[8.5pt] leading-snug"
                >
                  What were your major accomplishments based from the Proposed
                  Activities in your Training Schedule Form? Provide a detailed
                  description of the tasks involved in the accomplishment.
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold w-1/2 text-center uppercase text-[8.5pt]">
                  Proposed Activity/ies
                </td>
                <td className="border border-black p-2 font-bold w-1/2 text-center uppercase text-[8.5pt]">
                  Accomplishments
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 align-top">
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(aiData.proposedActivities ?? []).map(
                      (item: string, i: number) => (
                        <li key={i} className="leading-snug">{item}</li>
                      )
                    )}
                  </ul>
                </td>
                <td className="border border-black p-2 align-top">
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(aiData.actualAccomplishments ?? []).map(
                      (item: string, i: number) => (
                        <li key={i} className="leading-snug">{item}</li>
                      )
                    )}
                  </ul>
                </td>
              </tr>

              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    What problems have you encountered this week?
                  </span>
                  <span className="leading-snug">{aiData.problemsEncountered}</span>
                </td>
              </tr>

              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    How did you overcome or solve those problems?
                  </span>
                  <span className="leading-snug">{aiData.solutions}</span>
                </td>
              </tr>

              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    List one or two goals you have set for yourself next week.
                  </span>
                  <span className="leading-snug">{aiData.goalsNextWeek}</span>
                </td>
              </tr>

            </tbody>
          </table>

          {/* Signature */}
          <div className="text-[9pt]">
            <p className="mb-6">Noted by:</p>
            <div className="w-56">
              <p className="font-bold uppercase border-b border-black text-center pb-0.5 mb-0.5">
                KIRBY FUENTES
              </p>
              <p className="text-center">OIC-IT DEPARTMENT, TSKI</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
