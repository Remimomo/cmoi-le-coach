"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, UsersRound } from "lucide-react";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";
import { collectiveChallengeIdeas, qvtPillars } from "@/lib/coachEngine";

const benefits = [
  "favorise l'activité physique au quotidien",
  "réduit les effets de la sédentarité",
  "aide les collaborateurs à mieux gérer leur charge mentale",
  "renforce la cohésion d'équipe",
  "ne nécessite pas de salle de sport"
];

export default function EnterprisePage() {
  return (
    <AuthGate>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Entreprise</h1>
          </div>
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
            <ArrowLeft className="h-5 w-5 text-moss" />
          </Link>
        </header>

        <AccountStatus />

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss/20 text-moss">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-moss">QVT active</p>
              <h2 className="text-xl font-medium text-night">Pourquoi Auto Coach aide les entreprises</h2>
            </div>
          </div>
          <div className="space-y-3">
            {benefits.map((benefit) => (
              <p key={benefit} className="flex gap-2 text-sm leading-6 text-mist/80">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                <span>{benefit}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/75 p-5 shadow-soft">
          <p className="mb-3 text-sm font-medium text-night">Les piliers intégrés dans l&apos;IA</p>
          <div className="space-y-3">
            {qvtPillars.map((pillar) => (
              <article key={pillar.title} className="rounded-2xl bg-white/70 p-4">
                <h3 className="font-medium text-night">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mist/75">{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-moss/25 bg-moss/10 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <UsersRound className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-medium text-night">Défis collectifs à venir</h2>
          </div>
          <div className="space-y-3">
            {collectiveChallengeIdeas.map((challenge) => (
              <article key={challenge.title} className="rounded-2xl bg-white/65 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ember">{challenge.metric}</p>
                <h3 className="mt-1 font-medium text-night">{challenge.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mist/75">{challenge.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-mist/60">
            Les classements seront pensés pour encourager la participation, la régularité et la diversité, jamais la performance brute.
          </p>
        </section>
      </main>
    </AuthGate>
  );
}
