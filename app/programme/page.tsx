"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Dumbbell, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildGlobalAdvice,
  generateProgram,
  mergePlannedDays,
  type CoachAdvice,
  type HistoryEntry,
  type ProgramForm,
  type ProgramSession,
  type Readiness,
  type UserProfile
} from "@/lib/coachEngine";
import { initialGarminMock, type GarminMockData } from "@/lib/garminMock";
import { buildUserMemory } from "@/lib/userMemory";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

type StravaActivitySummary = {
  id: number;
  name: string;
  type: string;
  distanceKm: number;
  movingMinutes: number;
  startDate: string;
};

const initialReadiness: Readiness = {
  energy: 6,
  sleep: 7,
  stress: 4,
  motivation: 7,
  pain: 2,
  time: "durée optimale"
};

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

const initialForm: ProgramForm = {
  duration: "durée optimale",
  priority: "régularité",
  globalNotes: "",
  plannedDays: []
};

function readStorage<T>(key: string, fallback: T) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? ({ ...fallback, ...JSON.parse(value) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    level: profile.level.toLowerCase(),
    equipment: profile.equipment
  };
}

function normalizeGarmin(data: GarminMockData): GarminMockData {
  return {
    ...data,
    sleepQuality: data.sleepQuality === "moyenne" ? "moyen" : data.sleepQuality,
    stress: data.stress === "bas" ? "faible" : data.stress === "très élevé" ? "élevé" : data.stress,
    trainingLoad: data.trainingLoad === "élevée" ? "élevée" : data.trainingLoad,
    lastActivityIntensity: data.lastActivityIntensity === "très facile" ? "facile" : data.lastActivityIntensity === "modérée" ? "modérée" : data.lastActivityIntensity
  };
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => {
      if (Array.isArray(item)) return item.length > 0;
      if (typeof item === "string") return item.trim().length > 0;
      if (typeof item === "number") return item !== 0;
      if (typeof item === "boolean") return item;
      return Boolean(item);
    });
  }
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
}

function mergeWithoutEmpty<T extends Record<string, unknown>>(current: T, incoming: Partial<T>): T {
  const merged = { ...current };

  Object.entries(incoming).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim().length === 0) return;
    if (value === undefined || value === null) return;
    merged[key as keyof T] = value as T[keyof T];
  });

  return merged;
}

function sortStravaActivities(activities: StravaActivitySummary[]) {
  return [...activities].sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());
}

