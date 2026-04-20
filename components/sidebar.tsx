"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, FileText, Edit3,
  LogOut, Moon, Sun, Plus, ChevronRight, Printer 
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/records", label: "Time Records", icon: ClipboardList },
  { href: "/forms", label: "15-Day Forms", icon: FileText },
  { href: "/print-all", label: "Print All Forms", icon: Printer },
  { href: "/override", label: "Override DTR", icon: Edit3 },
];

interface SidebarProps {
  onLogTime: () => void;
  userName: string;
  internshipSite: string;
}

export function Sidebar({ onLogTime, userName, internshipSite }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="flex flex-col h-full w-64 border-r border-border bg-card/50 backdrop-blur-sm shrink-0">
      {/* Logo / Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">OJT Tracker</p>
            <p className="text-xs text-muted-foreground truncate">{internshipSite || "Daily Time Record"}</p>
          </div>
        </div>
      </div>

      {/* Log Time CTA */}
      <div className="p-4 border-b border-border">
        <Button onClick={onLogTime} className="w-full gap-2 font-semibold" size="default">
          <Plus className="w-4 h-4" />
          Log Time
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">Student Intern</p>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="w-3.5 h-3.5" />
            {loggingOut ? "..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
