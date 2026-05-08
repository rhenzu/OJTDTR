"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotedByValue {
  name: string;
  title: string;
}

interface NotedByContextType {
  notedBy: NotedByValue;
  setNotedBy: (v: NotedByValue) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dtr_noted_by";

const defaultValue: NotedByValue = {
  name: "KIRBY FUENTES",
  title: "OIC-IT DEPARTMENT, TSKI",
};

const NotedByContext = createContext<NotedByContextType>({
  notedBy: defaultValue,
  setNotedBy: () => {},
});

export function NotedByProvider({ children }: { children: ReactNode }) {
  const [notedBy, setNotedByState] = useState<NotedByValue>(defaultValue);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setNotedByState(JSON.parse(stored));
    } catch {}
  }, []);

  const setNotedBy = useCallback((v: NotedByValue) => {
    setNotedByState(v);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {}
  }, []);

  return (
    <NotedByContext.Provider value={{ notedBy, setNotedBy }}>
      {children}
    </NotedByContext.Provider>
  );
}

export function useNotedBy() {
  return useContext(NotedByContext);
}

// ── Global settings bar ───────────────────────────────────────────────────────
// Drop this anywhere above your list of weekly report cards.

export function NotedBySettingsBar() {
  const { notedBy, setNotedBy } = useNotedBy();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(notedBy);

  // Keep draft in sync if context changes externally
  useEffect(() => {
    if (!isEditing) setDraft(notedBy);
  }, [notedBy, isEditing]);

  const handleSave = () => {
    setNotedBy(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(notedBy);
    setIsEditing(false);
  };

  return (
    <div className="print:hidden flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-sm mb-4">
      <span className="text-muted-foreground font-medium shrink-0">Noted by (global):</span>

      {isEditing ? (
        <>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="Supervisor name"
            className="flex-1 min-w-0 border border-dashed border-yellow-400 bg-yellow-50/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-500 font-semibold uppercase"
          />
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title / Department"
            className="flex-1 min-w-0 border border-dashed border-yellow-400 bg-yellow-50/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-500"
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-red-300 text-red-600 hover:bg-red-50 shrink-0"
            onClick={handleCancel}
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            onClick={handleSave}
          >
            <Check className="w-3.5 h-3.5" /> Apply to all
          </Button>
        </>
      ) : (
        <>
          <span className="font-semibold uppercase">{notedBy.name}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{notedBy.title}</span>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 ml-auto shrink-0"
            onClick={() => { setDraft(notedBy); setIsEditing(true); }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </>
      )}
    </div>
  );
}
