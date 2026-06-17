"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type AuthUser = {
  email?: string;
};

export function AccountStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        setIsConfigured(Boolean(data.configured));
        setEmail((data.user as AuthUser | null)?.email ?? null);
      })
      .catch(() => {
        setIsConfigured(false);
        setEmail(null);
      });
  }, []);

  return (
    <Link href="/compte" className="mb-4 flex items-center gap-3 rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm shadow-soft">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-moss/20 text-moss">
        <UserRound className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-night">{email ? "Compte connecté" : "Compte non connecté"}</span>
        <span className="block truncate text-xs text-mist/70">
          {email ?? (isConfigured ? "Connecte-toi pour préparer la synchronisation." : "Configuration compte en attente.")}
        </span>
      </span>
    </Link>
  );
}
