"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getToday(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }
function addDays(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00"); d.setDate(d.getDate() + n); return toStr(d);
}
function getRangeBetween(a: string, b: string): string[] {
  const start = new Date(a + "T12:00:00");
  const end   = new Date(b + "T12:00:00");
  const [from, to] = start <= end ? [start, end] : [end, start];
  const result: string[] = [];
  const cur = new Date(from);
  while (cur <= to) { result.push(toStr(cur)); cur.setDate(cur.getDate() + 1); }
  return result;
}

export default function CalendarPicker({ selectedDates, onChange }: Props) {
  const today    = getToday();
  const todayStr = toStr(today);

  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const dragStartRef = useRef<string | null>(null);
  const dragModeRef  = useRef<"add" | "remove">("add");
  const [dragHover, setDragHover] = useState<string | null>(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dragRange = dragStartRef.current && dragHover
    ? getRangeBetween(dragStartRef.current, dragHover)
    : [];

  const isPast = (ds: string) => new Date(ds + "T12:00:00") < today;

  function isActiveFn(ds: string): boolean {
    if (isPast(ds)) return false;
    const inSel  = selectedDates.includes(ds);
    const inDrag = dragRange.includes(ds);
    if (dragModeRef.current === "remove") return inSel && !inDrag;
    return inSel || inDrag;
  }

  function onMouseDown(ds: string) {
    if (isPast(ds)) return;
    dragStartRef.current = ds;
    dragModeRef.current  = selectedDates.includes(ds) ? "remove" : "add";
    setDragHover(ds);
  }
  function onMouseEnter(ds: string) {
    if (!dragStartRef.current || isPast(ds)) return;
    setDragHover(ds);
  }
  const onMouseUp = useCallback(() => {
    if (!dragStartRef.current) return;
    const range = dragHover ? getRangeBetween(dragStartRef.current, dragHover) : [dragStartRef.current];
    const valid = range.filter((d) => !isPast(d));
    if (dragModeRef.current === "add") {
      onChange([...new Set([...selectedDates, ...valid])].sort());
    } else {
      const remove = new Set(valid);
      onChange(selectedDates.filter((d) => !remove.has(d)));
    }
    dragStartRef.current = null;
    setDragHover(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragHover, selectedDates, onChange]);

  return (
    <div
      className="select-none w-full"
      onMouseUp={onMouseUp}
      onMouseLeave={() => { if (dragStartRef.current) onMouseUp(); }}
    >
      {/* ── Month nav ── */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-doodle font-bold" style={{ fontSize: 22, color: "var(--text)" }}>
          {MONTHS[month]}{" "}
          <span style={{ color: "var(--muted-2)", fontWeight: 400 }}>{year}</span>
        </h3>
        <div className="flex items-center gap-1">
          {([
            { fn: () => setViewDate(new Date(year, month - 1, 1)), icon: <ChevronLeft size={14} /> },
            { fn: () => setViewDate(new Date(year, month + 1, 1)), icon: <ChevronRight size={14} /> },
          ]).map(({ fn, icon }, i) => (
            <button
              key={i}
              onClick={fn}
              className="w-8 h-8 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                border: "1.5px solid var(--border-light)",
                borderRadius: "8px",
                color: "var(--muted)",
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day headers ── */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="flex items-center justify-center pb-2">
            <span
              className="text-[10px] font-bold tracking-widest"
              style={{ color: "var(--muted-2)" }}
            >
              {d}
            </span>
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7">
        {/* Empty leading cells */}
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`e-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day     = i + 1;
          const ds      = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const past    = isPast(ds);
          const isToday = ds === todayStr;
          const active  = isActiveFn(ds);

          // Range connection (continuous strip)
          const dow       = new Date(ds + "T12:00:00").getDay();
          const connLeft  = active && dow !== 0 && isActiveFn(addDays(ds, -1));
          const connRight = active && dow !== 6 && isActiveFn(addDays(ds, +1));

          // Radius: round outer caps, square inner edges for continuous ranges
          const radius = !active
            ? "8px"
            : connLeft && connRight ? "0"
            : connLeft ? "0 10px 10px 0"
            : connRight ? "10px 0 0 10px"
            : "10px";

          return (
            <div
              key={day}
              className="flex items-center justify-center"
              style={{
                // Slight row gap between weeks (no column gap, for seamless horizontal range)
                paddingTop: 2,
                paddingBottom: 2,
              }}
            >
              <button
                disabled={past}
                onMouseDown={() => onMouseDown(ds)}
                onMouseEnter={() => onMouseEnter(ds)}
                className="relative flex items-center justify-center w-full transition-all duration-100"
                style={{
                  aspectRatio: "1",
                  background: active ? "var(--text)" : "transparent",
                  color: active ? "#fff" : past ? "var(--muted-2)" : "var(--text)",
                  borderRadius: radius,
                  cursor: past ? "not-allowed" : "pointer",
                  fontSize: 15,
                  fontWeight: active ? 700 : past ? 400 : 500,
                }}
              >
                {/* Today dot */}
                {isToday && !active && (
                  <span
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div
        className="mt-4 pt-3 flex items-center justify-between"
        style={{ borderTop: "1.5px dashed var(--border-light)" }}
      >
        {selectedDates.length > 0 ? (
          <>
            <span className="font-doodle text-sm font-bold" style={{ color: "var(--accent)" }}>
              {selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""} selected ✓
            </span>
            <button
              onClick={() => onChange([])}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: "var(--muted-2)" }}
            >
              clear all
            </button>
          </>
        ) : (
          <span className="font-doodle text-sm" style={{ color: "var(--muted-2)" }}>
            click or drag to select days
          </span>
        )}
      </div>
    </div>
  );
}
