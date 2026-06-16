"use client";

import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  levelOptions,
  type UserProfile
} from "@/lib/coachEngine";

const initialProfile: UserProfile = {
  firstName: "",
  goal: "forme générale",
  customGoal: "",
  level: "intermédiaire",
  sessionsPerWeek: "",
  equipment: "",
  customEquipment: "",
  recurringConstraints: ""
};

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    level: profile.level.toLowerCase(),
    equipment: profile.equipment
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  useEffect(() => {
    const saved = window.localStorage.getItem("auto-coach-profile");
    if (saved) {
      setProfile(normalizeProfile({ ...initialProfile, ...JSON.parse(saved) }));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-profile", JSON.stringify(profile));
  }, [profile]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Profil sportif</h1>
        </div>
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
          <ArrowLeft className="h-5 w-5 text-moss" />
        </Link>
      </header>

      <section className="rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-moss">Sauvegarde locale</p>
            <h2 className="text-lg font-medium text-night">Tes repères</h2>
          </div>
          <UserRound className="h-5 w-5 text-ember" />
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Prénom</span>
            <input
              value={profile.firstName}
              onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Ex: Alex"
              className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Objectif sportif principal</span>
            <textarea
              value={profile.goal}
              onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value }))}
              placeholder="Ex: préparer un trail, reprendre doucement, courir 10 km, perdre du poids..."
              className="min-h-24 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Niveau</span>
            <select
              value={profile.level}
              onChange={(event) => setProfile((current) => ({ ...current, level: event.target.value }))}
              className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
            >
              {levelOptions.map((level) => (
                <option className="bg-ink-950 text-night" key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Matériel disponible</span>
            <textarea
              value={profile.equipment}
              onChange={(event) => setProfile((current) => ({ ...current, equipment: event.target.value }))}
              placeholder="Ex: aucun matériel, tapis, haltères, élastiques, salle, vélo, piscine..."
              className="min-h-24 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Contrainte globale à respecter pour tous les programmes</span>
            <textarea
              value={profile.recurringConstraints}
              onChange={(event) => setProfile((current) => ({ ...current, recurringConstraints: event.target.value }))}
              placeholder="Ex: genou fragile, éviter les impacts, pas de bruit le soir, toujours garder un jour de repos après une sortie longue..."
              className="min-h-28 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/72">
            Sauvegarde automatique sur cet appareil. Reviens à l’accueil pour générer un programme adapté.
          </p>
        </div>
      </section>
    </main>
  );
}

