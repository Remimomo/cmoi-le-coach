"use client";

import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getAge,
  getCycleContext,
  levelOptions,
  type UserProfile
} from "@/lib/coachEngine";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

const initialProfile: UserProfile = {
  firstName: "",
  birthDate: "",
  sex: "préfère ne pas répondre",
  cycleLastPeriodStart: "",
  cycleAverageLength: "28",
  cyclePeriodLength: "5",
  goal: "forme générale",
  customGoal: "",
  level: "intermédiaire",
  favoriteSports: "",
  sessionsPerWeek: "",
  equipment: "",
  customEquipment: "",
  recurringConstraints: ""
};

const sexOptions = ["homme", "femme", "préfère ne pas répondre"];

function normalizeLevel(level: string) {
  const cleanLevel = level.toLowerCase().trim();
  if (cleanLevel.includes("interm")) return "intermédiaire";
  if (cleanLevel.includes("confirm")) return "confirmé";
  if (cleanLevel.includes("butant")) return "débutant";
  if (cleanLevel.includes("reprise")) return "reprise";
  return "intermédiaire";
}

function normalizeSex(sex: string) {
  const cleanSex = sex.toLowerCase().trim();
  if (cleanSex === "homme") return "homme";
  if (cleanSex === "femme") return "femme";
  return "préfère ne pas répondre";
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    level: normalizeLevel(profile.level),
    sex: normalizeSex(profile.sex),
    cycleAverageLength: profile.cycleAverageLength || "28",
    cyclePeriodLength: profile.cyclePeriodLength || "5",
    equipment: profile.equipment
  };
}

function hasProfileValue(profile: Partial<UserProfile>) {
  return Object.values(profile).some((value) => typeof value === "string" && value.trim().length > 0);
}

