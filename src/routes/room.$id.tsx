import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AREAS, CATS, MIN_MEMBERS, SLOTS, TIMES, fmtDate, loadRoom, recommend, rupiah, saveRoom, tally, track, uid, type Member, type Room } from "@/lib/kemana";

export const Route = createFileRoute("/room/$id")({
  head: () => ({
    meta: [
      { title: "Room Kumpul — KemanaAja" },
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
  useEffect(() => setRoom(loadRoom(id)), [id]);

  const update = (r: Room) => { saveRoom(r); setRoom({ ...r }); };
  const ready = (room?.members.length ?? 0) >= MIN_MEMBERS;
  const go = (i: number) => {
    if (i > 0 && !ready) return;
    if (i === 1 && room) track("recommendations_viewed", room.id);
    setTab(i);
  };

  if (room === undefined) return null;
  if (!room) return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div><p className="text-lg">Room tidak ditemukan.</p><Link to="/" className="kz-btn mt-4 inline-block">Buat room baru</Link></div>
    </main>
  );

  const tabs = ["Ajak & Preferensi", "Rekomendasi", "Voting"];
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <Link to="/" className="font-display text-xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{room.title}</h1>
        <p className="text-muted-foreground">{fmtDate(room.date) || "Tanggal belum ditentukan"} · {room.members.length} anggota</p>

        {room.decided ? <Decision room={room} onReopen={() => { update({ ...room, decided: undefined }); setTab(2); }} /> : (
          <>
            <nav className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t, i) => (
                <button key={t} disabled={i > 0 && !ready} onClick={() => go(i)} className={(i === tab ? "kz-tab kz-tab-active" : "kz-tab") + " disabled:opacity-50"}>{i + 1}. {t}</button>
              ))}
            </nav>
            <div className="mt-6">
              {tab === 0 && <Prefs room={room} update={update} next={() => go(1)} />}
              {tab === 1 && <Recs room={room} next={() => go(2)} />}
              {tab === 2 && <Vote room={room} update={update} />}
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
      {recs.length > 0 && <button className="kz-btn" onClick={next}>Mulai voting →</button>}
    </div>
  );
}
const hh = (h: number) => `${String(Math.floor(h % 24)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function Vote({ room, update }: { room: Room; update: (r: Room) => void }) {
  const recs = recommend(room.members);
  const t = tally(room.votes);
  const total = Object.keys(room.votes).length;
  const top = recs.slice().sort((a, b) => (t[b.id] ?? 0) - (t[a.id] ?? 0))[0];
  if (!recs.length) return <p className="text-muted-foreground">Belum ada opsi untuk divoting.</p>;
  return (
    <div className="space-y-5">
      {room.members.map((m) => (
        <div key={m.id} className="kz-card">
          <p className="font-semibold">{m.name} memilih:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recs.map((p) => (
              <button key={p.id} onClick={() => { update({ ...room, votes: { ...room.votes, [m.id]: p.id } }); track("vote_cast", room.id); }}
                className={room.votes[m.id] === p.id ? "kz-chip kz-chip-on" : "kz-chip"}>{p.emoji} {p.name}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="kz-card">
        <h3 className="font-semibold">Hasil sementara ({total}/{room.members.length} suara)</h3>
        <div className="mt-3 space-y-2">
          {recs.map((p) => {
            const pct = total ? ((t[p.id] ?? 0) / total) * 100 : 0;
            return (
              <div key={p.id}>
                <div className="flex justify-between text-sm"><span>{p.name}</span><span>{t[p.id] ?? 0}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
        <button disabled={!total} className="kz-btn mt-5 disabled:opacity-40" onClick={() => { update({ ...room, decided: top?.id }); track("decision_locked", room.id); }}>Kunci keputusan 🔒</button>
      </div>
    </div>
  );
}

function Decision({ room, onReopen }: { room: Room; onReopen: () => void }) {
  const p = recommend(room.members).find((x) => x.id === room.decided);
  if (!p) return null;
  const date = fmtDate(room.date);
  const text = `📍 KemanaAja: ${room.title}\n${p.name} (${p.area})\n🗓️ ${date || "TBD"}\n💸 ${rupiah(p.price)}/orang\n🗺️ ${p.maps}`;
  return (
    <div className="mt-8 rounded-3xl border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest">Decision Card</p>
      <p className="mt-4 text-6xl">{p.emoji}</p>
      <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{p.name}</h2>
      <p className="mt-2 font-medium">{p.cat} · {p.area} · {rupiah(p.price)}/orang</p>
      <p className="font-medium">{date || "Tanggal menyusul"} · {room.members.map((m) => m.name).join(", ")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a className="kz-btn-inverse" target="_blank" rel="noreferrer" href={p.maps}>Buka di Maps</a>
        <a className="kz-btn-inverse" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Bagikan ke WhatsApp</a>
        <button className="kz-btn-inverse" onClick={onReopen}>Buka voting lagi</button>
      </div>
    </div>
  );
}
