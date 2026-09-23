"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { TextInput } from "./controls";
import { cn } from "@/lib/utils";
import { toolbarBtn } from "@/components/tables/table-styles";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

interface ParseResult {
  y: number;
  m: number;
  d: number;
}

function parseISO(v: string): ParseResult | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const ts = new Date(y, mo, d).getTime();
  if (isNaN(ts)) return null;
  return { y, m: mo, d };
}

function todayISO(): string {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth(), now.getDate());
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const init = parseISO(value);
  const [viewY, setViewY] = React.useState(init?.y ?? new Date().getFullYear());
  const [viewM, setViewM] = React.useState(init?.m ?? new Date().getMonth());
  const pendingSyncRef = React.useRef(false);

  // Sync calendar view when external value changes; batch to avoid cascading renders.
  React.useEffect(() => {
    if (!open && !pendingSyncRef.current) {
      pendingSyncRef.current = true;
      const cur = parseISO(value);
      if (cur) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewY(cur.y);
         
        setViewM(cur.m);
      }
      requestAnimationFrame(() => { pendingSyncRef.current = false; });
    }
  }, [value, open]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstDay = new Date(viewY, viewM, 1).getDay();
  const today = todayISO();
  const monthLabel = new Date(viewY, viewM).toLocaleString("en-US", { month: "long", year: "numeric" });

  function selectDay(d: number) {
    onChange(toISO(viewY, viewM, d));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <TextInput
        readOnly
        value={value}
        placeholder={placeholder ?? "YYYY-MM-DD"}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn("cursor-pointer pr-10", disabled && "cursor-not-allowed")}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear date"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen((v) => !v);
          }}
          className={cn(
            toolbarBtn(false),
            "h-7 w-7 p-0",
            disabled && "pointer-events-none opacity-50",
          )}
          aria-label="Open calendar"
        >
          <Calendar className="size-3.5" />
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Pick a date"
          className="absolute z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-theme-md dark:border-gray-700 dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                setViewM((m) => {
                  if (m === 0) {
                    setViewY((y) => y - 1);
                    return 11;
                  }
                  return m - 1;
                });
              }}
              className={toolbarBtn(false) + " h-7 w-7 p-0"}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthLabel}</span>
            <button
              type="button"
              onClick={() => {
                setViewM((m) => {
                  if (m === 11) {
                    setViewY((y) => y + 1);
                    return 0;
                  }
                  return m + 1;
                });
              }}
              className={toolbarBtn(false) + " h-7 w-7 p-0"}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="h-7">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const iso = toISO(viewY, viewM, d);
              const isSelected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs transition",
                    isSelected
                      ? "bg-brand-500 text-white"
                      : isToday
                        ? "ring-1 ring-brand-500 text-gray-700 dark:text-gray-200"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(toolbarBtn(false), "w-full h-7 text-xs")}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
