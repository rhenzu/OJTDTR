import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWeeksData } from "@/actions/report-actions";
import { WeeklyReportsClient } from "@/components/weekly-reports-client";

export default async function WeeklyReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Only fetches existing saved reports — no AI calls on page load
  const weeksData = await getWeeksData(session.user.id);
  const studentName = session.user.name || "Student Name";

  return (
    <WeeklyReportsClient
      initialWeeksData={weeksData}
      studentName={studentName}
      userId={session.user.id}
    />
  );
}
