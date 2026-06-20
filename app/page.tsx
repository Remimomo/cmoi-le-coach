"use client";

import Link from "next/link";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flame,
  HeartPulse,
  Leaf,
  MessageCircle,
  Moon,
  Sparkles,
  Trophy,
  UsersRound,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildShapeSummary,
  mergePlannedDays,
  type HistoryEntry,
  type ProgramForm,
  type Readiness,
  type ShapeSummary,
  type UserProfile
} from "@/lib/coachEngine";
import { initialGarminMock, type GarminMockData } from "@/lib/garminMock";
import { buildUserMemory } from "@/lib/userMemory";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

type ChatMessage = {
  role: "user" | "coach";
  text: string;
};

type StravaActivitySummary = {
  id: number;
  name: string;
  type: string;
  distanceKm: number;
  movingMinutes: number;
  startDate: string;
};

type ChallengeDashboard = {
  member: null | {
    companyId: string;
    companyName: string;
    role: "employee" | "admin";
  };
  personalScore: number;
  collectiveScore: number;
  monthlyGoal: number;
  participationIndex: number;
  message: string;
};

const coachIntro = "Je suis là pour parler sport, forme, récup, motivation et alimentation simple.";

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

const readinessItems = [
  { key: "energy", label: "Énergie", icon: Zap, low: "Douce", high: "Pleine" },
  { key: "sleep", label: "Sommeil", icon: Moon, low: "Court", high: "Réparateur" },
  { key: "stress", label: "Stress", icon: Brain, low: "Calme", high: "Chargé" },
  { key: "motivation", label: "Motivation", icon: Sparkles, low: "Basse", high: "Haute" },
  { key: "pain", label: "Douleurs", icon: HeartPulse, low: "Aucune", high: "Présentes" }
] as const;

function coachMessage(text: string): ChatMessage {
  return { role: "coach", text };
}

function userMessage(text: string): ChatMessage {
  return { role: "user", text };
}

function todayLabel() {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());
}

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

function relevanceLabel(value: number) {
  if (value <= 12) return "beaucoup trop légère";
  if (value <= 37) return "un peu trop légère";
  if (value <= 62) return "parfaitement adaptée";
  if (value <= 87) return "un peu trop difficile";
  return "beaucoup trop difficile";
}

