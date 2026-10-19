import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { saveRoom, uid } from "@/lib/kemana";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KemanaAja — Putuskan tempat kumpul bareng, cepat" },
      { name: "description", content: "Buat room, ajak teman, isi preferensi, dan voting tempat kumpul dalam < 10 menit." },
      { property: "og:title", content: "KemanaAja — Kumpul tanpa ribet" },
      { property: "og:description", content: "Keputusan kolektif tempat & aktivitas untuk anak muda Indonesia." },
    ],
  }),
  component: Index,
});

const STEPS = ["Buat Room", "Ajak Teman", "Isi Preferensi", "Rekomendasi", "Voting & Keputusan"];

function Index() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const create = () => {
    const id = uid();
    saveRoom({ id, title: title || "Kumpul Weekend", date, members: [], votes: {} });
    nav({ to: "/room/$id", params: { id } });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-2xl font-bold">Kemana<span className="text-primary">Aja</span></span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">MVP Prototype</span>
        </header>

        <section className="mt-16 grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-6xl">
              Udah, nggak usah <span className="text-primary">"terserah"</span> lagi.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Satu link untuk satu grup. Budget dirahasiakan, rekomendasi pas buat semua, voting, beres.
            </p>
            <ol className="mt-8 flex flex-wrap gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="rounded-full border bg-card px-3 py-1 text-sm">
                  <span className="font-bold text-primary">{i + 1}</span> {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border-2 border-foreground bg-card p-7 shadow-brutal">
            <h2 className="font-display text-2xl font-bold">Buat room baru</h2>
            <label className="mt-5 block text-sm font-semibold">Nama rencana</label>
            <input className="kz-input" placeholder="Kumpul Weekend" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="mt-4 block text-sm font-semibold">Tanggal</label>
            <input type="date" className="kz-input" value={date} onChange={(e) => setDate(e.target.value)} />
            <button onClick={create} className="kz-btn mt-6 w-full">Buat Room →</button>
          </div>
        </section>
      </div>
    </main>
  );
}
