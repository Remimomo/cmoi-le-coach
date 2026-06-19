"use client";

import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type AuthUser = {
  email: string;
};

export function AccountStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setEmail((data.user as AuthUser | null)?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/compte";
  }

  if (!email) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-night/10 bg-white/55 px-3 py-2 text-xs shadow-soft">
      <span className="flex min-w-0 items-center gap-2 text-mist/70">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-moss/15 text-moss">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="truncate">Connecté : {email}</span>
      </span>
      <button onClick={logout} className="shrink-0 rounded-full border border-night/10 bg-white/70 px-3 py-1.5 font-medium text-night">
        <span className="inline-flex items-center gap-1">
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </span>
      </button>
    </div>
  );
}
