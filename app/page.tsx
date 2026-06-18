"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  MessageCircle,
  Moon,
  Sparkles,
  Zap,
  Brain,
  Coffee,
  Leaf,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildShapeSummary,
  buildGlobalAdvice,
  generateProgram,
  mergePlannedDays,
  type HistoryEntry,
  type ProgramForm,
  type ProgramSession,
  type Readiness,
  type ShapeSummary,
  type CoachAdvice,
  type UserProfile
} from "@/lib/coachEngine";
import {
  initialGarminMock,
  type GarminMockData
} from "@/lib/garminMock";
import { buildUserMemory } from "@/lib/userMemory";
import { AccountStatus } from "@/components/AccountStatus";
import { AuthGate } from "@/components/AuthGate";

type ChatMessage = {
  role: "user" | "coach";
  text: string;
};

function coachMessage(text: string): ChatMessage {
  return { role: "coach", text };
}

function userMessage(text: string): ChatMessage {
  return { role: "user", text };
}

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
  goal: "forme générale",
  customGoal: "",
  level: "intermédiaire",
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

export default function Home() {
  const [readiness, setReadiness] = useState<Readiness>(initialReadiness);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [garminData, setGarminData] = useState<GarminMockData>(initialGarminMock);
  const [form, setForm] = useState<ProgramForm>({ ...initialForm, plannedDays: mergePlannedDays() });
  const [summary, setSummary] = useState<ShapeSummary | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [program, setProgram] = useState<ProgramSession[]>([]);
  const [globalAdvice, setGlobalAdvice] = useState<CoachAdvice | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachReply, setCoachReply] = useState("Je regarde ta forme, tes contraintes et ton historique pour proposer quelque chose de réaliste.");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    coachMessage("Je suis là pour parler sport, forme, récup, motivation et alimentation simple. Pour le reste, je fais semblant d’être très concentré sur mes lacets.")
  ]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);
  const [hasCheckedCloudData, setHasCheckedCloudData] = useState(false);
  const [hasEditedReadiness, setHasEditedReadiness] = useState(false);
  const [hasEditedPlanner, setHasEditedPlanner] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Synchronisation locale active.");

  useEffect(() => {
    const savedProfile = readStorage("auto-coach-profile", initialProfile);
    const savedReadiness = readStorage("auto-coach-readiness", initialReadiness);
    const savedGarmin = readStorage("auto-coach-garmin-test", initialGarminMock);
    const savedForm = readStorage("auto-coach-planner", initialForm);
    const savedHistory = window.localStorage.getItem("auto-coach-history");
    const savedProgram = window.localStorage.getItem("auto-coach-current-program");

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
        setCloudStatus("Données synchronisées avec ton compte.");
      })
      .catch(() => setCloudStatus("Mode local actif. Connecte-toi pour synchroniser."))
      .finally(() => setHasCheckedCloudData(true));
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
    window.localStorage.setItem("auto-coach-planner", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-current-program", JSON.stringify(program));
  }, [program]);

  const localSummary = useMemo(() => buildShapeSummary(readiness, garminData, profile, form.priority, history), [readiness, garminData, profile, form.priority, history]);
  const userMemory = useMemo(() => buildUserMemory(history, profile), [history, profile]);
  const activeSummary = summary ?? localSummary;
  const selectedDayCount = form.plannedDays.filter((day) => day.selected).length;

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

  useEffect(() => {
    if (!hasLoadedLocalData || !hasCheckedCloudData || !hasEditedPlanner) return;

    const timeout = window.setTimeout(() => {
      void saveCloudPatch({ planner: form }, "Planification sauvegardée sur ton compte.").then((saved) => {
        if (saved) setHasEditedPlanner(false);
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedLocalData, hasCheckedCloudData, hasEditedPlanner, form, saveCloudPatch]);

  function updateReadiness(key: keyof Readiness, value: string | number) {
    setHasEditedReadiness(true);
    setReadiness((current) => ({ ...current, [key]: value }));
  }

  function togglePlannedDay(id: string) {
    setHasEditedPlanner(true);
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
    const fallbackProgram = generateProgram(readiness, coachForm, profile, garminData, history);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readiness, profile, garminData, form: coachForm, history })
      });
      const result = await response.json();
      const nextProgram = result.program?.length ? result.program : fallbackProgram;
      setProgram(nextProgram);
      setGlobalAdvice(buildGlobalAdvice(readiness, garminData, profile, coachForm, nextProgram));
      setSummary(result.summary ?? localSummary);
      await saveCloudPatch({
        readiness,
        garminData,
        planner: coachForm,
        currentProgram: nextProgram,
        memory: userMemory
      }, "Programme sauvegardé sur ton compte.");
      setCoachReply(
        result.source === "openai"
          ? "Programme généré avec l’IA connectée. J’ai gardé un ton prudent et humain."
          : "Programme généré en mode simulation intelligente. Tu peux déjà tester la logique avant OpenAI."
      );
    } catch {
      setProgram(fallbackProgram);
      setGlobalAdvice(buildGlobalAdvice(readiness, garminData, profile, coachForm, fallbackProgram));
      setSummary(localSummary);
      await saveCloudPatch({
        readiness,
        garminData,
        planner: coachForm,
        currentProgram: fallbackProgram,
        memory: userMemory
      }, "Programme sauvegardé sur ton compte.");
      setCoachReply("Le mode simulation a pris le relais. Le programme reste adapté aux données saisies.");
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
      session
    };

    setHistory((current) => {
      const nextHistory = [entry, ...current].slice(0, 10);
      void saveCloudPatch({ history: nextHistory, memory: buildUserMemory(nextHistory, profile) }, "Séance sauvegardée sur ton compte.");
      return nextHistory;
    });
    setCoachReply("Séance mémorisée. Elle servira de contexte pour les prochaines propositions.");
  }

  function deleteHistoryEntry(entryId: string) {
    setHistory((current) => {
      const nextHistory = current.filter((entry) => entry.id !== entryId);
      void saveCloudPatch({ history: nextHistory, memory: buildUserMemory(nextHistory, profile) }, "Historique mis à jour sur ton compte.");
      return nextHistory;
    });
  }

  function generateAlternativeSession(sessionId: string) {
    setProgram((current) => {
      const nextProgram = current.map((session) => {
        if (session.id !== sessionId) return session;

        const isRun = session.type.toLowerCase().includes("footing") || session.type.toLowerCase().includes("trail");
        const alternative = isRun
          ? {
              type: "renfo complémentaire maison",
              intensity: "facile",
              content: "Séance de renforcement simple pour remplacer la course sans perdre le fil.",
              detailedContent: "Échauffement 5 min\n3 séries de 15 squats lents\n3 séries de 10 fentes arrière par jambe\n3 x 30 sec de gainage\n3 séries de 12 ponts fessiers\n60 sec de récupération entre les exercices.",
              objective: "garder la régularité tout en réduisant l’impact.",
              reason: "variante proposée pour respecter les contraintes du jour sans répéter la même séance."
            }
          : {
              type: "footing facile alternatif",
              intensity: "facile",
              content: "Course douce et régulière, pensée comme une alternative simple à la séance prévue.",
              detailedContent: "8 min d’échauffement très facile\n20 à 30 min en aisance respiratoire\n5 min très faciles pour finir\nSi fatigue : alterner 4 min course / 1 min marche.",
              objective: "entretenir la régularité sans surcharge.",
              reason: "variante proposée pour offrir une option différente tout en gardant l’objectif du jour."
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
      "garmin",
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
      const reply = "Je suis ton coach sport et forme, pas le standard de toute la galaxie. Ramène-moi ça côté entraînement, sommeil, récup, motivation ou alimentation, et là je deviens très utile.";
      setCoachReply(reply);
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readiness, profile, garminData, form, history, message })
      });
      const result = await response.json();
      const reply = result.reply ?? `Je prends en compte: "${message}". On reste sur une approche simple, réaliste et durable. Allez, on construit ça proprement.`;
      setCoachReply(reply);
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
    } catch {
      const reply = `Je prends en compte: "${message}". On reste sur une approche simple, réaliste et durable. Pas besoin de jouer les machines, on veut durer.`;
      setCoachReply(reply);
      setChatMessages((current) => [...current, coachMessage(reply)].slice(-8));
    }
  }

  function toggleSessionDetails(sessionId: string) {
    setExpandedSessionIds((current) =>
      current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]
    );
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
              On construit une progression réaliste autour de ta vraie vie, pas autour d’un planning parfait qui n’existe jamais.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-moss/25 text-moss">
            <Leaf className="h-8 w-8" />
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Link href="/profil" className="rounded-2xl border border-night/10 bg-white/65 px-4 py-3 text-center text-sm text-mist">
          Profil
        </Link>
        <Link href="/garmin" className="rounded-2xl border border-night/10 bg-white/65 px-3 py-3 text-center text-sm text-mist">
          Connexions
        </Link>
        <Link href="/entreprise" className="rounded-2xl border border-night/10 bg-white/65 px-3 py-3 text-center text-sm text-mist">
          Entreprise
        </Link>
      </div>

      <AccountStatus />

      <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-night">Comment tu te sens aujourd’hui ?</h2>
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
        <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/75">{coachReply}</p>
      </section>

      <section className="mb-4 rounded-[28px] border border-night/10 bg-white/75 p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ember/15 text-ember">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-night">Ce que ton coach retient</p>
            <p className="text-sm leading-6 text-mist/80">{userMemory.insight}</p>
          </div>
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-[30px] border border-moss/25 bg-gradient-to-br from-white to-ink-950 p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-moss">Planification intelligente</p>
            <h2 className="text-2xl font-semibold leading-tight text-night">Programmer mes prochaines séances</h2>
            <p className="mt-3 text-sm leading-6 text-mist/70">
              Sélectionne les jours disponibles, puis ajoute tes vraies contraintes de vie.
            </p>
          </div>
          <CalendarDays className="h-7 w-7 shrink-0 text-ember" />
        </div>
        <button onClick={() => setShowPlanner((value) => !value)} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-stone-50 px-4 py-4 text-left font-medium text-night">
          <span>{showPlanner ? "Fermer la planification" : "Choisir mes jours"}</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>

      {showPlanner && (
        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/80 p-5">
          <h2 className="mb-4 text-lg font-medium text-night">Tes 10 prochains jours</h2>
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
                  <span className="mb-2 block text-sm text-mist/70">{day.dateLabel} · Envie ou contrainte pour ce jour</span>
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
              placeholder="Ex: semaine chargée, je veux éviter le bruit le soir, déplacement vendredi..."
              className="min-h-28 w-full resize-none rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35"
            />
          </label>

          <button disabled={isGenerating || selectedDayCount === 0} onClick={buildProgram} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-moss px-4 py-4 font-semibold text-night disabled:opacity-50">
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Le coach réfléchit..." : "Générer mon programme"}
          </button>
        </section>
      )}

      {program.length > 0 && (
        <section className="mb-4 rounded-[28px] border border-night/10 bg-white/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-night">Programme proposé</h2>
            <Dumbbell className="h-5 w-5 text-moss" />
          </div>
          <div className="space-y-4">
            {program.map((session) => (
              <article key={session.id} className="rounded-3xl bg-white/80 p-4">
                <p className="mb-1 text-sm font-semibold text-ember">{session.dateLabel}</p>
                <h3 className="text-lg font-medium text-night">{session.type}</h3>
                <p className="mt-1 text-sm text-mist/70">{session.duration} · intensité {session.intensity}</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-mist/75">
                  <p><span className="font-medium text-night">Contenu : </span>{session.content}</p>
                  <p><span className="font-medium text-night">Objectif : </span>{session.objective}</p>
                  <p className="rounded-2xl bg-moss/10 px-3 py-2"><span className="font-medium text-moss">Pourquoi ce choix : </span>{session.reason}</p>
                </div>
                <button
                  onClick={() => toggleSessionDetails(session.id)}
                  className="mt-4 w-full rounded-2xl border border-night/10 bg-white/65 px-4 py-3 text-sm font-medium text-night"
                >
                  {expandedSessionIds.includes(session.id) ? "Masquer le détail" : "Détailler la séance"}
                </button>

                {expandedSessionIds.includes(session.id) && (
                  <div className="mt-3 space-y-2 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-mist/80">
                    {session.detailedContent.split("\n").map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => generateAlternativeSession(session.id)}
                  className="mt-4 w-full rounded-2xl border border-ember/25 bg-ember/10 px-4 py-3 text-sm font-medium text-ember"
                >
                  Générer une autre séance du jour
                </button>
                <button onClick={() => saveSession(session)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-moss/30 bg-moss/15 px-4 py-3 font-medium text-moss">
                  <Check className="h-5 w-5" />
                  Mémoriser cette séance
                </button>
              </article>
            ))}
          </div>
          {globalAdvice && (
            <div className="mt-4 rounded-3xl border border-ember/20 bg-ember/10 p-4">
              <p className="text-sm font-semibold text-ember">{globalAdvice.title}</p>
              <p className="mt-2 text-sm leading-6 text-mist/80">{globalAdvice.body}</p>
            </div>
          )}
        </section>
      )}

      <section className="mb-5 rounded-[28px] border border-night/10 bg-white/80 p-5">
        <h2 className="mb-3 text-lg font-medium text-night">Historique local</h2>
        {history.length === 0 ? (
          <p className="text-sm leading-6 text-mist/60">Les programmes validés apparaîtront ici, uniquement sur cet appareil.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <article key={entry.id} className="rounded-2xl bg-white/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-night">{entry.title}</h3>
                    <p className="mt-1 text-sm text-mist/60">{entry.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-mist/45">{entry.date}</p>
                    <button onClick={() => deleteHistoryEntry(entry.id)} className="mt-3 rounded-full border border-night/10 px-3 py-1 text-xs text-mist/60">
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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

