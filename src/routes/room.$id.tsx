import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS, CATS, MIN_MEMBERS, SLOTS, TIMES, VOTE_LIMITS,
  fmtDate, getOwnerToken, loadRoom, lockDecision, recommend, reopenDecision, rupiah, saveRoom, startVoting, tally, topVoted, track, uid, votingOpen,
  type Member, type Room,
} from "@/lib/kemana";

export const Route = createFileRoute("/room/$id")({
  head: () => ({
    meta: [
      { title: "Rencana Kumpul — KemanaAja" },
      { name: "description", content: "Isi preferensi, lihat rekomendasi, dan voting tempat kumpul bareng teman." },
      { property: "og:title", content: "Kamu diajak kumpul! — KemanaAja" },
      { property: "og:description", content: "Isi preferensimu dan ikut voting tempat kumpul." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { id } = Route.useParams();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => loadRoom(id).then((r) => alive && setRoom(r)).catch(() => alive && setRoom(null));
    refresh();
    const channel = supabase
      .channel(`room-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${id}` }, refresh)
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [id]);

  const update = (r: Room) => { setRoom({ ...r }); void saveRoom(r); };
  const ready = (room?.members.length ?? 0) >= MIN_MEMBERS;
  const go = (i: number) => {
    if (i > 0 && !ready) return;
    if (i === 1 && room) track("recommendations_viewed", room.id);
    setTab(i);
  };

  if (room === undefined) return null;
  if (!room) return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div><p className="text-lg">Rencana tidak ditemukan.</p><Link to="/" className="kz-btn mt-4 inline-block">Buat rencana baru</Link></div>
    </main>
  );

  const ownerToken = getOwnerToken(room.id);
  const tabs = ["Ajak & Preferensi", "Rekomendasi", "Voting"];
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <Link to="/" className="font-display text-xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{room.title}</h1>
        <p className="text-muted-foreground">{fmtDate(room.date) || "Tanggal belum ditentukan"} · {room.members.length} anggota</p>

        {room.decided ? <Decision room={room} ownerToken={ownerToken} onReopened={() => setTab(2)} /> : (
          <>
            <nav className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t, i) => (
                <button key={t} disabled={i > 0 && !ready} onClick={() => go(i)} className={(i === tab ? "kz-tab kz-tab-active" : "kz-tab") + " disabled:opacity-50"}>{i + 1}. {t}</button>
              ))}
            </nav>
            <div className="mt-6">
              {tab === 0 && <Prefs room={room} update={update} next={() => go(1)} />}
              {tab === 1 && <Recs room={room} next={() => go(2)} />}
              {tab === 2 && <Vote room={room} update={update} ownerToken={ownerToken} />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Prefs({ room, update, next }: { room: Room; update: (r: Room) => void; next: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState("");
  const [f, setF] = useState({ name: "", budget: 75000, area: AREAS[0]!, times: [TIMES[1]!], cats: [] as string[] });
  const [err, setErr] = useState("");
  const link = typeof window !== "undefined" ? window.location.href : "";
  const n = room.members.length;
  const ready = n >= MIN_MEMBERS;

  const add = () => {
    if (!f.name.trim()) return setErr("Isi nama dulu ya.");
    if (!f.times.length) return setErr("Pilih minimal satu waktu.");
    setErr("");
    update({ ...room, members: [...room.members, { ...f, name: f.name.trim(), id: uid() }] });
    track("preference_saved", room.id);
    setSaved(f.name.trim());
    setF({ ...f, name: "" });
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="space-y-6">
      <div className="kz-card flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Link undangan</p><p className="truncate text-sm text-muted-foreground">{link}</p></div>
        <button className="kz-btn" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }}>{copied ? "Tersalin ✓" : "Salin link"}</button>
      </div>

      <div className="kz-card">
        <h2 className="font-display text-xl font-bold">Preferensi anggota</h2>
        <p className="text-sm text-muted-foreground">🔒 Budget bersifat rahasia — teman hanya melihat bahwa kamu sudah mengisi.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="nm" className="text-sm font-semibold">Nama</label>
            <input id="nm" className="kz-input bg-card" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Raka" /></div>
          <div><label className="text-sm font-semibold">Budget maks / orang: {rupiah(f.budget)}</label>
            <input type="range" min={0} max={200000} step={5000} value={f.budget} onChange={(e) => setF({ ...f, budget: +e.target.value })} className="mt-3 w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>Rp0</span><span>Rp200.000</span></div></div>
          <div><label htmlFor="ar" className="text-sm font-semibold">Area terdekat</label>
            <select id="ar" className="kz-input bg-card" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
          <div><p className="text-sm font-semibold">Waktu (boleh lebih dari satu)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIMES.map((t) => {
                const on = f.times.includes(t);
                return <button key={t} aria-pressed={on} onClick={() => setF({ ...f, times: toggle(f.times, t) })} className={on ? "kz-chip kz-chip-on" : "kz-chip"}>{t} <span className="text-xs">({SLOTS[t]![0]}–{SLOTS[t]![1]})</span></button>;
              })}
            </div></div>
        </div>
        <p className="mt-4 text-sm font-semibold">Mau ngapain?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATS.map((c) => {
            const on = f.cats.includes(c);
            return <button key={c} aria-pressed={on} onClick={() => setF({ ...f, cats: toggle(f.cats, c) })} className={on ? "kz-chip kz-chip-on" : "kz-chip"}>{c}</button>;
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="kz-btn" onClick={add}>Simpan preferensi</button>
          {err && <span className="text-sm font-semibold text-destructive">{err}</span>}
          {!err && saved && <span role="status" className="text-sm font-semibold">✓ Preferensi tersimpan ({saved})</span>}
        </div>
      </div>

      <div className="kz-card">
        <h3 className="font-semibold">Sudah mengisi ({n})</h3>
        {n > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {room.members.map((m: Member) => <li key={m.id} className="kz-chip kz-chip-on">✓ {m.name} · {m.area}</li>)}
          </ul>
        ) : <p className="mt-2 text-sm text-muted-foreground">Belum ada yang mengisi.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="kz-btn disabled:cursor-not-allowed disabled:opacity-40" disabled={!ready} onClick={next}>Lihat rekomendasi →</button>
          {!ready && <span className="text-sm text-muted-foreground">Butuh minimal {MIN_MEMBERS} orang (sekarang {n})</span>}
        </div>
      </div>
    </div>
  );
}

function Recs({ room, next }: { room: Room; next: () => void }) {
  const recs = recommend(room.members);
  const n = room.members.length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Semua opsi muat di budget terendah grup, ada di area anggota, dan buka di waktu pilihan — diurutkan dari yang paling cocok.</p>
      {recs.length === 0 && <p className="kz-card">Belum ada tempat yang cocok. Coba longgarkan budget, area, atau waktu.</p>}
      {recs.length > 0 && recs.length < 3 && <p className="text-sm font-semibold">Hanya {recs.length} opsi yang cocok. Longgarkan preferensi untuk pilihan lebih banyak.</p>}
      {recs.map((p, i) => (
        <div key={p.id} className="kz-card flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl">{p.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{i === 0 && "⭐ "}{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.cat} · 📍 {p.area} (terdekat untuk {p.areaMatch} dari {n}) · {p.note}</p>
            <p className="text-sm text-muted-foreground">🕒 Buka {hh(p.open)}–{hh(p.close)} · cocok {p.time}{p.catMatch > 0 && ` · aktivitas cocok untuk ${p.catMatch} dari ${n} anggota`}</p>
            <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">✓ Cocok untuk budget semua anggota</span>
          </div>
          <span className="font-semibold">{rupiah(p.price)}</span>
        </div>
      ))}
      {recs.length > 0 && <button className="kz-btn" onClick={next}>Ke voting →</button>}
    </div>
  );
}
const hh = (h: number) => `${String(Math.floor(h % 24)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function Vote({ room, update, ownerToken }: { room: Room; update: (r: Room) => void; ownerToken: string | null }) {
  const recs = recommend(room.members);
  const total = Object.keys(room.votes).length;
  const open = votingOpen(room);
  const started = !!room.votingStartedAt;
  const [limit, setLimit] = useState<number | null>(60);
  const [confirming, setConfirming] = useState(false);
  const [tie, setTie] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so the countdown / deadline state stays fresh.
  useEffect(() => {
    if (!room.votingEndsAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [room.votingEndsAt]);

  if (!recs.length) return <p className="text-muted-foreground">Belum ada opsi untuk divoting.</p>;

  const start = async (minutes: number | null) => {
    if (!ownerToken) return;
    setBusy(true);
    try {
      await startVoting(room.id, ownerToken, minutes === null ? null : Date.now() + minutes * 60000);
      track("vote_cast", room.id);
    } finally { setBusy(false); }
  };

  const lock = async (placeId: string) => {
    if (!ownerToken) return;
    setBusy(true);
    try {
      await lockDecision(room.id, ownerToken, placeId);
      track("decision_locked", room.id);
    } finally { setBusy(false); setConfirming(false); setTie(null); }
  };

  const askLock = () => {
    const top = topVoted(room.votes);
    if (top.length > 1) { setTie(top); return; }
    setConfirming(true);
  };

  const vote = (m: Member, placeId: string) => {
    if (!open) return;
    update({ ...room, votes: { ...room.votes, [m.id]: placeId } });
    track("vote_cast", room.id);
  };

  const remaining = room.votingEndsAt ? Math.max(0, room.votingEndsAt - Date.now()) : null;
  const remainingLabel = remaining === null ? null : remaining <= 0 ? "Waktu voting habis" :
    remaining < 3600000 ? `Sisa waktu ${Math.ceil(remaining / 60000)} menit` : `Sisa waktu ${Math.ceil(remaining / 3600000)} jam`;

  return (
    <div className="space-y-5">
      {!started && (
        <div className="kz-card">
          {ownerToken ? (
            <>
              <h3 className="font-semibold">Mulai voting</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pilih batas waktu voting (opsional). Anggota bisa mengganti suaranya sampai voting berakhir.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {VOTE_LIMITS.map((l) => (
                  <button key={l.label} aria-pressed={limit === l.minutes} onClick={() => setLimit(l.minutes)} className={limit === l.minutes ? "kz-chip kz-chip-on" : "kz-chip"}>{l.label}</button>
                ))}
              </div>
              <button disabled={busy} className="kz-btn mt-4 disabled:opacity-40" onClick={() => start(limit)}>Mulai voting 🗳️</button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Voting belum dimulai. Menunggu pembuat rencana menekan "Mulai voting".</p>
          )}
        </div>
      )}

      {started && (
        <>
          <div className="kz-card">
            <p className="font-semibold">{total} dari {room.members.length} anggota sudah voting</p>
            {remainingLabel && <p className="mt-1 text-sm text-muted-foreground">⏳ {remainingLabel}</p>}
            {!open && <p className="mt-1 text-sm text-muted-foreground">Voting ditutup — menunggu pembuat rencana mengunci keputusan.</p>}
          </div>

          {room.members.map((m) => (
            <div key={m.id} className="kz-card">
              <p className="font-semibold">{m.name} memilih:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recs.map((p) => (
                  <button key={p.id} disabled={!open} onClick={() => vote(m, p.id)}
                    className={(room.votes[m.id] === p.id ? "kz-chip kz-chip-on" : "kz-chip") + " disabled:cursor-not-allowed disabled:opacity-50"}>{p.emoji} {p.name}</button>
                ))}
              </div>
            </div>
          ))}

          {ownerToken && !tie && !confirming && (
            <div className="kz-card">
              <button disabled={!total || busy} className="kz-btn disabled:opacity-40" onClick={askLock}>Kunci keputusan 🔒</button>
              {!total && <p className="mt-2 text-sm text-muted-foreground">Belum ada suara masuk.</p>}
            </div>
          )}

          {ownerToken && confirming && !tie && (
            <div className="kz-card border-2 border-foreground">
              <p className="font-semibold">Kunci keputusan sekarang?</p>
              <p className="mt-1 text-sm text-muted-foreground">Setelah dikunci, suara tidak bisa diubah lagi.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button disabled={busy} className="kz-btn disabled:opacity-40" onClick={() => lock(topVoted(room.votes)[0]!)}>Ya, kunci 🔒</button>
                <button className="kz-btn-inverse" onClick={() => setConfirming(false)}>Batal</button>
              </div>
            </div>
          )}

          {ownerToken && tie && (
            <div className="kz-card border-2 border-foreground">
              <p className="font-semibold">Suara seri!</p>
              <p className="mt-1 text-sm text-muted-foreground">Sebagai pembuat rencana, pilih pemenang di antara opsi yang seri:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tie.map((id) => {
                  const p = recs.find((r) => r.id === id);
                  return p && <button key={id} disabled={busy} className="kz-chip disabled:opacity-40" onClick={() => lock(id)}>{p.emoji} {p.name}</button>;
                })}
              </div>
              <button className="mt-3 text-sm underline" onClick={() => setTie(null)}>Kembali</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Decision({ room, ownerToken, onReopened }: { room: Room; ownerToken: string | null; onReopened: () => void }) {
  const recs = recommend(room.members);
  const p = recs.find((x) => x.id === room.decided);
  if (!p) return null;
  const date = fmtDate(room.date);
  const t = tally(room.votes);
  const total = Object.keys(room.votes).length;
  const text = `📍 KemanaAja: ${room.title}\n${p.name} (${p.area})\n🗓️ ${date || "TBD"}\n💸 ${rupiah(p.price)}/orang\n🗺️ ${p.maps}`;

  const reopen = async () => {
    if (!ownerToken) return;
    await reopenDecision(room.id, ownerToken);
    onReopened();
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-3xl border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal sm:p-8">
        <p className="text-sm font-bold uppercase tracking-widest">Decision Card</p>
        <p className="mt-4 text-6xl">{p.emoji}</p>
        <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{p.name}</h2>
        <p className="mt-2 font-medium">{p.cat} · {p.area} · {rupiah(p.price)}/orang</p>
        <p className="font-medium">{[date, room.members.map((m) => m.name).join(", ")].filter(Boolean).join(" · ")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="kz-btn-inverse" target="_blank" rel="noreferrer" href={p.maps}>Buka di Maps</a>
          <a className="kz-btn-inverse" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Bagikan ke WhatsApp</a>
          {ownerToken && <button className="kz-btn-inverse" onClick={reopen}>Buka voting lagi</button>}
        </div>
      </div>

      <div className="kz-card">
        <h3 className="font-semibold">Hasil akhir ({total} suara)</h3>
        <div className="mt-3 space-y-2">
          {recs.map((r) => {
            const pct = total ? ((t[r.id] ?? 0) / total) * 100 : 0;
            return (
              <div key={r.id}>
                <div className="flex justify-between text-sm"><span>{r.id === room.decided ? "🏆 " : ""}{r.name}</span><span>{t[r.id] ?? 0}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
