import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, type AuthUser } from "@/lib/supabase";

type AuthContextValue = { user: AuthUser | null; loading: boolean };
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const current = await getCurrentUser().catch(() => null);
      if (active) { setUser(current); setLoading(false); }
    };
    void refresh();
    const onAuthChange = () => { void refresh(); };
    window.addEventListener("berserk-auth-change", onAuthChange);
    return () => { active = false; window.removeEventListener("berserk-auth-change", onAuthChange); };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
