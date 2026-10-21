import { supabase } from "@/integrations/supabase/client";

export type Member = { id: string; name: string; budget: number; area: string; times: string[]; cats: string[] };
export type Room = {
  id: string; title: string; date: string; createdAt?: number; members: Member[]; votes: Record<string, string>;
  decided?: string | undefined;
  /** Epoch ms when the owner started voting; undefined = voting not started. */
  votingStartedAt?: number | undefined;
  /** Epoch ms deadline; null/undefined = no time limit. */
  votingEndsAt?: number | null | undefined;
};
export type Place = { id: string; name: string; cat: string; area: string; price: number; open: number; close: number; note: string; maps: string; emoji: string };
export type Rec = Place & { score: number; catMatch: number; areaMatch: number; time: string };

/** Minimum members who must fill preferences before recommendations unlock. */
export const MIN_MEMBERS = 3;

export const AREAS = ["Jakarta Selatan", "Jakarta Pusat", "Jakarta Barat", "Tangerang Selatan", "Depok", "Bandung"];
/** Time slots with the hours (24h) they cover. */
export const SLOTS: Record<string, [number, number]> = { Siang: [11, 15], Sore: [15, 18], Malam: [18, 22] };
export const TIMES = Object.keys(SLOTS);
export const CATS = ["Kopi", "Makan", "Aktivitas", "Outdoor", "Hiburan"];
const EMOJI: Record<string, string> = { Kopi: "☕", Makan: "🍜", Aktivitas: "🎾", Outdoor: "🌳", Hiburan: "🎲" };

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const P = (id: string, name: string, cat: string, area: string, price: number, open: number, close: number, note: string): Place =>
  ({ id, name, cat, area, price, open, close, note, maps: maps(`${name} ${area}`), emoji: EMOJI[cat] ?? "📍" });

/** Sample data — replace via CSV import. */
export const SAMPLE_PLACES: Place[] = [
  P("p1", "Kopi Lumbung", "Kopi", "Jakarta Selatan", 45000, 8, 18, "Cozy, banyak colokan"),
  P("p2", "Warung Senja Blok M", "Makan", "Jakarta Selatan", 35000, 15, 23, "Dekat MRT Blok M"),
  P("p3", "Padel Court Senayan", "Aktivitas", "Jakarta Pusat", 120000, 7, 22, "Rame-rame lebih murah"),
  P("p4", "Taman Literasi", "Outdoor", "Jakarta Selatan", 0, 6, 18, "Gratis, dekat MRT"),
  P("p5", "Karaoke Nada", "Hiburan", "Jakarta Barat", 80000, 14, 24, "Paket grup 3 jam"),
  P("p6", "Sate Taichan Bendungan", "Makan", "Jakarta Pusat", 30000, 18, 24, "Legend, buka sampai larut"),
  P("p7", "Kopi Studio BSD", "Kopi", "Tangerang Selatan", 40000, 9, 22, "Spot foto estetik"),
  P("p8", "Bowling Pondok Indah", "Aktivitas", "Jakarta Selatan", 95000, 12, 22, "Seru buat grup besar"),
  P("p9", "Margo Food Street", "Makan", "Depok", 40000, 11, 22, "Banyak pilihan tenant"),
  P("p10", "Dago Bakery Terrace", "Kopi", "Bandung", 50000, 7, 18, "View kota"),
  P("p11", "Board Game Café Meeple", "Hiburan", "Jakarta Selatan", 60000, 11, 23, "200+ board game"),
  P("p12", "GBK Jogging Track", "Outdoor", "Jakarta Pusat", 0, 5, 18, "Lanjut sarapan bareng"),
  P("p13", "Bioskop Plaza Senayan", "Hiburan", "Jakarta Pusat", 55000, 10, 24, "Nonton + makan"),
  P("p14", "Mie Pedas BSD", "Makan", "Tangerang Selatan", 25000, 10, 22, "Super hemat"),
  P("p15", "Kedai Kopi Kemang", "Kopi", "Jakarta Selatan", 38000, 7, 22, "Outdoor seating"),
  P("p16", "Bakso Kota Barat", "Makan", "Jakarta Barat", 28000, 10, 21, "Porsi besar"),
];

