"use client";

import Brand from "./Brand";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AuthGuardProps = {
  children: React.ReactNode;
  requiredRole?: string;
};

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const validateSession = (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    ) => {
      if (!session) {
        router.replace("/");
        return;
      }

      const role = session.user.user_metadata?.role;

      if (requiredRole && role !== requiredRole) {
        router.replace("/patient");
        return;
      }

      setIsAuthenticated(true);
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      validateSession(session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        validateSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, requiredRole]);

  if (isAuthenticated === null) {
    return (
      <div className="session-loading" role="status"><Brand /><div className="loading-line" aria-hidden="true" /><p>Opening your workspace…</p></div>
    );
  }

  return <>{children}</>;
}
