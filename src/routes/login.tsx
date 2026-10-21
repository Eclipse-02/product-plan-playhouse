import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s['next']) }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ href: search.next });
  },
  head: () => pageMeta("Masuk — KemanaAja", "Masuk atau buat akun KemanaAja untuk menyetujui koneksi agen."),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL(next, window.location.origin).href } });
        if (error) throw error;
        if (!data.session) { setMessage("Periksa email untuk konfirmasi akun. Tautan akan membawa kamu kembali ke persetujuan koneksi."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await router.navigate({ href: next });
    } catch { setError("Belum bisa masuk atau mendaftar. Periksa email dan kata sandi, lalu coba lagi."); }
    finally { setBusy(false); }
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true); setError("");
    try {
      sessionStorage.setItem("kemana-oauth-next", next);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: callback.href });
      if (result.error) throw result.error;
      if (result.redirected) return;
      sessionStorage.removeItem("kemana-oauth-next");
      await router.navigate({ href: next });
    } catch { setError("Masuk dengan akun ini belum berhasil. Coba lagi."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-5 py-10">
    <div className="mx-auto max-w-md">
      <Link to="/" className="font-display text-2xl font-bold">Kemana<span className="text-primary">Aja</span></Link>
      <h1 className="mt-8 font-display text-3xl font-bold">{signup ? "Buat akun" : "Masuk"}</h1>
      <div className="mt-6 space-y-3">
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => social("google")}>Lanjutkan dengan Google</Button>
        <Button className="lovable-auth-button w-full" disabled={busy} onClick={() => social("lovable")}>Continue with Lovable</Button>
      </div>
      <form className="mt-6 space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label className="block text-sm font-semibold">Email<input className="kz-input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Kata sandi<input className="kz-input" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <Button className="w-full" type="submit" disabled={busy}>{busy ? "Memproses…" : signup ? "Daftar" : "Masuk"}</Button>
      </form>
      <Button className="mt-3" variant="link" disabled={busy} onClick={() => { setSignup(!signup); setError(""); setMessage(""); }}>{signup ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</Button>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    </div>
  </main>;
}