export const isOpen = (p: Place, slot: string) => {
  const s = SLOTS[slot];
  return !!s && p.open <= s[0] && p.close >= s[1];
};

/**
 * Recommendations:
 * - price ≤ lowest member budget
 * - area must be one of the members' nearest areas
 * - place open during a time slot (shared by all members if possible)
 * Returns up to 5, best match first.
 */
export function recommend(members: Member[], places: Place[] = getPlaces()): Rec[] {
  if (!members.length) return [];
  const minBudget = Math.min(...members.map((m) => m.budget));
  const areas = new Set(members.map((m) => m.area));
  const shared = TIMES.filter((t) => members.every((m) => m.times.includes(t)));
  const slots = shared.length ? shared : TIMES.filter((t) => members.some((m) => m.times.includes(t)));
  const out: Rec[] = [];
  for (const p of places) {
    if (p.price > minBudget || !areas.has(p.area)) continue;
    const time = slots.find((t) => isOpen(p, t));
    if (!time) continue;
    const areaMatch = members.filter((m) => m.area === p.area).length;
    const catMatch = members.filter((m) => m.cats.includes(p.cat)).length;
    const timeMatch = members.filter((m) => m.times.includes(time)).length;
    out.push({ ...p, time, areaMatch, catMatch, score: areaMatch * 3 + catMatch * 2 + timeMatch });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function tally(votes: Record<string, string>) {
  const t: Record<string, number> = {};
  Object.values(votes).forEach((v) => (t[v] = (t[v] ?? 0) + 1));
  return t;
}

/* ---------- voting rules ---------- */
/** Voting is open when started, not locked, and the deadline (if any) hasn't passed. */
export function votingOpen(room: Pick<Room, "votingStartedAt" | "votingEndsAt" | "decided">, now = Date.now()) {
  return !!room.votingStartedAt && !room.decided && (!room.votingEndsAt || now < room.votingEndsAt);
}
/** Place ids with the highest vote count. Length > 1 means a tie the owner must break. */
export function topVoted(votes: Record<string, string>): string[] {
  const t = tally(votes);
  const max = Math.max(0, ...Object.values(t));
  return max === 0 ? [] : Object.keys(t).filter((id) => t[id] === max);
}
/** Voting time-limit options in minutes; null = no limit. */
export const VOTE_LIMITS: { label: string; minutes: number | null }[] = [
  { label: "15 menit", minutes: 15 },
  { label: "1 jam", minutes: 60 },
  { label: "24 jam", minutes: 24 * 60 },
  { label: "Tanpa batas", minutes: null },
];

export const rupiah = (n: number) => (n === 0 ? "Gratis" : "Rp" + n.toLocaleString("id-ID"));
export const uid = () => Math.random().toString(36).slice(2, 8);
export const fmtDate = (iso: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "") : "";

/* ---------- rooms: stored online (Lovable Cloud), synced across devices ---------- */
type RoomRow = {
  id: string; title: string; date: string; members: unknown; votes: unknown; decided: string | null;
  voting_started_at: string | null; voting_ends_at: string | null; created_at: string;
};

function fromRow(r: RoomRow): Room {
  const members = (r.members as (Member & { time?: string })[]).map((m) => ({
    ...m, times: m.times ?? (m.time ? [m.time] : []),
  }));
  return {
    id: r.id, title: r.title, date: r.date, members,
    votes: (r.votes as Record<string, string>) ?? {},
    decided: r.decided ?? undefined,
    votingStartedAt: r.voting_started_at ? Date.parse(r.voting_started_at) : undefined,
    votingEndsAt: r.voting_ends_at ? Date.parse(r.voting_ends_at) : null,
    createdAt: Date.parse(r.created_at),
  };
}

/** Create a room online. Returns the owner token — kept on the creator's device only. */
export async function createRoom(title: string, date: string): Promise<{ id: string; ownerToken: string }> {
  const id = uid();
  const ownerToken = uid() + uid();
  const { error } = await supabase.rpc("create_room", { _id: id, _title: title, _date: date, _owner_token: ownerToken });
  if (error) throw error;
  localStorage.setItem(ownerKey(id), ownerToken);
  return { id, ownerToken };
}

const ownerKey = (id: string) => `kemana-owner-${id}`;
/** Owner token for this device, if this device created the room. */
export const getOwnerToken = (id: string) => (typeof window === "undefined" ? null : localStorage.getItem(ownerKey(id)));

export async function loadRoom(id: string): Promise<Room | null> {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as RoomRow) : null;
}

/** Save member/vote changes. Owner-gated fields go through the RPCs below. */
export async function saveRoom(r: Room) {
  const { error } = await supabase.from("rooms").update({ members: r.members, votes: r.votes }).eq("id", r.id);
  if (error) throw error;
}

export async function startVoting(id: string, ownerToken: string, endsAt: number | null) {
  const { error } = await supabase.rpc("start_voting", {
    _room_id: id, _owner_token: ownerToken,
    _ends_at: (endsAt === null ? null : new Date(endsAt).toISOString()) as string,
  });
  if (error) throw error;
}
export async function lockDecision(id: string, ownerToken: string, placeId: string) {
  const { error } = await supabase.rpc("lock_decision", { _room_id: id, _owner_token: ownerToken, _place_id: placeId });
  if (error) throw error;
}
export async function reopenDecision(id: string, ownerToken: string) {
  const { error } = await supabase.rpc("reopen_decision", { _room_id: id, _owner_token: ownerToken });
  if (error) throw error;
}

export async function allRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RoomRow[]).map(fromRow);
}

