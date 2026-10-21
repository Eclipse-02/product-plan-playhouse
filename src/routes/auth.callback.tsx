import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? oauthReturnPath(s.next) : undefined }),
  head: () => pageMeta("Menyelesaikan masuk — KemanaAja", "Kembali ke persetujuan koneksi KemanaAja setelah masuk."),
  component: Callback,
});
function Callback() {
  const { next } = Route.useSearch();
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const finish = async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (!data.user) { setError(true); return; }
      const target = next ?? oauthReturnPath(sessionStorage.getItem("kemana-oauth-next"));
      sessionStorage.removeItem("kemana-oauth-next");
      window.location.replace(target);
    };
    void finish();
    return () => { alive = false; };
  }, [next]);
  return <main className="min-h-screen bg-background px-5 py-16 text-center">
    <h1 className="font-display text-2xl font-bold">{error ? "Masuk belum selesai" : "Menyelesaikan masuk…"}</h1>
    {error && <Link className="mt-4 inline-block underline" to="/login" search={{ next: next ?? "/" }}>Coba masuk lagi</Link>}
  </main>;
}