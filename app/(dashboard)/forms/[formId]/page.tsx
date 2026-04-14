// app/(dashboard)/forms/[formId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getFormWithRecords } from "@/actions/form-actions";
import { getFormPeriod, getDaysInPeriod, getPeriodTitle, getAllPeriods } from "@/lib/dtr-logic";
import { getTodayString } from "@/lib/utils";
import { DTRTable } from "@/components/dtr-table";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { params: Promise<{ formId: string }>; }

export default async function FormDetailPage({ params }: Props) {
  const { formId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: userId, requiredTotalHours = 486, startDate } = session.user;
  const name = session.user.name ?? "";
  const internshipSite = session.user.internshipSite ?? "";
  if (!startDate) redirect("/dashboard");

  // formId is the start date of the period (YYYY-MM-DD)
  const periodStartDate = formId;

  // Validate it's a real date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStartDate)) notFound();

  // Get period from this start date
  const period = getFormPeriod(periodStartDate, startDate);

  // If requested formId doesn't match a period start, redirect to correct one
  if (period.start !== periodStartDate) {
    redirect(`/forms/${period.start}`);
  }

  const days = getDaysInPeriod(period.start, period.end);
  const periodTitle = getPeriodTitle(period.start, period.end);
  const today = getTodayString();

  const { form, records } = await getFormWithRecords(userId, period.start, period.end);
  const isCurrent = today >= period.start && today <= period.end;

  // --- Pagination Logic ---
  const allPeriods = getAllPeriods(startDate, today);
  const currentIndex = allPeriods.findIndex((p) => p.start === period.start);
  
  // allPeriods returns latest-first, so index + 1 is the OLDER period (Previous)
  const prevPeriod = currentIndex >= 0 && currentIndex < allPeriods.length - 1 ? allPeriods[currentIndex + 1] : null;
  // Index - 1 is the NEWER period (Next)
  const nextPeriod = currentIndex > 0 ? allPeriods[currentIndex - 1] : null;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/forms">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Forms
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {periodTitle}
            </h1>
            <p className="text-xs text-muted-foreground">{isCurrent ? "Current period — editable" : "Past period — click Save to update"}</p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {prevPeriod ? (
            <Link href={`/forms/${prevPeriod.start}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Period
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous Period
            </Button>
          )}

          {nextPeriod ? (
            <Link href={`/forms/${nextPeriod.start}`}>
              <Button variant="outline" size="sm">
                Next Period
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next Period
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* DTR Table */}
      <DTRTable
        userId={userId}
        days={days}
        records={records}
        form={form}
        userName={name}
        internshipSite={internshipSite}
        periodTitle={periodTitle}
        requiredTotalHours={requiredTotalHours}
        readOnly={false}
        startDate={period.start}
      />
    </div>
  );
}