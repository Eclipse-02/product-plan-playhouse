import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { allRooms, getEvents, type KEvent, type Room } from "@/lib/kemana";

export const Route = createFileRoute("/metrik")({
  head: () => ({
    meta: [
      { title: "Metrik — KemanaAja" },
      { name: "description", content: "Ringkasan metrik pilot KemanaAja: tingkat keputusan dan waktu ke keputusan." },
      { property: "og:title", content: "Metrik — KemanaAja" },
      { property: "og:description", content: "Tingkat keputusan, time-to-decision, dan pengisian preferensi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Metrik,
});

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function Metrik() {
  const [ev, setEv] = useState<KEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  useEffect(() => {
    getEvents().then(setEv).catch(() => undefined);
    allRooms().then(setRooms).catch(() => undefined);
  }, []);

  const created = ev.filter((e) => e.name === "room_created");
  const decidedRooms = new Set(ev.filter((e) => e.name === "decision_locked").map((e) => e.room));
  const durations = created.flatMap((c) => {
    const d = ev.find((e) => e.name === "decision_locked" && e.room === c.room);
    return d ? [(d.at - c.at) / 60000] : [];
  });
  const median = durations.length ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]! : null;
  const members = rooms.reduce((s, r) => s + r.members.length, 0);
  const voters = rooms.reduce((s, r) => s + Object.keys(r.votes).length, 0);
  const counts = ["room_created", "preference_saved", "recommendations_viewed", "vote_cast", "decision_locked"].map((n) => [n, ev.filter((e) => e.name === n).length] as const);

  const cards = [
    ["Rencana → Decision Card", pct(created.filter((c) => decidedRooms.has(c.room)).length, created.length), `${created.length} rencana dibuat`],
    ["Time-to-decision (median)", median === null ? "–" : `${median.toFixed(1)} menit`, `${durations.length} keputusan`],
    ["Anggota yang ikut voting", pct(voters, members), `${members} anggota mengisi preferensi`],
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link to="/" className="font-display text-xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Metrik</h1>
        <p className="text-sm text-muted-foreground">Data tersimpan online — gabungan semua perangkat.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {cards.map(([t, v, s]) => (
            <div key={t} className="kz-card"><p className="text-sm font-semibold">{t}</p><p className="mt-2 font-display text-3xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{s}</p></div>
          ))}
        </div>
        <div className="kz-card mt-4">
          <h2 className="font-semibold">Jumlah event</h2>
          <ul className="mt-2 space-y-1 text-sm">{counts.map(([n, c]) => <li key={n} className="flex justify-between"><code>{n}</code><span>{c}</span></li>)}</ul>
        </div>
        <div className="kz-card mt-4 overflow-x-auto">
          <h2 className="font-semibold">Log terbaru</h2>
          <ul className="mt-2 space-y-1 text-sm">{ev.slice(-20).reverse().map((e, i) => (
            <li key={i}><code>{e.name}</code> · rencana {e.room} · {new Date(e.at).toLocaleString("id-ID")}</li>))}</ul>
        </div>
      </div>
    </main>
  );
}
