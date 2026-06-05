"use client";

import { useRef, useEffect } from "react";
import { slotToTime, getTotalSlots, formatDayShort } from "@/lib/utils";

interface Props {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  slots: Record<string, number[]>;
  onChange: (slots: Record<string, number[]>) => void;
  dateRanges?: Record<string, { start: number; end: number }>;
}

const HEADER_H = 60;

export default function AvailabilityGrid({
  dates, timeStart, timeEnd, slots, onChange, dateRanges,
}: Props) {
  const totalSlots = getTotalSlots(timeStart, timeEnd);
  const isDragging = useRef(false);
  const dragMode   = useRef<"add" | "remove">("add");
  const lastKey    = useRef<string | null>(null);

  const cellH = totalSlots <= 12 ? 40 : totalSlots <= 20 ? 32 : 26;

  function inRange(date: string, i: number) {
    if (!dateRanges?.[date]) return true;
    const { start, end } = dateRanges[date];
    const h = timeStart + i * 0.5;
    return h >= start && h < end;
  }

  function isSel(date: string, i: number) {
    return (slots[date] ?? []).includes(i);
  }

  function toggle(date: string, i: number, mode: "add" | "remove") {
    if (!inRange(date, i)) return;
    const cur = slots[date] ?? [];
    const next = mode === "add"
      ? cur.includes(i) ? cur : [...cur, i]
      : cur.filter(s => s !== i);
    onChange({ ...slots, [date]: next });
  }

  function mouseDown(date: string, i: number) {
    if (!inRange(date, i)) return;
    isDragging.current = true;
    dragMode.current   = isSel(date, i) ? "remove" : "add";
    lastKey.current    = `${date}-${i}`;
    toggle(date, i, dragMode.current);
  }

  function mouseEnter(date: string, i: number) {
    if (!isDragging.current || !inRange(date, i)) return;
    const k = `${date}-${i}`;
    if (k === lastKey.current) return;
    lastKey.current = k;
    toggle(date, i, dragMode.current);
  }

  function touchMove(e: React.TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el) return;
    const date = el.getAttribute("data-date");
    const si   = el.getAttribute("data-slot");
    if (!date || si === null) return;
    const i = parseInt(si);
    if (!inRange(date, i)) return;
    const k = `${date}-${i}`;
    if (k === lastKey.current) return;
    lastKey.current = k;
    toggle(date, i, dragMode.current);
  }

  useEffect(() => {
    const up = () => { isDragging.current = false; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const TIME_COL = 60;
  const COL_W = dates.length <= 2 ? 100 : dates.length <= 5 ? 82 : dates.length <= 7 ? 68 : 58;
  const gridW  = TIME_COL + dates.length * COL_W;

  return (
    <div
      className="overflow-x-auto select-none touch-none"
      style={{ border: "2px solid var(--border-light)", borderRadius: 14 }}
      onTouchMove={touchMove}
      onTouchEnd={() => { isDragging.current = false; }}
    >
      <div style={{ width: gridW }}>

        {/* ── Sticky header ── */}
        <div
          className="sticky top-0 z-10 flex"
          style={{
            height: HEADER_H,
            borderBottom: "2px solid var(--border-light)",
            background: "rgba(247,244,238,0.97)",
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Time col spacer */}
          <div style={{ width: TIME_COL, flexShrink: 0, borderRight: "1px solid var(--border-light)" }} />

          {/* Day headers */}
          {dates.map((d, idx) => {
            const num    = new Date(d + "T12:00:00").getDate();
            const hasSel = (slots[d] ?? []).length > 0;
            return (
              <div
                key={d}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  borderRight: idx < dates.length - 1 ? "1px solid var(--border-light)" : "none",
                }}
              >
                <span
                  className="font-doodle text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "var(--muted-2)" }}
                >
                  {formatDayShort(d)}
                </span>
                <div
                  className="flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    width: 32, height: 32,
                    borderRadius: "50%",
                    background: hasSel ? "var(--accent)" : "transparent",
                    color: hasSel ? "#fff" : "var(--text)",
                    boxShadow: hasSel ? "2px 2px 0 rgba(22,163,74,0.3)" : "none",
                  }}
                >
                  {num}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Slot rows ── */}
        {Array.from({ length: totalSlots }, (_, i) => {
          const isHour = i % 2 === 0;
          return (
            <div key={i} className="flex">

              {/* Time label */}
              <div
                className="flex-shrink-0 flex items-start justify-end pr-3"
                style={{
                  width: TIME_COL,
                  height: cellH,
                  paddingTop: 3,
                  borderRight: "1px solid var(--border-light)",
                  borderTop: isHour && i > 0 ? "1px solid var(--border-light)" : "1px solid rgba(0,0,0,0.04)",
                }}
              >
                {isHour && (
                  <span
                    className="font-doodle text-[10px] font-bold tabular-nums"
                    style={{ color: "var(--muted-2)", lineHeight: 1 }}
                  >
                    {slotToTime(i, timeStart)}
                  </span>
                )}
              </div>

              {/* Slot cells — one per date */}
              {dates.map((d, colIdx) => {
                const ok  = inRange(d, i);
                const sel = ok && isSel(d, i);

                const selAbove = i > 0 && isSel(d, i - 1) && inRange(d, i - 1);
                const selBelow = i < totalSlots - 1 && isSel(d, i + 1) && inRange(d, i + 1);
                const isTop = sel && !selAbove;
                const isBot = sel && !selBelow;

                // Caps: rounded only at the start/end of a contiguous run
                const r = 5;
                const borderRadius = sel
                  ? isTop && isBot ? `${r}px`
                  : isTop          ? `${r}px ${r}px 0 0`
                  : isBot          ? `0 0 ${r}px ${r}px`
                  : "0"
                  : "0";

                // Suppress grid lines inside a continuous selected run
                const borderTop = sel && selAbove
                  ? "none"
                  : isHour && i > 0
                  ? "1px solid var(--border-light)"
                  : "1px solid rgba(0,0,0,0.04)";

                return (
                  <div
                    key={`${d}-${i}`}
                    data-date={d}
                    data-slot={i}
                    onMouseDown={() => mouseDown(d, i)}
                    onMouseEnter={() => mouseEnter(d, i)}
                    onTouchStart={() => {
                      if (!ok) return;
                      isDragging.current = true;
                      dragMode.current   = isSel(d, i) ? "remove" : "add";
                      lastKey.current    = `${d}-${i}`;
                      toggle(d, i, dragMode.current);
                    }}
                    style={{
                      width: COL_W,
                      flexShrink: 0,
                      height: cellH,
                      cursor: !ok ? "not-allowed" : "pointer",
                      borderRight: colIdx < dates.length - 1 ? "1px solid var(--border-light)" : "none",
                      borderTop,
                      // Color + radius applied directly — no inner wrapper
                      backgroundColor: sel
                        ? "rgba(22,163,74,0.82)"
                        : !ok
                        ? "rgba(0,0,0,0.03)"
                        : "transparent",
                      borderRadius,
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Bottom edge */}
        <div style={{ height: 4, borderTop: "1px solid var(--border-light)" }} />
      </div>
    </div>
  );
}
