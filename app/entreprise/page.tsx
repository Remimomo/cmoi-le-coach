"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, LockKeyhole, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

type ChallengeDashboard = {
  member: null | {
    companyId: string;
    companyName: string;
    role: "employee" | "admin";
  };
  month: string;
  personalScore: number;
  collectiveScore: number;
  monthlyGoal: number;
  activeParticipants: number;
  participationIndex: number;
  message: string;
};

const privacyText =
  "Tes données personnelles restent privées. Ton employeur ne voit pas tes séances, tes données sportives, tes échanges avec l’IA ni tes informations personnelles. Seuls des indicateurs collectifs anonymisés sont utilisés.";

export default function EnterprisePage() {
  const [dashboard, setDashboard] = useState<ChallengeDashboard | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualType, setManualType] = useState("séance libre");
  const [message, setMessage] = useState("Chargement du challenge...");
  const [isBusy, setIsBusy] = useState(false);

  const progress = useMemo(() => {
    if (!dashboard?.monthlyGoal) return 0;
    return Math.min(100, Math.round((dashboard.collectiveScore / dashboard.monthlyGoal) * 100));
  }, [dashboard]);

  function loadDashboard() {
    fetch("/api/enterprise/dashboard")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok) {
          setDashboard(result.dashboard);
          setMessage(result.dashboard?.member ? "Challenge collectif prêt." : "Entre ton code entreprise pour rejoindre ton collectif.");
          return;
        }
        setMessage(result.error ?? "Challenge indisponible.");
      })
      .catch(() => setMessage("Challenge indisponible pour le moment."));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function joinCompany() {
    setIsBusy(true);
    setMessage("Vérification du code entreprise...");
    try {
      const response = await fetch("/api/enterprise/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Code entreprise invalide.");
        return;
      }
      loadDashboard();
    } finally {
      setIsBusy(false);
    }
  }

  async function leaveCompany() {
    setIsBusy(true);
    await fetch("/api/enterprise/leave", { method: "POST" });
    setDashboard(null);
    setInviteCode("");
    loadDashboard();
    setIsBusy(false);
  }

  async function syncStravaPoints() {
    setIsBusy(true);
    setMessage("Synchronisation des séances Strava vérifiées...");
    try {
      const response = await fetch("/api/enterprise/sync-strava", { method: "POST" });
      const result = await response.json();
      setMessage(result.ok ? "Points Strava mis à jour." : result.error ?? "Synchronisation impossible.");
      loadDashboard();
    } finally {
      setIsBusy(false);
    }
  }

  async function declareManualSession() {
    setIsBusy(true);
    setMessage("Ajout de ta déclaration manuelle...");
    try {
      const response = await fetch("/api/enterprise/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: manualType,
          minutes: manualMinutes,
          activityDate: new Date().toISOString()
        })
      });
      const result = await response.json();
      setMessage(result.ok ? "Déclaration ajoutée avec points réduits." : result.error ?? "Déclaration impossible.");
      loadDashboard();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthGate>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Challenge collectif</h1>
          </div>
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
            <ArrowLeft className="h-5 w-5 text-moss" />
          </Link>
        </header>

        <AccountStatus />

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss/20 text-moss">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-moss">Challenge collectif</p>
              <h2 className="text-xl font-medium text-night">
                {dashboard?.member ? dashboard.member.companyName : "Rejoindre mon entreprise"}
              </h2>
            </div>
          </div>

          <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/80">{message}</p>

          {!dashboard?.member ? (
            <div className="mt-4 space-y-3">
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="Code entreprise"
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
              />
              <button disabled={isBusy || !inviteCode.trim()} onClick={joinCompany} className="w-full rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
                Rejoindre le challenge
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-moss/10 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.personalScore}</p>
                  <p className="mt-1 text-xs leading-4 text-mist/65">mes points du mois</p>
                </div>
                <div className="rounded-2xl bg-ember/10 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.collectiveScore}</p>
                  <p className="mt-1 text-xs leading-4 text-mist/65">score collectif</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <div className="mb-2 flex justify-between text-xs text-mist/65">
                  <span>Objectif collectif</span>
                  <span>{dashboard.monthlyGoal} pts</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-night/10">
                  <div className="h-full rounded-full bg-moss" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-mist/80">
                  Tu as déjà apporté {dashboard.personalScore} points au collectif ce mois-ci. Chaque séance compte, même courte.
                </p>
              </div>
              <p className="rounded-2xl bg-ink-850 px-4 py-3 text-sm leading-6 text-mist/80">
                {dashboard.message}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button disabled={isBusy} onClick={syncStravaPoints} className="rounded-2xl bg-moss px-4 py-3 text-sm font-semibold text-night disabled:opacity-50">
                  Points Strava
                </button>
                <button disabled={isBusy} onClick={leaveCompany} className="rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm font-semibold text-night disabled:opacity-50">
                  Quitter
                </button>
              </div>
              {dashboard.member.role === "admin" && (
                <Link href="/entreprise/admin" className="block rounded-2xl border border-ember/25 bg-ember/10 px-4 py-3 text-center text-sm font-semibold text-ember">
                  Espace admin entreprise
                </Link>
              )}
            </div>
          )}
        </section>

        {dashboard?.member && (
          <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-ember" />
              <h2 className="text-lg font-medium text-night">Déclarer une séance non Strava</h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-mist/75">
              Les séances déclarées manuellement donnent des points réduits et sont limitées chaque semaine.
            </p>
            <div className="space-y-3">
              <input
                value={manualType}
                onChange={(event) => setManualType(event.target.value)}
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
              />
              <input
                type="number"
                min="10"
                max="180"
                value={manualMinutes}
                onChange={(event) => setManualMinutes(Number(event.target.value))}
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
              />
              <button disabled={isBusy} onClick={declareManualSession} className="w-full rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
                Ajouter avec points réduits
              </button>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-moss/25 bg-moss/10 p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-medium text-night">Confidentialité</h2>
          </div>
          <p className="text-sm leading-6 text-mist/80">{privacyText}</p>
          <div className="mt-4 space-y-2 text-sm leading-6 text-mist/75">
            <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-moss" />Pas de classement individuel public.</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-moss" />Les points servent à encourager le collectif, pas à évaluer quelqu’un.</p>
            <p className="flex gap-2"><Building2 className="mt-1 h-4 w-4 shrink-0 text-moss" />L’entreprise voit uniquement des indicateurs collectifs anonymisés.</p>
          </div>
        </section>
      </main>
    </AuthGate>
  );
}

