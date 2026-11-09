import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createRoom, fmtDate, track } from "@/lib/kemana";
import { AccountControl } from "@/components/account-control";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KemanaAja — Putuskan tempat kumpul bareng, cepat" },
      {
        name: "description",
        content:
          "Buat rencana, ajak teman, isi preferensi, dan voting tempat kumpul dalam < 10 menit.",
      },
      { property: "og:title", content: "KemanaAja — Kumpul tanpa ribet" },
      {
        property: "og:description",
        content: "Keputusan kolektif tempat & aktivitas untuk anak muda Indonesia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const STEPS = ["Ajak & Preferensi", "Rekomendasi", "Voting"];

function Index() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const { id } = await createRoom(title || "Kumpul Weekend", date);
      track("room_created", id);
      nav({ to: "/room/$id", params: { id } });
    } catch (error) {
      console.error("Gagal membuat rencana:", error);
      setError("Rencana belum dapat dibuat. Coba lagi.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-bold">
            Kemana<span className="text-primary">Aja</span>
          </span>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link to="/tempat" className="underline-offset-4 hover:underline">
              Data tempat
            </Link>
            <Link to="/metrik" className="underline-offset-4 hover:underline">
              Metrik
            </Link>
            <AccountControl />
          </nav>
        </header>

        <section className="mt-12 grid gap-10 md:mt-16 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Udah, nggak usah <span className="text-primary">"terserah"</span> lagi.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Satu link untuk satu grup. Budget dirahasiakan, rekomendasi pas buat semua, voting,
              beres.
            </p>
            <ol
              className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
              aria-label="Langkah"
            >
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                    {i + 1}
                  </span>
                  <span className="font-medium">{s}</span>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </li>
              ))}
              <li className="font-bold text-primary">Decision Card ✓</li>
            </ol>
          </div>

          <div className="rounded-3xl border-2 border-foreground bg-card p-6 shadow-brutal sm:p-7">
            <h2 className="font-display text-2xl font-bold">Buat rencana baru</h2>
            <label htmlFor="t" className="mt-5 block text-sm font-semibold">
              Nama rencana
            </label>
            <input
              id="t"
              className="kz-input"
              placeholder="mis. Kumpul Weekend"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="d" className="mt-4 block text-sm font-semibold">
              Tanggal (opsional)
            </label>
            <input
              id="d"
              type="date"
              className="kz-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Boleh perkiraan{date && ` · ${fmtDate(date)}`}
            </p>
            <button
              onClick={create}
              disabled={busy || !hydrated}
              className="kz-btn mt-6 w-full disabled:opacity-50"
            >
              {busy ? "Membuat…" : "Buat Rencana →"}
            </button>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
