"use client";

import React, { use, useState, useCallback, useSyncExternalStore } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  slotToTime, getTotalSlots, getHeatColor,
  formatFullDate, formatDate, formatDayShort, formatShortDate,
  getDateRange, getGlobalRange,
} from "@/lib/utils";
import { Lock, Copy, Check, ArrowLeft, Users, Pencil } from "lucide-react";
import Link from "next/link";

const RANK = [
  {
    label: "Best",
    tag: "🥇 Best",
    accent: "var(--accent)",
    bg: "var(--accent-light)",
    border: "var(--accent)",
    textColor: "var(--accent-text)",
    cardBg: "var(--surface)",
    cardBorder: "var(--accent)",
    radius: "16px 22px 18px 14px",
  },
  {
    label: "Good",
    tag: "🥈 Good",
    accent: "#d97706",
    bg: "#fef3c7",
    border: "#d97706",
    textColor: "#92400e",
    cardBg: "var(--surface)",
    cardBorder: "var(--border)",
    radius: "14px 18px 22px 16px",
  },
  {
    label: "Maybe",
    tag: "🥉 Maybe",
    accent: "var(--muted)",
    bg: "var(--surface-2)",
    border: "var(--border-light)",
    textColor: "var(--muted)",
    cardBg: "var(--surface)",
    cardBorder: "var(--border)",
    radius: "18px 14px 16px 22px",
  },
];