export default function ProgrammePage() {
  const [readiness, setReadiness] = useState<Readiness>(initialReadiness);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [garminData, setGarminData] = useState<GarminMockData>(initialGarminMock);
  const [form, setForm] = useState<ProgramForm>({ ...initialForm, plannedDays: mergePlannedDays() });
  const [program, setProgram] = useState<ProgramSession[]>([]);
  const [globalAdvice, setGlobalAdvice] = useState<CoachAdvice | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stravaActivities, setStravaActivities] = useState<StravaActivitySummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);
  const [hasCheckedCloudData, setHasCheckedCloudData] = useState(false);
  const [hasEditedPlanner, setHasEditedPlanner] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Synchronisation locale active.");

  useEffect(() => {
    const savedProfile = readStorage("auto-coach-profile", initialProfile);
    const savedReadiness = readStorage("auto-coach-readiness", initialReadiness);
    const savedGarmin = readStorage("auto-coach-garmin-test", initialGarminMock);
    const savedForm = readStorage("auto-coach-planner", initialForm);
    const savedHistory = window.localStorage.getItem("auto-coach-history");
    const savedProgram = window.localStorage.getItem("auto-coach-current-program");
    const savedStravaActivities = window.localStorage.getItem("auto-coach-strava-activities");

    setProfile(normalizeProfile(savedProfile));
    setReadiness(savedReadiness);
    setGarminData(normalizeGarmin(savedGarmin));
    setForm({
      ...initialForm,
      ...savedForm,
      priority: savedForm.priority?.toLowerCase?.() ?? initialForm.priority,
      plannedDays: mergePlannedDays(savedForm.plannedDays)
    });
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedProgram) setProgram(JSON.parse(savedProgram));
    if (savedStravaActivities) setStravaActivities(sortStravaActivities(JSON.parse(savedStravaActivities)));
    setHasLoadedLocalData(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalData) return;

    fetch("/api/user-data")
      .then((response) => response.json())
      .then((result) => {
        if (!result.ok || !result.data) {
          setCloudStatus(result.error ? "Connecté, synchronisation cloud à finaliser." : "Compte prêt, données encore locales.");
          return;
        }

        if (hasMeaningfulValue(result.data.profile)) {
          setProfile((current) => normalizeProfile(mergeWithoutEmpty(current, result.data.profile)));
        }
        if (hasMeaningfulValue(result.data.readiness)) setReadiness((current) => ({ ...current, ...result.data.readiness }));
        if (hasMeaningfulValue(result.data.garminData)) {
          setGarminData((current) => normalizeGarmin({ ...current, ...result.data.garminData }));
        }
        if (hasMeaningfulValue(result.data.planner)) {
          setForm({
            ...initialForm,
            ...result.data.planner,
            plannedDays: mergePlannedDays(result.data.planner.plannedDays)
          });
        }
        if (Array.isArray(result.data.currentProgram) && result.data.currentProgram.length > 0) setProgram(result.data.currentProgram);
        if (Array.isArray(result.data.history) && result.data.history.length > 0) setHistory(result.data.history);
        if (Array.isArray(result.data.stravaData?.activities)) {
          const sortedActivities = sortStravaActivities(result.data.stravaData.activities);
          setStravaActivities(sortedActivities);
          window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(sortedActivities));
        }
        setCloudStatus("Données synchronisées avec ton compte.");
      })
      .catch(() => setCloudStatus("Mode local actif. Connecte-toi pour synchroniser."))
      .finally(() => setHasCheckedCloudData(true));
  }, [hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    window.localStorage.setItem("auto-coach-planner", JSON.stringify(form));
  }, [form, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    window.localStorage.setItem("auto-coach-current-program", JSON.stringify(program));
  }, [program, hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;

    fetch("/api/strava/sync")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok && Array.isArray(result.activities)) {
          const sortedActivities = sortStravaActivities(result.activities);
          setStravaActivities(sortedActivities);
          window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(sortedActivities));
        }
      })
      .catch(() => undefined);
  }, [hasLoadedLocalData]);

  const stravaHistory = useMemo<HistoryEntry[]>(() => {
    return stravaActivities.map((activity) => ({
      id: `strava-${activity.id}`,
      title: `Strava · ${activity.name}`,
      detail: `${activity.type}, ${activity.distanceKm} km, ${activity.movingMinutes} min`,
      date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(activity.startDate)),
      timestamp: new Date(activity.startDate).getTime()
    }));
  }, [stravaActivities]);
  const coachHistory = useMemo(() => [...history, ...stravaHistory], [history, stravaHistory]);
  const userMemory = useMemo(() => buildUserMemory(coachHistory, profile), [coachHistory, profile]);
  const selectedDayCount = form.plannedDays.filter((day) => day.selected).length;
  const visibleProgram = useMemo(
    () => program.filter((session) => form.plannedDays.some((day) => day.selected && session.id.startsWith(day.id))),
    [form.plannedDays, program]
  );

  const saveCloudPatch = useCallback(async (data: Record<string, unknown>, successMessage = "Données sauvegardées sur ton compte.") => {
    if (!hasCheckedCloudData) return false;

    try {
      const response = await fetch("/api/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setCloudStatus(successMessage);
        return true;
      }
    } catch {
      setCloudStatus("Sauvegarde locale active. La synchronisation reprendra dès que le compte répond.");
    }

    return false;
  }, [hasCheckedCloudData]);

  useEffect(() => {
    if (!hasLoadedLocalData || !hasCheckedCloudData || !hasEditedPlanner) return;

    const timeout = window.setTimeout(() => {
      void saveCloudPatch({ planner: form }, "Planification sauvegardée sur ton compte.").then((saved) => {
        if (saved) setHasEditedPlanner(false);
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedLocalData, hasCheckedCloudData, hasEditedPlanner, form, saveCloudPatch]);

  function togglePlannedDay(id: string) {
    setHasEditedPlanner(true);
    setProgram((current) => current.filter((session) => !session.id.startsWith(id)));
    setForm((current) => ({
      ...current,
      plannedDays: current.plannedDays.map((day) => (day.id === id ? { ...day, selected: !day.selected } : day))
    }));
  }

  function updatePlannedDayNote(id: string, note: string) {
    setHasEditedPlanner(true);
    setForm((current) => ({
      ...current,
      plannedDays: current.plannedDays.map((day) => (day.id === id ? { ...day, note } : day))
    }));
  }

  function updateGlobalNotes(globalNotes: string) {
    setHasEditedPlanner(true);
    setForm((current) => ({ ...current, globalNotes }));
  }

  async function buildProgram() {
    setIsGenerating(true);
    const coachForm = { ...form, duration: readiness.time };
    const fallbackProgram = generateProgram(readiness, coachForm, profile, garminData, coachHistory);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readiness, profile, garminData, form: coachForm, history: coachHistory })
      });
      const result = await response.json();
      const nextProgram = result.program?.length ? result.program : fallbackProgram;
      setProgram(nextProgram);
      setGlobalAdvice(buildGlobalAdvice(readiness, garminData, profile, coachForm, nextProgram));
      await saveCloudPatch({
        readiness,
        garminData,
        planner: coachForm,
        currentProgram: nextProgram,
        memory: userMemory
      }, "Programme sauvegardé sur ton compte.");
    } catch {
      setProgram(fallbackProgram);
      setGlobalAdvice(buildGlobalAdvice(readiness, garminData, profile, coachForm, fallbackProgram));
      await saveCloudPatch({
        readiness,
        garminData,
        planner: coachForm,
        currentProgram: fallbackProgram,
        memory: userMemory
      }, "Programme sauvegardé sur ton compte.");
    } finally {
      setIsGenerating(false);
    }
  }

  function saveSession(session: ProgramSession) {
    const entry = {
      id: crypto.randomUUID(),
      title: `${session.dateLabel} · ${session.type}`,
      detail: `${session.duration}, intensité ${session.intensity}`,
      date: new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date()),
      timestamp: Date.now(),
      session,
      relevanceScore: 50,
      relevanceHistory: [{ value: 50, timestamp: Date.now() }]
    };

    setHistory((current) => {
      const nextHistory = [entry, ...current].slice(0, 10);
      window.localStorage.setItem("auto-coach-history", JSON.stringify(nextHistory));
      void saveCloudPatch({ history: nextHistory, memory: buildUserMemory(nextHistory, profile) }, "Séance sauvegardée sur ton compte.");
      return nextHistory;
    });
  }

  function generateAlternativeSession(sessionId: string) {
    setProgram((current) => {
      const nextProgram = current.map((session) => {
        if (session.id !== sessionId) return session;

        const isRun = session.type.toLowerCase().includes("footing") || session.type.toLowerCase().includes("trail") || session.type.toLowerCase().includes("course");
        const alternative = isRun
          ? {
              type: "renfo complémentaire maison",
              intensity: "facile",
              content: "Séance de renforcement simple pour remplacer la course sans perdre le fil.",
              detailedContent: "Échauffement: 5 min\nSquats lents: 3 x 15\nFentes arrière: 3 x 10 par jambe\nGainage: 3 x 30 sec\nPonts fessiers: 3 x 12\nRécupération: 60 sec entre exercices",
              objective: "garder la régularité tout en réduisant l'impact.",
              reason: "variante proposée pour respecter les contraintes du jour sans répéter la même séance."
            }
          : {
              type: "footing facile alternatif",
              intensity: "facile",
              content: "Course douce et régulière, pensée comme une alternative simple à la séance prévue.",
              detailedContent: "Échauffement très facile: 8 min\nCourse en aisance respiratoire: 20 à 30 min\nRetour au calme: 5 min très faciles\nOption fatigue: 4 min course / 1 min marche\nRécupération: marche 3 min",
              objective: "entretenir la régularité sans surcharge.",
              reason: "variante proposée pour offrir une option différente tout en gardant l'objectif du jour."
            };

        return {
          ...session,
          id: `${session.id}-alternative-${Date.now()}`,
          ...alternative
        };
      });
      void saveCloudPatch({ currentProgram: nextProgram }, "Nouvelle séance sauvegardée sur ton compte.");
      return nextProgram;
    });
  }

  return (
    <AuthGate>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Programme</h1>
          </div>
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
            <ArrowLeft className="h-5 w-5 text-moss" />
          </Link>
        </header>

        <AccountStatus />

        <section className="mb-4 overflow-hidden rounded-[30px] border border-moss/25 bg-gradient-to-br from-white to-ink-950 p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-moss">Planification intelligente</p>
              <h2 className="text-2xl font-semibold leading-tight text-night">Choisir mes prochaines séances</h2>
              <p className="mt-3 text-sm leading-6 text-mist/70">
                Sélectionne les jours disponibles, ajoute tes contraintes, puis le coach génère un programme détaillé.
              </p>
            </div>
            <CalendarDays className="h-7 w-7 shrink-0 text-ember" />
          </div>
        </section>

        <section className="mb-4 rounded-[28px] border border-moss/20 bg-moss/10 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
            <p className="text-xs leading-5 text-mist/75">
              Ces programmes sont proposés par IA à partir de ton profil, tes sensations, tes disponibilités, ton historique et Strava. Si une séance ne colle pas, mets à jour tes infos pour améliorer la précision.
            </p>
          </div>
        </section>

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5">
          <h2 className="mb-4 text-lg font-medium text-night">Mes 10 prochains jours</h2>
          <div className="grid grid-cols-2 gap-3">
            {form.plannedDays.map((day) => (
              <button
                key={day.id}
                onClick={() => togglePlannedDay(day.id)}
                className={`min-h-24 rounded-3xl border p-4 text-left transition ${
                  day.selected
                    ? "border-moss bg-moss/35 text-night shadow-[0_0_0_2px_rgba(143,191,159,0.35)]"
                    : "border-night/10 bg-white/65 text-mist"
                }`}
              >
                <span className="block text-sm font-semibold">{day.shortLabel}</span>
                <span className={`mt-2 block text-xs ${day.selected ? "font-semibold text-moss" : "text-mist/60"}`}>
                  {day.selected ? "séance possible" : "non retenu"}
                </span>
              </button>
            ))}
          </div>

          {selectedDayCount > 0 && (
            <div className="mt-5 space-y-4">
              {form.plannedDays.filter((day) => day.selected).map((day) => (
                <label key={day.id} className="block">
                  <span className="mb-2 block text-sm text-mist/70">{day.dateLabel} · envie ou contrainte pour ce jour</span>
                  <textarea
                    value={day.note}
                    onChange={(event) => updatePlannedDayNote(day.id, event.target.value)}
                    placeholder="Ex: courir 50 min sur du plat, renfo haut du corps, séance courte le midi..."
                    className="min-h-20 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
                  />
                </label>
              ))}
            </div>
          )}

          <label className="mt-5 block">
            <span className="mb-2 block text-sm text-mist/70">Autres précisions pour ton coach</span>
            <textarea
              value={form.globalNotes}
              onChange={(event) => updateGlobalNotes(event.target.value)}
              placeholder="Ex: semaine chargée, déplacement vendredi, objectif prioritaire..."
              className="min-h-28 w-full resize-none rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <button disabled={isGenerating || selectedDayCount === 0} onClick={buildProgram} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-moss px-4 py-4 font-semibold text-night disabled:opacity-50">
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Le coach réfléchit..." : "Générer mon programme détaillé"}
          </button>
          <p className="mt-3 text-xs text-mist/55">{cloudStatus}</p>
        </section>

        {globalAdvice && (
          <section className="mb-4 rounded-[24px] border border-ember/20 bg-ember/10 p-4">
            <p className="text-sm font-medium text-ember">{globalAdvice.title}</p>
            <p className="mt-2 text-sm leading-6 text-mist/75">{globalAdvice.body}</p>
          </section>
        )}

        {visibleProgram.length > 0 ? (
          <section className="mb-4 rounded-[28px] border border-night/10 bg-white/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-night">Programme détaillé</h2>
              <Dumbbell className="h-5 w-5 text-moss" />
            </div>
            <div className="space-y-4">
              {visibleProgram.map((session) => (
                <article key={session.id} className="rounded-3xl bg-white/85 p-4">
                  <p className="mb-1 text-sm font-semibold text-ember">{session.dateLabel}</p>
                  <h3 className="text-lg font-medium text-night">{session.type}</h3>
                  <p className="mt-1 text-sm text-mist/70">{session.duration} · intensité {session.intensity}</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-mist/75">
                    <p><span className="font-medium text-night">Contenu : </span>{session.content}</p>
                    <p><span className="font-medium text-night">Objectif : </span>{session.objective}</p>
                    <div className="space-y-2 rounded-2xl bg-white/75 p-4">
                      {session.detailedContent.split("\n").filter(Boolean).map((line) => (
                        <p key={line} className="border-b border-night/5 pb-2 last:border-b-0 last:pb-0">{line}</p>
                      ))}
                    </div>
                    <p className="rounded-2xl bg-moss/10 px-3 py-2"><span className="font-medium text-moss">Pourquoi ce choix : </span>{session.reason}</p>
                  </div>

                  <button
                    onClick={() => generateAlternativeSession(session.id)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-ember/25 bg-ember/10 px-4 py-3 text-sm font-medium text-ember"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Générer une autre séance du jour
                  </button>
                  <button onClick={() => saveSession(session)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-moss/30 bg-moss/15 px-4 py-3 font-medium text-moss">
                    <Check className="h-5 w-5" />
                    Mémoriser cette séance
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-night/10 bg-white/75 p-5">
            <h2 className="text-lg font-medium text-night">Aucun programme détaillé pour le moment</h2>
            <p className="mt-2 text-sm leading-6 text-mist/70">
              Choisis au moins un jour, puis lance la génération. Les séances apparaîtront ici directement en détail.
            </p>
          </section>
        )}
      </main>
    </AuthGate>
  );
}
