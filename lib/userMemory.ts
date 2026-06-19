import type { HistoryEntry, UserProfile } from "./coachEngine";

export type UserMemory = {
  insight: string;
  preferredDuration: string;
  preferredSessionType: string;
  sessionCount: number;
  updatedAt: number;
};

function extractMinutes(text: string) {
  const match = text.match(/(\d{2,3})\s*min/i);
  return match ? Number(match[1]) : null;
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export function buildUserMemory(history: HistoryEntry[], profile: UserProfile): UserMemory {
  const sessions = history.map((entry) => entry.session).filter(Boolean);
  const durations = sessions
    .map((session) => extractMinutes(`${session?.duration ?? ""} ${session?.content ?? ""}`))
    .filter((value): value is number => typeof value === "number");
  const averageDuration = durations.length
    ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
    : null;
  const preferredSessionType = mostCommon(sessions.map((session) => session?.type ?? "").filter(Boolean));
  const ratedEntries = history.filter((entry) => typeof entry.relevanceScore === "number" && entry.session);
  const comfortableEntries = ratedEntries.filter((entry) => {
    const score = entry.relevanceScore ?? 50;
    return score >= 35 && score <= 65;
  });
  const comfortableDurations = comfortableEntries
    .map((entry) => extractMinutes(`${entry.session?.duration ?? ""} ${entry.session?.content ?? ""}`))
    .filter((value): value is number => typeof value === "number");
  const averageComfortableDuration = comfortableDurations.length
    ? Math.round(comfortableDurations.reduce((total, value) => total + value, 0) / comfortableDurations.length)
    : null;
  const firstName = profile.firstName.trim();

  let insight = firstName
    ? `${firstName}, je commence à apprendre ce qui te convient vraiment.`
    : "Je commence à apprendre ce qui te convient vraiment.";

  if (ratedEntries.length >= 2 && averageComfortableDuration) {
    insight = `Les séances autour de ${averageComfortableDuration} minutes semblent actuellement les plus adaptées à ton quotidien. Je vais utiliser cette tendance sans juger ta performance.`;
  } else if (history.length >= 3 && averageDuration && averageDuration < 50) {
    insight = "Tu sembles mieux réussir les séances courtes ou modérées, souvent sous les 50 minutes. On va garder cette piste pour construire durablement.";
  } else if (history.length >= 3 && preferredSessionType) {
    insight = `Tu reviens souvent vers les séances de type “${preferredSessionType}”. Je vais m’en servir pour proposer quelque chose de plus naturel pour toi.`;
  } else if (history.length === 0) {
    insight = "Ta mémoire coach est prête. Elle deviendra plus utile dès que tu mémoriseras quelques séances.";
  }

  return {
    insight,
    preferredDuration: averageDuration ? `${averageDuration} min` : "à apprendre",
    preferredSessionType: preferredSessionType || "à apprendre",
    sessionCount: history.length,
    updatedAt: Date.now()
  };
}
