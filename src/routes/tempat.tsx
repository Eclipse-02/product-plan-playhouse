import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CSV_HEADER, getPlaces, parsePlacesCsv, rupiah, savePlaces, SAMPLE_PLACES, type Place } from "@/lib/kemana";

export const Route = createFileRoute("/tempat")({
  head: () => ({
    meta: [
      { title: "Data Tempat — KemanaAja" },
      { name: "description", content: "Impor dan kelola data tempat kurasi KemanaAja lewat file CSV." },
      { property: "og:title", content: "Data Tempat — KemanaAja" },
      { property: "og:description", content: "Impor data tempat kurasi lewat CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tempat,
});

const hh = (h: number) => `${String(Math.floor(h % 24)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function Tempat() {
  const [places, setPlaces] = useState<Place[]>(SAMPLE_PLACES);
  const [msg, setMsg] = useState("");
  useEffect(() => setPlaces(getPlaces()), []);

  const onFile = async (file: File) => {
    const { places: p, errors } = parsePlacesCsv(await file.text());
    if (!p.length) return setMsg("Tidak ada baris valid. " + errors.slice(0, 3).join("; "));
    savePlaces(p); setPlaces(p);
    setMsg(`${p.length} tempat diimpor.${errors.length ? ` ${errors.length} baris dilewati.` : ""}`);
  };
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_HEADER + "\nKopi Lumbung,Kopi,Jakarta Selatan,45000,08:00,18:00,Cozy,https://maps.google.com/?q=Kopi+Lumbung\n")}`;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/" className="font-display text-xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Data tempat</h1>
        <div className="kz-card mt-4 space-y-3">
          <p className="text-sm">Kolom CSV: <code className="break-all text-xs">{CSV_HEADER}</code></p>
          <p className="text-sm text-muted-foreground">Kategori: Kopi, Makan, Aktivitas, Outdoor, Hiburan. Jam format 08:00.</p>
          <div className="flex flex-wrap gap-3">
            <label className="kz-btn cursor-pointer">Impor CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
            <a className="kz-btn-inverse" href={template} download="template-tempat.csv">Unduh template</a>
            <button className="kz-btn-inverse" onClick={() => { savePlaces(null); setPlaces(SAMPLE_PLACES); setMsg("Kembali ke data contoh."); }}>Pakai data contoh</button>
          </div>
          {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
        </div>
        <div className="kz-card mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted"><tr>{["Nama", "Kategori", "Area", "Harga/orang", "Jam", "Catatan", "Maps"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{places.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-semibold">{p.name}</td><td className="p-3">{p.cat}</td><td className="p-3">{p.area}</td>
                <td className="p-3">{rupiah(p.price)}</td><td className="p-3">{hh(p.open)}–{hh(p.close)}</td><td className="p-3">{p.note}</td>
                <td className="p-3"><a className="underline" href={p.maps} target="_blank" rel="noreferrer">Buka</a></td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
