import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getYearToDateRecords } from "@/actions/dtr-actions";
import { parseISO, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// 1. Define the TypeScript interface for your records
interface DTRRecord {
  date: string;
  morningIn?: string;
  morningOut?: string;
  afternoonIn?: string;
  afternoonOut?: string;
  totalHours?: number;
  [key: string]: any; // Allow other properties
}

// 2. Apply the interface to the helper function
function groupByMonth(records: DTRRecord[]) {
  return records.reduce((acc, record) => {
    const month = format(parseISO(record.date), "MMMM yyyy");
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {} as Record<string, DTRRecord[]>);
}

export default async function PrintAllPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const records = await getYearToDateRecords(session.user.id);
  const groupedRecords = groupByMonth(records);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-black min-h-screen">
      {/* Non-printable controls */}
      <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Batch Print DTR</h1>
          <p className="text-muted-foreground">January to Current Date</p>
        </div>
        <Button onClick={() => typeof window !== 'undefined' && window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print to PDF
        </Button>
      </div>

      {/* Printable Forms Loop */}
      <div className="print-container">
        {/* 3. Explicitly type [string, DTRRecord[]] here to fix the "unknown" error */}
        {Object.entries(groupedRecords).map(([month, monthRecords]: [string, DTRRecord[]]) => (
          <div key={month} className="page-break w-full mb-12">
            <div id="dtr-form" className="p-4">
              <h2 className="text-center font-bold text-xl uppercase mb-1">
                Daily Time Record
              </h2>
              <p className="text-center mb-4 font-semibold">{month}</p>
              
              <div className="mb-4 text-sm">
                <p>Name: <strong>{session.user.name || "Student Name"}</strong></p>
              </div>

              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border p-1">Date</th>
                    <th colSpan={2} className="border p-1">AM</th>
                    <th colSpan={2} className="border p-1">PM</th>
                    <th rowSpan={2} className="border p-1">Total Hours</th>
                  </tr>
                  <tr>
                    <th className="border p-1">Arrival</th>
                    <th className="border p-1">Departure</th>
                    <th className="border p-1">Arrival</th>
                    <th className="border p-1">Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const record = monthRecords.find(r => parseISO(r.date).getDate() === day);
                    
                    return (
                      <tr key={day}>
                        <td className="border p-1">{day}</td>
                        <td className="border p-1">{record?.morningIn ? format(parseISO(record.morningIn), "HH:mm") : ""}</td>
                        <td className="border p-1">{record?.morningOut ? format(parseISO(record.morningOut), "HH:mm") : ""}</td>
                        <td className="border p-1">{record?.afternoonIn ? format(parseISO(record.afternoonIn), "HH:mm") : ""}</td>
                        <td className="border p-1">{record?.afternoonOut ? format(parseISO(record.afternoonOut), "HH:mm") : ""}</td>
                        <td className="border p-1">{record?.totalHours || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="mt-8 flex justify-between text-sm">
                <div className="text-center">
                  <div className="border-b border-black w-48 mb-1"></div>
                  <p>Student Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-black w-48 mb-1"></div>
                  <p>Supervisor Signature</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {Object.keys(groupedRecords).length === 0 && (
          <p className="text-center text-muted-foreground">No records found for the current year.</p>
        )}
      </div>
    </div>
  );
}
