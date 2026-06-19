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

  useEffect(() => {
    fetch("/api/strava/status")
      .then((response) => response.json())
      .then((data) => {
        setStravaStatus(data.message ?? "Statut Strava indisponible.");
        setStravaAuthorizeUrl(data.authorizeUrl ?? null);
        setIsStravaConnected(data.status === "connected");
        if (data.status === "connected") {
          fetch("/api/strava/sync")
            .then((response) => response.json())
            .then((activityData) => {
              if (activityData.ok && Array.isArray(activityData.activities)) {
                setStravaActivities(activityData.activities);
                window.localStorage.setItem("auto-coach-strava-activities", JSON.stringify(activityData.activities));
              }
            })
            .catch(() => setStravaActivities([]));
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
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Connexions sport</h1>
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
        ) : isStravaConnected ? (
          <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-mist/70">
            Strava est connecté. Aucune activité récente à afficher pour le moment.
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
