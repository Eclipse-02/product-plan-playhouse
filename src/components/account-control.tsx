import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const AccountContext = createContext<User | null>(null);
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
}

export function AccountControl() {
  const user = useAccount();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { setError("Belum bisa keluar. Coba lagi."); setBusy(false); return; }
    await router.navigate({ to: "/login", search: { next: "/" }, replace: true });
    setBusy(false);
  }
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    {user ? <><span className="max-w-48 truncate" title={user.email}>{user.email}</span><Button variant="outline" size="sm" disabled={busy} onClick={signOut}>Keluar</Button></> :
      <Button variant="link" size="sm" asChild><Link to="/login" search={{ next: "/" }}>Masuk</Link></Button>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}