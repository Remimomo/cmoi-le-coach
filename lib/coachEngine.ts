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
  const sleepConcern = readiness.sleep <= 5;
  const stressConcern = readiness.stress >= 7;
  const loadConcern = readiness.energy <= 4 || garmin.trainingLoad === "élevée";
  const painConcern = readiness.pain >= 6 || !["", "aucune", "aucune douleur marquante"].includes(garmin.painNotes.toLowerCase());
  const status = score >= 7 ? "Tu peux avancer, tranquillement." : score >= 5 ? "On ajuste sans forcer." : "Aujourd'hui, on protège la régularité.";

  const signals = [
    sleepConcern ? "ton sommeil semble à ménager" : "ton sommeil semble correct",
    stressConcern ? "le stress est haut" : "ton stress reste gérable",
    loadConcern ? "ton énergie invite à garder de la marge" : "ton énergie permet d'avancer",
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
    (readiness.energy <= 6 && Number(garmin.bodyBattery) <= 40) ||
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
      type: "récupération active",
      duration: "20 min",
      intensity: "facile",
      content: "Marche douce, mobilité légère et respiration. Aucune séance structurée.",
      detailedContent: "10 min de marche très douce\n5 min de mobilité hanches/dos\n5 min de respiration calme\nSi une douleur augmente, tu arrêtes.",
      objective: "respecter une contrainte de repos tout en gardant un minimum de mouvement.",
      reason: "tu as indiqué une contrainte de repos, donc le coach protège la récupération."
    };
  }

  if (has(`${note} ${goalText}`, ["trail", "montagne", "dénivelé"])) {
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
           ? "12 min très faciles\n5 x 3 min en montée à effort soutenu\n2 min de récupération en redescendant ou en marchant entre chaque bloc\n8 min faciles pour finir\nEn descente, priorité à la technique, pas à la vitesse."
          : "10 min faciles\n30 à 40 min sur terrain vallonné en restant capable de parler\nMarche autorisée dans les montées raides\n5 à 8 min très faciles pour finir.",
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
      detailedContent: "2 tours tranquilles\n8 squats lents\n8 fentes arrière par jambe\n20 sec de gainage\n10 ponts fessiers\n45 sec de récupération entre les exercices\n5 min de mobilité pour finir.",
      objective: "rester régulier sans augmenter l'impact.",
      reason: "les douleurs signalées invitent à limiter la course et à privilégier un travail contrôlé."
    };
  }

  if (has(note, ["renfo", "haut du corps", "gainage"]) || form.priority === "renfo" || has(goalText, ["renfo", "renforcement"])) {
    return {
      type: has(note, ["haut du corps"]) ? "renfo haut du corps" : "renfo maison",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "modérée",
      content: `Échauffement 6 min, puis 3 blocs avec ${getEquipment(profile)}: poussée, tirage si possible, jambes contrôlées, gainage. Finir avec 4 min de mobilité.`,
      detailedContent: has(note, ["haut du corps"])
         ? `${confirmed ? "Échauffement 8 min" : "Échauffement 6 min"}\n${confirmed ? "5" : "4"} séries de 10 à 15 pompes inclinées\n${confirmed ? "5" : "4"} séries de 12 tirages avec ${getEquipment(profile)} si possible\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de récupération entre les exercices\nMobilité épaules/dos pour finir.`
        : `${confirmed ? "Échauffement 8 min" : "Échauffement 6 min"}\n${confirmed ? "5" : "4"} séries de 15 à 20 squats lents\n${confirmed ? "5" : "4"} séries de 10 fentes arrière par jambe\n${confirmed ? "5" : "4"} séries de 12 ponts fessiers\n${confirmed ? "5 x 40 sec" : "4 x 30 sec"} de gainage\n${confirmed ? "45 sec" : "60 sec"} de récupération entre les exercices\nSi tu as ${getEquipment(profile)}, ajoute-le seulement si le geste reste propre.`,
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
      detailedContent: "10 min très faciles\nCourse continue en aisance respiratoire\nSi la respiration monte trop : 8 min course / 2 min marche\n5 min lentes pour finir.",
      objective: "développer l'endurance sans courir après la performance.",
      reason: "respecte ton envie de sortie longue tout en gardant une intensité compatible avec ton état actuel."
    };
  }

  if (has(note, ["plat", "courir", "footing"]) || has(goalText, ["10 km", "semi", "marathon", "trail", "swimrun", "courir"])) {
    return {
      type: has(note, ["plat"]) ? "footing facile sur plat" : "footing facile",
      duration,
      intensity: easy || beginner ? "facile" : confirmed ? "intense" : "modérée",
      content: "8 min d'échauffement, course régulière en aisance, puis 5 min très faciles. Rester capable de parler tout du long.",
      detailedContent: has(note, ["fractionné"])
         ? `${confirmed ? "15" : "12"} min d'échauffement facile\n${confirmed ? "10" : "8"} x 1 min rapide mais contrôlée\n1 min très facile entre chaque répétition\n8 min faciles pour finir.`
        : "8 à 10 min d'échauffement\nCourse régulière en aisance respiratoire\n5 min très faciles pour finir\nÉtirements légers si besoin.",
      objective: "construire une base solide et répétable.",
      reason: has(note, ["plat", "courir"])
         ? "respecte ta demande utilisateur et évite une surcharge car les signaux de récupération sont pris en compte."
        : "reste cohérent avec ton objectif tout en gardant une marge de récupération."
    };
  }

  return {
    type: easy ? "séance douce mixte" : "course facile + éducatifs",
    duration,
    intensity: easy ? "facile" : "modérée",
    content: easy
       ? "Marche rapide ou course très douce, puis 8 min de gainage et mobilité."
      : "Course facile, 4 lignes droites relâchées, puis mobilité courte.",
    detailedContent: easy
       ? "20 min de marche rapide ou course très douce\n2 tours de 20 sec de gainage\n2 tours de 8 squats lents\n2 tours de 8 ponts fessiers\nMobilité dos/hanches pour finir."
      : "10 min faciles\n20 à 30 min de course calme\n4 lignes droites de 15 sec relâchées\nRécupération complète entre chaque ligne droite.",
    objective: "installer la régularité sans pression.",
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
  const recentProgramCount = history.filter((entry) => entry.program?.length).length;
  const levelHint =
    profile.level === "confirmé"
       ? " Ton niveau confirmé autorise une séance plus exigeante quand les signaux de forme sont bons."
      : profile.level === "débutant" || profile.level === "reprise"
         ? " Ton niveau invite à garder une marge confortable pour construire sans brûler les étapes."
        : " Ton niveau intermédiaire permet de progresser sans chercher l'intensité maximale à chaque séance.";
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
    const isHard = session.intensity === "intense" || session.type.toLowerCase().includes("fractionné");
    const shouldSoften = previousWasHard || previousWasLong;
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
  const recentHint =
    recentProgramCount > 0 ? " L'historique local montre déjà un programme récent, donc la progression reste prudente." : "";
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
         ? `Vu les signaux de fatigue, garde ${nextOffDay} comme vrai jour de récupération. Si tu te sens mieux, ajoute seulement 10 min de mobilité ou de gainage facile.`
        : "Vu les signaux de fatigue, évite d'ajouter une séance. Le meilleur choix est de garder de la marge et de privilégier la récupération."
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
    body: `Le programme est cohérent avec ton objectif ${goal}. Garde une intensité confortable sur les premières séances et ajuste seulement si les sensations restent bonnes.`
  };
}
