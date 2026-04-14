"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TimeDialog } from "./time-dialog";
import { IDailyRecord } from "@/types";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  internshipSite: string;
  userId: string;
  todayRecord: IDailyRecord | null;
}

export function DashboardShell({ children, userName, internshipSite, userId, todayRecord }: DashboardShellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [record, setRecord] = useState<IDailyRecord | null>(todayRecord);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar
          onLogTime={() => { setDialogOpen(true); setSidebarOpen(false); }}
          userName={userName}
          internshipSite={internshipSite}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 p-4 border-b border-border lg:hidden bg-card/50 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <p className="font-semibold text-sm">OJT Tracker</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      <TimeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        todayRecord={record}
        userId={userId}
      />
    </div>
  );
}
