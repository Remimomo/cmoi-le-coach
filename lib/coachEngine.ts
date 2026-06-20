import type { GarminMockData } from "./garminMock";

export type Readiness = {
  energy: number;
  sleep: number;
  stress: number;
  motivation: number;
  pain: number;
  time: string;
};

export type PlannedDay = {
  id: string;
  dateLabel: string;
  dayName: string;
  shortLabel: string;
  selected: boolean;
  note: string;
};

export type ProgramForm = {
  duration: string;
  priority: string;
  globalNotes: string;
  plannedDays: PlannedDay[];
};

export type UserProfile = {
  firstName: string;
  birthDate: string;
  sex: string;
  cycleLastPeriodStart: string;
  cycleAverageLength: string;
  cyclePeriodLength: string;
  goal: string;
  customGoal: string;
  level: string;
  favoriteSports: string;
  sessionsPerWeek: string;
  equipment: string;
  customEquipment: string;
  recurringConstraints: string;
};

export type ProgramSession = {
  id: string;
  day: string;
  dateLabel: string;
  type: string;
  duration: string;
  intensity: string;
  content: string;
  detailedContent: string;
  objective: string;
  reason: string;
};

export type ShapeSummary = {
  status: string;
  explanation: string;
};

export type CoachAdvice = {
  title: string;
  body: string;
};

export type QvtAnalysis = {
  sedentaryRisk: boolean;
  mentalLoad: boolean;
  accessibleMode: boolean;
  daysSinceLastTraining: number | null;
  recommendedSessionCount: number | null;
  signals: string[];
};

export type CycleContext = {
  cycleDay: number;
  phase: "règles" | "folliculaire" | "ovulation" | "lutéale";
  softSuggestion: boolean;
  summaryHint: string;
  programHint: string;
};

export type HistoryEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
  timestamp?: number;
  program?: ProgramSession[];
  session?: ProgramSession;
  relevanceScore?: number;
  relevanceHistory?: {
    value: number;
    timestamp: number;
  }[];
};

export const goalOptions = [
  "forme générale",
  "reprise sportive",
  "perte de poids",
  "trail",
  "10 km",
  "semi-marathon",
  "marathon",
  "swimrun",
  "renforcement",
  "autre"
];

export const levelOptions = ["débutant", "reprise", "intermédiaire", "confirmé"];
export const timeOptions = ["durée optimale", "20 min", "30 min", "40 min", "50 min", "1h", "1h30", "variable"];
export const priorityOptions = [
  "régularité",
  "récupération",
  "endurance",
  "renfo",
  "plaisir",
  "préparation course",
  "reprise douce"
];

export const qvtPillars = [
  {
    title: "Lutte contre la sédentarité",
    description: "Détecter les périodes avec peu de mouvement et proposer marche, mobilité ou séances courtes sans culpabiliser."
  },
  {
    title: "Réduction de la charge mentale",
    description: "Adapter le programme aux semaines chargées, déplacements, enfants, fatigue mentale et manque de temps."
  },
  {
    title: "Cohésion d'équipe",
    description: "Préparer des défis collectifs basés sur participation, régularité et diversité, jamais sur vitesse ou performance."
  },
  {
    title: "Activité physique accessible",
    description: "Inclure marche, mobilité, étirements, renforcement léger, footing, vélo et natation selon le profil."
  }
];

export const collectiveChallengeIdeas = [
  {
    title: "Défi anti-sédentarité",
    metric: "participation",
    description: "Un point pour chaque action simple: marche, mobilité, étirements ou séance courte."
  },
  {
    title: "Défi régularité inter-services",
    metric: "régularité",
    description: "Les équipes progressent grâce aux semaines actives, même avec des séances courtes."
  },
  {
    title: "Défi diversité inter-entreprises",
    metric: "diversité",
    description: "Marche, vélo, natation, renfo, mobilité et footing comptent tous pour inclure tous les niveaux."
  }
];

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getDaysSinceLastTraining(history: HistoryEntry[]) {
  const timestamps = history.map((entry) => entry.timestamp).filter((value): value is number => typeof value === "number");
  if (!timestamps.length) return null;

  const latest = Math.max(...timestamps);
  return Math.max(0, Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24)));
}

function parseHistoryMinutes(entry: HistoryEntry) {
  const match = entry.detail.match(/(\d+)\s*min/i);
  return match ? Number(match[1]) : 0;
}

function parseHistoryDistance(entry: HistoryEntry) {
  const match = entry.detail.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function getRecentActivityContext(history: HistoryEntry[]) {
  const entries = history
    .filter((entry) => typeof entry.timestamp === "number")
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));
  const latest = entries[0];

  if (!latest?.timestamp) {
    return {
      latest,
      daysSince: null as number | null,
      recentMinutes: 0,
      recentDistance: 0,
      hasRecentStrava: false,
      heavyRecentActivity: false
    };
  }

  const now = Date.now();
  const daysSince = Math.max(0, Math.floor((now - latest.timestamp) / (1000 * 60 * 60 * 24)));
  const recentEntries = entries.filter((entry) => (entry.timestamp ?? 0) >= now - 3 * 24 * 60 * 60 * 1000);
  const recentMinutes = recentEntries.reduce((total, entry) => total + parseHistoryMinutes(entry), 0);
  const recentDistance = recentEntries.reduce((total, entry) => total + parseHistoryDistance(entry), 0);
  const hasRecentStrava = recentEntries.some((entry) => entry.id.startsWith("strava-"));
  const heavyRecentActivity = daysSince <= 2 && (recentMinutes >= 75 || recentDistance >= 12);

  return { latest, daysSince, recentMinutes, recentDistance, hasRecentStrava, heavyRecentActivity };
}

