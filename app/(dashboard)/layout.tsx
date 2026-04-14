import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getTodayRecord } from "@/actions/dtr-actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const todayRecord = await getTodayRecord(session.user.id);

  return (
    <DashboardShell
      userName={session.user.name || ""}
      internshipSite={session.user.internshipSite || ""}
      userId={session.user.id}
      todayRecord={todayRecord}
    >
      {children}
    </DashboardShell>
  );
}