type PlanRow = { date: string; slotIndex: number; count: number; names: string[] };
type MatrixOption = PlanRow & { label: string; subLabel: string; lockSlot: number };

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-7 h-7 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{
        border: "2px solid var(--border-light)",
        borderRadius: "50% 55% 50% 45%",
        background: "var(--surface-2)",
        color: "var(--muted)",
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planData  = useQuery(api.plans.get, { id: id as Id<"plans"> });
  const lockSlot  = useMutation(api.plans.lock);
  const [locking, setLocking]         = useState<string | null>(null);
  const [copied,  setCopied]          = useState(false);
  const [organizerClaimed, setOrganizerClaimed] = useState(false);

  const storedIsOrganizer = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => !!localStorage.getItem(`nodex-owns-${id}`),
    () => false
  );
  const isOrganizer = storedIsOrganizer || organizerClaimed;
  function claimOrganizer() { localStorage.setItem(`nodex-owns-${id}`, "1"); setOrganizerClaimed(true); }

  const handleLock = useCallback(async (date: string, slotIndex: number) => {
    const key = `${date}-${slotIndex}`;
    setLocking(key);
    try {
      await lockSlot({ id: id as Id<"plans">, date, slotIndex });
    } finally {
      setLocking(null);
    }
  }, [id, lockSlot]);

  if (planData === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border-light)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (planData === null) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-doodle text-2xl font-bold" style={{ color: "var(--muted)" }}>Plan not found.</p>
        <p className="text-sm" style={{ color: "var(--muted-2)" }}>This link may be invalid or the plan was deleted.</p>
        <Link href="/" className="font-doodle text-base font-bold px-5 py-2.5 transition-all"
          style={{ color: "var(--accent-text)", background: "var(--accent-light)", border: "2px solid var(--accent)", borderRadius: "10px 14px 12px 8px", boxShadow: "3px 3px 0 var(--accent)" }}>
          ← Back to home
        </Link>
      </div>
    );
  }

  const { plan, participants } = planData;
  const total    = participants.length;
  const isLocked = plan.lockedDate !== undefined && plan.lockedSlot !== undefined;
  const globalRange = plan.hasTime ? getGlobalRange(plan) : { start: 0, end: 0 };
  const totalSlots  = plan.hasTime ? getTotalSlots(globalRange.start, globalRange.end) : 0;

  const bestRows: PlanRow[] = [];
  if (plan.hasTime) {
    for (const date of plan.dates) {
      const dr = getDateRange(plan, date);
      for (let s = 0; s < totalSlots; s++) {
        const slotHour = globalRange.start + s * 0.5;
        if (slotHour < dr.start || slotHour >= dr.end) continue;
        const freeP = participants.filter((p) => (p.slots as Record<string, number[]>)[date]?.includes(s));
        if (freeP.length > 0) bestRows.push({ date, slotIndex: s, count: freeP.length, names: freeP.map(p => p.name) });
      }
    }
    bestRows.sort((a, b) => b.count - a.count || a.slotIndex - b.slotIndex);
  } else {
    for (const date of plan.dates) {
      const freeP = participants.filter((p) => (p.slots as Record<string, number[]>)[date]?.includes(1));
      bestRows.push({ date, slotIndex: -1, count: freeP.length, names: freeP.map(p => p.name) });
    }
    bestRows.sort((a, b) => b.count - a.count);
  }
  const top3 = bestRows.slice(0, 3);

  const matrixOptions: MatrixOption[] = plan.hasTime
    ? plan.dates.flatMap((date) => {
        const dr = getDateRange(plan, date);
        return Array.from({ length: totalSlots }, (_, s) => {
          const slotHour = globalRange.start + s * 0.5;
          if (slotHour < dr.start || slotHour >= dr.end) return null;
          const names = participants
            .filter((p) => (p.slots as Record<string, number[]>)[date]?.includes(s))
            .map((p) => p.name);
          return {
            date,
            slotIndex: s,
            lockSlot: s,
            count: names.length,
            names,
            label: slotToTime(s, globalRange.start),
            subLabel: formatShortDate(date),
          };
        }).filter((option): option is MatrixOption => option !== null);
      })
    : plan.dates.map((date) => {
        const names = participants
          .filter((p) => (p.slots as Record<string, number[]>)[date]?.includes(1))
          .map((p) => p.name);
        return {
          date,
          slotIndex: -1,
          lockSlot: 1,
          count: names.length,
          names,
          label: formatDayShort(date),
          subLabel: formatShortDate(date),
        };
      });
  const showDoodleBoard = !plan.hasTime && total > 0 && matrixOptions.length > 0;
  const slotColumnMin = plan.dates.length > 10 ? 52 : 64;
  const slotGridMinWidth = 72 + plan.dates.length * slotColumnMin;

  function isParticipantFree(participant: typeof participants[number], option: MatrixOption) {
    return (participant.slots as Record<string, number[]>)[option.date]?.includes(option.lockSlot) ?? false;
  }

  function getFinalMessage() {
    if (!isLocked) return "";
    const dateStr = formatFullDate(plan.lockedDate!);
    const timeStr = plan.hasTime ? ` at ${slotToTime(plan.lockedSlot!, globalRange.start)}` : "";
    const names = plan.hasTime
      ? participants.filter((p) => (p.slots as Record<string, number[]>)[plan.lockedDate!]?.includes(plan.lockedSlot!)).map(p => p.name).join(", ")
      : participants.filter((p) => (p.slots as Record<string, number[]>)[plan.lockedDate!]?.includes(1)).map(p => p.name).join(", ");
    return `${plan.name}\n${dateStr}${timeStr}\nFree: ${names}`;
  }

  async function handleCopyFinal() {
    try {
      await navigator.clipboard.writeText(getFinalMessage());
    } catch {
      // Clipboard API unavailable or permission denied — silently ignore
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* ── Header ── */}
      <header
        className="border-b px-5 py-3.5 flex items-center gap-3 sticky top-0 z-10"
        style={{
          borderColor: "var(--border-light)",
          background: "rgba(247,244,238,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Link href={`/plan/${id}`} className="transition-colors" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-doodle text-xl font-bold truncate" style={{ color: "var(--text)" }}>
            {plan.name}
          </h1>
          <p className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
            <Users size={11} />
            {total} response{total !== 1 ? "s" : ""}
            {isLocked && <span className="ml-1 font-bold" style={{ color: "var(--accent)" }}>· Locked ✓</span>}
          </p>
        </div>
        {isOrganizer && (
          <Link
            href={`/plan/${id}/edit`}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 transition-all"
            style={{
              color: "var(--muted)",
              border: "1.5px solid var(--border-light)",
              borderRadius: "6px 8px 6px 4px",
            }}
          >
            <Pencil size={12} /> Edit
          </Link>
        )}
      </header>

      <main className="results-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-5 lg:px-8 py-5 sm:py-7 space-y-8">

        {/* ── Locked banner ── */}
        {isLocked && (
          <div
            className="doodle-locked-banner anim-fade-up p-6 space-y-4"
            style={{
              background: "var(--accent-light)",
              border: "2.5px solid var(--accent)",
              borderRadius: "16px 22px 18px 14px",
              boxShadow: "5px 5px 0 var(--accent)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 flex items-center justify-center"
                  style={{
                    background: "var(--accent)",
                    borderRadius: "50%",
                  }}
                >
                  <Lock size={13} style={{ color: "#fff" }} />
                </div>
                <span className="font-doodle text-base font-bold" style={{ color: "var(--accent-text)" }}>
                  Time Locked In! 🎉
                </span>
              </div>
              <button
                onClick={handleCopyFinal}
                className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 transition-all w-full sm:w-auto"
                style={{
                  color: "var(--accent-text)",
                  background: "#fff",
                  border: "2px solid var(--accent)",
                  borderRadius: "8px 10px 8px 6px",
                  boxShadow: "2px 2px 0 var(--accent)",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy message"}
              </button>
            </div>

            <div className="space-y-0.5">
              <p className="text-sm" style={{ color: "var(--accent-text)", opacity: 0.8 }}>
                {formatFullDate(plan.lockedDate!)}
              </p>
              <p className="font-doodle font-bold" style={{ fontSize: "clamp(28px, 6vw, 40px)", color: "var(--text)", lineHeight: 1.1 }}>
                {plan.hasTime ? slotToTime(plan.lockedSlot!, globalRange.start) : "This day works! 🎉"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {participants
                .filter((p) => {
                  const s = p.slots as Record<string, number[]>;
                  return plan.hasTime
                    ? s[plan.lockedDate!]?.includes(plan.lockedSlot!)
                    : s[plan.lockedDate!]?.includes(1);
                })
                .map((p) => (
                  <div key={p.participantId} className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1.5px solid var(--accent)" }}>
                    <Avatar name={p.name} />
                    <span className="text-xs font-medium" style={{ color: "var(--accent-text)" }}>{p.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Best slots ── */}
        {top3.length > 0 && (
          <div className="space-y-3 anim-fade-up anim-delay-1">
            <div className="flex items-center gap-3 px-1">
              <h2 className="font-doodle text-lg font-bold" style={{ color: "var(--text)" }}>
                {plan.hasTime ? "Best times" : "Best days"}
              </h2>
              <div style={{ flex: 1, borderTop: "2px dashed var(--border-light)" }} />
            </div>

            <div className="space-y-3">
              {top3.map((row, i) => {
                const key = `${row.date}-${row.slotIndex}`;
                const rank = RANK[i] ?? RANK[2];
                const busyNames = participants.filter((p) => !row.names.includes(p.name)).map((p) => p.name);
                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;

                return (
                  <div
                    key={key}
                    className="doodle-result-card p-5 space-y-4"
                    style={{
                      background: "var(--surface)",
                      border: `2.5px solid var(--border)`,
                      borderRadius: rank.radius,
                      boxShadow: "4px 4px 0 var(--border)",
                    }}
                  >
                    {/* Rank badge + date */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <span
                          className="inline-block font-doodle text-xs font-bold px-3 py-1"
                          style={{
                            background: rank.bg,
                            color: rank.textColor,
                            border: `2px solid ${rank.border}`,
                            borderRadius: "6px 10px 8px 4px",
                            boxShadow: `2px 2px 0 ${rank.border}`,
                          }}
                        >
                          {rank.tag}
                        </span>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {formatDate(row.date)}
                        </p>
                        <p className="font-doodle font-bold" style={{ fontSize: "clamp(22px, 5vw, 30px)", color: "var(--text)", lineHeight: 1.1 }}>
                          {plan.hasTime
                            ? slotToTime(row.slotIndex, globalRange.start)
                            : formatDayShort(row.date)}
                        </p>
                      </div>

                      {/* Count */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-doodle font-bold leading-none" style={{ fontSize: "clamp(28px, 5vw, 36px)", color: "var(--text)" }}>
                          {row.count}
                          <span className="text-base font-normal" style={{ color: "var(--muted-2)" }}>/{total}</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>people free</p>
                        <p className="font-doodle text-sm font-bold mt-0.5" style={{ color: rank.accent }}>
                          {pct}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)", border: "1.5px solid var(--border-light)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: rank.accent,
                        }}
                      />
                    </div>

                    {/* Avatars */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {row.names.map((n, nameIdx) => (
                        <div key={`${row.date}-${row.slotIndex}-${n}-${nameIdx}`} className="flex items-center gap-1">
                          <Avatar name={n} />
                          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{n}</span>
                        </div>
                      ))}
                      {busyNames.length > 0 && (
                        <span className="text-[11px] ml-1 italic" style={{ color: "var(--muted-2)" }}>
                          · {busyNames.join(", ")} busy
                        </span>
                      )}
                    </div>

                    {/* Lock button */}
                    {!isLocked && isOrganizer && (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleLock(row.date, row.slotIndex >= 0 ? row.slotIndex : 1)}
                          disabled={locking === key}
                          className="relative overflow-hidden btn-shine btn-stamp w-full flex items-center justify-center gap-2 font-bold py-3 text-sm transition-all"
                          style={{ background: "var(--text)", color: "#fff" }}
                        >
                          {locking === key
                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><Check size={14} /> Confirm this {plan.hasTime ? "time" : "day"} for everyone</>}
                        </button>
                        <p className="text-center text-[11px]" style={{ color: "var(--muted-2)" }}>
                          This notifies everyone and finalises the plan
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Day slots (time mode) ── */}
        {showDoodleBoard && (
          <div className="space-y-3 anim-fade-up anim-delay-2">
            <div className="flex items-center gap-3 px-1">
              <h2 className="font-doodle text-lg font-bold" style={{ color: "var(--text)" }}>
                Doodle board
              </h2>
              <div style={{ flex: 1, borderTop: "2px dashed var(--border-light)" }} />
            </div>

            <div className="doodle-matrix-wrap">
              <div
                className="doodle-matrix"
                style={{ gridTemplateColumns: `minmax(128px, 1.15fr) repeat(${matrixOptions.length}, minmax(74px, 0.8fr))` }}
              >
                <div className="doodle-matrix-corner">
                  <span>People</span>
                </div>

                {matrixOptions.map((option, idx) => {
                  const key = `${option.date}-${option.slotIndex}`;
                  const isLk = plan.lockedDate === option.date && plan.lockedSlot === option.lockSlot;
                  const pct = total > 0 ? Math.round((option.count / total) * 100) : 0;
                  return (
                    <div
                      key={key}
                      className="doodle-matrix-option"
                      style={{ ["--doodle-delay" as string]: `${idx * 34}ms` }}
                    >
                      <p className="font-doodle font-bold leading-tight" style={{ color: "var(--text)" }}>{option.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>{option.subLabel}</p>
                      <div className="doodle-matrix-score" style={{ backgroundColor: getHeatColor(option.count, total) }}>
                        {option.count}/{total}
                      </div>
                      {!isLocked && isOrganizer && (
                        <button
                          onClick={() => handleLock(option.date, option.lockSlot)}
                          disabled={locking === key}
                          className="doodle-matrix-lock"
                          title={`Confirm ${option.subLabel} ${option.label}`}
                        >
                          {locking === key ? "..." : "Lock"}
                        </button>
                      )}
                      {isLk && <span className="doodle-matrix-locked">Locked</span>}
                      <span className="sr-only">{pct}% free, option {idx + 1}</span>
                    </div>
                  );
                })}

                {participants.map((participant, rowIdx) => (
                  <React.Fragment key={participant.participantId}>
                    <div
                      className="doodle-matrix-person"
                      style={{ ["--doodle-delay" as string]: `${120 + rowIdx * 42}ms` }}
                    >
                      <Avatar name={participant.name} />
                      <span>{participant.name}</span>
                    </div>
                    {matrixOptions.map((option, colIdx) => {
                      const free = isParticipantFree(participant, option);
                      const isLk = plan.lockedDate === option.date && plan.lockedSlot === option.lockSlot;
                      return (
                        <div
                          key={`${participant.participantId}-${option.date}-${option.slotIndex}`}
                          className="doodle-matrix-cell"
                          style={{
                            background: free ? "var(--accent-light)" : "rgba(255,255,255,0.42)",
                            outline: isLk ? "2px solid var(--accent)" : "none",
                            ["--doodle-delay" as string]: `${150 + rowIdx * 42 + colIdx * 18}ms`,
                          }}
                          title={`${participant.name} is ${free ? "free" : "busy"}`}
                        >
                          <span className={free ? "is-free" : "is-busy"}>{free ? "✓" : "-"}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {plan.hasTime && total > 0 && (
          <div className="space-y-3 anim-fade-up anim-delay-3">
            <div className="flex items-center gap-3 px-1">
              <h2 className="font-doodle text-lg font-bold" style={{ color: "var(--text)" }}>
                Day slots
              </h2>
              <div style={{ flex: 1, borderTop: "2px dashed var(--border-light)" }} />
            </div>

            <div
              className="doodle-slots-panel p-3 sm:p-4"
              style={{
                background: "var(--surface)",
                border: "2.5px solid var(--border)",
                borderRadius: "14px 20px 16px 12px",
                boxShadow: "4px 4px 0 var(--border)",
              }}
            >
              <div
                className="day-slots-grid grid"
                style={{
                  gridTemplateColumns: `64px repeat(${plan.dates.length}, minmax(${slotColumnMin}px, 1fr))`,
                  minWidth: slotGridMinWidth,
                }}
              >
                {/* Column headers */}
                <div />
                {plan.dates.map((d) => (
                  <div key={d} className="text-center pb-2 px-0.5">
                    <div className="font-doodle text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>
                      {formatDayShort(d)}
                    </div>
                    <div className="font-doodle text-xs font-bold" style={{ color: "var(--text)" }}>
                      {formatShortDate(d)}
                    </div>
                  </div>
                ))}

                {/* Rows */}
                {Array.from({ length: totalSlots }, (_, i) => (
                  <React.Fragment key={i}>
                    <div className="day-slots-time flex items-center justify-end pr-2" style={{ height: 18 }}>
                      <span className="font-doodle text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>
                        {i % 2 === 0 ? slotToTime(i, globalRange.start) : ""}
                      </span>
                    </div>
                    {plan.dates.map((d) => {
                      const dr = getDateRange(plan, d);
                      const slotHour = globalRange.start + i * 0.5;
                      const inRange  = slotHour >= dr.start && slotHour < dr.end;
                      const count    = inRange
                        ? participants.filter((p) => (p.slots as Record<string, number[]>)[d]?.includes(i)).length
                        : 0;
                      const isLk = plan.lockedDate === d && plan.lockedSlot === i;
                      return (
                        <div
                          key={`${d}-${i}`}
                          className="doodle-slot-cell mx-0.5 my-0.5 rounded-sm transition-all"
                          style={{
                            height: 18,
                            backgroundColor: inRange ? getHeatColor(count, total) : "rgba(0,0,0,0.04)",
                            outline: isLk ? "2px solid var(--accent)" : "none",
                            outlineOffset: "1px",
                            ["--doodle-delay" as string]: `${80 + i * 8}ms`,
                          }}
                          title={inRange ? `${count}/${total} free` : "Outside time window"}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Legend */}
              <div
                className="flex items-center gap-3 mt-4 pt-3"
                style={{ borderTop: "2px dashed var(--border-light)" }}
              >
                <span className="font-doodle text-xs font-bold" style={{ color: "var(--muted-2)" }}>Some free</span>
                <div className="flex gap-0.5 flex-1">
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                    <div
                      key={r}
                      className="flex-1 h-3 rounded-sm"
                      style={{ backgroundColor: getHeatColor(r * (total || 1), total || 1) }}
                    />
                  ))}
                </div>
                <span className="font-doodle text-xs font-bold" style={{ color: "var(--muted)" }}>Most free</span>
              </div>
            </div>
          </div>
        )}

        {plan.hasTime && total > 0 && top3.length === 0 && (
          <div className="doodle-result-card px-5 py-6 text-center space-y-2" style={{ background: "var(--surface)", border: "2.5px solid var(--border)", borderRadius: "14px 20px 16px 12px", boxShadow: "4px 4px 0 var(--border)" }}>
            <p className="font-doodle text-xl font-bold" style={{ color: "var(--text)" }}>No shared time slots yet.</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>People have responded, but no time currently overlaps. Try adding more dates or a wider time window.</p>
            {isOrganizer && (
              <Link href={`/plan/${id}/edit`} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 mt-2" style={{ color: "var(--accent-text)", background: "var(--accent-light)", border: "1.5px solid var(--accent)", borderRadius: "8px 10px 8px 6px" }}>
                <Pencil size={12} /> Edit plan
              </Link>
            )}
          </div>
        )}

        {/* ── Date-only bar chart ── */}
        {!plan.hasTime && total > 0 && (
          <div className="space-y-3 anim-fade-up anim-delay-2">
            <div className="flex items-center gap-3 px-1">
              <h2 className="font-doodle text-lg font-bold" style={{ color: "var(--text)" }}>All days</h2>
              <div style={{ flex: 1, borderTop: "2px dashed var(--border-light)" }} />
            </div>

            <div
              className="doodle-result-card p-4 space-y-2"
              style={{
                background: "var(--surface)",
                border: "2.5px solid var(--border)",
                borderRadius: "14px 20px 16px 12px",
                boxShadow: "4px 4px 0 var(--border)",
              }}
            >
              {plan.dates.map((d) => {
                const count = participants.filter((p) => (p.slots as Record<string, number[]>)[d]?.includes(1)).length;
                const ratio = total > 0 ? count / total : 0;
                const pct   = Math.round(ratio * 100);
                return (
                  <div key={d} className="flex items-center gap-4 py-1.5">
                    <div className="w-20 flex-shrink-0">
                      <p className="font-doodle text-sm font-bold" style={{ color: "var(--text)" }}>{formatDayShort(d)}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>{formatShortDate(d)}</p>
                    </div>
                    <div
                      className="flex-1 h-3.5 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)", border: "1.5px solid var(--border-light)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${ratio * 100}%`, backgroundColor: getHeatColor(count, total) }}
                      />
                    </div>
                    <div className="text-right w-16 flex-shrink-0">
                      <p className="font-doodle text-sm font-bold" style={{ color: "var(--text)" }}>
                        {count}<span className="text-xs font-normal" style={{ color: "var(--muted-2)" }}>/{total}</span>
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--muted-2)" }}>{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {total === 0 && (
          <div className="text-center py-20 space-y-4 anim-fade-up">
            <div
              className="inline-flex items-center justify-center w-16 h-16 mb-2"
              style={{
                border: "2.5px dashed var(--border-light)",
                borderRadius: "50%",
                background: "var(--surface)",
              }}
            >
              <Users size={24} style={{ color: "var(--muted-2)" }} />
            </div>
            <p className="font-doodle text-2xl font-bold" style={{ color: "var(--muted)" }}>No responses yet.</p>
            <p className="text-sm" style={{ color: "var(--muted-2)" }}>Share the link and check back soon.</p>
            <Link
              href={`/plan/${id}`}
              className="inline-block mt-4 font-doodle text-base font-bold px-5 py-2.5 transition-all"
              style={{
                color: "var(--accent-text)",
                background: "var(--accent-light)",
                border: "2px solid var(--accent)",
                borderRadius: "10px 14px 12px 8px",
                boxShadow: "3px 3px 0 var(--accent)",
              }}
            >
              ← Back to plan
            </Link>
          </div>
        )}

        {/* ── Non-organizer info ── */}
        {!isOrganizer && !isLocked && (
          <div
            className="px-5 py-4 space-y-2"
            style={{
              background: "var(--surface-2)",
              border: "1.5px dashed var(--border-light)",
              borderRadius: "12px 16px 14px 10px",
            }}
          >
            <p className="font-doodle text-sm font-bold" style={{ color: "var(--muted)" }}>
              ⏳ Waiting for the organiser to confirm a time
            </p>
            <p className="text-xs" style={{ color: "var(--muted-2)" }}>
              Once everyone has responded, the organiser will lock in the best time. You&apos;ll see it here.
            </p>
            <button
              onClick={claimOrganizer}
              className="text-[11px] hover:underline transition-colors mt-1"
              style={{ color: "var(--muted-2)" }}
            >
              Are you the organiser? Tap here to claim
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
