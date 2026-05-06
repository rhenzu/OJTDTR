"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { RefreshCw, Printer, Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { regenerateWeeklyReport, saveWeeklyReport } from "@/actions/report-actions";

interface ReportProps {
  report: any;
  studentName: string;
  onPrint: () => void;
  registerRef: (el: HTMLElement | null) => void;
}

// ── Tiny inline helpers ──────────────────────────────────────────────────────

/** A growing textarea that looks like plain text when not focused */
function InlineText({
  value,
  onChange,
  placeholder = "—",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      className="w-full resize-none bg-yellow-50/60 border border-dashed border-yellow-400
                 rounded px-1.5 py-1 text-[9pt] leading-snug focus:outline-none
                 focus:bg-yellow-50 focus:border-yellow-500 min-h-[3rem]
                 placeholder:text-gray-400 transition-colors"
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => {
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
        onChange(e.target.value);
      }}
    />
  );
}

/** An editable bullet list */
function InlineList({
  items,
  onChange,
  placeholder = "Add item…",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="mt-2 text-[8pt] text-gray-400 select-none">•</span>
          <textarea
            className="flex-1 resize-none bg-yellow-50/60 border border-dashed border-yellow-400
                       rounded px-1.5 py-1 text-[9pt] leading-snug focus:outline-none
                       focus:bg-yellow-50 focus:border-yellow-500 min-h-[1.8rem]
                       placeholder:text-gray-400 transition-colors"
            value={item}
            placeholder={placeholder}
            rows={1}
            onChange={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
              update(i, e.target.value);
            }}
          />
          <button
            onClick={() => remove(i)}
            className="mt-1.5 text-red-400 hover:text-red-600 transition-colors shrink-0"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={add}
          className="flex items-center gap-1 text-[8.5pt] text-blue-500 hover:text-blue-700
                     transition-colors mt-0.5 pl-4"
        >
          <Plus className="w-3 h-3" /> Add item
        </button>
      </li>
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeeklyReportCard({
  report,
  studentName,
  onPrint,
  registerRef,
}: ReportProps) {
  const { _id, weekNo, startDate, endDate, aiData, isComplete } = report;

  // ── Dialog / regen state
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // ── Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const emptyData = {
    dutiesPerformed: "",
    newTrainings: "",
    proposedActivities: [] as string[],
    actualAccomplishments: [] as string[],
    problemsEncountered: "",
    solutions: "",
    goalsNextWeek: "",
  };

  const [draft, setDraft] = useState({ ...emptyData, ...aiData });

  const setField = useCallback(
    <K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) =>
      setDraft((prev) => ({ ...prev, [key]: val })),
    []
  );

  const handleEdit = () => {
    setDraft({ ...emptyData, ...aiData }); // reset to latest saved data
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft({ ...emptyData, ...aiData });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!_id) return;
    setIsSaving(true);
    await saveWeeklyReport(_id, draft);
    setIsSaving(false);
    setIsEditing(false);
  };

  // ── Regen
  const handleRegenerate = async () => {
    if (!_id) return;
    setIsGenerating(true);
    await regenerateWeeklyReport(_id, customPrompt);
    setIsGenerating(false);
    setIsOpen(false);
    setCustomPrompt("");
  };

  // ── Date formatting
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startFmt = format(start, "MMMM d");
  const endFmt =
    start.getMonth() === end.getMonth()
      ? format(end, "d, yyyy")
      : format(end, "MMMM d, yyyy");
  const inclusiveDate = `${startFmt} – ${endFmt}`;

  // Current data to display (draft while editing, aiData otherwise)
  const data = isEditing ? draft : aiData;

  if (!aiData)
    return (
      <div className="text-sm text-red-500 p-4">
        Failed to load AI data for Week {weekNo}.
      </div>
    );

  return (
    <div className="relative mb-8 group">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { margin: 0; size: letter; }
            body { margin: 0; padding: 0; }
            #weekly-print-document {
              padding: 0.3in 0.3in 0.3in 0.5in !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
        `,
        }}
      />

      {/* ── Controls bar ──────────────────────────────────────────── */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 print:hidden">

        {/* Save / Cancel — shown only while editing */}
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-white/90 backdrop-blur shadow-sm border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="w-4 h-4" />
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </>
        ) : (
          /* Normal controls — visible on hover */
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-white/80 backdrop-blur shadow-sm"
              onClick={handleEdit}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>

            {/* Print */}
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
        )}
      </div>

      {/* ── Editing banner ───────────────────────────────────────── */}
      {isEditing && (
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded print:hidden">
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          Editing mode — fields highlighted in yellow are editable. Click Save changes when done.
        </div>
      )}

      {/* ── Incomplete warning ───────────────────────────────────── */}
      {!isComplete && (
        <div className="mb-3 text-xs font-sans font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded print:hidden">
          This week has fewer than 5 logged days. Keep logging to complete it.
        </div>
      )}

      {/* ── THE PRINTABLE CARD ───────────────────────────────────── */}
      <div
        id="weekly-print-document"
        ref={registerRef}
        className="bg-white border border-gray-300 shadow-sm rounded-md mx-auto w-full max-w-[794px]"
        style={{
          fontFamily: '"Century Gothic", "Century Gothic Paneuropean", sans-serif',
        }}
      >
        <div className="p-6">
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

              {/* Duties Performed */}
              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">Duties Performed this week:</span>
                  {isEditing ? (
                    <InlineText
                      value={draft.dutiesPerformed}
                      onChange={(v) => setField("dutiesPerformed", v)}
                      placeholder="Describe duties performed…"
                    />
                  ) : (
                    <span className="leading-snug">{data.dutiesPerformed}</span>
                  )}
                </td>
              </tr>

              {/* New Trainings */}
              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    What new training/s took place this week?
                  </span>
                  {isEditing ? (
                    <InlineText
                      value={draft.newTrainings}
                      onChange={(v) => setField("newTrainings", v)}
                      placeholder="Describe trainings…"
                    />
                  ) : (
                    <span className="leading-snug">{data.newTrainings}</span>
                  )}
                </td>
              </tr>

              {/* Section header */}
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

              {/* Column headers */}
              <tr>
                <td className="border border-black p-2 font-bold w-1/2 text-center uppercase text-[8.5pt]">
                  Proposed Activity/ies
                </td>
                <td className="border border-black p-2 font-bold w-1/2 text-center uppercase text-[8.5pt]">
                  Accomplishments
                </td>
              </tr>

              {/* Activities + Accomplishments */}
              <tr>
                <td className="border border-black p-2 align-top">
                  {isEditing ? (
                    <InlineList
                      items={draft.proposedActivities}
                      onChange={(v) => setField("proposedActivities", v)}
                      placeholder="Proposed activity…"
                    />
                  ) : (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {(data.proposedActivities ?? []).map((item: string, i: number) => (
                        <li key={i} className="leading-snug">{item}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="border border-black p-2 align-top">
                  {isEditing ? (
                    <InlineList
                      items={draft.actualAccomplishments}
                      onChange={(v) => setField("actualAccomplishments", v)}
                      placeholder="Accomplishment…"
                    />
                  ) : (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {(data.actualAccomplishments ?? []).map((item: string, i: number) => (
                        <li key={i} className="leading-snug">{item}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>

              {/* Problems */}
              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    What problems have you encountered this week?
                  </span>
                  {isEditing ? (
                    <InlineText
                      value={draft.problemsEncountered}
                      onChange={(v) => setField("problemsEncountered", v)}
                      placeholder="Describe problems encountered…"
                    />
                  ) : (
                    <span className="leading-snug">{data.problemsEncountered}</span>
                  )}
                </td>
              </tr>

              {/* Solutions */}
              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    How did you overcome or solve those problems?
                  </span>
                  {isEditing ? (
                    <InlineText
                      value={draft.solutions}
                      onChange={(v) => setField("solutions", v)}
                      placeholder="Describe solutions…"
                    />
                  ) : (
                    <span className="leading-snug">{data.solutions}</span>
                  )}
                </td>
              </tr>

              {/* Goals */}
              <tr>
                <td colSpan={2} className="border border-black p-2 align-top">
                  <span className="font-bold block mb-1">
                    List one or two goals you have set for yourself next week.
                  </span>
                  {isEditing ? (
                    <InlineText
                      value={draft.goalsNextWeek}
                      onChange={(v) => setField("goalsNextWeek", v)}
                      placeholder="Describe goals for next week…"
                    />
                  ) : (
                    <span className="leading-snug">{data.goalsNextWeek}</span>
                  )}
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
