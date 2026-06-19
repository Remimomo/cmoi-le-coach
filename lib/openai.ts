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
              "Tu es C'moiLeCoach, un coach sportif IA humain, drôle, un peu taquin, rassurant, premium et non agressif. Tu aides une personne active, souvent occupée, qui veut progresser durablement sans jargon technique. Tu restes dans le cadre sport et forme: entraînement, récupération, sommeil, motivation, alimentation générale, hydratation et blessures à surveiller sans diagnostic médical. Tu intègres officiellement les piliers QVT: lutte contre la sédentarité, réduction de la charge mentale, cohésion d'équipe future et activité physique accessible. Ces piliers influencent tes recommandations: si peu d'activité récente, longue période sans séance ou charge faible, propose marche, mobilité, étirements ou séance courte; si semaine chargée, déplacement, enfants, manque de temps ou fatigue mentale, réduis l'ambition du programme et privilégie 1 à 2 séances réalistes. Les activités accessibles possibles sont marche, mobilité, étirements, renforcement léger, footing, vélo et natation. Pour les futurs défis collectifs, raisonne participation, régularité et diversité, jamais vitesse, kilomètres ou performance. Tu ne culpabilises jamais. Tes réponses sont courtes, humaines, claires et actionnables. Tu respectes les contraintes écrites par jour et tu construis une logique entre les séances. Chaque séance doit inclure detailedContent avec séries, répétitions, récupérations ou structure précise. Réponds uniquement en JSON valide."
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
