"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, FileText, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

type AdminDashboard = {
  companyName: string;
  month: string;
  activeParticipants: number;
  totalMembers: number;
  monthlyScore: number;
  previousMonthScore: number;
  participationRate: number;
  participationIndex: number;
  ranking: { companyName: string; participationIndex: number; rank: number }[];
  latestReport?: {
    month: string;
    content: string;
    createdAt: string;
  } | null;
};

export default function EnterpriseAdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [message, setMessage] = useState("Chargement de l’espace admin...");
  const [isGenerating, setIsGenerating] = useState(false);

  const progression = useMemo(() => {
    if (!dashboard) return 0;
    if (dashboard.previousMonthScore === 0) return dashboard.monthlyScore > 0 ? 100 : 0;
    return Math.round(((dashboard.monthlyScore - dashboard.previousMonthScore) / dashboard.previousMonthScore) * 100);
  }, [dashboard]);

  function loadAdmin() {
    fetch("/api/enterprise/admin")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok) {
          setDashboard(result.adminDashboard);
          setMessage("Indicateurs collectifs chargés.");
          return;
        }
        setMessage(result.error ?? "Accès admin impossible.");
      })
      .catch(() => setMessage("Accès admin impossible."));
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  async function generateReport() {
    setIsGenerating(true);
    const response = await fetch("/api/enterprise/report", { method: "POST" });
    const result = await response.json();
    setMessage(result.ok ? "Rapport mensuel généré." : result.error ?? "Rapport impossible.");
    loadAdmin();
    setIsGenerating(false);
  }

  return (
    <AuthGate>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Admin entreprise</h1>
          </div>
          <Link href="/entreprise" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
            <ArrowLeft className="h-5 w-5 text-moss" />
          </Link>
        </header>

        <AccountStatus />

        <p className="mb-4 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-mist/80 shadow-soft">{message}</p>

        {dashboard && (
          <>
            <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-moss" />
                <div>
                  <p className="text-sm text-moss">{dashboard.companyName}</p>
                  <h2 className="text-lg font-medium text-night">Indicateurs collectifs</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-moss/10 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.activeParticipants}</p>
                  <p className="mt-1 text-xs text-mist/65">participants actifs</p>
                </div>
                <div className="rounded-2xl bg-ember/10 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.monthlyScore}</p>
                  <p className="mt-1 text-xs text-mist/65">score mensuel</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.participationRate}%</p>
                  <p className="mt-1 text-xs text-mist/65">taux participation</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-2xl font-semibold text-night">{dashboard.participationIndex}</p>
                  <p className="mt-1 text-xs text-mist/65">indice collectif</p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-ink-850 px-4 py-3 text-sm leading-6 text-mist/80">
                Progression vs mois précédent : {progression >= 0 ? "+" : ""}{progression}%.
              </p>
            </section>

            <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-ember" />
                <h2 className="text-lg font-medium text-night">Classement inter-entreprises</h2>
              </div>
              <div className="space-y-2">
                {dashboard.ranking.map((company) => (
                  <div key={company.rank} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm">
                    <span className="font-medium text-night">#{company.rank} {company.companyName}</span>
                    <span className="text-mist/70">{company.participationIndex}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-medium text-night">Rapport mensuel</h2>
              </div>
              <button disabled={isGenerating} onClick={generateReport} className="mb-4 w-full rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
                {isGenerating ? "Génération..." : "Générer le rapport"}
              </button>
              <p className="whitespace-pre-line rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/80">
                {dashboard.latestReport?.content ?? "Aucun rapport généré pour le moment."}
              </p>
            </section>

            <section className="rounded-[28px] border border-moss/25 bg-moss/10 p-5 shadow-soft">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-medium text-night">Données protégées</h2>
              </div>
              <p className="text-sm leading-6 text-mist/80">
                Cette page n’affiche jamais les séances individuelles, les scores nominatifs, les données personnelles, les échanges IA ni le détail Strava.
              </p>
            </section>
          </>
        )}
      </main>
    </AuthGate>
  );
}

