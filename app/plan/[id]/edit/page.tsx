"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  firstAvailableTimeWindowForDate,
  getTimeRange,
  isTimeWindowAvailableForDate,
  isTimeWindowAvailableForDates,
  formatDayShort,
  formatShortDate,
  type TimeWindowValue,
} from "@/lib/utils";
import { ArrowLeft, Check, Clock, Save } from "lucide-react";
import CalendarPicker from "@/components/CalendarPicker";
import Link from "next/link";

type TimeWindow = TimeWindowValue;
type TimeMode   = "global" | "per_day";

const TIME_OPTIONS: { value: TimeWindow; label: string; short: string; sub: string }[] = [
  { value: "morning",   label: "Morning",   short: "Morn", sub: "8am–12pm" },
  { value: "afternoon", label: "Afternoon", short: "Aft",  sub: "12–5pm"  },
  { value: "evening",   label: "Evening",   short: "Eve",  sub: "5–11pm"  },
  { value: "all_day",   label: "All Day",   short: "All",  sub: "8–10pm"  },
];

function hourRangeToWindow(start: number, end: number): TimeWindow {
  if (start === 8  && end === 12) return "morning";
  if (start === 12 && end === 17) return "afternoon";
  if (start === 8  && end === 22) return "all_day";
  return "evening";
}

function TimePill({ selected, disabled, onClick, label, sub }: {
  selected: boolean; disabled?: boolean; onClick: () => void; label: string; sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3.5 py-1.5 text-sm font-medium transition-all whitespace-nowrap"
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
      className="px-2.5 py-1 text-[11px] font-bold transition-all"
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

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router     = useRouter();
  const planData   = useQuery(api.plans.get, { id: id as Id<"plans"> });
  const updatePlan = useMutation(api.plans.update);

  const [name, setName]                   = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasTime, setHasTime]             = useState(false);
  const [timeMode, setTimeMode]           = useState<TimeMode>("global");
  const [globalTime, setGlobalTime]       = useState<TimeWindow>("evening");
  const [perDayTime, setPerDayTime]       = useState<Record<string, TimeWindow>>({});
  const [initialized, setInitialized]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  useEffect(() => {
    if (!planData?.plan || initialized) return;
    const p = planData.plan;
    setName(p.name); setSelectedDates(p.dates); setHasTime(p.hasTime); setTimeMode(p.timeMode);
    if (p.hasTime) {
      if (p.timeMode === "global") {
        setGlobalTime(hourRangeToWindow(p.timeStart, p.timeEnd));
      } else if (p.perDayStarts && p.perDayEnds) {
        const perDay: Record<string, TimeWindow> = {};
        for (const d of p.dates) {
          perDay[d] = hourRangeToWindow(p.perDayStarts[d] ?? p.timeStart, p.perDayEnds[d] ?? p.timeEnd);
        }
        setPerDayTime(perDay);
      }
    }
    setInitialized(true);
  }, [planData, initialized]);

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

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    let timeStart = 0, timeEnd = 0;
    let perDayStarts: Record<string, number> | undefined;
    let perDayEnds:   Record<string, number> | undefined;

    if (hasTime) {
      if (timeMode === "global") {
        const r = getTimeRange(globalTime); timeStart = r.start; timeEnd = r.end;
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

    await updatePlan({
      id: id as Id<"plans">,
      name: name.trim(), dates: selectedDates, hasTime,
      timeMode: hasTime ? timeMode : "global",
      timeStart, timeEnd,
      perDayStarts: hasTime && timeMode === "per_day" ? perDayStarts : undefined,
      perDayEnds:   hasTime && timeMode === "per_day" ? perDayEnds   : undefined,
    });

    setSaving(false); setSaved(true);
    setTimeout(() => router.push(`/plan/${id}`), 800);
  }

  const hasValidTimeSelection = !hasTime || (
    timeMode === "global"
      ? isTimeWindowAvailableForDates(selectedDates, globalTime)
      : selectedDates.every((date) => isTimeWindowAvailableForDate(date, perDayTime[date] ?? globalTime))
  );
  const canSave = name.trim().length > 0 && selectedDates.length > 0 && hasValidTimeSelection;

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

  return (
    <div className="min-h-screen bg-paper">
      <main className="min-h-screen flex flex-col items-center px-5 py-12 sm:py-20">

        {/* Back nav + heading */}
        <div className="w-full max-w-md mb-10 anim-fade-up">
          <Link
            href={`/plan/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold mb-6 transition-colors group"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Back to plan
          </Link>

          <div
            className="inline-block px-4 py-1.5 mb-4"
            style={{
              background: "#fef08a",
              border: "2px solid #92400e",
              borderRadius: "8px 12px 10px 6px",
              boxShadow: "2px 2px 0 #92400e",
              transform: "rotate(-1deg)",
            }}
          >
            <span className="font-doodle text-sm font-bold" style={{ color: "#92400e" }}>
              ✏️ Editing plan
            </span>
          </div>

          <h1 className="font-doodle font-bold leading-tight" style={{ fontSize: "clamp(32px, 8vw, 44px)", color: "var(--text)" }}>
            Edit plan
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
            Changes apply to all participants
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">

          {/* Plan name */}
          <div className="anim-fade-up anim-delay-1">
            <p className="font-doodle text-sm font-bold mb-2" style={{ color: "var(--muted)" }}>
              ✏️ Plan name
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plan name"
              className="w-full text-base transition-all focus:outline-none px-5 py-4"
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
              📅 Dates
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
          <div className="anim-fade-up anim-delay-3 doodle-card overflow-hidden">
            <button
              onClick={() => setHasTime(!hasTime)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors"
              style={{ background: hasTime ? "rgba(22,163,74,0.06)" : "transparent" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center transition-all"
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
              <div
                className="relative flex-shrink-0 transition-all"
                style={{
                  width: 40, height: 22,
                  background: hasTime ? "var(--accent)" : "var(--border-light)",
                  border: "2px solid var(--border)",
                  borderRadius: 99,
                }}
              >
                <span
                  className="absolute rounded-full bg-white transition-all"
                  style={{ width: 14, height: 14, left: hasTime ? 22 : 2, top: 2 }}
                />
              </div>
            </button>

            {hasTime && (
              <div style={{ borderTop: "2px solid var(--border-light)" }}>
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
                        className="flex-1 py-1.5 text-xs font-bold transition-all"
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
                                className="text-[10px] px-2 py-0.5 font-bold"
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

          {/* Save CTA */}
          <div className="anim-fade-up anim-delay-4 pt-1">
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="relative overflow-hidden btn-shine btn-stamp w-full flex items-center justify-center gap-2.5 font-bold py-4 text-[15px] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : saved
                  ? <><Check size={17} strokeWidth={2.5} /> Saved!</>
                  : <><Save size={17} strokeWidth={2.5} /> Save changes</>}
            </button>
            {!canSave && name.trim() && (
              <p className="text-center text-xs mt-2.5" style={{ color: "var(--muted)" }}>
                Select at least one date to continue
              </p>
            )}
          </div>

          {/* Danger zone hint */}
          <div className="pb-6 pt-2 text-center">
            <p className="text-xs" style={{ color: "var(--muted-2)" }}>
              Changes take effect immediately for all participants
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
