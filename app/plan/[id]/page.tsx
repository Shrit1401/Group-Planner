"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { slotToTime, formatDate, getGlobalRange, isTimeWindowAvailableForDate, type TimeWindowValue } from "@/lib/utils";
import { ArrowRight, Check, BarChart2, Lock, Pencil, ChevronLeft, ChevronRight, X, Zap } from "lucide-react";
import Link from "next/link";
import DoodleBackground from "@/components/DoodleBackground";

// ── helpers ────────────────────────────────────────────────────────

function generateParticipantId() { return Math.random().toString(36).slice(2, 12); }

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtH(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const AVATAR_COLORS = [
  ["#fde68a","#92400e"],["#bbf7d0","#166534"],["#bfdbfe","#1e40af"],
  ["#fecaca","#991b1b"],["#e9d5ff","#6b21a8"],["#fed7aa","#9a3412"],
] as const;

function avatarColor(name: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Time periods ────────────────────────────────────────────────────

type Period = { key: string; label: string; emoji: string; startH: number; endH: number; bg: string; fg: string };

const ALL_PERIODS: Period[] = [
  { key: "morning",   label: "Morning",   emoji: "🌅", startH: 8,  endH: 12, bg: "#fef9c3", fg: "#78350f" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️", startH: 12, endH: 17, bg: "#dbeafe", fg: "#1e3a8a" },
  { key: "evening",   label: "Evening",   emoji: "🌙", startH: 17, endH: 22, bg: "#ede9fe", fg: "#4c1d95" },
];

function getActivePeriods(planStart: number, planEnd: number): Period[] {
  return ALL_PERIODS.filter(p => p.startH < planEnd && p.endH > planStart);
}

function periodsToSlots(periods: string[], planStart: number, planEnd: number): number[] {
  const slots: number[] = [];
  for (const p of ALL_PERIODS) {
    if (!periods.includes(p.key)) continue;
    const s = Math.max(p.startH, planStart);
    const e = Math.min(p.endH, planEnd);
    if (s >= e) continue;
    const off = (s - planStart) * 2;
    const cnt = (e - s) * 2;
    for (let i = 0; i < cnt; i++) slots.push(off + i);
  }
  return [...new Set(slots)].sort((a, b) => a - b);
}

function slotsToPeriods(slots: number[], planStart: number): string[] {
  if (!slots.length) return [];
  const hours = slots.map(s => planStart + s * 0.5);
  const out: string[] = [];
  if (hours.some(h => h >= 8  && h < 12)) out.push("morning");
  if (hours.some(h => h >= 12 && h < 17)) out.push("afternoon");
  if (hours.some(h => h >= 17))           out.push("evening");
  return out.length ? out : ["morning"];
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WDAYS  = ["S","M","T","W","T","F","S"];

// ── Calendar ────────────────────────────────────────────────────────

function PlanCalendar({
  planDates, daySelections, perDate, selectedDate, onSelect,
}: {
  planDates: string[];
  daySelections: Record<string, string[]>;
  perDate: Record<string, { count: number; names: string[] }>;
  selectedDate: string | null;
  onSelect: (d: string) => void;
}) {
  const planSet = new Set(planDates);
  const today = new Date(); today.setHours(0,0,0,0);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date((planDates[0] ?? toStr(today)) + "T12:00:00");
    d.setDate(1); return d;
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="w-full select-none">
      {/* nav */}
      <div className="flex items-center justify-between mb-5">
        <p className="font-doodle font-bold text-2xl" style={{ color: "var(--text)" }}>
          {MONTHS[month]} <span style={{ color: "var(--muted-2)", fontWeight: 400 }}>{year}</span>
        </p>
        <div className="flex gap-1">
          {[
            { fn: () => setViewDate(new Date(year, month - 1, 1)), icon: <ChevronLeft size={12} /> },
            { fn: () => setViewDate(new Date(year, month + 1, 1)), icon: <ChevronRight size={12} /> },
          ].map(({ fn, icon }, i) => (
            <button key={i} onClick={fn} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: "1.5px solid var(--border-light)", color: "var(--muted)" }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {WDAYS.map((d, i) => (
          <div key={i} className="flex items-center justify-center h-8">
            <span className="text-xs font-bold tracking-wider" style={{ color: "var(--muted-2)" }}>{d}</span>
          </div>
        ))}
      </div>

      {/* cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDow }, (_, i) => <div key={`e-${i}`} className="planner-calendar-cell" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds  = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isPlan = planSet.has(ds);
          const sel    = daySelections[ds] ?? [];
          const isFree = sel.length > 0;
          const isSel  = ds === selectedDate;
          const freeNames = perDate[ds]?.names ?? [];
          const freeCount = perDate[ds]?.count ?? 0;

          return (
            <div key={day} className="planner-calendar-cell p-1">
              <button disabled={!isPlan} onClick={() => isPlan && onSelect(ds)}
                className="relative w-full h-full flex flex-col items-center justify-center transition-all duration-100 rounded-xl"
                style={{
                  background: isFree ? "var(--accent)" : isPlan ? "var(--surface)" : "transparent",
                  color: isFree ? "#fff" : isPlan ? "var(--text)" : "var(--muted-2)",
                  cursor: isPlan ? "pointer" : "default",
                  outline: isSel ? "2.5px solid var(--text)" : "none",
                  outlineOffset: "1px",
                  boxShadow: isFree ? "2px 2px 0 rgba(22,163,74,0.35)" : isPlan ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  border: isPlan && !isFree ? "1.5px solid var(--border-light)" : "none",
                  fontWeight: isPlan ? 600 : 400,
                  fontSize: 18,
                }}>
                {day}
                {isPlan && freeCount > 0 && (
                  <div className="flex gap-[2px] mt-[2px]">
                    {freeNames.slice(0, 3).map((n, idx) => {
                      const [bg] = avatarColor(n);
                      return <div key={idx} className="w-[4px] h-[4px] rounded-full"
                        style={{ background: isFree ? "rgba(255,255,255,0.6)" : bg }} />;
                    })}
                    {freeCount > 3 && <div className="w-[4px] h-[4px] rounded-full"
                      style={{ background: isFree ? "rgba(255,255,255,0.4)" : "var(--muted-2)" }} />}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planData          = useQuery(api.plans.get, { id: id as Id<"plans"> });
  const upsertParticipant = useMutation(api.participants.upsert);

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName]                   = useState("");
  const [nameInput, setNameInput]         = useState("");
  // daySelections: date → [] (busy) | ["all"] (non-hasTime free) | ["morning","afternoon","evening"] subset
  const [daySelections, setDaySelections] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate]   = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);
  const [saving, setSaving]               = useState(false);
  const [isOrganizer, setIsOrganizer]     = useState(false);

  useEffect(() => {
    setIsOrganizer(!!localStorage.getItem(`nodex-owns-${id}`));
    const pid = localStorage.getItem(`nodex-pid-${id}`);
    if (pid) {
      setParticipantId(pid);
      setName(localStorage.getItem(`nodex-name-${id}`) ?? "");
    }
  }, [id]);

  useEffect(() => {
    if (!planData) return;
    const existing = localStorage.getItem(`nodex-plan-info-${id}`);
    const parsed   = existing ? JSON.parse(existing) as { created?: number } : null;
    localStorage.setItem(`nodex-plan-info-${id}`, JSON.stringify({
      name: planData.plan.name,
      dates: planData.plan.dates,
      role: !!localStorage.getItem(`nodex-owns-${id}`) ? "organizer" : "participant",
      created: parsed?.created ?? Date.now(),
    }));
    if (planData.plan.dates.length > 0 && !selectedDate) {
      setSelectedDate(planData.plan.dates[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, planData]);

  useEffect(() => {
    if (!participantId || !planData) return;
    const me = planData.participants.find(p => p.participantId === participantId);
    if (!me) return;
    setName(me.name);
    const saved = me.slots as Record<string, number[]>;
    const next: Record<string, string[]> = {};
    for (const [date, slots] of Object.entries(saved)) {
      if (!slots.length) continue;
      next[date] = planData.plan.hasTime
        ? slotsToPeriods(slots, planData.plan.timeStart)
        : ["all"];
    }
    setDaySelections(next);
  }, [participantId, planData]);

  const perDate = useMemo(() => {
    if (!planData) return {} as Record<string, { count: number; names: string[] }>;
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const date of planData.plan.dates) {
      const free = planData.participants.filter(p => {
        const s = p.slots as Record<string, number[]>;
        return (s[date] ?? []).length > 0 && p.name !== name;
      });
      map[date] = { count: free.length, names: free.map(p => p.name) };
    }
    return map;
  }, [planData, name]);

  function handleJoin() {
    if (!nameInput.trim()) return;
    const pid = generateParticipantId();
    localStorage.setItem(`nodex-pid-${id}`, pid);
    localStorage.setItem(`nodex-name-${id}`, nameInput.trim());
    setParticipantId(pid); setName(nameInput.trim());
  }

  const handleSave = useCallback(async () => {
    if (!participantId || !name || !planData) return;
    setSaving(true);
    const gr = planData.plan.hasTime ? getGlobalRange(planData.plan) : null;
    const payload: Record<string, number[]> = {};
    for (const date of planData.plan.dates) {
      const sel = planData.plan.hasTime
        ? (daySelections[date] ?? []).filter((period) => isTimeWindowAvailableForDate(date, period as TimeWindowValue))
        : daySelections[date] ?? [];
      if (!sel.length) {
        payload[date] = [];
      } else if (planData.plan.hasTime && gr) {
        payload[date] = periodsToSlots(sel, gr.start, gr.end);
      } else {
        payload[date] = [1];
      }
    }
    await upsertParticipant({ planId: id as Id<"plans">, participantId, name, slots: payload });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [id, participantId, name, daySelections, planData, upsertParticipant]);

  function togglePeriod(date: string, period: string) {
    if (!isTimeWindowAvailableForDate(date, period as TimeWindowValue)) return;
    setDaySelections(prev => {
      const cur  = prev[date] ?? [];
      const next = cur.includes(period) ? cur.filter(p => p !== period) : [...cur, period];
      return { ...prev, [date]: next };
    });
  }

  function toggleFree(date: string) {
    setDaySelections(prev => {
      const cur = prev[date] ?? [];
      return { ...prev, [date]: cur.length > 0 ? [] : ["all"] };
    });
  }

  function markAllFree(planDates: string[], hasTime: boolean, periods: Period[]) {
    const next: Record<string, string[]> = {};
    for (const d of planDates) next[d] = hasTime ? periods.filter((p) => isTimeWindowAvailableForDate(d, p.key as TimeWindowValue)).map(p => p.key) : ["all"];
    setDaySelections(prev => ({ ...prev, ...next }));
  }

  function clearAll(planDates: string[]) {
    const next: Record<string, string[]> = {};
    for (const d of planDates) next[d] = [];
    setDaySelections(prev => ({ ...prev, ...next }));
  }

  function toggleSelectedDateStatus(date: string) {
    if (isMeFree) {
      clearAll([date]);
      return;
    }
    if (plan.hasTime) {
      setDaySelections(prev => ({
        ...prev,
        [date]: activePeriods.filter((p) => isTimeWindowAvailableForDate(date, p.key as TimeWindowValue)).map(p => p.key),
      }));
      return;
    }
    toggleFree(date);
  }

  // ── Loading / not found ─────────────────────────────────────────

  if (planData === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border-light)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (planData === null) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-doodle text-2xl font-bold" style={{ color: "var(--muted)" }}>Plan not found.</p>
        <Link href="/" className="btn-stamp font-doodle text-sm font-bold px-5 py-2.5"
          style={{ color: "var(--accent-text)", background: "var(--accent-light)", border: "2px solid var(--accent)", borderRadius: "10px 14px 12px 8px" }}>
          ← Back to home
        </Link>
      </div>
    );
  }

  const { plan } = planData;
  const globalRange    = plan.hasTime ? getGlobalRange(plan) : { start: 8, end: 22 };
  const activePeriods  = plan.hasTime ? getActivePeriods(globalRange.start, globalRange.end) : [];
  const freeDates      = plan.dates.filter(d => (daySelections[d] ?? []).length > 0);

  // ── Locked ─────────────────────────────────────────────────────

  if (plan.lockedDate !== undefined && plan.lockedSlot !== undefined) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="anim-fade-up space-y-6 w-full max-w-sm">
          <div className="flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full"
              style={{ border: "2.5px solid var(--accent)", background: "var(--accent-light)", boxShadow: "3px 3px 0 var(--accent)" }}>
              <Lock size={24} style={{ color: "var(--accent)" }} />
            </div>
          </div>
          <h1 className="font-doodle text-3xl font-bold" style={{ color: "var(--text)" }}>{plan.name}</h1>
          <div className="px-6 py-5 space-y-1"
            style={{ border: "2px solid var(--border)", borderRadius: "16px 20px 16px 12px", background: "var(--surface)", boxShadow: "4px 4px 0 var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{formatDate(plan.lockedDate)}</p>
            {plan.hasTime
              ? <p className="font-doodle text-4xl font-bold" style={{ color: "var(--accent)" }}>{slotToTime(plan.lockedSlot, plan.timeStart)}</p>
              : <p className="font-doodle text-xl font-bold" style={{ color: "var(--text)" }}>All day 🎉</p>}
          </div>
          <Link href={`/plan/${id}/results`} className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--muted)" }}>
            <BarChart2 size={13} /> View results →
          </Link>
        </div>
      </div>
    );
  }

  // ── Name entry ─────────────────────────────────────────────────

  if (!participantId) {
    return (
      <div className="min-h-screen bg-paper relative flex flex-col items-center justify-center px-5">
        <DoodleBackground />
        <div className="relative z-10 w-full max-w-xs anim-fade-up space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-block px-3 py-1 mb-2 -rotate-1"
              style={{ background: "#fef08a", border: "2px solid #92400e", borderRadius: "6px 10px 8px 4px", boxShadow: "2px 2px 0 #92400e" }}>
              <span className="font-doodle text-xs font-bold" style={{ color: "#92400e" }}>✉️ You&apos;re invited</span>
            </div>
            <h1 className="font-doodle font-bold" style={{ fontSize: "clamp(28px, 7vw, 40px)", color: "var(--text)" }}>
              {plan.name}
            </h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              📅 {plan.dates.length} date{plan.dates.length !== 1 ? "s" : ""}
              {plan.hasTime && ` · ${activePeriods.map(p => p.label).join(", ")}`}
            </p>
          </div>
          <div className="space-y-3">
            <label className="font-doodle text-xs font-bold block" style={{ color: "var(--muted)" }}>✏️ Your name</label>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="Enter your name…" autoFocus
              className="w-full text-sm focus:outline-none px-4 py-3.5"
              style={{ border: "2px solid var(--border)", borderRadius: "12px 16px 14px 10px", background: "var(--surface)", color: "var(--text)", boxShadow: "3px 3px 0 var(--border)" }} />
            <button onClick={handleJoin} disabled={!nameInput.trim()}
              className="btn-stamp btn-shine w-full flex items-center justify-center gap-2 font-bold py-3.5 text-sm disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Let&apos;s go <ArrowRight size={15} strokeWidth={2.5} />
            </button>
          </div>
          {planData.participants.length > 0 && (
            <p className="text-center text-xs" style={{ color: "var(--muted-2)" }}>
              {planData.participants.length} {planData.participants.length === 1 ? "person has" : "people have"} responded
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────

  const selDate     = selectedDate;
  const selSel      = selDate ? (daySelections[selDate] ?? []) : [];
  const isMeFree    = selSel.length > 0;

  const allParticipants = selDate
    ? planData.participants.map(p => ({
        name: p.name,
        free: ((p.slots as Record<string, number[]>)[selDate] ?? []).length > 0,
        isMe: p.name === name,
      }))
    : [];
  const others      = allParticipants.filter(p => !p.isMe);
  const freeOthers  = others.filter(p => p.free).length;

  return (
    <div className="min-h-screen planner-frame flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-20 planner-topbar px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-doodle font-bold text-xl leading-tight truncate" style={{ color: "var(--text)" }}>{plan.name}</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            hi <span className="font-semibold" style={{ color: "var(--accent-text)" }}>{name}</span> 👋
          </p>
        </div>
        <div className="planner-header-actions flex items-center gap-2 flex-shrink-0">
          {isOrganizer && (
            <Link href={`/plan/${id}/edit`} className="soft-button flex items-center gap-1.5 text-xs font-semibold px-3 py-2">
              <Pencil size={11} /> Edit
            </Link>
          )}
          <Link href={`/plan/${id}/results`} className="soft-button flex items-center gap-1.5 text-xs font-semibold px-3 py-2">
            <BarChart2 size={12} /> Results
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Left: calendar */}
        <aside className="planner-sidebar lg:basis-[70%] lg:max-w-[70%] lg:flex-shrink-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 sm:space-y-5">

          {/* Quick select */}
          <div className="planner-quick-actions flex gap-2">
            <button onClick={() => markAllFree(plan.dates, plan.hasTime, activePeriods)}
              className="doodle-action flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: "var(--accent-light)", color: "var(--accent-text)" }}>
              <Zap size={11} /> Mark all free
            </button>
            <button onClick={() => clearAll(plan.dates)}
              className="doodle-action is-muted flex items-center justify-center gap-1.5 text-sm font-bold py-3 px-4 transition-colors"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
              <X size={11} /> Clear
            </button>
          </div>

          <div className="planner-calendar-board">
            <PlanCalendar
              planDates={plan.dates}
              daySelections={daySelections}
              perDate={perDate}
              selectedDate={selDate}
              onSelect={setSelectedDate}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap pt-3" style={{ borderTop: "1px dashed var(--border-light)" }}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[3px]" style={{ background: "var(--accent)" }} />
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>Free</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[3px]" style={{ background: "var(--surface)", border: "1.5px solid var(--border-light)" }} />
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>Plan date</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                <div className="w-[4px] h-[4px] rounded-full" style={{ background: "var(--muted-2)" }} />
                <div className="w-[4px] h-[4px] rounded-full" style={{ background: "var(--muted-2)" }} />
              </div>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>Others free</span>
            </div>
          </div>
        </aside>

        {/* Right: detail */}
        <section className="planner-control-zone lg:basis-[30%] lg:max-w-[30%] flex-shrink-0 px-3 sm:px-6 py-5 sm:py-7 overflow-y-auto">
          {selDate && plan.dates.includes(selDate) ? (
            <div className="planner-detail space-y-5 lg:sticky lg:top-24">

              {/* Date card */}
              <div className="doodle-date-note px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
                    {new Date(selDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                  </p>
                  <p className="font-doodle font-bold leading-none" style={{ fontSize: 48, color: "var(--text)", lineHeight: 1 }}>
                    {new Date(selDate + "T12:00:00").getDate()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(selDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => selDate && toggleSelectedDateStatus(selDate)}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: isMeFree ? "var(--accent)" : "var(--surface-2)",
                      border: `2px solid ${isMeFree ? "var(--accent)" : "var(--border-light)"}`,
                    }}
                    aria-label={isMeFree ? "Mark busy" : "Mark free"}
                  >
                    {isMeFree ? <Check size={18} color="#fff" strokeWidth={2.5} /> : <X size={16} style={{ color: "var(--muted-2)" }} />}
                  </button>
                  <span className="text-[10px] font-bold" style={{ color: isMeFree ? "var(--accent-text)" : "var(--muted-2)" }}>
                    {isMeFree ? "free" : "busy"}
                  </span>
                </div>
              </div>

              {/* Time period selection (hasTime) OR simple free/busy toggle */}
              {plan.hasTime ? (
                <div className="doodle-note space-y-3 rotate-note-a">
                  <p className="doodle-section-title text-sm font-bold" style={{ color: "var(--muted)" }}>When are you free?</p>
                  {activePeriods.map(period => {
                    const isOn = selSel.includes(period.key);
                    const isDisabled = selDate ? !isTimeWindowAvailableForDate(selDate, period.key as TimeWindowValue) : false;
                    return (
                      <button key={period.key} onClick={() => selDate && togglePeriod(selDate, period.key)}
                        disabled={isDisabled}
                        className={`doodle-period ${isOn ? "is-selected" : ""} w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0`}
                        style={{
                          background: isOn ? period.bg : "rgba(255,255,255,0.46)",
                          borderColor: isOn ? period.fg + "70" : "var(--border-light)",
                          boxShadow: isOn ? `3px 3px 0 ${period.fg}20` : "none",
                          opacity: isDisabled ? 0.35 : 1,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                        }}>
                        <span className="text-xl leading-none">{period.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold leading-tight" style={{ color: isOn ? period.fg : "var(--text)" }}>
                            {period.label}
                          </p>
                          <p className="text-[11px]" style={{ color: isOn ? period.fg + "99" : "var(--muted-2)" }}>
                            {fmtH(period.startH)} – {fmtH(period.endH)}
                          </p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ background: isOn ? period.fg : "var(--border-light)" }}>
                          {isOn
                            ? <Check size={11} color="#fff" strokeWidth={3} />
                            : <span className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>+</span>}
                        </div>
                      </button>
                    );
                  })}
                  {selSel.length === 0 && (
                    <p className="text-[11px] text-center py-1" style={{ color: "var(--muted-2)" }}>
                      Nothing selected = marked as busy
                    </p>
                  )}
                  {selDate && activePeriods.some((period) => !isTimeWindowAvailableForDate(selDate, period.key as TimeWindowValue)) && (
                    <p className="text-[11px] text-center py-1" style={{ color: "var(--muted-2)" }}>
                      Past time windows are disabled for today.
                    </p>
                  )}
                </div>
              ) : (
                /* Simple free/busy for non-timed plans */
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl"
                  style={{ background: "var(--surface-2)", border: "1.5px solid var(--border-light)" }}>
                  <button onClick={() => selDate && !isMeFree && toggleFree(selDate)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background: isMeFree ? "var(--accent)" : "transparent",
                      color: isMeFree ? "#fff" : "var(--muted)",
                      boxShadow: isMeFree ? "0 2px 8px rgba(22,163,74,0.25)" : "none",
                    }}>
                    <Check size={13} strokeWidth={2.5} /> Free
                  </button>
                  <button onClick={() => selDate && isMeFree && toggleFree(selDate)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background: !isMeFree ? "var(--surface)" : "transparent",
                      color: !isMeFree ? "var(--text)" : "var(--muted)",
                      border: !isMeFree ? "1.5px solid var(--border-light)" : "none",
                    }}>
                    <X size={13} strokeWidth={2.5} /> Busy
                  </button>
                </div>
              )}

              {/* Others' availability */}
              {others.length > 0 && (
                <div className="doodle-note space-y-3 rotate-note-b">
                  <div className="flex items-center justify-between">
                    <p className="doodle-section-title text-sm font-bold" style={{ color: "var(--muted)" }}>Who else is free</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: freeOthers > 0 ? "var(--accent-light)" : "var(--surface-2)",
                        color: freeOthers > 0 ? "var(--accent-text)" : "var(--muted-2)",
                      }}>
                      {freeOthers}/{others.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {others.map((p, idx) => {
                      const [bg, fg] = avatarColor(p.name);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: p.free ? bg : "var(--surface-2)",
                            color: p.free ? fg : "var(--muted-2)",
                            border: `1px solid ${p.free ? fg + "50" : "var(--border-light)"}`,
                          }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: p.free ? fg : "var(--border-light)", color: p.free ? bg : "var(--muted)" }}>
                            {initials(p.name)}
                          </span>
                          {p.name}
                          <span className="opacity-70">{p.free ? "✓" : "✗"}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2">
              <p className="text-3xl">👈</p>
              <p className="font-doodle font-bold" style={{ color: "var(--muted)" }}>Pick a date</p>
              <p className="text-xs" style={{ color: "var(--muted-2)" }}>Tap any highlighted date on the calendar</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 save-dock px-4 sm:px-6 py-3">
        {saved && (
          <div className="mb-2 flex items-center justify-between px-3 py-2 rounded-xl anim-fade-up"
            style={{ background: "var(--accent-light)", border: "1.5px solid rgba(22,163,74,0.4)" }}>
            <p className="font-doodle text-sm font-bold" style={{ color: "var(--accent-text)" }}>✓ Saved!</p>
            <Link href={`/plan/${id}/results`} className="text-xs font-bold"
              style={{ color: "var(--accent-text)", textDecoration: "underline" }}>See results →</Link>
          </div>
        )}
        <div className="planner-save-row flex items-center gap-3">
          <div className="flex-1">
            {freeDates.length > 0
              ? <p className="text-xs" style={{ color: "var(--muted)" }}>
                  <span className="font-bold" style={{ color: "var(--accent-text)" }}>{freeDates.length} day{freeDates.length !== 1 ? "s" : ""}</span> marked free
                </p>
              : <p className="text-xs" style={{ color: "var(--muted-2)" }}>No days selected yet</p>}
          </div>
          <button onClick={handleSave} disabled={saving || freeDates.length === 0}
            className="planner-save-button btn-stamp btn-shine flex items-center justify-center gap-2 font-bold px-6 py-3 text-sm transition-all disabled:opacity-35"
            style={{ background: "var(--accent)", color: "#fff", borderRadius: "12px" }}>
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : saved ? <><Check size={15} /> Saved</> : <><Check size={15} /> Save</>}
          </button>
        </div>
      </footer>
    </div>
  );
}
