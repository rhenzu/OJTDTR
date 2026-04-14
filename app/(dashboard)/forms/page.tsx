// app/(dashboard)/forms/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllForms } from "@/actions/form-actions";
import { getDashboardStats } from "@/actions/dtr-actions";
import Link from "next/link";
import { FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FormsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: userId, requiredTotalHours = 486, startDate } = session.user;
  if (!startDate) redirect("/dashboard");

  // Fetch both the forms list and the overall dashboard stats simultaneously
  const [forms, stats] = await Promise.all([
    getAllForms(userId, startDate),
    getDashboardStats(userId, requiredTotalHours)
  ]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          DTR Forms Tracker
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          View, edit, and print your 15-day Daily Time Record forms.
        </p>
      </div>

      {/* OVERALL HOURS SUMMARY CARD */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4" />
             Overall OJT Hours Progress
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-1 border-l-2 border-emerald-500/30 pl-3">
               <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Worked</p>
               <p className="font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalHoursWorked.toFixed(2)}h</p>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Required Hours</p>
               <p className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">{requiredTotalHours}h</p>
             </div>
             <div className="space-y-1 border-l-2 border-amber-500/30 pl-3">
               <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Remaining</p>
               <p className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.remainingHours.toFixed(2)}h</p>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Completion</p>
               <p className="font-mono text-2xl font-bold text-foreground">{stats.progressPercent}%</p>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {forms.map((f, i) => {
          const isLatest = i === 0;
          // Calculate the Total Worked specifically as of THIS form period
          const totalWorkedAsOfForm = f.previousHours + f.totalHoursThisForm;
          
          return (
            <Card key={f.startDate} className={`hover:shadow-md transition-shadow ${isLatest ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
              <CardContent className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl mt-1 shrink-0 ${isLatest ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base">{f.periodTitle}</h3>
                      {isLatest && <Badge variant="default" className="text-[10px] px-2 h-5">Active Period</Badge>}
                    </div>
                    
                    {/* IN-DEPTH FORM MATH ROW */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap bg-muted/40 rounded-lg p-2 px-3 border border-border/50">
                       <div className="flex flex-col">
                         <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Previous</span>
                         <span className="text-sm font-mono">{f.previousHours.toFixed(2)}h</span>
                       </div>
                       <div className="text-muted-foreground/40 font-mono text-lg font-light">+</div>
                       <div className="flex flex-col">
                         <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">This Form</span>
                         <span className="text-sm font-mono text-primary font-medium">{f.totalHoursThisForm.toFixed(2)}h</span>
                       </div>
                       <div className="text-muted-foreground/40 font-mono text-lg font-light">=</div>
                       <div className="flex flex-col border-l-2 border-emerald-500/30 pl-3">
                         <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Total Worked</span>
                         <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold">{totalWorkedAsOfForm.toFixed(2)}h</span>
                       </div>
                       <div className="flex flex-col border-l-2 border-amber-500/30 pl-3 ml-1 sm:ml-2">
                         <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining</span>
                         <span className="text-sm font-mono text-amber-600 dark:text-amber-400 font-bold">{f.remainingHours.toFixed(2)}h</span>
                       </div>
                    </div>

                  </div>
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto justify-end mt-2 xl:mt-0">
                  {f.studentSignature && f.supervisorSignature ? (
                     <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 shadow-none">Signed</Badge>
                  ) : (
                     <Badge variant="outline" className="text-muted-foreground shadow-none">Unsigned</Badge>
                  )}
                  <Link href={`/forms/${f.startDate}`}>
                    <Button className="gap-1.5 shadow-none" variant={isLatest ? "default" : "secondary"}>
                      {isLatest ? "Open Current" : "View Form"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}