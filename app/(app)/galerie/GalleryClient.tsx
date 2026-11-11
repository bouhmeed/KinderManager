"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { getGalleryPhotos, uploadPhoto, deletePhoto, getPhotoScope } from "@/app/actions/photos";
import { getClassRoomOptions, getOccurrences } from "@/app/actions/activities";

export default function GalleryClient() {
  return <Suspense fallback={<p className="text-gray-500 py-12 text-center">Chargement…</p>}><GalleryInner /></Suspense>;
}

function GalleryInner() {
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof getGalleryPhotos>>>([]);
  const [classRooms, setClassRooms] = useState<{ id: number; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState("");
  const [occurrenceId, setOccurrenceId] = useState("");
  const [dayOccurrences, setDayOccurrences] = useState<{ id: number; title: string; startMinutes: number }[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    getPhotoScope().then((s) => setIsStaff(s.role !== "PARENT"));
    getClassRoomOptions().then(setClassRooms).catch(() => {});
  }, []);

  const load = () => {
    getGalleryPhotos({
      classId: classId ? parseInt(classId) : undefined,
      date: date || undefined,
      occurrenceId: occurrenceId ? parseInt(occurrenceId) : undefined,
    }).then(setPhotos).catch(() => setPhotos([])).finally(() => setLoading(false));
  };

  useEffect(load, [classId, date, occurrenceId]);

  useEffect(() => {
    let alive = true;
    if (date) {
      getOccurrences({ date }).then((list) => {
        if (alive) setDayOccurrences(list.map((o) => ({ id: o.id, title: o.title, startMinutes: o.startMinutes })));
      }).catch(() => { if (alive) setDayOccurrences([]); });
    } else {
      queueMicrotask(() => { if (alive) setDayOccurrences([]); });
    }
    return () => { alive = false; };
  }, [date]);

  const handleUpload = async (fd: FormData) => {
    setError("");
    startTransition(async () => {
      const res = await uploadPhoto(fd);
      if (res?.error) setError(res.error);
      else { setShowUpload(false); load(); }
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Supprimer cette photo ?")) return;
    startTransition(async () => { await deletePhoto(id); load(); });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie photos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select value={classId} onChange={(e) => { setLoading(true); setClassId(e.target.value); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
            <option value="">Toutes les classes</option>
            {classRooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => { setLoading(true); setDate(e.target.value); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
          {dayOccurrences.length > 0 && (
            <select value={occurrenceId} onChange={(e) => { setLoading(true); setOccurrenceId(e.target.value); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
              <option value="">Toutes les séances</option>
              {dayOccurrences.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          )}
          {isStaff && (
            <button onClick={() => setShowUpload(!showUpload)} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              {showUpload ? "Fermer" : "+ Photo"}
            </button>
          )}
        </div>
      </div>

      {showUpload && isStaff && <UploadForm classRooms={classRooms} dayOccurrences={dayOccurrences} pending={isPending} onSubmit={handleUpload} />}
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
      ) : photos.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Aucune photo.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => (
            <figure key={p.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={p.caption ?? "Photo"} className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
              <figcaption className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {p.caption && <span className="block truncate">{p.caption}</span>}
                <span>
                  {p.child ? `${p.child.firstName} ${p.child.lastName}` : p.classRoom?.name ?? ""}
                  {p.occurrence ? ` — ${p.occurrence.title}` : ""}
                </span>
                <span className="block text-gray-400">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
              </figcaption>
              {isStaff && (
                <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 bg-red-600/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Suppr.
                </button>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadForm({ classRooms, dayOccurrences, pending, onSubmit }: {
  classRooms: { id: number; name: string }[];
  dayOccurrences: { id: number; title: string }[];
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [form, setForm] = useState({ classId: "", occurrenceId: "", caption: "", audience: "STAFF_ONLY", takenAt: "" });
  const input = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
  const lbl = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";
  return (
    <form
      className="mb-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 grid grid-cols-1 md:grid-cols-3 gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit(fd);
      }}
    >
      <div>
        <label className={lbl}>Classe *</label>
        <select name="classId" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={input}>
          <option value="">Choisir…</option>
          {classRooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Séance (optionnel)</label>
        <select name="occurrenceId" value={form.occurrenceId} onChange={(e) => setForm({ ...form, occurrenceId: e.target.value })} className={input}>
          <option value="">— Aucune —</option>
          {dayOccurrences.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Audience</label>
        <select name="audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={input}>
          <option value="STAFF_ONLY">Personnel uniquement</option>
          <option value="CLASS_CHILDREN">Visible par les parents</option>
        </select>
      </div>
      <div>
        <label className={lbl}>Légende</label>
        <input name="caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className={input} />
      </div>
      <div>
        <label className={lbl}>Date de prise</label>
        <input name="takenAt" type="date" value={form.takenAt} onChange={(e) => setForm({ ...form, takenAt: e.target.value })} className={input} />
      </div>
      <div>
        <label className={lbl}>Fichier *</label>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className="w-full text-sm text-gray-600 dark:text-gray-300" />
      </div>
      <div className="md:col-span-3 flex justify-end">
        <button type="submit" disabled={pending} className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
          {pending ? "Envoi…" : "Téléverser"}
        </button>
      </div>
    </form>
  );
}
