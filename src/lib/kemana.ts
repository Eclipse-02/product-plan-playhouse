export type Member = { id: string; name: string; budget: number; area: string; time: string; cats: string[] };
export type Room = { id: string; title: string; date: string; members: Member[]; votes: Record<string, string>; decided?: string | undefined };
export type Place = { id: string; name: string; cat: string; area: string; price: number; times: string[]; emoji: string; tag: string };

export const AREAS = ["Jakarta Selatan", "Jakarta Pusat", "Jakarta Barat", "Tangerang Selatan", "Depok", "Bandung"];
export const TIMES = ["Siang", "Sore", "Malam"];
export const CATS = ["Kopi", "Makan", "Aktivitas", "Outdoor", "Hiburan"];

export const PLACES: Place[] = [
  { id: "p1", name: "Kopi Lumbung", cat: "Kopi", area: "Jakarta Selatan", price: 45000, times: ["Siang", "Sore"], emoji: "☕", tag: "Cozy, banyak colokan" },
  { id: "p2", name: "Warung Senja Blok M", cat: "Makan", area: "Jakarta Selatan", price: 35000, times: ["Sore", "Malam"], emoji: "🍜", tag: "Dekat MRT Blok M" },
  { id: "p3", name: "Padel Court Senayan", cat: "Aktivitas", area: "Jakarta Pusat", price: 120000, times: ["Siang", "Sore", "Malam"], emoji: "🎾", tag: "Rame-rame lebih murah" },
  { id: "p4", name: "Taman Literasi", cat: "Outdoor", area: "Jakarta Selatan", price: 0, times: ["Siang", "Sore"], emoji: "🌳", tag: "Gratis, dekat MRT" },
  { id: "p5", name: "Karaoke Nada", cat: "Hiburan", area: "Jakarta Barat", price: 80000, times: ["Sore", "Malam"], emoji: "🎤", tag: "Paket grup 3 jam" },
  { id: "p6", name: "Sate Taichan Bendungan", cat: "Makan", area: "Jakarta Pusat", price: 30000, times: ["Malam"], emoji: "🍢", tag: "Legend, buka sampai larut" },
  { id: "p7", name: "Kopi Kenangan Studio", cat: "Kopi", area: "Tangerang Selatan", price: 40000, times: ["Siang", "Sore", "Malam"], emoji: "🧋", tag: "Spot foto estetik" },
  { id: "p8", name: "Bowling Pondok Indah", cat: "Aktivitas", area: "Jakarta Selatan", price: 95000, times: ["Sore", "Malam"], emoji: "🎳", tag: "Seru buat grup besar" },
  { id: "p9", name: "Margo Food Street", cat: "Makan", area: "Depok", price: 40000, times: ["Sore", "Malam"], emoji: "🍔", tag: "Banyak pilihan tenant" },
  { id: "p10", name: "Dago Bakery Terrace", cat: "Kopi", area: "Bandung", price: 50000, times: ["Siang", "Sore"], emoji: "🥐", tag: "View kota" },
  { id: "p11", name: "Board Game Café Meeple", cat: "Hiburan", area: "Jakarta Selatan", price: 60000, times: ["Siang", "Sore", "Malam"], emoji: "🎲", tag: "200+ board game" },
  { id: "p12", name: "GBK Jogging Track", cat: "Outdoor", area: "Jakarta Pusat", price: 0, times: ["Siang", "Sore"], emoji: "🏃", tag: "Lanjut sarapan bareng" },
  { id: "p13", name: "Bioskop XXI Plaza", cat: "Hiburan", area: "Jakarta Pusat", price: 55000, times: ["Siang", "Sore", "Malam"], emoji: "🎬", tag: "Nonton + makan" },
  { id: "p14", name: "Mie Gacoan BSD", cat: "Makan", area: "Tangerang Selatan", price: 25000, times: ["Siang", "Sore", "Malam"], emoji: "🌶️", tag: "Super hemat" },
];

/** Recommendations: price must fit the LOWEST member budget (goal G3). */
export function recommend(members: Member[]): (Place & { score: number })[] {
  if (!members.length) return [];
  const minBudget = Math.min(...members.map((m) => m.budget));
  return PLACES.filter((p) => p.price <= minBudget)
    .map((p) => {
      let score = 0;
      for (const m of members) {
        if (m.area === p.area) score += 3;
        if (m.cats.includes(p.cat)) score += 2;
        if (p.times.includes(m.time)) score += 1;
      }
      return { ...p, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function tally(votes: Record<string, string>) {
  const t: Record<string, number> = {};
  Object.values(votes).forEach((v) => (t[v] = (t[v] ?? 0) + 1));
  return t;
}

export const rupiah = (n: number) => (n === 0 ? "Gratis" : "Rp" + n.toLocaleString("id-ID"));
export const uid = () => Math.random().toString(36).slice(2, 8);

const key = (id: string) => `kemana-room-${id}`;
export function loadRoom(id: string): Room | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(id));
  return raw ? (JSON.parse(raw) as Room) : null;
}
export function saveRoom(r: Room) {
  localStorage.setItem(key(r.id), JSON.stringify(r));
}