export default function Home() {
  const [readiness, setReadiness] = useState<Readiness>(initialReadiness);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [garminData, setGarminData] = useState<GarminMockData>(initialGarminMock);
  const [form, setForm] = useState<ProgramForm>({ ...initialForm, plannedDays: mergePlannedDays() });
  const [summary, setSummary] = useState<ShapeSummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([coachMessage(coachIntro)]);
  const [stravaActivities, setStravaActivities] = useState<StravaActivitySummary[]>([]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);
  const [hasCheckedCloudData, setHasCheckedCloudData] = useState(false);
  const [hasEditedReadiness, setHasEditedReadiness] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Synchronisation locale active.");
  const [challengeDashboard, setChallengeDashboard] = useState<ChallengeDashboard | null>(null);

  useEffect(() => {
    const savedProfile = readStorage("auto-coach-profile", initialProfile);
    const savedReadiness = readStorage("auto-coach-readiness", initialReadiness);
    const savedGarmin = readStorage("auto-coach-garmin-test", initialGarminMock);
    const savedForm = readStorage("auto-coach-planner", initialForm);
    const savedHistory = window.localStorage.getItem("auto-coach-history");
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
    if (savedStravaActivities) setStravaActivities(JSON.parse(savedStravaActivities));
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
        if (Array.isArray(result.data.history) && result.data.history.length > 0) setHistory(result.data.history);
        if (Array.isArray(result.data.stravaData?.activities)) {
          setStravaActivities(result.data.stravaData.activities);
          window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(result.data.stravaData.activities));
        }
        setCloudStatus("Données synchronisées avec ton compte.");
      })
      .catch(() => setCloudStatus("Mode local actif. Connecte-toi pour synchroniser."))
      .finally(() => setHasCheckedCloudData(true));
  }, [hasLoadedLocalData]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;

    fetch("/api/enterprise/dashboard")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok && result.dashboard?.member) setChallengeDashboard(result.dashboard);
      })
      .catch(() => undefined);
  }, [hasLoadedLocalData]);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-garmin-test", JSON.stringify(garminData));
  }, [garminData]);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-readiness", JSON.stringify(readiness));
  }, [readiness]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    window.localStorage.setItem("auto-coach-profile", JSON.stringify(profile));
  }, [hasLoadedLocalData, profile]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    window.localStorage.setItem("auto-coach-history", JSON.stringify(history));
  }, [hasLoadedLocalData, history]);

  useEffect(() => {
    if (!hasLoadedLocalData) return;

    fetch("/api/strava/sync")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok && Array.isArray(result.activities)) {
          setStravaActivities(result.activities);
          window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(result.activities));
        }
      })
      .catch(() => undefined);
  }, [hasLoadedLocalData]);

  const stravaHistory = useMemo<HistoryEntry[]>(() => {
    return stravaActivities.map((activity) => ({
      id: `strava-${activity.id}`,
      title: `Strava · ${activity.name}`,
      detail: `${activity.type}, ${activity.distanceKm} km, ${activity.movingMinutes} min`,
      date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(activity.startDate)),
      timestamp: new Date(activity.startDate).getTime()
    }));
  }, [stravaActivities]);
  const coachHistory = useMemo(() => [...history, ...stravaHistory], [history, stravaHistory]);
  const localSummary = useMemo(() => buildShapeSummary(readiness, garminData, profile, form.priority, coachHistory), [readiness, garminData, profile, form.priority, coachHistory]);
  const userMemory = useMemo(() => buildUserMemory(coachHistory, profile), [coachHistory, profile]);
  const displayedHistory = useMemo(
    () => [...coachHistory].sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0)),
    [coachHistory]
  );
  const visibleHistoryEntries = showFullHistory ? displayedHistory : displayedHistory.slice(0, 3);
  const activeSummary = summary ?? localSummary;
  const tenDayBalance = useMemo(() => {
    const since = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const recentEntries = coachHistory.filter((entry) => (entry.timestamp ?? 0) >= since);
    const minutes = recentEntries.reduce((total, entry) => {
      const match = entry.detail.match(/(\d+)\s*min/i);
      return total + (match ? Number(match[1]) : 0);
    }, 0);
    const stravaCount = recentEntries.filter((entry) => entry.id.startsWith("strava-")).length;

    return {
      sessions: recentEntries.length,
      minutes,
      stravaCount
    };
  }, [coachHistory]);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-memory", JSON.stringify(userMemory));
  }, [userMemory]);

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
    if (!hasLoadedLocalData || !hasCheckedCloudData || !hasEditedReadiness) return;

    const timeout = window.setTimeout(() => {
      void saveCloudPatch({ readiness }, "État du jour sauvegardé sur ton compte.").then((saved) => {
        if (saved) setHasEditedReadiness(false);
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedLocalData, hasCheckedCloudData, hasEditedReadiness, readiness, saveCloudPatch]);

  function updateReadiness(key: keyof Readiness, value: string | number) {
    setHasEditedReadiness(true);
    setSummary(null);
    setReadiness((current) => ({ ...current, [key]: value }));
  }

  function deleteHistoryEntry(entryId: string) {
    setHistory((current) => {
      const nextHistory = current.filter((entry) => entry.id !== entryId);
      void saveCloudPatch({ history: nextHistory, memory: buildUserMemory(nextHistory, profile) }, "Historique mis à jour sur ton compte.");
      return nextHistory;
    });
  }

  function updateSessionRelevance(entryId: string, value: number) {
    setHistory((current) => {
      const nextHistory = current.map((entry) => {
        if (entry.id !== entryId) return entry;

        return {
          ...entry,
          relevanceScore: value,
          relevanceHistory: [
            { value, timestamp: Date.now() },
            ...(entry.relevanceHistory ?? [])
          ].slice(0, 20)
        };
      });

      void saveCloudPatch(
        { history: nextHistory, memory: buildUserMemory(nextHistory, profile) },
        "Pertinence de la séance sauvegardée sur ton compte."
      );
      return nextHistory;
    });
  }

  function isSportRelated(message: string) {
    const lower = message.toLowerCase();
    return [
      "sport",
      "course",
      "courir",
      "séance",
      "entrain",
      "entraîn",
      "renfo",
      "muscu",
      "trail",
      "sommeil",
      "fatigue",
      "stress",
      "douleur",
      "strava",
      "motivation",
      "récup",
      "fractionné",
      "gainage",
      "marche",
      "vélo",
      "natation",
      "alimentation",
      "nutrition",
      "manger",
      "repas",
      "protéine",
      "glucide",
      "hydratation",
      "boire",
      "petit déjeuner",
      "collation"
    ].some((word) => lower.includes(word));
  }

  async function askCoach() {
    const message = coachInput.trim();
    if (!message) return;
    setCoachInput("");
    setChatMessages((current) => [...current, userMessage(message)].slice(-8));

    if (!isSportRelated(message)) {
      const reply = "Je suis là pour parler sport, forme, récup, motivation et alimentation simple.";
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readiness, profile, garminData, form, history: coachHistory, message })
      });
      const result = await response.json();
      const reply = result.reply ?? `Je prends en compte: "${message}". On reste sur une approche simple, réaliste et durable.`;
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
    } catch {
      const reply = `Je prends en compte: "${message}". On reste sur une approche simple, réaliste et durable.`;
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
    }
  }

  return (
    <AuthGate>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5">
        <header className="mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist/50">{todayLabel()}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">C&apos;moiLeCoach</h1>
          </div>
        </header>

        <section className="mb-4 overflow-hidden rounded-[30px] border border-night/10 bg-white/80 p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-mist">Ton coach personnel</p>
              <h2 className="mt-1 text-3xl font-semibold leading-tight text-night">
                Bonjour{profile.firstName.trim() ? ` ${profile.firstName.trim()}` : ""}
              </h2>
              <p className="mt-3 text-sm leading-6 text-mist/80">
                Ton accueil reste centré sur ton état du jour, tes séances réalisées et tes points.
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-moss/25 text-moss">
              <Leaf className="h-8 w-8" />
            </div>
          </div>
        </section>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <Link href="/profil" className="rounded-2xl border border-night/10 bg-white/65 px-3 py-3 text-center text-sm text-mist">
            Profil
          </Link>
          <Link href="/programme" className="rounded-2xl border border-night/10 bg-white/65 px-2 py-3 text-center text-sm text-mist">
            Programme
          </Link>
          <Link href="/garmin" className="rounded-2xl border border-night/10 bg-white/65 px-2 py-3 text-center text-sm text-mist">
            STRAVA
          </Link>
          <Link href="/entreprise" className="rounded-2xl border border-night/10 bg-white/65 px-2 py-3 text-center text-sm text-mist">
            Entreprise
          </Link>
        </div>

        <AccountStatus />

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-night">Comment tu te sens aujourd&apos;hui ?</h2>
            <HeartPulse className="h-5 w-5 text-ember" />
          </div>

          <div className="space-y-4">
            {readinessItems.map(({ key, label, icon: Icon, low, high }) => (
              <label key={key} className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-mist">
                    <Icon className="h-4 w-4 text-moss" />
                    {label}
                  </span>
                  <span className="text-night">{readiness[key]}</span>
                </div>
                <input
                  aria-label={label}
                  type="range"
                  min="1"
                  max="10"
                  value={readiness[key]}
                  onChange={(event) => updateReadiness(key, Number(event.target.value))}
                  className="h-2 w-full accent-moss"
                />
                <div className="mt-1 flex justify-between text-[11px] text-mist/45">
                  <span>{low}</span>
                  <span>{high}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-[28px] border border-moss/30 bg-gradient-to-br from-white to-ink-850 p-5 shadow-soft backdrop-blur">
          <p className="mb-2 text-sm text-moss">Synthèse de forme</p>
          <h2 className="text-xl font-medium text-night">{activeSummary.status}</h2>
          <p className="mt-3 text-sm leading-6 text-mist/75">{activeSummary.explanation}</p>
        </section>

        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-moss">Mini bilan</p>
              <h2 className="mt-1 text-lg font-medium text-night">Tes 10 derniers jours</h2>
            </div>
            <Trophy className="h-5 w-5 text-ember" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-moss/10 px-3 py-4 text-center">
              <p className="text-2xl font-semibold text-night">{tenDayBalance.sessions}</p>
              <p className="mt-1 text-[11px] leading-4 text-mist/65">séance(s)</p>
            </div>
            <div className="rounded-2xl bg-ember/10 px-3 py-4 text-center">
              <p className="text-2xl font-semibold text-night">{tenDayBalance.minutes}</p>
              <p className="mt-1 text-[11px] leading-4 text-mist/65">minutes</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-4 text-center">
              <p className="text-2xl font-semibold text-night">{tenDayBalance.stravaCount}</p>
              <p className="mt-1 text-[11px] leading-4 text-mist/65">Strava</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-ink-850 px-4 py-3 text-xs leading-5 text-mist/70">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
            {tenDayBalance.sessions > 0
              ? "Le coach utilise ce bilan pour doser la prochaine charge."
              : "Dès qu'une séance apparaît, le coach ajuste mieux la suite."}
          </p>
        </section>

        {challengeDashboard?.member && (
          <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-moss">Challenge collectif</p>
                <h2 className="mt-1 text-lg font-medium text-night">{challengeDashboard.member.companyName}</h2>
              </div>
              <UsersRound className="h-5 w-5 text-ember" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-moss/10 p-4">
                <p className="text-2xl font-semibold text-night">{challengeDashboard.personalScore}</p>
                <p className="mt-1 text-xs text-mist/65">mes points</p>
              </div>
              <div className="rounded-2xl bg-ember/10 p-4">
                <p className="text-2xl font-semibold text-night">{challengeDashboard.collectiveScore}</p>
                <p className="mt-1 text-xs text-mist/65">collectif</p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-night/10">
              <div
                className="h-full rounded-full bg-moss"
                style={{ width: `${Math.min(100, Math.round((challengeDashboard.collectiveScore / Math.max(1, challengeDashboard.monthlyGoal)) * 100))}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-mist/80">{challengeDashboard.message}</p>
            <Link href="/entreprise" className="mt-4 block rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-center text-sm font-semibold text-night">
              Voir le challenge
            </Link>
          </section>
        )}

        <section className="mb-4 rounded-[28px] border border-moss/25 bg-moss/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-moss">Programme IA</p>
              <h2 className="mt-1 text-lg font-medium text-night">Tes séances sont sur une page dédiée</h2>
              <p className="mt-2 text-sm leading-6 text-mist/70">
                Choisis tes jours et consulte le programme détaillé directement, sans ouvrir chaque séance.
              </p>
            </div>
            <Sparkles className="h-6 w-6 shrink-0 text-ember" />
          </div>
          <Link href="/programme" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-moss px-4 py-3 font-semibold text-night">
            Ouvrir le programme
            <ChevronRight className="h-5 w-5" />
          </Link>
        </section>

        <section className="mb-5 rounded-[28px] border border-night/10 bg-white/80 p-5">
          <h2 className="mb-3 text-lg font-medium text-night">Historique local</h2>
          {displayedHistory.length === 0 ? (
            <p className="text-sm leading-6 text-mist/60">Les séances mémorisées et Strava apparaîtront ici.</p>
          ) : (
            <div className="space-y-3">
              {visibleHistoryEntries.map((entry) => (
                <article key={entry.id} className="rounded-2xl bg-white/65 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-night">{entry.title}</h3>
                      <p className="mt-1 text-sm text-mist/60">{entry.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-mist/45">{entry.date}</p>
                      {!entry.id.startsWith("strava-") && (
                        <button onClick={() => deleteHistoryEntry(entry.id)} className="mt-3 rounded-full border border-night/10 px-3 py-1 text-xs text-mist/60">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                  {!entry.id.startsWith("strava-") && entry.session && (
                    <div className="mt-4 rounded-2xl bg-moss/10 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-night">Pertinence de la séance</p>
                          <p className="mt-1 text-xs leading-5 text-mist/65">Cette séance était-elle adaptée à toi aujourd&apos;hui ?</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-moss">{entry.relevanceScore ?? 50}</span>
                      </div>
                      <input
                        aria-label="Pertinence de la séance"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={entry.relevanceScore ?? 50}
                        onChange={(event) => updateSessionRelevance(entry.id, Number(event.target.value))}
                        className="h-2 w-full accent-moss"
                      />
                      <div className="mt-2 grid grid-cols-5 gap-1 text-[9px] leading-3 text-mist/50">
                        <span>0<br />très légère</span>
                        <span>25<br />légère</span>
                        <span className="text-center">50<br />adaptée</span>
                        <span className="text-right">75<br />difficile</span>
                        <span className="text-right">100<br />très difficile</span>
                      </div>
                      <p className="mt-2 text-xs text-mist/70">
                        {relevanceLabel(entry.relevanceScore ?? 50)}
                        {entry.relevanceHistory?.length ? ` · ${entry.relevanceHistory.length} ajustement(s)` : ""}
                      </p>
                    </div>
                  )}
                </article>
              ))}
              {displayedHistory.length > 3 && (
                <button
                  onClick={() => setShowFullHistory((value) => !value)}
                  className="w-full rounded-2xl border border-night/10 bg-white/65 px-4 py-3 text-sm font-medium text-night"
                >
                  {showFullHistory ? "Réduire l'historique" : `Voir les ${displayedHistory.length - 3} autres entrées`}
                </button>
              )}
            </div>
          )}
        </section>

        <p className="mb-4 px-2 text-center text-xs text-mist/50">{cloudStatus}</p>

        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-night/10 bg-ink-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-mist">Conversation coach</span>
            <button
              onClick={() => setIsChatCollapsed((value) => !value)}
              className="flex items-center gap-1 rounded-full border border-night/10 bg-white/70 px-3 py-1 text-xs text-mist"
            >
              {isChatCollapsed ? "Ouvrir" : "Réduire"}
              {isChatCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          {!isChatCollapsed && (
            <div className="mb-2 max-h-36 space-y-2 overflow-y-auto px-1">
              {chatMessages.map((message, index) => (
                <p
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl px-3 py-2 text-xs leading-5 ${
                    message.role === "coach" ? "bg-moss/10 text-mist" : "bg-white/75 text-night"
                  }`}
                >
                  {message.text}
                </p>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-3xl border border-night/10 bg-white/70 p-2">
            <MessageCircle className="mb-3 ml-2 h-5 w-5 shrink-0 text-moss" />
            <textarea
              value={coachInput}
              onChange={(event) => setCoachInput(event.target.value)}
              rows={1}
              placeholder="Demande libre à ton coach IA..."
              className="max-h-24 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-sm text-night outline-none placeholder:text-mist/40"
            />
            <button onClick={askCoach} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-night" aria-label="Envoyer">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}
