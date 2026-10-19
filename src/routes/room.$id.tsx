import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AREAS, CATS, TIMES, loadRoom, recommend, rupiah, saveRoom, tally, uid, type Member, type Room } from "@/lib/kemana";

export const Route = createFileRoute("/room/$id")({
  head: () => ({
    meta: [
      { title: "Room Kumpul — KemanaAja" },
      { name: "description", content: "Isi preferensi, lihat rekomendasi, dan voting tempat kumpul bareng teman." },
      { property: "og:title", content: "Kamu diajak kumpul! — KemanaAja" },
      { property: "og:description", content: "Isi preferensimu dan ikut voting tempat kumpul." },
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

  if (room === undefined) return null;
  if (!room) return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div><p className="text-lg">Room tidak ditemukan.</p><Link to="/" className="kz-btn mt-4 inline-block">Buat room baru</Link></div>
    </main>
  );

  const tabs = ["Ajak & Preferensi", "Rekomendasi", "Voting"];
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/" className="font-display text-xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
        <h1 className="mt-6 font-display text-4xl font-bold">{room.title}</h1>
        <p className="text-muted-foreground">{room.date || "Tanggal belum ditentukan"} · {room.members.length} anggota</p>

        {room.decided ? <Decision room={room} onReset={() => update({ ...room, decided: undefined })} /> : (
          <>
            <nav className="mt-6 flex gap-2">
              {tabs.map((t, i) => (
                <button key={t} onClick={() => setTab(i)} className={i === tab ? "kz-tab kz-tab-active" : "kz-tab"}>{i + 1}. {t}</button>
              ))}
            </nav>
            <div className="mt-6">
              {tab === 0 && <Prefs room={room} update={update} next={() => setTab(1)} />}
              {tab === 1 && <Recs room={room} next={() => setTab(2)} />}
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
  const blank = { name: "", budget: 75000, area: AREAS[0], time: TIMES[1], cats: [] as string[] };
  const [f, setF] = useState(blank);
  const link = typeof window !== "undefined" ? window.location.href : "";

  const add = () => {
    if (!f.name.trim()) return;
    update({ ...room, members: [...room.members, { ...f, id: uid() }] });
    setF(blank);
  };

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
          <div><label className="text-sm font-semibold">Nama</label><input className="kz-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Raka" /></div>
          <div><label className="text-sm font-semibold">Budget maks / orang: {rupiah(f.budget)}</label>
            <input type="range" min={0} max={200000} step={5000} value={f.budget} onChange={(e) => setF({ ...f, budget: +e.target.value })} className="mt-3 w-full accent-primary" /></div>
          <div><label className="text-sm font-semibold">Area terdekat</label>
            <select className="kz-input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label className="text-sm font-semibold">Waktu</label>
            <select className="kz-input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>{TIMES.map((a) => <option key={a}>{a}</option>)}</select></div>
        </div>
        <p className="mt-4 text-sm font-semibold">Mau ngapain?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATS.map((c) => {
            const on = f.cats.includes(c);
            return <button key={c} onClick={() => setF({ ...f, cats: on ? f.cats.filter((x) => x !== c) : [...f.cats, c] })} className={on ? "kz-chip kz-chip-on" : "kz-chip"}>{c}</button>;
          })}
        </div>
        <button className="kz-btn mt-5" onClick={add}>Simpan preferensi</button>
      </div>

      {room.members.length > 0 && (
        <div className="kz-card">
          <h3 className="font-semibold">Sudah mengisi ({room.members.length})</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {room.members.map((m: Member) => <li key={m.id} className="kz-chip kz-chip-on">✓ {m.name} · {m.area}</li>)}
          </ul>
          <button className="kz-btn mt-5" onClick={next}>Lihat rekomendasi →</button>
        </div>
      )}
    </div>
  );
}

function Recs({ room, next }: { room: Room; next: () => void }) {
  const recs = recommend(room.members);
  if (!room.members.length) return <p className="text-muted-foreground">Belum ada preferensi. Isi dulu di langkah 1.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Semua opsi muat di budget terendah grup, diurutkan dari yang paling cocok.</p>
      {recs.length === 0 && <p className="kz-card">Belum ada tempat yang cocok. Coba longgarkan preferensi.</p>}
      {recs.map((p, i) => (
        <div key={p.id} className="kz-card flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl">{p.emoji}</span>
          <div className="flex-1">
            <p className="font-display text-lg font-bold">{i === 0 && "⭐ "}{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.cat} · {p.area} · {p.tag}</p>
          </div>
          <span className="font-semibold text-primary">{rupiah(p.price)}</span>
        </div>
      ))}
      {recs.length > 0 && <button className="kz-btn" onClick={next}>Mulai voting →</button>}
    </div>
  );
}

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
              <button key={p.id} onClick={() => update({ ...room, votes: { ...room.votes, [m.id]: p.id } })}
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
        <button disabled={!total} className="kz-btn mt-5 disabled:opacity-40" onClick={() => update({ ...room, decided: top.id })}>Kunci keputusan 🔒</button>
      </div>
    </div>
  );
}

function Decision({ room, onReset }: { room: Room; onReset: () => void }) {
  const p = recommend(room.members).find((x) => x.id === room.decided);
  if (!p) return null;
  const text = `📍 KemanaAja: ${room.title}\n${p.name} (${p.area})\n🗓️ ${room.date || "TBD"}\n💸 ${rupiah(p.price)}/orang`;
  return (
    <div className="mt-8 rounded-3xl border-2 border-foreground bg-primary p-8 text-primary-foreground shadow-brutal">
      <p className="text-sm font-semibold uppercase tracking-widest">Decision Card</p>
      <p className="mt-4 text-6xl">{p.emoji}</p>
      <h2 className="mt-3 font-display text-4xl font-bold">{p.name}</h2>
      <p className="mt-2 opacity-90">{p.cat} · {p.area} · {rupiah(p.price)}/orang</p>
      <p className="opacity-90">{room.date || "Tanggal menyusul"} · {room.members.map((m) => m.name).join(", ")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a className="kz-btn-inverse" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Bagikan ke WhatsApp</a>
        <button className="kz-btn-inverse" onClick={onReset}>Ubah keputusan</button>
      </div>
    </div>
  );
}
