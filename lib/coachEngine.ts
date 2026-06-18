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
  goal: string;
  customGoal: string;
  level: string;
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

export type HistoryEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
  timestamp?: number;
  program?: ProgramSession[];
  session?: ProgramSession;
};

export const goalOptions = [
  "forme gÃ©nÃ©rale",
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

export const levelOptions = ["dÃ©butant", "reprise", "intermÃ©diaire", "confirmÃ©"];
export const timeOptions = ["durÃ©e optimale", "20 min", "30 min", "40 min", "50 min", "1h", "1h30", "variable"];
export const priorityOptions = [
  "rÃ©gularitÃ©",
  "rÃ©cupÃ©ration",
  "endurance",
  "renfo",
  "plaisir",
  "prÃ©paration course",
  "reprise douce"
];

export const qvtPillars = [
  {
    title: "Lutte contre la sÃ©dentaritÃ©",
    description: "DÃ©tecter les pÃ©riodes avec peu de mouvement et proposer marche, mobilitÃ© ou sÃ©ances courtes sans culpabiliser."
  },
  {
    title: "RÃ©duction de la charge mentale",
    description: "Adapter le programme aux semaines chargÃ©es, dÃ©placements, enfants, fatigue mentale et manque de temps."
  },
  {
    title: "CohÃ©sion d'Ã©quipe",
    description: "PrÃ©parer des dÃ©fis collectifs basÃ©s sur participation, rÃ©gularitÃ© et diversitÃ©, jamais sur vitesse ou performance."
  },
  {
    title: "ActivitÃ© physique accessible",
    description: "Inclure marche, mobilitÃ©, Ã©tirements, renforcement lÃ©ger, footing, vÃ©lo et natation selon le profil."
  }
];

export const collectiveChallengeIdeas = [
  {
    title: "DÃ©fi anti-sÃ©dentaritÃ©",
    metric: "participation",
    description: "Un point pour chaque action simple: marche, mobilitÃ©, Ã©tirements ou sÃ©ance courte."
  },
  {
    title: "DÃ©fi rÃ©gularitÃ© inter-services",
    metric: "rÃ©gularitÃ©",
    description: "Les Ã©quipes progressent grÃ¢ce aux semaines actives, mÃªme avec des sÃ©ances courtes."
  },
  {
    title: "DÃ©fi diversitÃ© inter-entreprises",
    metric: "diversitÃ©",
    description: "Marche, vÃ©lo, natation, renfo, mobilitÃ© et footing comptent tous pour inclure tous les niveaux."
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

export function getGoal(profile: UserProfile) {
  return profile.goal.toLowerCase() === "autre" ? clean(profile.customGoal, "forme gÃ©nÃ©rale") : profile.goal.toLowerCase();
}

export function getEquipment(profile: UserProfile) {
  const equipment = profile.equipment.toLowerCase();
  if (!equipment || equipment === "aucun") return "poids du corps";
  return equipment;
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
  const stressPenalty = garmin.stress === "Ã©levÃ©" ? 2 : garmin.stress === "modÃ©rÃ©" ? 1 : 0;
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
  const goal = getGoal(profile);
  const sleepConcern = ["mauvais", "moyen"].includes(garmin.sleepQuality) || readiness.sleep <= 5;
  const stressConcern = garmin.stress === "Ã©levÃ©" || readiness.stress >= 7;
  const loadConcern = garmin.trainingLoad === "Ã©levÃ©e";
  const painConcern = readiness.pain >= 6 || !["", "aucune", "aucune douleur marquante"].includes(garmin.painNotes.toLowerCase());
  const status = score >= 7 ? "Tu peux avancer, tranquillement." : score >= 5 ? "On ajuste sans forcer." : "Aujourdâ€™hui, on protÃ¨ge la rÃ©gularitÃ©.";

  const signals = [
    sleepConcern ? "ton sommeil semble moyen" : "ton sommeil semble correct",
    stressConcern ? "le stress est haut" : "ton stress reste gÃ©rable",
    loadConcern ? "ta charge rÃ©cente est Ã©levÃ©e" : "ta charge rÃ©cente est modÃ©rÃ©e",
    painConcern ? "une douleur mÃ©rite de rester prudente" : ""
  ].filter(Boolean);
  const hasRecentTraining = history.length > 0;
  const daysSinceLastTraining = getDaysSinceLastTraining(history);
  const encouragement =
    readiness.motivation >= 7
      ? "Ta motivation est bonne, donc on lâ€™utilise intelligemment sans partir en mode hÃ©ros de film dÃ¨s lâ€™Ã©chauffement."
      : "La motivation nâ€™a pas besoin dâ€™Ãªtre parfaite: aujourdâ€™hui, on vise surtout une action simple qui relance la machine.";
  const historyMessage =
    daysSinceLastTraining !== null
      ? daysSinceLastTraining === 0
        ? "Tu as une sÃ©ance mÃ©morisÃ©e trÃ¨s rÃ©cente: le programme garde donc de la marge pour Ã©viter dâ€™empiler de la fatigue."
        : daysSinceLastTraining >= 5
          ? "Cela fait plusieurs jours sans sÃ©ance mÃ©morisÃ©e: reprise douce conseillÃ©e, histoire de rÃ©veiller le corps sans lui envoyer une facture."
          : "Ta derniÃ¨re sÃ©ance mÃ©morisÃ©e est assez rÃ©cente: on peut avancer, mais avec une progression propre."
      : hasRecentTraining
        ? "Tes derniÃ¨res sÃ©ances mÃ©morisÃ©es montrent que tu es dÃ©jÃ  dans une dynamique. On garde donc une progression cohÃ©rente plutÃ´t quâ€™un grand coup dâ€™Ã©clat."
        : "Comme aucune sÃ©ance rÃ©cente nâ€™est mÃ©morisÃ©e, une reprise douce est probablement plus rentable quâ€™un entraÃ®nement brutal.";
  const practicalExample =
    qvt.sedentaryRisk
      ? "Exemple: une marche de 20 minutes aujourd'hui serait deja benefique, sans transformer ta journee en stage commando."
      : qvt.mentalLoad
        ? "Exemple: deux seances simples et realistes valent mieux qu'un programme parfait qui finit dans le tiroir."
        : sleepConcern && readiness.motivation >= 6
          ? "Exemple: une séance facile de 40 à 45 min te ferait probablement plus progresser qu'un entraînement intense aujourd'hui."
          : "Exemple: une séance propre, terminée avec de la marge, vaut mieux qu'une séance spectaculaire qui te grille deux jours.";
  const qvtMessage = qvt.signals.length
    ? ` Cote QVT, je note ${qvt.signals.join(", ")}: on cherche une action faisable dans ton quotidien avant de chercher l'entrainement parfait.`
    : "";
  const quote = `Citation du jour: â€œLa rÃ©gularitÃ© gagne souvent contre lâ€™intensitÃ© quand lâ€™intensitÃ© oublie de dormir.â€`;

  return {
    status,
    explanation: `${signals.join(" et ")}. ${encouragement} ${historyMessage}${qvtMessage} Pour ton objectif ${goal.toLowerCase()}, le programme privilÃ©gie ${priority.toLowerCase()} sans ajouter trop de fatigue. ${practicalExample} ${quote}`
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
  const constraintText = getConstraintText(profile, form);
  const mentalLoad = has(constraintText, [
    "semaine charg",
    "charge mentale",
    "dÃ©placement",
    "deplacement",
    "professionnel",
    "enfant",
    "manque de temps",
    "fatigue mentale",
    "boulot",
    "travail",
    "rÃ©union",
    "reunion"
  ]);
  const sedentaryRisk =
    garmin.lastActivity === "repos" ||
    garmin.lastActivityDuration === "repos" ||
    daysSinceLastTraining === null ||
    daysSinceLastTraining >= 5 ||
    recentSessions <= 1 ||
    (garmin.trainingLoad === "faible" && recentSessions <= 2);
  const accessibleMode =
    sedentaryRisk ||
    mentalLoad ||
    readiness.energy <= 4 ||
    readiness.stress >= 7 ||
    readiness.pain >= 6 ||
    profile.level === "dÃ©butant" ||
    profile.level === "reprise";
  const selectedDays = form?.plannedDays.filter((day) => day.selected).length ?? null;
  const recommendedSessionCount = selectedDays === null ? null : mentalLoad || sedentaryRisk ? Math.min(selectedDays, 2) : selectedDays;
  const signals = [
    sedentaryRisk ? "peu d'activitÃ© rÃ©cente" : "",
    mentalLoad ? "charge mentale ou contraintes Ã©levÃ©es" : "",
    accessibleMode ? "activitÃ© accessible Ã  privilÃ©gier" : ""
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
  if (fallback === "durÃ©e optimale") return optimalDuration(readiness, garmin);
  return fallback === "variable" ? "40 min" : fallback;
}

function shouldBeEasy(readiness: Readiness, garmin: GarminMockData) {
  return (
    readiness.energy <= 4 ||
    readiness.sleep <= 5 ||
    readiness.stress >= 7 ||
    garmin.sleepQuality === "mauvais" ||
    Number(garmin.bodyBattery) <= 40 ||
    garmin.trainingLoad === "Ã©levÃ©e"
  );
}

function chooseSession(day: PlannedDay, form: ProgramForm, readiness: Readiness, garmin: GarminMockData, profile: UserProfile) {
  const note = `${day.note} ${form.globalNotes}`.toLowerCase();
  const goalText = getGoal(profile).toLowerCase();
  const qvt = analyzeQvtContext(readiness, garmin, profile, [], form);
  const easy = shouldBeEasy(readiness, garmin);
  const painful = readiness.pain >= 6 || garmin.painNotes.toLowerCase().includes("genou");
  const duration = durationFromNote(day.note || form.globalNotes, form.duration, readiness, garmin);
  const confirmed = profile.level === "confirmÃ©";
  const beginner = profile.level === "dÃ©butant" || profile.level === "reprise";

  if (qvt.sedentaryRisk && !has(note, ["trail", "fractionn", "renfo", "courir", "footing", "velo", "vélo", "natation"])) {
    return {
      type: "marche active + mobilité",
      duration: "20 min",
      intensity: "facile",
      content: "Marche accessible, mobilité douce et respiration. Objectif: remettre du mouvement sans pression.",
      detailedContent: "12 min de marche confortable\n3 min de mobilité épaules/dos\n3 min de mobilité hanches/mollets\n2 min de respiration calme\nSi tu te sens bien, ajoute 5 min de marche.",
      objective: "lutter contre la sédentarité avec une action simple et réaliste.",
      reason: "tu sembles avoir peu bougé récemment; une courte marche est déjà bénéfique et plus durable qu'une séance ambitieuse mal placée."
    };
  }

  if (qvt.mentalLoad && !has(note, ["longue", "intense", "fractionn", "trail"])) {
    return {
      type: "séance courte anti-charge mentale",
      duration: "25 min",
      intensity: "facile",
      content: "Format court: marche rapide ou footing très doux, puis 6 minutes de mobilité. Simple, faisable, sans charge mentale ajoutée.",
      detailedContent: "5 min très faciles\n14 min marche rapide ou footing très doux\n2 x 30 sec gainage doux\n2 x 8 squats lents\n4 min mobilité dos/hanches\nFinir avec la sensation d'en avoir gardé sous le pied.",
      objective: "préserver la régularité pendant une période chargée.",
      reason: "les contraintes de vie indiquent une charge mentale élevée; le coach réduit volontairement l'ambition pour proposer une séance tenable."
    };
  }

  if (has(note, ["repos obligatoire", "repos"])) {
    return {
      type: "rÃ©cupÃ©ration active",
      duration: "20 min",
      intensity: "facile",
      content: "Marche douce, mobilitÃ© lÃ©gÃ¨re et respiration. Aucune sÃ©ance structurÃ©e.",
      detailedContent: "10 min de marche trÃ¨s douce\n5 min de mobilitÃ© hanches/dos\n5 min de respiration calme\nSi une douleur augmente, tu arrÃªtes.",
      objective: "respecter une contrainte de repos tout en gardant un minimum de mouvement.",
      reason: "tu as indiquÃ© une contrainte de repos, donc le coach protÃ¨ge la rÃ©cupÃ©ration."
    };
  }

  if (has(`${note} ${goalText}`, ["trail", "montagne", "dÃ©nivelÃ©"])) {
    const requestedIntense = has(note, ["intense", "fort", "dur"]);
    const adjustedIntensity = easy || painful || beginner ? "modÃ©rÃ©e" : requestedIntense || confirmed ? "intense" : "modÃ©rÃ©e";

    return {
      type: requestedIntense ? "trail en montagne contrÃ´lÃ©" : "trail vallonnÃ©",
      duration,
      intensity: adjustedIntensity,
      content:
        adjustedIntensity === "intense"
          ? "Ã‰chauffement 12 min, puis blocs de montÃ©e soutenue avec descentes trÃ¨s contrÃ´lÃ©es. Finir par 8 min faciles."
          : "Parcours vallonnÃ© en aisance, montÃ©es rÃ©guliÃ¨res sans se mettre dans le rouge, descentes prudentes et fin trÃ¨s facile.",
      detailedContent:
        adjustedIntensity === "intense"
          ? "12 min trÃ¨s faciles\n5 x 3 min en montÃ©e Ã  effort soutenu\n2 min de rÃ©cupÃ©ration en redescendant ou en marchant entre chaque bloc\n8 min faciles pour finir\nEn descente, prioritÃ© Ã  la technique, pas Ã  la vitesse."
          : "10 min faciles\n30 Ã  40 min sur terrain vallonnÃ© en restant capable de parler\nMarche autorisÃ©e dans les montÃ©es raides\n5 Ã  8 min trÃ¨s faciles pour finir.",
      objective: "respecter ton envie de trail tout en gardant une charge maÃ®trisÃ©e.",
      reason:
        requestedIntense && adjustedIntensity !== "intense"
          ? "tu as demandÃ© un trail intense en montagne, mais les signaux de forme invitent Ã  rÃ©duire lâ€™intensitÃ© pour Ã©viter une surcharge."
          : "respecte ta demande de trail intense en montagne et lâ€™intÃ¨gre dans une sÃ©ance structurÃ©e."
    };
  }

  if (painful) {
    return {
      type: "mobilitÃ© + renfo doux",
      duration,
      intensity: "facile",
      content: "MobilitÃ© hanches/mollets, gainage court, squats trÃ¨s contrÃ´lÃ©s et marche si tout est confortable.",
      detailedContent: "2 tours tranquilles\n8 squats lents\n8 fentes arriÃ¨re par jambe\n20 sec de gainage\n10 ponts fessiers\n45 sec de rÃ©cupÃ©ration entre les exercices\n5 min de mobilitÃ© pour finir.",
      objective: "rester rÃ©gulier sans augmenter lâ€™impact.",
      reason: "les douleurs signalÃ©es invitent Ã  limiter la course et Ã  privilÃ©gier un travail contrÃ´lÃ©."
    };
  }

  if (has(note, ["renfo", "haut du corps", "gainage"]) || form.priority === "renfo" || has(goalText, ["renfo", "renforcement"])) {
    return {
      type: has(note, ["haut du corps"]) ? "renfo haut du corps" : "renfo maison",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "modÃ©rÃ©e",
      content: `Ã‰chauffement 6 min, puis 3 blocs avec ${getEquipment(profile)}: poussÃ©e, tirage si possible, jambes contrÃ´lÃ©es, gainage. Finir avec 4 min de mobilitÃ©.`,
      detailedContent: has(note, ["haut du corps"])
        ? `${confirmed ? "Ã‰chauffement 8 min" : "Ã‰chauffement 6 min"}\n${confirmed ? "5" : "4"} sÃ©ries de 10 Ã  15 pompes inclinÃ©es\n${confirmed ? "5" : "4"} sÃ©ries de 12 tirages avec ${getEquipment(profile)} si possible\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de rÃ©cupÃ©ration entre les exercices\nMobilitÃ© Ã©paules/dos pour finir.`
        : `${confirmed ? "Ã‰chauffement 8 min" : "Ã‰chauffement 6 min"}\n${confirmed ? "5" : "4"} sÃ©ries de 15 Ã  20 squats lents\n${confirmed ? "5" : "4"} sÃ©ries de 10 fentes arriÃ¨re par jambe\n${confirmed ? "5" : "4"} sÃ©ries de 12 ponts fessiers\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de rÃ©cupÃ©ration entre les exercices\nSi tu as ${getEquipment(profile)}, ajoute-le seulement si le geste reste propre.`,
      objective: "Ã©quilibrer course et renforcement sans ajouter trop dâ€™impact.",
      reason: has(note, ["haut du corps", "renfo"])
        ? "respecte ta demande prÃ©cise et garde une charge maÃ®trisÃ©e."
        : "ajoute du renforcement utile pour soutenir la rÃ©gularitÃ©."
    };
  }

  if (has(note, ["sortie longue", "longue"])) {
    return {
      type: "sortie longue tranquille",
      duration,
      intensity: easy ? "facile" : "modÃ©rÃ©e",
      content: "Course en aisance respiratoire, terrain simple, sans accÃ©lÃ©ration. Si la forme baisse, alterner 8 min course / 2 min marche.",
      detailedContent: "10 min trÃ¨s faciles\nCourse continue en aisance respiratoire\nSi la respiration monte trop : 8 min course / 2 min marche\n5 min lentes pour finir.",
      objective: "dÃ©velopper lâ€™endurance sans courir aprÃ¨s la performance.",
      reason: "respecte ton envie de sortie longue tout en gardant une intensitÃ© compatible avec ton Ã©tat actuel."
    };
  }

  if (has(note, ["plat", "courir", "footing"]) || has(goalText, ["10 km", "semi", "marathon", "trail", "swimrun", "courir"])) {
    return {
      type: has(note, ["plat"]) ? "footing facile sur plat" : "footing facile",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "modÃ©rÃ©e",
      content: "8 min dâ€™Ã©chauffement, course rÃ©guliÃ¨re en aisance, puis 5 min trÃ¨s faciles. Rester capable de parler tout du long.",
      detailedContent: has(note, ["fractionnÃ©"])
        ? `${confirmed ? "15" : "12"} min dâ€™Ã©chauffement facile\n${confirmed ? "10" : "8"} x 1 min rapide mais contrÃ´lÃ©e\n1 min trÃ¨s facile entre chaque rÃ©pÃ©tition\n8 min faciles pour finir.`
        : "8 Ã  10 min dâ€™Ã©chauffement\nCourse rÃ©guliÃ¨re en aisance respiratoire\n5 min trÃ¨s faciles pour finir\nÃ‰tirements lÃ©gers si besoin.",
      objective: "construire une base solide et rÃ©pÃ©table.",
      reason: has(note, ["plat", "courir"])
        ? "respecte ta demande utilisateur et Ã©vite une surcharge car les signaux de rÃ©cupÃ©ration sont pris en compte."
        : "reste cohÃ©rent avec ton objectif tout en gardant une marge de rÃ©cupÃ©ration."
    };
  }

  return {
    type: easy ? "sÃ©ance douce mixte" : "course facile + Ã©ducatifs",
    duration,
    intensity: easy ? "facile" : "modÃ©rÃ©e",
    content: easy
      ? "Marche rapide ou course trÃ¨s douce, puis 8 min de gainage et mobilitÃ©."
      : "Course facile, 4 lignes droites relÃ¢chÃ©es, puis mobilitÃ© courte.",
    detailedContent: easy
      ? "20 min de marche rapide ou course trÃ¨s douce\n2 tours de 20 sec de gainage\n2 tours de 8 squats lents\n2 tours de 8 ponts fessiers\nMobilitÃ© dos/hanches pour finir."
      : "10 min faciles\n20 Ã  30 min de course calme\n4 lignes droites de 15 sec relÃ¢chÃ©es\nRÃ©cupÃ©ration complÃ¨te entre chaque ligne droite.",
    objective: "installer la rÃ©gularitÃ© sans pression.",
    reason: "choix Ã©quilibrÃ© entre objectif, forme du jour, charge rÃ©cente et contraintes disponibles."
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
  const recentProgramCount = history.filter((entry) => entry.program?.length).length;
  const levelHint =
    profile.level === "confirmÃ©"
      ? " Ton niveau confirmÃ© autorise une sÃ©ance plus exigeante quand les signaux de forme sont bons."
      : profile.level === "dÃ©butant" || profile.level === "reprise"
        ? " Ton niveau invite Ã  garder une marge confortable pour construire sans brÃ»ler les Ã©tapes."
        : " Ton niveau intermÃ©diaire permet de progresser sans chercher lâ€™intensitÃ© maximale Ã  chaque sÃ©ance.";
  let previousWasHard = false;
  let previousWasLong = false;

  return selectedDays.map((day, index) => {
    const overRealisticLimit = qvt.recommendedSessionCount !== null && index >= qvt.recommendedSessionCount;
    const session = overRealisticLimit
      ? {
          type: "récupération active accessible",
          duration: "15 min",
          intensity: "facile",
          content: "Marche douce, mobilité ou étirements. L'objectif est de garder le lien avec le mouvement sans ajouter une vraie séance.",
          detailedContent: "8 min de marche douce\n3 min mobilité dos/épaules\n3 min mobilité hanches/mollets\n1 min respiration calme\nStop si cela ajoute de la fatigue.",
          objective: "maintenir la régularité sans augmenter la charge mentale.",
          reason: "la période semble chargée ou peu active récemment; le programme réduit volontairement le nombre de vraies séances pour rester réaliste."
        }
      : chooseSession(day, form, readiness, garmin, profile);
    const isHard = session.intensity === "intense" || session.type.toLowerCase().includes("fractionnÃ©");
    const shouldSoften = previousWasHard || previousWasLong;
    const coordinatedSession =
      shouldSoften && isHard
        ? {
            ...session,
            intensity: "modÃ©rÃ©e",
            content: `${session.content} Lâ€™intensitÃ© est volontairement plafonnÃ©e car la sÃ©ance prÃ©cÃ©dente Ã©tait dÃ©jÃ  exigeante.`,
            detailedContent: `${session.detailedContent} Ne cherche pas Ã  battre un record aujourdâ€™hui : garde une marge sur chaque rÃ©pÃ©tition.`,
            reason: `${session.reason} La sÃ©ance est coordonnÃ©e avec la prÃ©cÃ©dente pour Ã©viter deux charges fortes de suite.`
          }
        : session;
    const recentHint =
      recentProgramCount > 0 ? " Lâ€™historique local montre dÃ©jÃ  un programme rÃ©cent, donc la progression reste prudente." : "";
    const sequenceHint =
      index === 0
        ? " PremiÃ¨re sÃ©ance placÃ©e avec une marge pour entrer progressivement dans la pÃ©riode."
        : shouldSoften
          ? " Cette sÃ©ance est volontairement plus contrÃ´lÃ©e car la prÃ©cÃ©dente Ã©tait chargÃ©e."
          : " Elle sâ€™insÃ¨re dans une progression Ã©quilibrÃ©e avec les autres jours choisis.";

    previousWasHard = coordinatedSession.intensity === "intense";
    previousWasLong = coordinatedSession.type.toLowerCase().includes("longue") || coordinatedSession.duration.includes("1h");

    return {
      id: `${day.id}-${coordinatedSession.type}`,
      day: day.dayName,
      dateLabel: day.dateLabel,
      ...coordinatedSession,
      reason: `${coordinatedSession.reason}${sequenceHint}${recentHint}${levelHint}`
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
  const hasRenfo = program.some((session) => session.type.toLowerCase().includes("renfo") || session.content.toLowerCase().includes("gainage"));
  const nextOffDay = offDays[0]?.shortLabel;
  const goal = getGoal(profile);

  if (easy) {
    return {
      title: "Conseil global",
      body: nextOffDay
        ? `Vu les signaux de fatigue, garde ${nextOffDay} comme vrai jour de rÃ©cupÃ©ration. Si tu te sens mieux, ajoute seulement 10 min de mobilitÃ© ou de gainage facile.`
        : "Vu les signaux de fatigue, Ã©vite dâ€™ajouter une sÃ©ance. Le meilleur choix est de garder de la marge et de privilÃ©gier la rÃ©cupÃ©ration."
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
        ? `Pour optimiser ton objectif ${goal}, ajoute si possible 10 min de gainage trÃ¨s simple sur ${nextOffDay}, sans transformer ce jour en vraie sÃ©ance.`
        : `Pour optimiser ton objectif ${goal}, ajoute 8 Ã  10 min de gainage Ã  la fin dâ€™une sÃ©ance facile.`
    };
  }

  if (selectedCount >= 5) {
    return {
      title: "Conseil global",
      body: "Tu as sÃ©lectionnÃ© beaucoup de jours. Garde au moins une sÃ©ance trÃ¨s facile et accepte de transformer une sÃ©ance en repos si le sommeil baisse."
    };
  }

  return {
    title: "Conseil global",
    body: `Le programme est cohÃ©rent avec ton objectif ${goal}. Garde une intensitÃ© confortable sur les premiÃ¨res sÃ©ances et ajuste seulement si les sensations restent bonnes.`
  };
}
