"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
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

export default function GarminPage() {
  const [stravaStatus, setStravaStatus] = useState("Vérification Strava en cours...");
  const [stravaAuthorizeUrl, setStravaAuthorizeUrl] = useState<string | null>(null);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivitySummary[]>([]);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);

  async function syncStravaActivities() {
    setIsSyncingStrava(true);

    try {
      const response = await fetch("/api/strava/sync");
      const activityData = await response.json();

      if (activityData.ok && Array.isArray(activityData.activities)) {
        setStravaActivities(activityData.activities);
        window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(activityData.activities));
        setStravaStatus(
          activityData.activities.length > 0
            ? activityData.saveWarning
              ? `${activityData.activities.length} activité(s) Strava récupérée(s). Sauvegarde Supabase à finaliser.`
              : `${activityData.activities.length} activité(s) Strava synchronisée(s).`
            : "Strava est connecté, mais aucune activité n'a été renvoyée par Strava."
        );
        return;
      }

      setStravaStatus(activityData.error ?? "Strava est connecté, mais la synchronisation a échoué.");
    } catch {
      setStravaStatus("Strava est connecté, mais la synchronisation a échoué.");
    } finally {
      setIsSyncingStrava(false);
    }
  }

  useEffect(() => {
    fetch("/api/strava/status")
      .then((response) => response.json())
      .then((data) => {
        setStravaStatus(data.message ?? "Statut Strava indisponible.");
        setStravaAuthorizeUrl(data.authorizeUrl ?? null);
        setIsStravaConnected(data.status === "connected");
        if (data.status === "connected") {
          void syncStravaActivities();
        }
      })
      .catch(() => setStravaStatus("Statut Strava indisponible pour le moment."));
  }, []);

  async function disconnectStrava() {
    await fetch("/api/strava/disconnect", { method: "POST" });
    setIsStravaConnected(false);
    setStravaAuthorizeUrl("/api/strava/connect");
    setStravaActivities([]);
    window.localStorage.removeItem("auto-coach-strava-activities");
    setStravaStatus("Strava est déconnecté. Tu peux reconnecter ton compte.");
  }

  return (
    <AuthGate>
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">STRAVA</h1>
        </div>
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
          <ArrowLeft className="h-5 w-5 text-moss" />
        </Link>
      </header>

      <AccountStatus />

      <section className="mb-4 rounded-[28px] border border-moss/25 bg-white/80 p-5 shadow-soft">
        <p className="mb-1 text-sm font-medium text-moss">Connexion Strava</p>
        <p className="text-sm leading-6 text-mist/80">{stravaStatus}</p>
        {stravaAuthorizeUrl ? (
          <a href="/api/strava/connect" className="mt-4 block rounded-2xl bg-ember px-4 py-3 text-center font-semibold text-white">
            Connecter Strava
          </a>
        ) : !isStravaConnected ? (
          <button disabled className="mt-4 w-full rounded-2xl bg-ember px-4 py-3 font-semibold text-white opacity-50">
            Connecter Strava
          </button>
        ) : null}
        {isStravaConnected ? (
          <button onClick={syncStravaActivities} disabled={isSyncingStrava} className="mt-4 w-full rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
            {isSyncingStrava ? "Synchronisation..." : "Synchroniser Strava"}
          </button>
        ) : null}
        {stravaActivities.length > 0 ? (
          <div className="mt-4 space-y-2">
            {stravaActivities.map((activity) => (
              <div key={activity.id} className="rounded-2xl bg-moss/10 px-4 py-3">
                <p className="truncate text-sm font-medium text-night">{activity.name}</p>
                <p className="mt-1 text-xs text-mist/70">
                  {activity.type} · {activity.distanceKm} km · {activity.movingMinutes} min
                </p>
              </div>
            ))}
          </div>
        ) : isStravaConnected && !isSyncingStrava ? (
          <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-mist/70">
            Aucune activité Strava reçue pour le moment. Lance une synchronisation, puis vérifie que tes activités existent bien sur Strava et que l&apos;autorisation donnée à C&apos;moiLeCoach permet de lire les activités.
          </p>
        ) : null}
        {isStravaConnected ? (
          <button onClick={disconnectStrava} className="mt-4 w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 font-semibold text-night">
            Déconnecter Strava
          </button>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-mist/60">
          Les activités Strava synchronisées sont sauvegardées sur ton compte et utilisées par le coach.
        </p>
      </section>

    </main>
    </AuthGate>
  );
}
