import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { generateWeeklyReports } from "@/actions/report-actions";
import { WeeklyReportCard } from "@/components/weekly-report-card";
// Import your existing client-side print button
import { PrintButton } from "@/components/print-button"; 

// 1. Define the shape of our report data so TypeScript is happy
interface ReportData {
  weekNo: number;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  aiData: any; 
}

export default async function WeeklyReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Call the server action to calculate and generate AI data
  const reports = await generateWeeklyReports(session.user.id);
  const studentName = session.user.name || "Student Name";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">AI Weekly Reports</h1>
          <p className="text-muted-foreground text-sm">
            Automatically compiled every 5 working days using Gemini 2.5 Flash.
          </p>
        </div>
        
        {/* 2. Replaced the inline button with your PrintButton component */}
        <PrintButton />
      </div>

      <div className="space-y-12 print:space-y-0 print:block">
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground mt-12">
            Not enough working days logged yet to generate a report.
          </p>
        ) : (
          /* 3. Explicitly tell TypeScript that 'report' is of type 'ReportData' */
          reports.map((report: ReportData) => (
            <div key={report.weekNo} className="print:break-after-page print:break-inside-avoid">
               <WeeklyReportCard report={report} studentName={studentName} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
