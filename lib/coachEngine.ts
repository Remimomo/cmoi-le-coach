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
    title: "D?fi anti-s?dentarit?",
    metric: "participation",
    description: "Un point pour chaque action simple: marche, mobilit?, ?tirements ou s?ance courte."
  },
  {
    title: "D?fi r?gularit? inter-services",
    metric: "r?gularit?",
    description: "Les ?quipes progressent gr?ce aux semaines actives, m?me avec des s?ances courtes."
  },
  {
    title: "D?fi diversit? inter-entreprises",
    metric: "diversit?",
    description: "Marche, v?lo, natation, renfo, mobilit? et footing comptent tous pour inclure tous les niveaux."
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
  return profile.goal.toLowerCase() === "autre" ? clean(profile.customGoal, "forme générale") : profile.goal.toLowerCase();
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
  const goal = getGoal(profile);
  const sleepConcern = ["mauvais", "moyen"].includes(garmin.sleepQuality) || readiness.sleep <= 5;
  const stressConcern = garmin.stress === "élevé" || readiness.stress >= 7;
  const loadConcern = garmin.trainingLoad === "élevée";
  const painConcern = readiness.pain >= 6 || !["", "aucune", "aucune douleur marquante"].includes(garmin.painNotes.toLowerCase());
  const status = score >= 7 ? "Tu peux avancer, tranquillement." : score >= 5 ? "On ajuste sans forcer." : "Aujourd'hui, on protège la régularité.";

  const signals = [
    sleepConcern ? "ton sommeil semble moyen" : "ton sommeil semble correct",
    stressConcern ? "le stress est haut" : "ton stress reste gérable",
    loadConcern ? "ta charge récente est élevée" : "ta charge récente est modérée",
    painConcern ? "une douleur mérite de rester prudente" : ""
  ].filter(Boolean);
  const hasRecentTraining = history.length > 0;
  const daysSinceLastTraining = getDaysSinceLastTraining(history);
  const encouragement =
    readiness.motivation >= 7
       ? "Ta motivation est bonne, donc on l'utilise intelligemment sans partir en mode héros de film dès l'échauffement."
      : "La motivation n'a pas besoin d'être parfaite: aujourd'hui, on vise surtout une action simple qui relance la machine.";
  const historyMessage =
    daysSinceLastTraining !== null
       ? daysSinceLastTraining === 0
         ? "Tu as une séance mémorisée très récente: le programme garde donc de la marge pour éviter d'empiler de la fatigue."
        : daysSinceLastTraining >= 5
           ? "Cela fait plusieurs jours sans séance mémorisée: reprise douce conseillée, histoire de réveiller le corps sans lui envoyer une facture."
          : "Ta dernière séance mémorisée est assez récente: on peut avancer, mais avec une progression propre."
      : hasRecentTraining
         ? "Tes dernières séances mémorisées montrent que tu es déjà dans une dynamique. On garde donc une progression cohérente plutôt qu'un grand coup d'éclat."
        : "Comme aucune séance récente n'est mémorisée, une reprise douce est probablement plus rentable qu'un entraînement brutal.";
  const practicalExample =
    qvt.sedentaryRisk
       ? "Exemple: une marche de 20 minutes aujourd'hui serait déjà bénéfique, sans transformer ta journée en stage commando."
      : qvt.mentalLoad
         ? "Exemple: deux séances simples et réalistes valent mieux qu'un programme parfait qui finit dans le tiroir."
        : sleepConcern && readiness.motivation >= 6
           ? "Exemple: une séance facile de 40 à 45 min te ferait probablement plus progresser qu'un entraînement intense aujourd'hui."
          : "Exemple: une séance propre, terminée avec de la marge, vaut mieux qu'une séance spectaculaire qui te grille deux jours.";
  const qvtMessage = qvt.signals.length
     ? ` Côté QVT, je note ${qvt.signals.join(", ")}: on cherche une action faisable dans ton quotidien avant de chercher l'entraînement parfait.`
    : "";
  const quote = `Citation du jour: "La régularité gagne souvent contre l'intensité quand l'intensité oublie de dormir."`;

  return {
    status,
    explanation: `${signals.join(" et ")}. ${encouragement} ${historyMessage}${qvtMessage} Pour ton objectif ${goal.toLowerCase()}, le programme privilégie ${priority.toLowerCase()} sans ajouter trop de fatigue. ${practicalExample} ${quote}`
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

function shouldBeEasy(readiness: Readiness, garmin: GarminMockData) {
  return (
    readiness.energy <= 4 ||
    readiness.sleep <= 5 ||
    readiness.stress >= 7 ||
    garmin.sleepQuality === "mauvais" ||
    Number(garmin.bodyBattery) <= 40 ||
    garmin.trainingLoad === "élevée"
  );
}

function chooseSession(day: PlannedDay, form: ProgramForm, readiness: Readiness, garmin: GarminMockData, profile: UserProfile) {
  const note = `${day.note} ${form.globalNotes}`.toLowerCase();
  const goalText = getGoal(profile).toLowerCase();
  const qvt = analyzeQvtContext(readiness, garmin, profile, [], form);
  const easy = shouldBeEasy(readiness, garmin);
  const painful = readiness.pain >= 6 || garmin.painNotes.toLowerCase().includes("genou");
  const duration = durationFromNote(day.note || form.globalNotes, form.duration, readiness, garmin);
  const confirmed = profile.level === "confirmé";
  const beginner = profile.level === "débutant" || profile.level === "reprise";

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
      type: "r?cup?ration active",
      duration: "20 min",
      intensity: "facile",
      content: "Marche douce, mobilit? l?g?re et respiration. Aucune s?ance structur?e.",
      detailedContent: "10 min de marche tr?s douce\n5 min de mobilit? hanches/dos\n5 min de respiration calme\nSi une douleur augmente, tu arr?tes.",
      objective: "respecter une contrainte de repos tout en gardant un minimum de mouvement.",
      reason: "tu as indiqu? une contrainte de repos, donc le coach prot?ge la r?cup?ration."
    };
  }

  if (has(`${note} ${goalText}`, ["trail", "montagne", "d?nivel?"])) {
    const requestedIntense = has(note, ["intense", "fort", "dur"]);
    const adjustedIntensity = easy || painful || beginner ? "mod?r?e" : requestedIntense || confirmed ? "intense" : "mod?r?e";

    return {
      type: requestedIntense ? "trail en montagne contr?l?" : "trail vallonn?",
      duration,
      intensity: adjustedIntensity,
      content:
        adjustedIntensity === "intense"
           ? "Ã‰chauffement 12 min, puis blocs de mont?e soutenue avec descentes tr?s contr?l?es. Finir par 8 min faciles."
          : "Parcours vallonn? en aisance, mont?es r?guli?res sans se mettre dans le rouge, descentes prudentes et fin tr?s facile.",
      detailedContent:
        adjustedIntensity === "intense"
           ? "12 min tr?s faciles\n5 x 3 min en mont?e ? effort soutenu\n2 min de r?cup?ration en redescendant ou en marchant entre chaque bloc\n8 min faciles pour finir\nEn descente, priorit? la technique, pas ? la vitesse."
          : "10 min faciles\n30 Ã ? 40 min sur terrain vallonn? en restant capable de parler\nMarche autoris?e dans les mont?es raides\n5 ? 8 min tr?s faciles pour finir.",
      objective: "respecter ton envie de trail tout en gardant une charge ma?tris?e.",
      reason:
        requestedIntense && adjustedIntensity !== "intense"
           ? "tu as demand? un trail intense en montagne, mais les signaux de forme invitent ? r?duire l'intensit? pour ?viter une surcharge."
          : "respecte ta demande de trail intense en montagne et l'int?gre dans une s?ance structur?e."
    };
  }

  if (painful) {
    return {
      type: "mobilit? + renfo doux",
      duration,
      intensity: "facile",
      content: "Mobilit? hanches/mollets, gainage court, squats tr?s contr?l?s et marche si tout est confortable.",
      detailedContent: "2 tours tranquilles\n8 squats lents\n8 fentes arri?re par jambe\n20 sec de gainage\n10 ponts fessiers\n45 sec de r?cup?ration entre les exercices\n5 min de mobilit? pour finir.",
      objective: "rester r?gulier sans augmenter l'impact.",
      reason: "les douleurs signal?es invitent Ã ? limiter la course et ? privil?gier un travail contr?l?."
    };
  }

  if (has(note, ["renfo", "haut du corps", "gainage"]) || form.priority === "renfo" || has(goalText, ["renfo", "renforcement"])) {
    return {
      type: has(note, ["haut du corps"]) ? "renfo haut du corps" : "renfo maison",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "mod?r?e",
      content: `Ã‰chauffement 6 min, puis 3 blocs avec ${getEquipment(profile)}: pouss?e, tirage si possible, jambes contr?l?es, gainage. Finir avec 4 min de mobilit?.`,
      detailedContent: has(note, ["haut du corps"])
         ? `${confirmed ? "Ã‰chauffement 8 min" : "Ã‰chauffement 6 min"}\n${confirmed ? "5" : "4"} s?ries de 10 ? 15 pompes inclin?es\n${confirmed ? "5" : "4"} s?ries de 12 tirages avec ${getEquipment(profile)} si possible\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de r?cup?ration entre les exercices\nMobilit?paules/dos pour finir.`
        : `${confirmed ? "Ã‰chauffement 8 min" : "Ã‰chauffement 6 min"}\n${confirmed ? "5" : "4"} s?ries de 15 ? 20 squats lents\n${confirmed ? "5" : "4"} s?ries de 10 fentes arri?re par jambe\n${confirmed ? "5" : "4"} s?ries de 12 ponts fessiers\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de r?cup?ration entre les exercices\nSi tu as ${getEquipment(profile)}, ajoute-le seulement si le geste reste propre.`,
      objective: "?quilibrer course et renforcement sans ajouter trop d'impact.",
      reason: has(note, ["haut du corps", "renfo"])
         ? "respecte ta demande pr?cise et garde une charge ma?tris?e."
        : "ajoute du renforcement utile pour soutenir la r?gularit?."
    };
  }

  if (has(note, ["sortie longue", "longue"])) {
    return {
      type: "sortie longue tranquille",
      duration,
      intensity: easy ? "facile" : "mod?r?e",
      content: "Course en aisance respiratoire, terrain simple, sans acc?l?ration. Si la forme baisse, alterner 8 min course / 2 min marche.",
      detailedContent: "10 min tr?s faciles\nCourse continue en aisance respiratoire\nSi la respiration monte trop : 8 min course / 2 min marche\n5 min lentes pour finir.",
      objective: "d?velopper l'endurance sans courir apr?s la performance.",
      reason: "respecte ton envie de sortie longue tout en gardant une intensit? compatible avec ton ?tat actuel."
    };
  }

  if (has(note, ["plat", "courir", "footing"]) || has(goalText, ["10 km", "semi", "marathon", "trail", "swimrun", "courir"])) {
    return {
      type: has(note, ["plat"]) ? "footing facile sur plat" : "footing facile",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "mod?r?e",
      content: "8 min d'?chauffement, course r?guli?re en aisance, puis 5 min tr?s faciles. Rester capable de parler tout du long.",
      detailedContent: has(note, ["fractionn?"])
         ? `${confirmed ? "15" : "12"} min d'?chauffement facile\n${confirmed ? "10" : "8"} x 1 min rapide mais contr?l?e\n1 min tr?s facile entre chaque r?p?tition\n8 min faciles pour finir.`
        : "8 Ã ? 10 min d'?chauffement\nCourse r?guli?re en aisance respiratoire\n5 min tr?s faciles pour finir\nÃ‰tirements l?gers si besoin.",
      objective: "construire une base solide et r?p?table.",
      reason: has(note, ["plat", "courir"])
         ? "respecte ta demande utilisateur et ?vite une surcharge car les signaux de r?cup?ration sont pris en compte."
        : "reste coh?rent avec ton objectif tout en gardant une marge de r?cup?ration."
    };
  }

  return {
    type: easy ? "s?ance douce mixte" : "course facile + ?ducatifs",
    duration,
    intensity: easy ? "facile" : "mod?r?e",
    content: easy
       ? "Marche rapide ou course tr?s douce, puis 8 min de gainage et mobilit?."
      : "Course facile, 4 lignes droites rel?ch?es, puis mobilit? courte.",
    detailedContent: easy
       ? "20 min de marche rapide ou course tr?s douce\n2 tours de 20 sec de gainage\n2 tours de 8 squats lents\n2 tours de 8 ponts fessiers\nMobilit? dos/hanches pour finir."
      : "10 min faciles\n20 Ã ? 30 min de course calme\n4 lignes droites de 15 sec rel?ch?es\nR?cup?ration compl?te entre chaque ligne droite.",
    objective: "installer la r?gularit? sans pression.",
    reason: "choix ?quilibr? entre objectif, forme du jour, charge r?cente et contraintes disponibles."
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
    profile.level === "confirm?"
       ? " Ton niveau confirm? autorise une s?ance plus exigeante quand les signaux de forme sont bons."
      : profile.level === "d?butant" || profile.level === "reprise"
         ? " Ton niveau invite ? garder une marge confortable pour construire sans br?ler les ?tapes."
        : " Ton niveau interm?diaire permet de progresser sans chercher l'intensit? maximale Ã ? chaque s?ance.";
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
    const isHard = session.intensity === "intense" || session.type.toLowerCase().includes("fractionn?");
    const shouldSoften = previousWasHard || previousWasLong;
    const coordinatedSession =
      shouldSoften && isHard
         ? {
            ...session,
            intensity: "mod?r?e",
            content: `${session.content} L'intensit? est volontairement plafonn?e car la s?ance pr?c?dente ?tait d?jÃ ? exigeante.`,
            detailedContent: `${session.detailedContent} Ne cherche pas Ã ? battre un record aujourd'hui : garde une marge sur chaque r?p?tition.`,
            reason: `${session.reason} La s?ance est coordonn?e avec la pr?c?dente pour ?viter deux charges fortes de suite.`
          }
        : session;
    const recentHint =
      recentProgramCount > 0 ? " L'historique local montre d?j? un programme r?cent, donc la progression reste prudente." : "";
    const sequenceHint =
      index === 0
         ? " Premi?re s?ance plac?e avec une marge pour entrer progressivement dans la p?riode."
        : shouldSoften
           ? " Cette s?ance est volontairement plus contr?l?e car la pr?c?dente ?tait charg?e."
          : " Elle s'ins?re dans une progression ?quilibr?e avec les autres jours choisis.";

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
  const nextOffDay = offDays[0].shortLabel;
  const goal = getGoal(profile);

  if (easy) {
    return {
      title: "Conseil global",
      body: nextOffDay
         ? `Vu les signaux de fatigue, garde ${nextOffDay} comme vrai jour de r?cup?ration. Si tu te sens mieux, ajoute seulement 10 min de mobilit? ou de gainage facile.`
        : "Vu les signaux de fatigue, ?vite d'ajouter une s?ance. Le meilleur choix est de garder de la marge et de privil?gier la r?cup?ration."
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
         ? `Pour optimiser ton objectif ${goal}, ajoute si possible 10 min de gainage tr?s simple sur ${nextOffDay}, sans transformer ce jour en vraie s?ance.`
        : `Pour optimiser ton objectif ${goal}, ajoute 8 Ã ? 10 min de gainage ? la fin d'une s?ance facile.`
    };
  }

  if (selectedCount >= 5) {
    return {
      title: "Conseil global",
      body: "Tu as s?lectionn? beaucoup de jours. Garde au moins une s?ance tr?s facile et accepte de transformer une s?ance en repos si le sommeil baisse."
    };
  }

  return {
    title: "Conseil global",
    body: `Le programme est coh?rent avec ton objectif ${goal}. Garde une intensit? confortable sur les premi?res s?ances et ajuste seulement si les sensations restent bonnes.`
  };
}
