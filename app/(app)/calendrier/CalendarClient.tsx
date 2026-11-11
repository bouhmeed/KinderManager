"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { getCalendarChildren, getCalendarRange } from "@/app/actions/calendar";
import { minutesToHHMM } from "@/lib/tunis-time";

type Child = { id: number; firstName: string; lastName: string; classRoom: { name: string } | null };
type Participation = { childId: number; status: string; minutes: number | null; educatorRemark: string | null; remarkVisibleToParents: boolean };
type Occurrence = { id: number; title: string; startMinutes: number; endMinutes: number; kind: string; status: string; educatorNote: string | null; noteVisibleToParents: boolean; classRoomId: number; activityTitle: string | null; participations: Participation[] };
type DayPhoto = { id: number; caption: string | null; childId: number | null; occurrenceId: number | null };
type Day = { date: string; photos: DayPhoto[]; attendances: { childId: number; status: string; arrivalTime: Date | null; departureTime: Date | null }[]; occurrences: Occurrence[] };
type Club = { childId: number; activityTitle: string };

type View = "month" | "week" | "day";

const ATT_LABELS: Record<string, string> = {
  PRESENT: "Présent", LATE: "En retard", ABSENT_DECLARED: "Absence déclarée",
  ABSENT_EXCUSED: "Absence excusée", ABSENT_UNEXCUSED: "Absence", NOT_RECORDED: "À vérifier",
};
const PART_LABELS: Record<string, string> = { PENDING: "…", PRESENT: "✓", PARTIAL: "Partiel", ABSENT: "Absent", CANCELLED: "Annulé" };
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function key(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(k: string) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtTime(d: Date | null) { return d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function CalendarClient() {
  return (
    <Suspense fallback={<div className="text-gray-500 py-12 text-center">Chargement…</div>}>
      <CalendarInner />
    </Suspense>
  );
}

function CalendarInner() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<number | 0>(0);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [days, setDays] = useState<Day[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    getCalendarChildren().then((list) => {
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0].id);
    });
  }, []);

  const range = useMemo(() => {
    if (view === "day") {
      const d = parseKey(key(cursor));
      return { from: key(d), to: key(d) };
    }
    if (view === "week") {
      const d = new Date(cursor);
      const dow = (d.getDay() + 6) % 7; // Monday=0
      const start = new Date(d); start.setDate(d.getDate() - dow);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { from: key(start), to: key(end) };
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    // pad to full weeks
    const s = new Date(start); s.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const e = new Date(end); e.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
    return { from: key(s), to: key(e) };
  }, [cursor, view]);

  useEffect(() => {
    let alive = true;
    getCalendarRange(range.from, range.to, selectedChild ? [selectedChild] : undefined)
      .then((res) => { if (alive) { setDays(res.days); setClubs(res.clubs); } })
      .catch(() => { if (alive) setDays([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range.from, range.to, selectedChild]);

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const nav = (dir: number) => {
    setLoading(true);
    setCursor((c) => {
      const d = new Date(c);
      if (view === "day") d.setDate(d.getDate() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const title = view === "month"
    ? cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : view === "week"
      ? `Semaine du ${parseKey(range.from).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
      : parseKey(range.from).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const selected = selectedDay ? dayMap.get(selectedDay) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedChild} onChange={(e) => { setLoading(true); setSelectedChild(parseInt(e.target.value)); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
            {children.length > 1 && <option value={0}>Tous les enfants</option>}
            {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.classRoom ? ` (${c.classRoom.name})` : ""}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button key={v} onClick={() => { setLoading(true); setView(v); }} className={`px-3 py-2 ${view === v ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>
                {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => nav(-1)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">‹</button>
            <button onClick={() => { setLoading(true); const n = new Date(); setCursor(view === "day" ? n : new Date(n.getFullYear(), n.getMonth(), 1)); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">Aujourd&apos;hui</button>
            <button onClick={() => nav(1)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">›</button>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 capitalize">{title}</h3>
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
      ) : view === "month" ? (
        <MonthGrid dayMap={dayMap} range={range} cursor={cursor} selectedDay={selectedDay} onSelect={setSelectedDay} />
      ) : view === "week" ? (
        <WeekView days={days} dayMap={dayMap} range={range} onSelect={setSelectedDay} />
      ) : (
        <DayView day={selected ?? dayMap.get(range.from)} childList={children} clubs={clubs} />
      )}

      {selected && view !== "day" && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
              {parseKey(selected.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <button onClick={() => setSelectedDay(null)} className="text-sm text-gray-500 hover:text-gray-700">Fermer</button>
          </div>
          <DayDetail day={selected} childList={children} clubs={clubs} />
        </div>
      )}
    </div>
  );
}

function MonthGrid({ dayMap, range, cursor, selectedDay, onSelect }: {
  dayMap: Map<string, Day>; range: { from: string; to: string }; cursor: Date;
  selectedDay: string | null; onSelect: (k: string) => void;
}) {
  const cells: Date[] = [];
  const start = parseKey(range.from);
  const total = Math.round((parseKey(range.to).getTime() - start.getTime()) / 86400000) + 1;
  for (let i = 0; i < total; i++) { const d = new Date(start); d.setDate(d.getDate() + i); cells.push(d); }
  const month = cursor.getMonth();
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((w) => <div key={w} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1">{w}</div>)}
      {cells.map((d) => {
        const k = key(d);
        const day = dayMap.get(k);
        const inMonth = d.getMonth() === month;
        const att = day?.attendances ?? [];
        const presentCount = att.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length;
        return (
          <button key={k} onClick={() => onSelect(k)}
            className={`min-h-20 rounded-lg border p-1.5 text-left text-xs transition-colors ${inMonth ? "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600" : "bg-gray-50 dark:bg-gray-800 border-transparent opacity-50"} ${selectedDay === k ? "ring-2 ring-indigo-500" : "hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
            <span className={`font-medium ${inMonth ? "text-gray-800 dark:text-gray-100" : "text-gray-400"}`}>{d.getDate()}</span>
            {day && (
              <div className="mt-1 space-y-0.5">
                {att.length > 0 && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{presentCount}/{att.length} présent{att.length > 1 ? "s" : ""}</p>
                )}
                {day.occurrences.length > 0 && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{day.occurrences.length} activité{day.occurrences.length > 1 ? "s" : ""}</p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WeekView({ dayMap, range, onSelect }: { days: Day[]; dayMap: Map<string, Day>; range: { from: string; to: string }; onSelect: (k: string) => void }) {
  const cells: string[] = [];
  const start = parseKey(range.from);
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); cells.push(key(d)); }
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {cells.map((k) => {
        const day = dayMap.get(k);
        const d = parseKey(k);
        return (
          <button key={k} onClick={() => onSelect(k)} className="min-h-40 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}</p>
            <div className="mt-1 space-y-1">
              {(day?.occurrences ?? []).slice(0, 4).map((o) => (
                <p key={o.id} className={`text-[11px] truncate ${o.status === "CANCELLED" ? "line-through text-gray-400" : "text-indigo-700 dark:text-indigo-300"}`}>
                  {minutesToHHMM(o.startMinutes)} {o.title}
                </p>
              ))}
              {(day?.occurrences.length ?? 0) > 4 && <p className="text-[10px] text-gray-400">+{day!.occurrences.length - 4}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({ day, childList, clubs }: { day: Day | undefined; childList: Child[]; clubs: Club[] }) {
  if (!day) return <p className="text-gray-500 dark:text-gray-400 text-center py-12">Aucune donnée pour cette journée.</p>;
  return <DayDetail day={day} childList={childList} clubs={clubs} />;
}

function DayDetail({ day, childList, clubs }: { day: Day; childList: Child[]; clubs: Club[] }) {
  const childName = (id: number) => { const c = childList.find((x) => x.id === id); return c ? `${c.firstName} ${c.lastName}` : `#${id}`; };
  const dayClubs = clubs.filter((c) => childList.some((ch) => ch.id === c.childId));
  return (
    <div className="space-y-4">
      {dayClubs.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Clubs</h5>
          <ul className="flex flex-wrap gap-2">
            {dayClubs.map((c, i) => (
              <li key={i} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                {childName(c.childId)} — {c.activityTitle}
              </li>
            ))}
          </ul>
        </div>
      )}
      {day.photos.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Photos</h5>
          <div className="flex flex-wrap gap-2">
            {day.photos.map((p) => (
              <a key={p.id} href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer" title={p.caption ?? ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt={p.caption ?? "Photo"} className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
              </a>
            ))}
          </div>
        </div>
      )}
      {day.attendances.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Présences</h5>
          <ul className="space-y-1">
            {day.attendances.map((a, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-3">
                <span className="font-medium">{childName(a.childId)}</span>
                <span>{ATT_LABELS[a.status] ?? a.status}</span>
                <span className="text-gray-400">Arrivée {fmtTime(a.arrivalTime)} — Départ {fmtTime(a.departureTime)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {day.occurrences.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Programme & participations</h5>
          <ul className="space-y-3">
            {day.occurrences.map((o) => (
              <li key={o.id} className={`border rounded-lg p-3 ${o.status === "CANCELLED" ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{minutesToHHMM(o.startMinutes)} – {minutesToHHMM(o.endMinutes)} {o.title}</span>
                  {o.status === "CANCELLED" && <span className="text-xs text-red-600 font-semibold">Annulée</span>}
                  {o.kind === "CLUB_SESSION" && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">Club</span>}
                </div>
                {o.participations.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {o.participations.map((p) => (
                      <li key={p.childId} className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-2">
                        <span className="font-medium">{childName(p.childId)}</span>
                        <span>{PART_LABELS[p.status] ?? p.status}</span>
                        {p.minutes != null && <span>{p.minutes} min</span>}
                        {p.educatorRemark && p.remarkVisibleToParents && <span className="italic text-gray-500">« {p.educatorRemark} »</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {o.educatorNote && o.noteVisibleToParents && (
                  <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">Remarque : {o.educatorNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {day.attendances.length === 0 && day.occurrences.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune activité ni présence enregistrée.</p>
      )}
    </div>
  );
}
