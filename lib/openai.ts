import {
  buildShapeSummary,
  generateProgram,
  type HistoryEntry,
  type ProgramForm,
  type ProgramSession,
  type Readiness,
  type ShapeSummary,
  type UserProfile
} from "./coachEngine";
import type { GarminMockData } from "./garminMock";

export type CoachInput = {
  readiness: Readiness;
  profile: UserProfile;
  garminData: GarminMockData;
  form: ProgramForm;
  history: HistoryEntry[];
  message: string;
};

export type CoachOutput = {
  summary: ShapeSummary;
  program?: ProgramSession[];
  reply: string;
  source: "openai" | "mock";
};

function buildFallbackReply(input: CoachInput) {
  if (!input.message) return undefined;

  const message = input.message.toLowerCase();
  const lastSession = input.history.find((entry) => entry.session)?.session;
  const context = lastSession
     ? `Je garde aussi en tête ta dernière séance mémorisée: ${lastSession.type}, ${lastSession.duration}.`
    : "Comme je n'ai pas encore beaucoup d'historique, je préfère construire simple et propre.";

  if (message.includes("fatigu") || message.includes("sommeil")) {
    return `${context} Si tu te sens fatigué, vise une séance facile de 30 à 45 min ou 20 min de mobilité/gainage. Pas besoin de faire le héros: aujourd'hui, le vrai boss, c'est la régularité.`;
  }

  if (
    message.includes("alimentation") ||
    message.includes("nutrition") ||
    message.includes("manger") ||
    message.includes("repas") ||
    message.includes("protéine") ||
    message.includes("glucide") ||
    message.includes("hydratation")
  ) {
    return `${context} Côté alimentation, je reste simple: avant une séance, vise quelque chose de digeste avec un peu d'énergie; après, pense protéines, féculents ou fruit, et hydratation. Pas besoin de transformer ton frigo en laboratoire, on veut juste aider ton corps à suivre le rythme.`;
  }

  if (message.includes("renfo") || message.includes("muscu") || message.includes("gainage")) {
    return `${context} Proposition simple: 4 tours avec 15 squats, 10 fentes par jambe, 12 ponts fessiers et 30 secondes de gainage. Récupère 60 secondes entre les exercices. Propre, efficace, sans cinéma.`;
  }

  if (message.includes("fractionné") || message.includes("intense")) {
    return `${context} Si tes signaux de forme sont bons, tu peux faire 12 min faciles, puis 8 x 1 min rapide / 1 min lente, et 8 min faciles. Si le sommeil est moyen, transforme ça en footing facile: ton futur toi dira merci.`;
  }

  if (message.includes("trail") || message.includes("montagne")) {
    return `${context} Pour du trail, je proposerais une séance vallonnée: 10 min faciles, 4 à 5 montées de 3 min contrôlées, récupération en descente tranquille, puis 8 min faciles. Technique avant ego, toujours.`;
  }

  return `${context} Je prends ta demande: "${input.message}". On reste sur une approche sportive simple, motivante et durable. Donne-moi ton envie précise, ta fatigue ou ton temps dispo, et je te transforme ça en séance claire.`;
}

function fallbackCoach(input: CoachInput): CoachOutput {
  const summary = buildShapeSummary(input.readiness, input.garminData, input.profile, input.form.priority, input.history);
  const program = generateProgram(input.readiness, input.form, input.profile, input.garminData, input.history);
  const reply = buildFallbackReply(input);

  return { summary, program, reply: reply ?? "", source: "mock" };
}

export async function runCoach(input: CoachInput): Promise<CoachOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackCoach(input);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Tu es C'moiLeCoach, un coach sportif IA humain, rassurant, premium et non agressif. Tu restes dans le cadre sport et forme: entraînement, récupération, sommeil, motivation, alimentation générale, hydratation et blessures à surveiller sans diagnostic médical. La synthèse doit être courte: uniquement les points marquants, sans citation, sans phrase décorative. L'historique peut contenir des séances mémorisées, des activités Strava et une note relevanceScore appelée Pertinence de la séance. Une activité Strava récente doit être considérée comme une vraie séance récente dans la synthèse et dans le programme. Cette note va de 0 beaucoup trop légère à 100 beaucoup trop difficile, 50 parfaitement adaptée. Utilise cette note uniquement pour améliorer la personnalisation future: durée, intensité, fréquence, type de séance et moment de la semaine. Ne l'utilise jamais pour juger la performance. Identifie les tendances, par exemple les durées qui semblent les plus adaptées. L'âge peut servir à doser progressivement les recommandations. Si un suivi du cycle menstruel existe, utilise-le uniquement de manière douce, facultative et sportive, jamais comme diagnostic médical. Formulations autorisées: 'J'ai tenu compte de la période actuelle de ton cycle dans la construction du programme.', 'Compte tenu de la période actuelle et de ton ressenti, je privilégie aujourd'hui une séance plus souple.', 'Le programme proposé reste entièrement adaptable à tes sensations.' Le niveau utilisateur doit changer réellement la charge: débutant/reprise restent progressifs, intermédiaire reste construit, confirmé devient nettement plus intense et structuré quand les signaux de forme sont bons. Les sports favoris du profil sont une préférence souple: privilégie-les quand c'est cohérent, mais propose aussi des sports complémentaires si cela sert l'objectif, la récupération ou la prévention. Tu intègres les piliers QVT: sédentarité, charge mentale, cohésion future et activité accessible. Les piliers QVT ajustent la charge, mais ne remplacent jamais un objectif sportif précis: si l'objectif parle de gagner, swimrun, trail, course, 10 km, semi, marathon ou compétition, propose une séance cohérente avec cet objectif, éventuellement allégée. Marche seule uniquement si l'utilisateur demande repos, douleur forte ou fatigue forte. Chaque séance doit garder une logique avec l'objectif et inclure detailedContent avec une ligne par exercice/bloc, plus les récupérations aux bons endroits. Réponds uniquement en JSON valide."
          },
          {
            role: "user",
            content: `Crée une synthèse et un programme. Données: ${JSON.stringify(input)}. Format JSON: {"summary":{"status":"...","explanation":"..."},"program":[{"id":"...","day":"...","dateLabel":"...","type":"...","duration":"...","intensity":"facile|modérée|intense","content":"...","detailedContent":"...","objective":"...","reason":"..."}],"reply":"optionnel"}`
          }
        ]
      })
    });

    if (!response.ok) return fallbackCoach(input);

    const data = await response.json();
    const text = data.output_text || data.output?.[0]?.content?.[0]?.text;
    if (!text) return fallbackCoach(input);

    const parsed = JSON.parse(text) as Partial<CoachOutput>;
    if (!parsed.summary || !Array.isArray(parsed.program)) return fallbackCoach(input);

    return {
      summary: parsed.summary,
      program: parsed.program,
      reply: parsed.reply ?? "",
      source: "openai"
    };
  } catch {
    return fallbackCoach(input);
  }
}
