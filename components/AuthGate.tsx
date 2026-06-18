"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type AuthUser = {
  id: string;
  email?: string;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        const user = data.user as AuthUser | null;
        if (user?.id) {
          setIsAllowed(true);
          return;
        }

        window.location.replace("/compte");
      })
      .catch(() => window.location.replace("/compte"));
  }, []);

  if (!isAllowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4">
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-mist shadow-soft">Vérification du compte...</p>
      </main>
    );
  }

  return <>{children}</>;
}