/* ---------- places + CSV import (per-device override) ---------- */
export function getPlaces(): Place[] {
  if (typeof window === "undefined") return SAMPLE_PLACES;
  const raw = localStorage.getItem("kemana-places");
  return raw ? (JSON.parse(raw) as Place[]) : SAMPLE_PLACES;
}
export function savePlaces(p: Place[] | null) {
  if (p) localStorage.setItem("kemana-places", JSON.stringify(p));
  else localStorage.removeItem("kemana-places");
}
export const CSV_HEADER = "nama,kategori,area,harga_per_orang,jam_buka,jam_tutup,catatan,google_maps";
function splitCsv(line: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const hour = (s: string) => { const [h, m] = s.split(":").map(Number); return (h ?? 0) + (m ?? 0) / 60 || (s === "24:00" ? 24 : 0); };
export function parsePlacesCsv(text: string): { places: Place[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = []; const places: Place[] = [];
  lines.slice(1).forEach((l, i) => {
    const [name, cat, area, price, open, close, note, link] = splitCsv(l);
    if (!name || !cat || !area || price === undefined || !open || !close) { errors.push(`Baris ${i + 2}: kolom wajib kosong`); return; }
    let c = hour(close); const o = hour(open);
    if (c <= o) c += 24; // closes after midnight
    places.push({ id: `c${i}`, name, cat, area, price: Number(price) || 0, open: o, close: c, note: note ?? "", maps: link || maps(`${name} ${area}`), emoji: EMOJI[cat] ?? "📍" });
  });
  return { places, errors };
}

/* ---------- metrics (online) ---------- */
export type EventName = "room_created" | "preference_saved" | "recommendations_viewed" | "vote_cast" | "decision_locked";
export type KEvent = { name: EventName; room: string; at: number };
export function track(name: EventName, room: string) {
  void supabase.from("events").insert({ name, room }).then(() => undefined);
}
export async function getEvents(): Promise<KEvent[]> {
  const { data, error } = await supabase.from("events").select("name, room, at").order("at", { ascending: true });
  if (error) throw error;
  return (data as { name: EventName; room: string; at: string }[]).map((e) => ({ ...e, at: Date.parse(e.at) }));
}