function mergeProfileWithoutEmpty(current: UserProfile, incoming: Partial<UserProfile>): UserProfile {
  const merged = { ...current };

  Object.entries(incoming).forEach(([key, value]) => {
    if (typeof value !== "string" || value.trim().length === 0) return;
    merged[key as keyof UserProfile] = value;
  });

  return merged;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [hasCheckedCloudProfile, setHasCheckedCloudProfile] = useState(false);
  const [hasEditedProfile, setHasEditedProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Sauvegarde locale active.");
  const hasEditedProfileRef = useRef(false);
  const age = getAge(profile);
  const cycle = getCycleContext(profile);

  function updateProfile(field: keyof UserProfile, value: string) {
    setHasEditedProfile(true);
    hasEditedProfileRef.current = true;
    setProfile((current) => {
      const nextProfile = normalizeProfile({ ...current, [field]: value });
      window.localStorage.setItem("auto-coach-profile", JSON.stringify(nextProfile));

      if (hasCheckedCloudProfile) {
        fetch("/api/user-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: nextProfile })
        })
          .then((response) => {
            if (response.ok) {
              setHasEditedProfile(false);
              hasEditedProfileRef.current = false;
              setSyncStatus("Profil sauvegardé sur ton compte.");
            }
          })
          .catch(() => setSyncStatus("Sauvegarde locale active. La synchronisation reprendra plus tard."));
      }

      return nextProfile;
    });
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("auto-coach-profile");
    if (saved) {
      setProfile(normalizeProfile({ ...initialProfile, ...JSON.parse(saved) }));
    }
    setHasLoadedProfile(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedProfile) return;

    fetch("/api/user-data")
      .then((response) => response.json())
      .then((result) => {
        if (hasEditedProfileRef.current) return;
        if (result.ok && result.data.profile && hasProfileValue(result.data.profile)) {
          const cloudProfile = normalizeProfile(mergeProfileWithoutEmpty(initialProfile, result.data.profile));
          setProfile(cloudProfile);
          window.localStorage.setItem("auto-coach-profile", JSON.stringify(cloudProfile));
          setHasEditedProfile(false);
          hasEditedProfileRef.current = false;
          setSyncStatus("Profil synchronisé avec ton compte.");
        } else {
          setSyncStatus("Profil prêt à être sauvegardé sur ton compte.");
        }
      })
      .catch(() => setSyncStatus("Mode local actif. Connecte-toi pour synchroniser."))
      .finally(() => setHasCheckedCloudProfile(true));
  }, [hasLoadedProfile]);

  useEffect(() => {
    if (!hasLoadedProfile) return;
    window.localStorage.setItem("auto-coach-profile", JSON.stringify(profile));
  }, [hasLoadedProfile, profile]);

  useEffect(() => {
    if (!hasLoadedProfile || !hasCheckedCloudProfile || !hasEditedProfile) return;

    const timeout = window.setTimeout(() => {
      fetch("/api/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      })
        .then((response) => {
          if (response.ok) {
            setHasEditedProfile(false);
            hasEditedProfileRef.current = false;
            setSyncStatus("Profil sauvegardé sur ton compte.");
          }
        })
        .catch(() => undefined);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedProfile, hasCheckedCloudProfile, hasEditedProfile, profile]);

  return (
    <AuthGate>
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

        <AccountStatus />

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
                onChange={(event) => updateProfile("firstName", event.target.value)}
                placeholder="Ex: Alex"
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Date de naissance</span>
              <input
                type="date"
                value={profile.birthDate}
                onChange={(event) => updateProfile("birthDate", event.target.value)}
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
              />
              <p className="mt-2 text-xs leading-5 text-mist/55">
                {age !== null ? `Age calculé automatiquement : ${age} ans.` : "L'âge servira à doser progressivement les recommandations futures."}
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Sexe</span>
              <select
                value={profile.sex}
                onChange={(event) => updateProfile("sex", event.target.value)}
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
              >
                {sexOptions.map((sex) => (
                  <option className="bg-ink-950 text-night" key={sex} value={sex}>{sex}</option>
                ))}
              </select>
            </label>

            {profile.sex === "femme" && (
              <section className="rounded-[24px] border border-moss/20 bg-moss/10 p-4">
                <h3 className="text-sm font-medium text-night">Suivi du cycle menstruel</h3>
                <p className="mt-2 text-xs leading-5 text-mist/65">
                  Facultatif. L&apos;application ne fait aucun diagnostic médical : ces informations servent seulement à adapter doucement les séances à tes sensations.
                </p>

                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-mist/70">Premier jour des dernières règles</span>
                    <input
                      type="date"
                      value={profile.cycleLastPeriodStart}
                      onChange={(event) => updateProfile("cycleLastPeriodStart", event.target.value)}
                      className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-mist/70">Durée moyenne du cycle</span>
                    <input
                      type="number"
                      min="21"
                      max="45"
                      value={profile.cycleAverageLength}
                      onChange={(event) => updateProfile("cycleAverageLength", event.target.value)}
                      placeholder="28"
                      className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-mist/70">Durée moyenne des règles</span>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={profile.cyclePeriodLength}
                      onChange={(event) => updateProfile("cyclePeriodLength", event.target.value)}
                      placeholder="5"
                      className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
                    />
                  </label>

                  {cycle && (
                    <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs leading-5 text-mist/70">
                      Estimation actuelle : jour {cycle.cycleDay}, phase {cycle.phase}. Le programme reste entièrement adaptable à tes sensations.
                    </p>
                  )}
                </div>
              </section>
            )}

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Objectif sportif principal</span>
              <textarea
                value={profile.goal}
                onChange={(event) => updateProfile("goal", event.target.value)}
                placeholder="Ex: préparer un trail, reprendre doucement, courir 10 km, perdre du poids..."
                className="min-h-24 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Niveau</span>
              <select
                value={profile.level}
                onChange={(event) => updateProfile("level", event.target.value)}
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none"
              >
                {levelOptions.map((level) => (
                  <option className="bg-ink-950 text-night" key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Sports favoris</span>
              <textarea
                value={profile.favoriteSports}
                onChange={(event) => updateProfile("favoriteSports", event.target.value)}
                placeholder="Ex: course à pied, natation, swimrun, vélo, trail, renforcement..."
                className="min-h-20 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
              />
              <p className="mt-2 text-xs leading-5 text-mist/55">
                Le coach les privilégie quand c&apos;est cohérent, mais peut proposer un sport complémentaire pour progresser ou récupérer.
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Matériel disponible</span>
              <textarea
                value={profile.equipment}
                onChange={(event) => updateProfile("equipment", event.target.value)}
                placeholder="Ex: aucun matériel, tapis, haltères, élastiques, salle, vélo, piscine..."
                className="min-h-24 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Contrainte globale à respecter pour tous les programmes</span>
              <textarea
                value={profile.recurringConstraints}
                onChange={(event) => updateProfile("recurringConstraints", event.target.value)}
                placeholder="Ex: genou fragile, éviter les impacts, pas de bruit le soir, toujours garder un jour de repos après une sortie longue..."
                className="min-h-28 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
              />
            </label>

            <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/72">
              {syncStatus}
            </p>
          </div>
        </section>
      </main>
    </AuthGate>
  );
}