function getFeedbackContext(history: HistoryEntry[]) {
  const ratedEntries = history.filter((entry) => typeof entry.relevanceScore === "number" && entry.session);
  if (!ratedEntries.length) {
    return {
      count: 0,
      average: null as number | null,
      trend: "",
      durationHint: "",
      intensityHint: "",
      typeHint: "",
      frequencyHint: "",
      weekMomentHint: "",
      bestDurationRange: ""
    };
  }

  const average = Math.round(ratedEntries.reduce((total, entry) => total + (entry.relevanceScore ?? 50), 0) / ratedEntries.length);
  const comfortableEntries = ratedEntries.filter((entry) => {
    const score = entry.relevanceScore ?? 50;
    return score >= 35 && score <= 65;
  });
  const tooHardEntries = ratedEntries.filter((entry) => (entry.relevanceScore ?? 50) > 65);
  const tooLightEntries = ratedEntries.filter((entry) => (entry.relevanceScore ?? 50) < 35);
  const comfortableDurations = comfortableEntries
    .map(parseHistoryMinutes)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  const bestDurationRange = comfortableDurations.length
    ? `${Math.max(20, Math.min(...comfortableDurations))} à ${Math.max(...comfortableDurations)} minutes`
    : "";
  const comfortableTypes = comfortableEntries.map((entry) => entry.session?.type ?? "").filter(Boolean);
  const typeCounts = comfortableTypes.reduce<Record<string, number>>((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  const preferredType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const firstHalfScores = ratedEntries.slice(Math.ceil(ratedEntries.length / 2)).map((entry) => entry.relevanceScore ?? 50);
  const secondHalfScores = ratedEntries.slice(0, Math.ceil(ratedEntries.length / 2)).map((entry) => entry.relevanceScore ?? 50);
  const firstAverage = firstHalfScores.length ? firstHalfScores.reduce((total, value) => total + value, 0) / firstHalfScores.length : average;
  const secondAverage = secondHalfScores.length ? secondHalfScores.reduce((total, value) => total + value, 0) / secondHalfScores.length : average;
  const trend = Math.abs(secondAverage - firstAverage) >= 10
    ? secondAverage > firstAverage
      ? "les dernières séances semblent un peu plus difficiles qu'avant"
      : "les dernières séances semblent mieux tolérées qu'avant"
    : "les retours sont assez stables";

  return {
    count: ratedEntries.length,
    average,
    trend,
    durationHint: bestDurationRange ? `Les séances de ${bestDurationRange} semblent actuellement les plus adaptées à ton quotidien.` : "",
    intensityHint: tooHardEntries.length > tooLightEntries.length
      ? "Réduire légèrement l'intensité ou ajouter plus de récupération."
      : tooLightEntries.length > tooHardEntries.length
        ? "Augmenter progressivement la durée ou l'intensité quand les autres signaux sont bons."
        : "Garder une intensité proche de l'actuel.",
    typeHint: preferredType ? `Le type "${preferredType}" ressort comme plutôt bien adapté.` : "",
    frequencyHint: tooHardEntries.length >= 2 ? "Éviter d'empiler trop de séances exigeantes la même semaine." : "",
    weekMomentHint: tooHardEntries.length >= 2 ? "Placer les séances les plus exigeantes après un jour plus léger." : "",
    bestDurationRange
  };
}

export function getGoal(profile: UserProfile) {
  return profile.goal.toLowerCase() === "autre" ? clean(profile.customGoal, "forme générale") : profile.goal.toLowerCase();
}

export function getEquipment(profile: UserProfile) {
  const equipment = profile.equipment.toLowerCase();
  if (!equipment || equipment === "aucun") return "poids du corps";
  return equipment;
}

function getFavoriteSports(profile: UserProfile) {
  return profile.favoriteSports?.toLowerCase() ?? "";
}

export function getAge(profile: UserProfile) {
  if (!profile.birthDate) return null;
  const birthDate = new Date(profile.birthDate);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;

  return age >= 0 && age <= 120 ? age : null;
}

function numberFromProfile(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCycleContext(profile: UserProfile): CycleContext | null {
  if (profile.sex !== "femme" || !profile.cycleLastPeriodStart) return null;

  const lastPeriodStart = new Date(profile.cycleLastPeriodStart);
  if (Number.isNaN(lastPeriodStart.getTime())) return null;

  const cycleLength = Math.min(45, Math.max(21, numberFromProfile(profile.cycleAverageLength, 28)));
  const periodLength = Math.min(10, Math.max(2, numberFromProfile(profile.cyclePeriodLength, 5)));
  const elapsedDays = Math.floor((Date.now() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
  if (elapsedDays < 0) return null;

  const cycleDay = (elapsedDays % cycleLength) + 1;
  const phase =
    cycleDay <= periodLength
      ? "règles"
      : cycleDay <= Math.max(periodLength + 1, 13)
        ? "folliculaire"
        : cycleDay <= 16
          ? "ovulation"
          : "lutéale";
  const softSuggestion = phase === "règles" || (phase === "lutéale" && cycleDay >= cycleLength - 4);

  return {
    cycleDay,
    phase,
    softSuggestion,
    summaryHint: softSuggestion
      ? "cycle actuel: privilégier une adaptation souple selon les sensations"
      : "cycle actuel pris en compte",
    programHint: softSuggestion
      ? " Compte tenu de la période actuelle du cycle et de ton ressenti, le programme garde une marge et reste entièrement adaptable."
      : " J'ai tenu compte de la période actuelle de ton cycle dans la construction du programme."
  };
}

export function createNextTenDays() {
  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  const shortFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });

  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const id = date.toISOString().slice(0, 10);
    const dateLabel = formatter.format(date);
    const shortLabel = shortFormatter.format(date);

    return {
      id,
      dateLabel,
      dayName: dateLabel.split(" ")[0],
      shortLabel,
      selected: index === 1 || index === 3 || index === 5,
      note: ""
    };
  });
}

export function mergePlannedDays(savedDays?: PlannedDay[]) {
  const freshDays = createNextTenDays();
  if (!savedDays?.length) return freshDays;

  return freshDays.map((day) => {
    const saved = savedDays.find((item) => item.id === day.id);
    return saved ? { ...day, selected: saved.selected, note: saved.note } : day;
  });
}

export function getReadinessScore(readiness: Readiness, garmin: GarminMockData) {
  const bodyBattery = Number(garmin.bodyBattery);
  const bodyBatteryScore = Number.isFinite(bodyBattery) ? Math.round(bodyBattery / 10) : 6;
  const stressPenalty = garmin.stress === "élevé" ? 2 : garmin.stress === "modéré" ? 1 : 0;
  const sleepPenalty = ["mauvais", "moyen"].includes(garmin.sleepQuality) ? 1 : 0;
  const load = readiness.stress + readiness.pain + stressPenalty + sleepPenalty;
  const positive = readiness.energy + readiness.sleep + readiness.motivation + bodyBatteryScore;

  return Math.max(1, Math.min(10, Math.round((positive * 1.15 - load * 0.72) / 4)));
}

export function buildShapeSummary(
  readiness: Readiness,
  garmin: GarminMockData,
  profile: UserProfile,
  priority: string,
  history: HistoryEntry[] = []
): ShapeSummary {
  const score = getReadinessScore(readiness, garmin);
  const qvt = analyzeQvtContext(readiness, garmin, profile, history);
  const recentActivity = getRecentActivityContext(history);
  const feedback = getFeedbackContext(history);
  const cycle = getCycleContext(profile);
  const age = getAge(profile);
  const goal = getGoal(profile);
  const sleepConcern = readiness.sleep <= 5;
  const stressConcern = readiness.stress >= 7;
  const loadConcern = readiness.energy <= 4 || garmin.trainingLoad === "élevée";
  const painConcern = readiness.pain >= 6 || !["", "aucune", "aucune douleur marquante"].includes(garmin.painNotes.toLowerCase());
  const status = score >= 7 ? "Tu peux avancer, tranquillement." : score >= 5 ? "On ajuste sans forcer." : "Aujourd'hui, on protège la régularité.";

  const signals = [
    sleepConcern ? "sommeil à ménager" : "",
    stressConcern ? "stress haut" : "",
    loadConcern ? "énergie basse ou charge élevée" : "",
    painConcern ? "une douleur mérite de rester prudente" : "",
    cycle ? cycle.summaryHint : "",
    age !== null ? `âge pris en compte: ${age} ans` : ""
  ].filter(Boolean);
  const daysSinceLastTraining = getDaysSinceLastTraining(history);
  const historyMessage =
    daysSinceLastTraining !== null
       ? daysSinceLastTraining === 0
         ? "séance très récente"
        : daysSinceLastTraining >= 5
           ? "plusieurs jours sans séance"
          : ""
      : "pas encore d'historique récent";
  const qvtSignal = qvt.mentalLoad
    ? "charge mentale à alléger"
    : qvt.sedentaryRisk
      ? "activité récente faible"
      : "";
  const stravaSignal = recentActivity.hasRecentStrava
    ? recentActivity.heavyRecentActivity
      ? `Strava récent chargé: ${recentActivity.recentDistance.toFixed(1)} km / ${recentActivity.recentMinutes} min sur 3 jours`
      : "activité Strava récente prise en compte"
    : "";
  const feedbackSignal = feedback.count >= 2
    ? feedback.durationHint || `Pertinence moyenne récente: ${feedback.average}/100`
    : "";
  const markedSignals = [...signals, historyMessage, stravaSignal, feedbackSignal, qvtSignal].filter(Boolean).slice(0, 5);
  const signalText = markedSignals.length ? markedSignals.join(", ") : "les voyants principaux sont corrects";
  const direction = sleepConcern || stressConcern || loadConcern || painConcern
    ? "On garde une marge, mais le contenu reste relié à ton objectif."
    : "On peut viser une séance utile, sans surcharger.";

  return {
    status,
    explanation: `Points marquants: ${signalText}. Objectif: ${goal.toLowerCase()}. Priorité: ${priority.toLowerCase()}. ${direction}`
  };
}

function has(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function countRecentSessions(history: HistoryEntry[], days = 14) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((entry) => typeof entry.timestamp === "number" && entry.timestamp >= since).length;
}

function getConstraintText(profile: UserProfile, form?: ProgramForm) {
  const dayNotes = form?.plannedDays.map((day) => day.note).join(" ") ?? "";
  return `${profile.recurringConstraints} ${form?.globalNotes ?? ""} ${dayNotes}`.toLowerCase();
}

export function analyzeQvtContext(
  readiness: Readiness,
  garmin: GarminMockData,
  profile: UserProfile,
  history: HistoryEntry[] = [],
  form?: ProgramForm
): QvtAnalysis {
  const daysSinceLastTraining = getDaysSinceLastTraining(history);
  const recentSessions = countRecentSessions(history, 14);
  const recentActivity = getRecentActivityContext(history);
  const hasRecentTraining = daysSinceLastTraining !== null && daysSinceLastTraining <= 4;
  const hasAnyRecentActivity = hasRecentTraining || recentActivity.hasRecentStrava;
  const constraintText = getConstraintText(profile, form);
  const mentalLoad = has(constraintText, [
    "semaine charg",
    "charge mentale",
    "déplacement",
    "deplacement",
    "professionnel",
    "enfant",
    "manque de temps",
    "fatigue mentale",
    "boulot",
    "travail",
    "réunion",
    "reunion"
  ]);
  const sedentaryRisk =
    (!hasAnyRecentActivity && (garmin.lastActivity === "repos" || garmin.lastActivityDuration === "repos")) ||
    (daysSinceLastTraining === null && !recentActivity.hasRecentStrava) ||
    (daysSinceLastTraining !== null && daysSinceLastTraining >= 5) ||
    (!hasAnyRecentActivity && recentSessions <= 1) ||
    (!hasAnyRecentActivity && garmin.trainingLoad === "faible" && recentSessions <= 2);
  const accessibleMode =
    sedentaryRisk ||
    mentalLoad ||
    readiness.energy <= 4 ||
    readiness.stress >= 7 ||
    readiness.pain >= 6 ||
    profile.level === "débutant" ||
    profile.level === "reprise";
  const selectedDays = form?.plannedDays.filter((day) => day.selected).length ?? null;
  const recommendedSessionCount = selectedDays === null ? null : mentalLoad || sedentaryRisk ? Math.min(selectedDays, 2) : selectedDays;
  const signals = [
    sedentaryRisk ? "peu d'activité récente" : "",
    mentalLoad ? "charge mentale ou contraintes élevées" : "",
    accessibleMode ? "activité accessible à privilégier" : ""
  ].filter(Boolean);

  return { sedentaryRisk, mentalLoad, accessibleMode, daysSinceLastTraining, recommendedSessionCount, signals };
}

function optimalDuration(readiness: Readiness, garmin: GarminMockData) {
  if (shouldBeEasy(readiness, garmin)) return "30 min";
  if (garmin.trainingLoad === "faible" && readiness.energy >= 7 && readiness.motivation >= 7) return "50 min";
  return "40 min";
}

function durationFromNote(note: string, fallback: string, readiness: Readiness, garmin: GarminMockData) {
  const match = note.match(/(\d{2,3})\s*(min|minutes)/i);
  if (match) return `${match[1]} min`;
  if (note.toLowerCase().includes("courte")) return "25 min";
  if (note.toLowerCase().includes("longue")) return "1h";
  if (fallback === "durée optimale") return optimalDuration(readiness, garmin);
  return fallback === "variable" ? "40 min" : fallback;
}

function durationMinutes(duration: string) {
  const hourMatch = duration.match(/^1h(?:(\d{2}))?$/i);
  if (hourMatch) return 60 + (hourMatch[1] ? Number(hourMatch[1]) : 0);

  const minuteMatch = duration.match(/(\d{2,3})\s*min/i);
  return minuteMatch ? Number(minuteMatch[1]) : null;
}

function formatDurationFromMinutes(minutes: number) {
  if (minutes >= 90) return "1h30";
  if (minutes >= 75) return "1h15";
  if (minutes >= 60) return "1h";
  return `${minutes} min`;
}

function adjustDurationForLevel(duration: string, profile: UserProfile, easy: boolean, painful: boolean) {
  const minutes = durationMinutes(duration);
  if (!minutes) return duration;
  const age = getAge(profile);

  if (profile.level === "confirmé" && !easy && !painful) {
    const upperLimit = age !== null && age >= 55 ? 65 : 75;
    return formatDurationFromMinutes(Math.min(upperLimit, Math.max(minutes + 15, 50)));
  }

  if ((profile.level === "débutant" || profile.level === "reprise") && minutes > 40) {
    return "40 min";
  }

  return duration;
}

function shouldBeEasy(readiness: Readiness, garmin: GarminMockData) {
  return (
    readiness.energy <= 4 ||
    readiness.sleep <= 5 ||
    readiness.stress >= 7 ||
    (readiness.energy <= 6 && Number(garmin.bodyBattery) <= 40) ||
    garmin.trainingLoad === "élevée"
  );
}

function isPerformanceGoal(goal: string) {
  return has(goal, ["gagner", "course", "swimrun", "swim run", "trail", "10 km", "semi", "marathon", "objectif"]);
}

function chooseSession(day: PlannedDay, form: ProgramForm, readiness: Readiness, garmin: GarminMockData, profile: UserProfile, history: HistoryEntry[] = []) {
  const note = `${day.note} ${form.globalNotes}`.toLowerCase();
  const goalText = getGoal(profile).toLowerCase();
  const favoriteSports = getFavoriteSports(profile);
  const preferenceText = `${note} ${goalText} ${favoriteSports}`;
  const qvt = analyzeQvtContext(readiness, garmin, profile, history, form);
  const cycle = getCycleContext(profile);
  const cycleSoftMode = Boolean(cycle?.softSuggestion && (readiness.energy <= 6 || readiness.stress >= 6 || readiness.pain >= 4));
  const easy = shouldBeEasy(readiness, garmin) || cycleSoftMode;
  const painful = readiness.pain >= 6 || garmin.painNotes.toLowerCase().includes("genou");
  const duration = adjustDurationForLevel(durationFromNote(day.note || form.globalNotes, form.duration, readiness, garmin), profile, easy, painful);
  const confirmed = profile.level === "confirmé";
  const beginner = profile.level === "débutant" || profile.level === "reprise";
  const performanceGoal = isPerformanceGoal(goalText);

  if (qvt.sedentaryRisk && !performanceGoal && !has(note, ["trail", "fractionn", "renfo", "courir", "footing", "velo", "vélo", "natation"])) {
    return {
      type: "marche active + mobilité",
      duration: "20 min",
      intensity: "facile",
      content: "Marche accessible, mobilité douce et respiration. Objectif: remettre du mouvement sans pression.",
      detailedContent: "Marche confortable: 12 min\nMobilité épaules/dos: 3 min\nMobilité hanches/mollets: 3 min\nRespiration calme: 2 min\nRécupération: stop si la fatigue monte",
      objective: "lutter contre la sédentarité avec une action simple et réaliste.",
      reason: "tu sembles avoir peu bougé récemment; une courte marche est déjà bénéfique et plus durable qu'une séance ambitieuse mal placée."
    };
  }

  if (qvt.mentalLoad && !performanceGoal && !has(note, ["longue", "intense", "fractionn", "trail"])) {
    return {
      type: "séance courte anti-charge mentale",
      duration: "25 min",
      intensity: "facile",
      content: "Format court: marche rapide ou footing très doux, puis 6 minutes de mobilité. Simple, faisable, sans charge mentale ajoutée.",
      detailedContent: "Échauffement très facile: 5 min\nMarche rapide ou footing doux: 14 min\nGainage doux: 2 x 30 sec\nSquats lents: 2 x 8\nMobilité dos/hanches: 4 min\nRécupération: finir avec de la marge",
      objective: "préserver la régularité pendant une période chargée.",
      reason: "les contraintes de vie indiquent une charge mentale élevée; le coach réduit volontairement l'ambition pour proposer une séance tenable."
    };
  }

  if (has(note, ["repos obligatoire", "repos"])) {
    return {
      type: "récupération active",
      duration: "20 min",
      intensity: "facile",
      content: "Marche douce, mobilité légère et respiration. Aucune séance structurée.",
      detailedContent: "Marche très douce: 10 min\nMobilité hanches/dos: 5 min\nRespiration calme: 5 min\nRécupération: arrêt si une douleur augmente",
      objective: "respecter une contrainte de repos tout en gardant un minimum de mouvement.",
      reason: "tu as indiqué une contrainte de repos, donc le coach protège la récupération."
    };
  }

  if (has(preferenceText, ["swimrun", "swim run", "nage", "natation", "piscine"])) {
    const swimRunIntensity = easy || painful || beginner ? "modérée" : confirmed ? "intense" : "modérée";

    return {
      type: "enchaînement swimrun spécifique",
      duration,
      intensity: swimRunIntensity,
      content: "Séance orientée swimrun: aisance course, renfo utile au haut du corps et transitions courtes. Si pas d'accès piscine, remplace la nage par tirage élastique.",
      detailedContent:
        "Échauffement course très facile: 8 min\nCourse aisance respiratoire: 3 x 8 min\nRécupération entre blocs course: 2 min marche\nTirage élastique ou nage facile: 3 x 4 min\nRécupération entre blocs nage/tirage: 1 min\nGainage ventral: 3 x 30 sec\nRetour au calme: 5 min très faciles",
      objective: "progresser vers ton objectif swimrun sans perdre le lien entre course, nage et transitions.",
      reason: has(favoriteSports, ["natation", "swim", "nage"]) && !has(goalText, ["swimrun", "swim run", "nage", "natation"])
        ? "la séance respecte tes sports favoris tout en gardant une place au complément course/renfo."
        : "l'objectif déclaré est spécifique; même en restant prudent, la séance garde un contenu utile pour le swimrun."
    };
  }

  if (has(preferenceText, ["trail", "montagne", "dénivelé"])) {
    const requestedIntense = has(note, ["intense", "fort", "dur"]);
    const adjustedIntensity = easy || painful || beginner ? "modérée" : requestedIntense || confirmed ? "intense" : "modérée";

    return {
      type: requestedIntense ? "trail en montagne contrôlé" : "trail vallonné",
      duration,
      intensity: adjustedIntensity,
      content:
        adjustedIntensity === "intense"
           ? "Échauffement 12 min, puis blocs de montée soutenue avec descentes très contrôlées. Finir par 8 min faciles."
          : "Parcours vallonné en aisance, montées régulières sans se mettre dans le rouge, descentes prudentes et fin très facile.",
      detailedContent:
        adjustedIntensity === "intense"
           ? "Échauffement très facile: 12 min\nMontée soutenue: 5 x 3 min\nRécupération: 2 min en descente ou marche entre les blocs\nRetour au calme: 8 min faciles\nDescente: priorité technique, pas vitesse"
          : "Échauffement facile: 10 min\nTerrain vallonné en aisance: 30 à 40 min\nMontées raides: marche autorisée\nRetour au calme: 5 à 8 min très faciles",
      objective: "respecter ton envie de trail tout en gardant une charge maîtrisée.",
      reason:
        requestedIntense && adjustedIntensity !== "intense"
           ? "tu as demandé un trail intense en montagne, mais les signaux de forme invitent à réduire l'intensité pour éviter une surcharge."
          : "respecte ta demande de trail intense en montagne et l'intègre dans une séance structurée."
    };
  }

  if (painful) {
    return {
      type: "mobilité + renfo doux",
      duration,
      intensity: "facile",
      content: "Mobilité hanches/mollets, gainage court, squats très contrôlés et marche si tout est confortable.",
      detailedContent: "Circuit tranquille: 2 tours\nSquats lents: 8 reps\nFentes arrière: 8 reps par jambe\nGainage: 20 sec\nPonts fessiers: 10 reps\nRécupération: 45 sec entre exercices\nMobilité finale: 5 min",
      objective: "rester régulier sans augmenter l'impact.",
      reason: "les douleurs signalées invitent à limiter la course et à privilégier un travail contrôlé."
    };
  }

  if (has(note, ["renfo", "haut du corps", "gainage"]) || form.priority === "renfo" || has(preferenceText, ["renfo", "renforcement", "muscu", "gainage"])) {
    return {
      type: has(note, ["haut du corps"]) ? "renfo haut du corps" : "renfo maison",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "modérée",
      content: `Échauffement 6 min, puis 3 blocs avec ${getEquipment(profile)}: poussée, tirage si possible, jambes contrôlées, gainage. Finir avec 4 min de mobilité.`,
      detailedContent: has(note, ["haut du corps"])
         ? `Échauffement: ${confirmed ? "8" : "6"} min\nPompes inclinées: ${confirmed ? "5" : "4"} x 10 à 15\nTirages avec ${getEquipment(profile)}: ${confirmed ? "5" : "4"} x 12\nGainage: ${confirmed ? "5 x 40 sec" : "4 x 30 sec"}\nRécupération: ${confirmed ? "45 sec" : "60 sec"} entre exercices\nMobilité épaules/dos: 4 min`
        : `Échauffement: ${confirmed ? "8" : "6"} min\nSquats lents: ${confirmed ? "5" : "4"} x 15 à 20\nFentes arrière: ${confirmed ? "5" : "4"} x 10 par jambe\nPonts fessiers: ${confirmed ? "5" : "4"} x 12\nGainage: ${confirmed ? "5 x 40 sec" : "4 x 30 sec"}\nRécupération: ${confirmed ? "45 sec" : "60 sec"} entre exercices`,
      objective: "Équilibrer course et renforcement sans ajouter trop d'impact.",
      reason: has(note, ["haut du corps", "renfo"])
         ? "respecte ta demande précise et garde une charge maîtrisée."
        : "ajoute du renforcement utile pour soutenir la régularité."
    };
  }

  if (has(note, ["sortie longue", "longue"])) {
    return {
      type: "sortie longue tranquille",
      duration,
      intensity: easy ? "facile" : "modérée",
      content: "Course en aisance respiratoire, terrain simple, sans accélération. Si la forme baisse, alterner 8 min course / 2 min marche.",
      detailedContent: "Échauffement très facile: 10 min\nCourse continue en aisance: bloc principal\nOption fatigue: 8 min course / 2 min marche\nRetour au calme: 5 min lentes\nRécupération: hydratation et marche 3 min",
      objective: "développer l'endurance sans courir après la performance.",
      reason: "respecte ton envie de sortie longue tout en gardant une intensité compatible avec ton état actuel."
    };
  }

  if (has(note, ["plat", "courir", "footing"]) || has(preferenceText, ["10 km", "semi", "marathon", "trail", "swimrun", "courir", "course", "running", "footing"])) {
    const confirmedHardRun = confirmed && !easy && !painful;

    return {
      type: confirmedHardRun ? "course intense structurée" : has(note, ["plat"]) ? "footing facile sur plat" : "footing facile",
      duration,
      intensity: easy || beginner ? "facile" : confirmedHardRun ? "intense" : "modérée",
      content: confirmedHardRun
         ? "Séance course exigeante: échauffement long, blocs soutenus, récupérations courtes et retour au calme. L'objectif est de provoquer une vraie adaptation, sans négliger la récupération."
        : "8 min d'échauffement, course régulière en aisance, puis 5 min très faciles. Rester capable de parler tout du long.",
      detailedContent: has(note, ["fractionné"])
         ? `Échauffement facile: ${confirmed ? "15" : "12"} min\nRépétitions rapides contrôlées: ${confirmed ? "10" : "8"} x 1 min\nRécupération: 1 min très facile entre répétitions\nRetour au calme: 8 min faciles`
        : confirmedHardRun
          ? "Échauffement progressif: 15 min\nBloc tempo soutenu: 3 x 8 min\nRécupération: 2 min très facile entre les blocs\nAccélérations relâchées: 4 x 20 sec\nRécupération: 1 min complète entre accélérations\nRetour au calme: 10 min faciles"
          : "Échauffement: 8 à 10 min\nCourse régulière en aisance: bloc principal\nRetour au calme: 5 min très faciles\nRécupération: étirements légers si besoin",
      objective: confirmedHardRun ? "développer une intensité utile à ton objectif sportif." : "construire une base solide et répétable.",
      reason: has(note, ["plat", "courir"])
         ? confirmedHardRun
           ? "respecte ta demande de course et ton niveau confirmé: la charge est volontairement plus haute, avec des récupérations prévues."
          : "respecte ta demande utilisateur et évite une surcharge car les signaux de récupération sont pris en compte."
        : confirmedHardRun
          ? "ton niveau confirmé et ton objectif permettent une séance vraiment structurée quand les signaux sont bons."
          : "reste cohérent avec ton objectif tout en gardant une marge de récupération."
    };
  }

  if (has(favoriteSports, ["vélo", "velo", "cyclisme", "bike"])) {
    return {
      type: "vélo endurance souple",
      duration,
      intensity: easy || beginner ? "facile" : "modérée",
      content: "Sortie vélo en endurance, utile pour développer le cardio avec moins d'impact que la course.",
      detailedContent: "Échauffement souple: 8 min\nVélo en aisance: 25 à 40 min\nCadence fluide: rester capable de parler\nRetour au calme: 5 min très faciles\nRécupération: hydratation et jambes légères",
      objective: "utiliser un sport que tu apprécies pour construire l'endurance sans surcharge.",
      reason: "tes sports favoris orientent la proposition, tout en gardant de la variété pour compléter ton objectif."
    };
  }

  return {
    type: easy ? "séance douce mixte" : confirmed ? "course progressive intense" : "course facile + éducatifs",
    duration,
    intensity: easy ? "facile" : confirmed ? "intense" : "modérée",
    content: easy
       ? "Marche rapide ou course très douce, puis 8 min de gainage et mobilité."
      : confirmed
        ? "Course progressive avec un bloc soutenu, éducatifs et récupération intégrée."
        : "Course facile, 4 lignes droites relâchées, puis mobilité courte.",
    detailedContent: easy
       ? "Marche rapide ou course douce: 20 min\nGainage: 2 x 20 sec\nSquats lents: 2 x 8\nPonts fessiers: 2 x 8\nMobilité dos/hanches: 4 min\nRécupération: garder une marge nette"
      : confirmed
        ? "Échauffement facile: 12 min\nCourse progressive: 20 min de modéré à soutenu\nBloc rapide contrôlé: 6 x 45 sec\nRécupération: 75 sec très facile entre les blocs\nRetour au calme: 8 min faciles"
        : "Échauffement facile: 10 min\nCourse calme: 20 à 30 min\nLignes droites relâchées: 4 x 15 sec\nRécupération: complète entre chaque ligne droite",
    objective: confirmed ? "créer une vraie stimulation adaptée à un niveau confirmé." : "installer la régularité sans pression.",
    reason: "choix équilibré entre objectif, forme du jour, charge récente et contraintes disponibles."
  };
}

export function generateProgram(
  readiness: Readiness,
  form: ProgramForm,
  profile: UserProfile,
  garmin: GarminMockData,
  history: HistoryEntry[] = []
): ProgramSession[] {
  const selectedDays = form.plannedDays.filter((day) => day.selected);
  const qvt = analyzeQvtContext(readiness, garmin, profile, history, form);
  const recentActivity = getRecentActivityContext(history);
  const feedback = getFeedbackContext(history);
  const cycle = getCycleContext(profile);
  const age = getAge(profile);
  const recentProgramCount = history.filter((entry) => entry.program?.length).length;
  const levelHint =
    profile.level === "confirmé"
       ? " Ton niveau confirmé autorise une séance plus exigeante quand les signaux de forme sont bons."
      : profile.level === "débutant" || profile.level === "reprise"
         ? " Ton niveau invite à garder une marge confortable pour construire sans brûler les étapes."
        : " Ton niveau intermédiaire permet de progresser sans chercher l'intensité maximale à chaque séance.";
  const ageHint = age !== null ? ` Ton âge (${age} ans) est intégré pour doser progressivement la charge.` : "";
  const cycleHint = cycle?.programHint ?? "";
  let previousWasHard = false;
  let previousWasLong = false;

  return selectedDays.map((day, index) => {
    const performanceGoal = isPerformanceGoal(getGoal(profile));
    const overRealisticLimit = !performanceGoal && qvt.recommendedSessionCount !== null && index >= qvt.recommendedSessionCount;
    const session = overRealisticLimit
       ? {
          type: "récupération active accessible",
          duration: "15 min",
          intensity: "facile",
          content: "Marche douce, mobilité ou étirements. L'objectif est de garder le lien avec le mouvement sans ajouter une vraie séance.",
          detailedContent: "Marche douce: 8 min\nMobilité dos/épaules: 3 min\nMobilité hanches/mollets: 3 min\nRespiration calme: 1 min\nRécupération: stop si cela ajoute de la fatigue",
          objective: "maintenir la régularité sans augmenter la charge mentale.",
          reason: "la période semble chargée ou peu active récemment; le programme réduit volontairement le nombre de vraies séances pour rester réaliste."
        }
      : chooseSession(day, form, readiness, garmin, profile, history);
    const isHard = session.intensity === "intense" || session.type.toLowerCase().includes("fractionné");
    const shouldSoften =
      previousWasHard ||
      previousWasLong ||
      (index === 0 && recentActivity.heavyRecentActivity) ||
      (index === 0 && cycle?.softSuggestion && isHard) ||
      (index === 0 && feedback.average !== null && feedback.average > 65);
    const coordinatedSession =
      shouldSoften && isHard
         ? {
            ...session,
            intensity: "modérée",
            content: `${session.content} L'intensité est volontairement plafonnée car la séance précédente était déjà exigeante.`,
            detailedContent: `${session.detailedContent} Ne cherche pas à battre un record aujourd'hui : garde une marge sur chaque répétition.`,
            reason: `${session.reason} La séance est coordonnée avec la précédente pour éviter deux charges fortes de suite.`
          }
        : session;
  const recentHint = recentActivity.heavyRecentActivity
    ? " Strava montre une charge récente notable, donc la première séance garde une marge."
    : recentActivity.hasRecentStrava
      ? " Les dernières activités Strava sont prises en compte dans la progression."
      : recentProgramCount > 0
        ? " L'historique local montre déjà un programme récent, donc la progression reste prudente."
        : "";
    const feedbackHint = feedback.count >= 2
      ? ` Retour pertinence: ${feedback.trend}. ${feedback.durationHint} ${feedback.intensityHint} ${feedback.frequencyHint} ${feedback.weekMomentHint}`.trim()
      : "";
    const sequenceHint =
      index === 0
         ? " Première séance placée avec une marge pour entrer progressivement dans la période."
        : shouldSoften
           ? " Cette séance est volontairement plus contrôlée car la précédente était chargée."
          : " Elle s'insère dans une progression équilibrée avec les autres jours choisis.";

    previousWasHard = coordinatedSession.intensity === "intense";
    previousWasLong = coordinatedSession.type.toLowerCase().includes("longue") || coordinatedSession.duration.includes("1h");

    return {
      id: `${day.id}-${coordinatedSession.type}`,
      day: day.dayName,
      dateLabel: day.dateLabel,
      ...coordinatedSession,
      reason: `${coordinatedSession.reason}${sequenceHint}${recentHint}${levelHint}${ageHint}${cycleHint}${feedbackHint ? ` ${feedbackHint}` : ""}`
    };
  });
}

export function buildGlobalAdvice(
  readiness: Readiness,
  garmin: GarminMockData,
  profile: UserProfile,
  form: ProgramForm,
  program: ProgramSession[]
): CoachAdvice {
  const selectedCount = form.plannedDays.filter((day) => day.selected).length;
  const offDays = form.plannedDays.filter((day) => !day.selected);
  const easy = shouldBeEasy(readiness, garmin);
  const qvt = analyzeQvtContext(readiness, garmin, profile, [], form);
  const cycle = getCycleContext(profile);
  const age = getAge(profile);
  const hasRenfo = program.some((session) => session.type.toLowerCase().includes("renfo") || session.content.toLowerCase().includes("gainage"));
  const nextOffDay = offDays[0].shortLabel;
  const goal = getGoal(profile);

  if (easy) {
    return {
      title: "Conseil global",
      body: nextOffDay
         ? `Vu les signaux de fatigue, garde ${nextOffDay} comme vrai jour de récupération. Si tu te sens mieux, ajoute seulement 10 min de mobilité ou de gainage facile.`
        : "Vu les signaux de fatigue, évite d'ajouter une séance. Le meilleur choix est de garder de la marge et de privilégier la récupération."
    };
  }

  if (cycle?.softSuggestion) {
    return {
      title: "Conseil global",
      body: "Compte tenu de la période actuelle et de ton ressenti, garde une marge sur les intensités. Le programme proposé reste entièrement adaptable à tes sensations."
    };
  }

  if (qvt.sedentaryRisk) {
    return {
      title: "Conseil global QVT",
      body: "Le plus rentable cette semaine est de casser les longues périodes assises: ajoute 2 à 3 marches de 10 minutes quand c'est possible. Pas besoin de tenue de sport, juste remettre le corps en mouvement."
    };
  }

  if (qvt.mentalLoad) {
    return {
      title: "Conseil global QVT",
      body: "Ta semaine semble chargée. Garde le programme volontairement simple: deux vraies séances suffisent, le reste peut être marche, mobilité ou repos assumé. La régularité gagne quand elle respecte la vraie vie."
    };
  }

  if (!hasRenfo && selectedCount <= 3) {
    return {
      title: "Conseil global",
      body: nextOffDay
         ? `Pour optimiser ton objectif ${goal}, ajoute si possible 10 min de gainage très simple sur ${nextOffDay}, sans transformer ce jour en vraie séance.`
        : `Pour optimiser ton objectif ${goal}, ajoute 8 à 10 min de gainage à la fin d'une séance facile.`
    };
  }

  if (selectedCount >= 5) {
    return {
      title: "Conseil global",
    body: "Tu as sélectionné beaucoup de jours. Garde au moins une séance très facile et accepte de transformer une séance en repos si le sommeil baisse."
    };
  }

  return {
    title: "Conseil global",
    body: `Le programme est cohérent avec ton objectif ${goal}. ${age !== null ? `Ton âge (${age} ans) est intégré pour doser la progression. ` : ""}Garde une intensité confortable sur les premières séances et ajuste seulement si les sensations restent bonnes.`
  };
}
