import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AccountControl } from "@/components/account-control";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Tautan persetujuan tidak lengkap. Mulai koneksi lagi dari aplikasi agen.");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr + location.hash } });
    return { accountEmail: data.user.email ?? "" };
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!authorizationId) throw new Error("Tautan persetujuan tidak lengkap.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error("Permintaan koneksi tidak tersedia atau kedaluwarsa. Mulai koneksi lagi dari aplikasi agen.");
    if (data && "redirect_url" in data && data.redirect_url) throw redirect({ href: data.redirect_url });
    return data;
  },
  head: () => pageMeta("Persetujuan koneksi agen — KemanaAja", "Tinjau dan setujui akses agen ke alat perencanaan KemanaAja."),
  pendingComponent: () => <main className="min-h-screen bg-background p-10 text-center">Memuat permintaan koneksi…</main>,
  errorComponent: ({ error }) => <main className="min-h-screen bg-background px-5 py-16"><div className="mx-auto max-w-md"><h1 className="font-display text-2xl font-bold">Koneksi belum dapat dilanjutkan</h1><p role="alert" className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "Permintaan koneksi tidak tersedia. Coba lagi."}</p><Link className="mt-6 inline-block underline" to="/">Kembali ke KemanaAja</Link></div></main>,
  component: Consent,
});

function Consent() {
  const details = Route.useLoaderData();
  const { accountEmail } = Route.useRouteContext();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!details || !("client" in details)) return <main className="p-10">Permintaan koneksi tidak tersedia.</main>;
  const clientName = details.client.name;
  const scopes = details.scope.split(" ").filter(Boolean);
  const labels: Record<string, string> = { openid: "Identitas akun", email: "Alamat email", profile: "Profil dasar" };
  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const result = approve ? await supabase.auth.oauth.approveAuthorization(authorization_id) : await supabase.auth.oauth.denyAuthorization(authorization_id);
      if (result.error || !result.data?.redirect_url) throw new Error("Gagal");
      window.location.assign(result.data.redirect_url);
    } catch { setError(approve ? "Persetujuan belum tersimpan. Coba lagi." : "Pembatalan belum berhasil. Coba lagi."); setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-5 py-10"><div className="mx-auto max-w-lg">
    <Link to="/" className="font-display text-2xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
    <h1 className="mt-8 break-words font-display text-3xl font-bold">Hubungkan {clientName} ke KemanaAja</h1>
    <p className="mt-4 text-muted-foreground">{clientName} dapat menggunakan alat KemanaAja atas nama kamu.</p>
    <div className="mt-6 border-y border-border py-4"><p className="text-sm font-semibold">Akun: {accountEmail}</p><AccountControl /></div>
    <p className="mt-5 break-all text-sm text-muted-foreground">Tujuan koneksi: {details.redirect_uri}</p>
    <ul className="mt-5 space-y-2 text-sm">{scopes.map(scope => <li key={scope}>✓ {labels[scope] ?? `Izin tambahan: ${scope}`}</li>)}<li>✓ Melihat data tempat contoh</li><li>✓ Mencari rekomendasi dari preferensi yang kamu berikan</li></ul>
    <p className="mt-5 text-sm text-muted-foreground">Koneksi ini tidak memberi akses ke budget anggota, rencana tersimpan, suara, atau tombol khusus pembuat rencana. Izin aplikasi tetap berlaku.</p>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-7 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>Setujui koneksi</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Batalkan koneksi</Button></div>
  </div></main>;
}