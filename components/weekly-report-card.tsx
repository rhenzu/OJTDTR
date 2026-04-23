"use client";

import { format } from "date-fns";

interface ReportProps {
  report: any;
  studentName: string;
}

export function WeeklyReportCard({ report, studentName }: ReportProps) {
  const { weekNo, startDate, endDate, aiData, isComplete } = report;

  // Format Dates (e.g., January 28 - February 3, 2026)
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startFormat = format(start, "MMMM d");
  const endFormat = start.getMonth() === end.getMonth() 
    ? format(end, "d, yyyy") 
    : format(end, "MMMM d, yyyy");
  
  const inclusiveDate = `${startFormat} - ${endFormat}`;

  if (!aiData) return <div>Failed to load AI Data for Week {weekNo}</div>;

  return (
    <div className="bg-white p-8 mb-8 border border-gray-300 shadow-sm rounded-md" style={{ fontFamily: '"Century Gothic", sans-serif' }}>
      
      {!isComplete && (
        <div className="mb-4 text-xs font-sans font-bold text-amber-600 bg-amber-50 p-2 rounded">
          Note: This week currently has less than 5 logged days. Continue logging to complete it.
        </div>
      )}

      {/* Header section */}
      <h1 className="text-center font-bold text-[14pt] mb-6">WEEKLY PROGRESS REPORT</h1>
      
      <div className="mb-6 space-y-1 text-sm">
        <p className="font-bold">{studentName.toUpperCase()}</p>
        <p>Week #: {weekNo}</p>
        <p>{inclusiveDate}</p>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black text-sm mb-12">
        <tbody>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top min-h-[60px]">
              <span className="font-bold block mb-2">Duties Performed this week:</span>
              {aiData.dutiesPerformed}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top min-h-[60px]">
              <span className="font-bold block mb-2">What new training/s took place this week?</span>
              {aiData.newTrainings}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top bg-gray-50 text-center font-bold">
              What were your major accomplishments based from the Proposed Activities in your Training Schedule Form? Provide a detailed description of the tasks involved in the accomplishment.
            </td>
          </tr>
          <tr>
            <td className="border border-black p-3 align-top font-bold w-1/2 text-center uppercase">
              Proposed Activity/ies
            </td>
            <td className="border border-black p-3 align-top font-bold w-1/2 text-center uppercase">
              Accomplishments
            </td>
          </tr>
          <tr>
            <td className="border border-black p-3 align-top">
              <ul className="list-disc pl-5 space-y-1">
                {aiData.proposedActivities?.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </td>
            <td className="border border-black p-3 align-top">
              <ul className="list-disc pl-5 space-y-1">
                {aiData.actualAccomplishments?.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top">
              <span className="font-bold block mb-2">What problems have you encountered this week?</span>
              {aiData.problemsEncountered}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top">
              <span className="font-bold block mb-2">How did you overcome or solve those problems?</span>
              {aiData.solutions}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-3 align-top">
              <span className="font-bold block mb-2">List one or two goals you have set for yourself next week.</span>
              {aiData.goalsNextWeek}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature Section */}
      <div className="mt-12 text-sm">
        <p className="mb-8">Noted by:</p>
        <div className="w-64">
          <p className="font-bold uppercase border-b border-black text-center pb-1 mb-1">
            KIRBY FUENTES
          </p>
          <p className="text-center">OIC-IT DEPARTMENT, TSKI</p>
        </div>
      </div>
    </div>
  );
}
