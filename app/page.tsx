"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  firstAvailableTimeWindowForDate,
  getTimeRange,
  isTimeWindowAvailableForDate,
  isTimeWindowAvailableForDates,
  formatDayShort,
  formatShortDate,
  type TimeWindowValue,
} from "@/lib/utils";
import { ArrowRight, Copy, Check, Clock, ExternalLink } from "lucide-react";
import CalendarPicker from "@/components/CalendarPicker";
import DoodleBackground from "@/components/DoodleBackground";

type RecentPlan = { id: string; name: string; dates: string[]; role: "organizer" | "participant"; created: number };

type TimeWindow = TimeWindowValue;
type TimeMode = "global" | "per_day";

const TIME_OPTIONS: { value: TimeWindow; label: string; short: string; sub: string }[] = [
  { value: "morning",   label: "Morning",   short: "Morn", sub: "8–12pm"  },
  { value: "afternoon", label: "Afternoon", short: "Aft",  sub: "12–5pm"  },
  { value: "evening",   label: "Evening",   short: "Eve",  sub: "5–11pm"  },
  { value: "all_day",   label: "All Day",   short: "All",  sub: "8–10pm"  },
];

function TimePill({ selected, disabled, onClick, label, sub }: {
  selected: boolean; disabled?: boolean; onClick: () => void; label: string; sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3.5 py-1.5 text-sm font-medium transition-all duration-100 whitespace-nowrap"
      style={{
        borderRadius: selected ? "10px 14px 12px 8px" : "8px 12px 10px 6px",
        border: `2px solid ${selected ? "var(--border)" : "var(--border-light)"}`,
        background: selected ? "var(--border)" : "transparent",
        color: selected ? "#fff" : "var(--muted)",
        boxShadow: selected ? "2px 2px 0 var(--border)" : "none",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
      {sub && <span className="ml-1.5 text-xs opacity-60">{sub}</span>}
    </button>
  );
}

function MiniTimePill({ selected, disabled, onClick, label }: {
  selected: boolean; disabled?: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 text-[11px] font-bold transition-all duration-100"
      style={{
        borderRadius: selected ? "8px 10px 8px 6px" : "6px 8px 6px 4px",
        border: `2px solid ${selected ? "var(--border)" : "var(--border-light)"}`,
        background: selected ? "var(--border)" : "transparent",
        color: selected ? "#fff" : "var(--muted)",
        boxShadow: selected ? "2px 2px 0 var(--border)" : "none",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const createPlan = useMutation(api.plans.create);

  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasTime, setHasTime] = useState(true);
  const [timeMode, setTimeMode] = useState<TimeMode>("global");
  const [globalTime, setGlobalTime] = useState<TimeWindow>("evening");
  const [perDayTime, setPerDayTime] = useState<Record<string, TimeWindow>>({});
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);

  useEffect(() => {
    const plans: RecentPlan[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("nodex-plan-info-")) continue;
      try {
        const id   = key.replace("nodex-plan-info-", "");
        const data = JSON.parse(localStorage.getItem(key) ?? "{}") as Omit<RecentPlan, "id">;
        plans.push({ id, ...data });
      } catch { /* skip malformed */ }
    }
    plans.sort((a, b) => b.created - a.created);
    setRecentPlans(plans.slice(0, 8));
  }, []);

  const shareUrl =
    createdId && typeof window !== "undefined"
      ? `${window.location.origin}/plan/${createdId}`
      : "";

  const hasValidTimeSelection = !hasTime || (
    timeMode === "global"
      ? isTimeWindowAvailableForDates(selectedDates, globalTime)
      : selectedDates.every((date) => isTimeWindowAvailableForDate(date, perDayTime[date] ?? globalTime))
  );
  const canCreate = name.trim().length > 0 && selectedDates.length > 0 && hasValidTimeSelection;

  function nextValidGlobalTime(dates: string[], preferred: TimeWindow): TimeWindow {
    if (dates.length === 0 || isTimeWindowAvailableForDates(dates, preferred)) return preferred;
    return TIME_OPTIONS.find((opt) => isTimeWindowAvailableForDates(dates, opt.value))?.value ?? preferred;
  }

  function nextValidTimeForDate(date: string, preferred: TimeWindow): TimeWindow {
    return firstAvailableTimeWindowForDate(date, preferred) ?? preferred;
  }

  function handleTimeModeChange(mode: TimeMode) {
    setTimeMode(mode);
    if (mode === "per_day") {
      const seeded: Record<string, TimeWindow> = {};
      for (const d of selectedDates) seeded[d] = nextValidTimeForDate(d, perDayTime[d] ?? globalTime);
      setPerDayTime(seeded);
    } else {
      setGlobalTime((prev) => nextValidGlobalTime(selectedDates, prev));
    }
  }

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates);
    setGlobalTime((prev) => nextValidGlobalTime(dates, prev));
    if (timeMode === "per_day") {
      const next: Record<string, TimeWindow> = {};
      for (const d of dates) next[d] = nextValidTimeForDate(d, perDayTime[d] ?? globalTime);
      setPerDayTime(next);
    }
  }

  function setAllPerDay(tw: TimeWindow) {
    const next: Record<string, TimeWindow> = {};
    for (const d of selectedDates) next[d] = isTimeWindowAvailableForDate(d, tw) ? tw : nextValidTimeForDate(d, perDayTime[d] ?? globalTime);
    setPerDayTime(next);
  }

  async function handleCreate() {
    if (!canCreate) return;
    setLoading(true);

    let timeStart = 0, timeEnd = 0;
    let perDayStarts: Record<string, number> | undefined;
    let perDayEnds:   Record<string, number> | undefined;

    if (hasTime) {
      if (timeMode === "global") {
        const r = getTimeRange(globalTime);
        timeStart = r.start; timeEnd = r.end;
      } else {
        perDayStarts = {}; perDayEnds = {};
        for (const d of selectedDates) {
          const r = getTimeRange(perDayTime[d] ?? globalTime);
          perDayStarts[d] = r.start; perDayEnds[d] = r.end;
        }
        timeStart = Math.min(...Object.values(perDayStarts));
        timeEnd   = Math.max(...Object.values(perDayEnds));
      }
    }

    const id = await createPlan({
      name: name.trim(),
      dates: selectedDates,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hasTime,
      timeMode: hasTime ? timeMode : "global",
      timeStart, timeEnd,
      perDayStarts: hasTime && timeMode === "per_day" ? perDayStarts : undefined,
      perDayEnds:   hasTime && timeMode === "per_day" ? perDayEnds   : undefined,
    });

    localStorage.setItem(`nodex-owns-${id}`, "1");
    localStorage.setItem(`nodex-plan-info-${id}`, JSON.stringify({
      name: name.trim(), dates: selectedDates, role: "organizer", created: Date.now(),
    }));
    setCreatedId(id);
    setLoading(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API unavailable or permission denied — silently ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Share screen ──────────────────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="min-h-screen bg-paper relative">
        <DoodleBackground />
        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-16">
          <div className="w-full max-w-sm space-y-8 anim-fade-up">

            {/* Celebration badge */}
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="w-24 h-24 flex items-center justify-center"
                  style={{
                    border: "3px solid var(--accent)",
                    borderRadius: "50% 55% 45% 52%",
                    background: "var(--accent-light)",
                    boxShadow: "4px 4px 0 var(--accent)",
                  }}
                >
                  <Check size={40} strokeWidth={3} style={{ color: "var(--accent)" }} />
                </div>
                {/* Sticker stars */}
                <span className="absolute -top-2 -right-2 font-doodle text-xl" style={{ transform: "rotate(15deg)", display: "block" }}>✦</span>
                <span className="absolute -bottom-1 -left-3 font-doodle text-base" style={{ transform: "rotate(-10deg)", display: "block", color: "var(--muted-2)" }}>✦</span>
              </div>
            </div>

            {/* Plan name */}
            <div className="text-center space-y-2">
              <p className="font-doodle text-base font-bold tracking-widest uppercase" style={{ color: "var(--muted-2)" }}>Plan created!</p>
              <h1 className="font-doodle font-bold leading-tight" style={{ fontSize: "clamp(34px, 8vw, 48px)", color: "var(--text)" }}>{name}</h1>
              <div className="flex items-center justify-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
                <span>{selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "var(--muted-2)" }}>·</span>
                <span>Share the link below</span>
              </div>
            </div>

            {/* Dashed divider */}
            <div style={{ borderTop: "2px dashed var(--border-light)" }} />

            {/* Actions */}
            <div className="space-y-3">
              {/* URL row */}
              <p className="font-doodle text-sm font-bold" style={{ color: "var(--muted)" }}>
                🔗 Your share link
              </p>
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-100 text-left"
                style={{
                  border: "2px solid var(--border-light)",
                  borderRadius: "10px 14px 12px 8px",
                  background: "var(--surface)",
                  boxShadow: "2px 2px 0 var(--border-light)",
                }}
              >
                <span className="flex-1 text-[11px] font-mono truncate" style={{ color: "var(--muted)" }}>{shareUrl}</span>
                <span
                  className="flex items-center gap-1 text-xs font-bold flex-shrink-0 px-2 py-1 transition-all"
                  style={{
                    color: copied ? "var(--accent)" : "var(--muted)",
                    background: copied ? "var(--accent-light)" : "var(--surface-2)",
                    borderRadius: "6px 8px 6px 4px",
                    border: "1.5px solid var(--border-light)",
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>

              {/* Copy CTA */}
              <button
                onClick={handleCopy}
                className="relative overflow-hidden btn-shine btn-stamp w-full flex items-center justify-center gap-2 font-bold py-4 text-sm transition-all duration-100"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
                {copied ? "Link Copied!" : "Copy Link to Share"}
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hey! Mark when you're free: ${shareUrl}`)}`)}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 transition-colors"
                style={{ color: "var(--muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </button>
            </div>

            {/* Footer links */}
            <div style={{ borderTop: "2px dashed var(--border-light)", paddingTop: "1.25rem" }}>
              <div className="flex items-center justify-center gap-6 text-xs">
                <button
                  onClick={() => router.push(`/plan/${createdId}/results`)}
                  className="font-doodle font-bold hover:underline transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  View results →
                </button>
                <span style={{ color: "var(--muted-2)" }}>·</span>
                <button
                  onClick={() => router.push(`/plan/${createdId}/edit`)}
                  className="font-doodle font-bold hover:underline transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  Edit plan →
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ── Create screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper relative">
      <DoodleBackground />
      <main className="relative z-10 flex flex-col items-center px-5 py-12 sm:py-20">

        {/* Hero */}
        <div className="text-center mb-10 anim-fade-up w-full max-w-2xl">
          {/* Wordmark */}
          <p
            className="font-doodle font-bold tracking-[0.18em] uppercase mb-6"
            style={{ fontSize: 13, color: "var(--muted-2)", letterSpacing: "0.2em" }}
          >
            ✦ &nbsp;made by shrit&nbsp; ✦
          </p>

          <h1
            className="font-doodle font-bold leading-[1.02] mb-5"
            style={{ fontSize: "clamp(54px, 11vw, 88px)", color: "var(--text)" }}
          >
            Plan together,
            <br />
            <span style={{ color: "var(--accent)", textDecoration: "underline wavy var(--accent) 3px", textUnderlineOffset: "6px" }}>
              effortlessly.
            </span>
          </h1>

          <p className="text-base mx-auto max-w-sm" style={{ color: "var(--muted)" }}>
            Pick dates · share a link · everyone marks when they&apos;re free
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-md space-y-4">

          {/* Plan name */}
          <div className="anim-fade-up anim-delay-1">
            <p className="font-doodle text-sm font-bold mb-2" style={{ color: "var(--muted)" }}>
              ✏️ What are we planning?
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Team lunch, Movie night, Trip…"
              autoFocus
              className="w-full font-doodle text-2xl sm:text-3xl font-bold transition-all duration-150 focus:outline-none px-5 py-4"
              style={{
                border: "2.5px solid var(--border)",
                borderRadius: "14px 20px 16px 12px",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "4px 4px 0 var(--border)",
              }}
            />
          </div>

          {/* Calendar */}
          <div className="anim-fade-up anim-delay-2">
            <p className="font-doodle text-sm font-bold mb-2" style={{ color: "var(--muted)" }}>
              📅 Pick your dates
            </p>
            <div className="doodle-card p-5">
              <CalendarPicker selectedDates={selectedDates} onChange={handleDatesChange} />
            </div>
            {selectedDates.length > 0 && (
              <p className="text-xs mt-2 text-center font-doodle font-bold" style={{ color: "var(--accent-text)" }}>
                ✓ {selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Time config */}
          <div className="anim-fade-up anim-delay-3 doodle-card handdrawn-live overflow-hidden">
            <button
              onClick={() => setHasTime(!hasTime)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors duration-150"
              style={{ background: hasTime ? "rgba(22,163,74,0.06)" : "transparent" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center transition-all duration-200"
                  style={{
                    borderRadius: "8px 10px 8px 6px",
                    border: "2px solid var(--border-light)",
                    background: hasTime ? "var(--accent-light)" : "transparent",
                    color: hasTime ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  <Clock size={15} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Include specific time?</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {hasTime ? "Participants pick a time slot" : "Just pick which days work"}
                  </p>
                </div>
              </div>
              {/* Toggle */}
              <div
                className="relative flex-shrink-0 transition-all duration-200"
                style={{
                  width: 40, height: 22,
                  background: hasTime ? "var(--accent)" : "var(--border-light)",
                  border: "2px solid var(--border)",
                  borderRadius: 99,
                }}
              >
                <span
                  className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
                  style={{ width: 14, height: 14, left: hasTime ? 22 : 2 }}
                />
              </div>
            </button>

            {hasTime && (
              <div style={{ borderTop: "2px solid var(--border-light)" }}>
                {/* Global / Per day */}
                <div className="px-5 pt-4 pb-1">
                  <div
                    className="flex gap-1 p-1"
                    style={{
                      background: "var(--surface-2)",
                      borderRadius: "10px 14px 10px 8px",
                      border: "2px solid var(--border-light)",
                    }}
                  >
                    {(["global", "per_day"] as TimeMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => handleTimeModeChange(m)}
                        className="flex-1 py-1.5 text-xs font-bold transition-all duration-150"
                        style={{
                          borderRadius: "8px 10px 8px 6px",
                          background: timeMode === m ? "var(--border)" : "transparent",
                          color: timeMode === m ? "#fff" : "var(--muted)",
                          boxShadow: timeMode === m ? "2px 2px 0 rgba(0,0,0,0.3)" : "none",
                        }}
                      >
                        {m === "global" ? "Same for all" : "Per day"}
                      </button>
                    ))}
                  </div>
                </div>

                {timeMode === "global" && (
                  <div className="px-5 pt-3 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {TIME_OPTIONS.map((opt) => {
                        const disabled = selectedDates.length > 0 && !isTimeWindowAvailableForDates(selectedDates, opt.value);
                        return (
                          <TimePill
                            key={opt.value}
                            selected={globalTime === opt.value}
                            disabled={disabled}
                            onClick={() => !disabled && setGlobalTime(opt.value)}
                            label={opt.label}
                            sub={opt.sub}
                          />
                        );
                      })}
                    </div>
                    {selectedDates.some((date) => !isTimeWindowAvailableForDate(date, "morning")) && (
                      <p className="text-[11px] mt-2" style={{ color: "var(--muted-2)" }}>
                        Past time windows are disabled for today.
                      </p>
                    )}
                  </div>
                )}

                {timeMode === "per_day" && selectedDates.length > 0 && (
                  <div className="px-5 pt-3 pb-4 space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-doodle text-sm font-bold" style={{ color: "var(--text)" }}>Per day</p>
                      <div className="flex gap-1">
                        {TIME_OPTIONS.map((opt) => (
                          (() => {
                            const disabled = selectedDates.some((date) => !isTimeWindowAvailableForDate(date, opt.value));
                            return (
                              <button
                                key={opt.value}
                                onClick={() => !disabled && setAllPerDay(opt.value)}
                                disabled={disabled}
                                className="text-[10px] px-2 py-0.5 font-bold transition-all"
                                style={{
                                  border: "1.5px solid var(--border-light)",
                                  borderRadius: "6px",
                                  color: "var(--muted)",
                                  opacity: disabled ? 0.35 : 1,
                                  cursor: disabled ? "not-allowed" : "pointer",
                                }}
                              >
                                All {opt.short}
                              </button>
                            );
                          })()
                        ))}
                      </div>
                    </div>
                    {selectedDates.map((d) => (
                      <div key={d} className="flex items-center gap-3 py-1.5">
                        <div className="w-20 flex-shrink-0">
                          <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{formatDayShort(d)}</p>
                          <p className="text-[11px]" style={{ color: "var(--muted)" }}>{formatShortDate(d)}</p>
                        </div>
                        <div className="flex gap-1 flex-1">
                          {TIME_OPTIONS.map((opt) => {
                            const disabled = !isTimeWindowAvailableForDate(d, opt.value);
                            return (
                              <MiniTimePill
                                key={opt.value}
                                selected={(perDayTime[d] ?? globalTime) === opt.value}
                                disabled={disabled}
                                onClick={() => !disabled && setPerDayTime((prev) => ({ ...prev, [d]: opt.value }))}
                                label={opt.short}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {selectedDates.some((date) => !isTimeWindowAvailableForDate(date, "morning")) && (
                      <p className="text-[11px] pt-1" style={{ color: "var(--muted-2)" }}>
                        Past time windows are disabled for today.
                      </p>
                    )}
                  </div>
                )}

                {timeMode === "per_day" && selectedDates.length === 0 && (
                  <p className="px-5 py-4 text-xs" style={{ color: "var(--muted)" }}>Select dates first</p>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="anim-fade-up anim-delay-4 pt-1">
            <button
              onClick={handleCreate}
              disabled={!canCreate || loading}
              className="relative overflow-hidden btn-shine btn-stamp w-full flex items-center justify-center gap-2.5 font-bold py-4 text-[15px] transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Get sharing link <ArrowRight size={17} strokeWidth={2.5} /></>}
            </button>
            {!canCreate && (
              <p className="text-center text-xs mt-2.5" style={{ color: "var(--muted)" }}>
                {!name.trim() ? "Enter a plan name to continue" : "Select at least one date above"}
              </p>
            )}
          </div>

        </div>

        {/* Recent plans */}
        {recentPlans.length > 0 && (
          <div className="w-full max-w-md mt-12 anim-fade-up anim-delay-5">
            <div className="flex items-center gap-3 mb-3">
              <p className="font-doodle text-sm font-bold" style={{ color: "var(--muted)" }}>
                📋 Your recent plans
              </p>
              <div style={{ flex: 1, borderTop: "2px dashed var(--border-light)" }} />
            </div>
            <div className="space-y-2">
              {recentPlans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/plan/${p.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all group"
                  style={{
                    border: "2px solid var(--border-light)",
                    borderRadius: "10px 14px 12px 8px",
                    background: "var(--surface)",
                    boxShadow: "2px 2px 0 var(--border-light)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-doodle text-base font-bold truncate" style={{ color: "var(--text)" }}>
                      {p.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                      {p.dates.length} day{p.dates.length !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{ color: p.role === "organizer" ? "var(--accent-text)" : "var(--muted-2)" }}>
                        {p.role === "organizer" ? "organizer" : "participant"}
                      </span>
                    </p>
                  </div>
                  <ExternalLink size={13} style={{ color: "var(--muted-2)", flexShrink: 0 }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-xs tracking-wide anim-fade-up anim-delay-5" style={{ color: "var(--muted-2)" }}>
          No signup &nbsp;·&nbsp; No app &nbsp;·&nbsp; Just a link
        </p>
      </main>
    </div>
  );
}
