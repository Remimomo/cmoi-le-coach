"use client";

import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import {
  activityDurationOptions,
  activityIntensityOptions,
  activityOptions,
  bodyBatteryOptions,
  garminStressOptions,
  initialGarminMock,
  sleepHourOptions,
  sleepQualityOptions,
  trainingLoadOptions,
  type GarminMockData
} from "@/lib/garminMock";
import { AccountStatus } from "@/components/AccountStatus";

function option(value: string) {
  return (
    <option className="bg-ink-950 text-night" key={value} value={value}>
      {value}
    </option>
  );
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (typeof item === "number") return item !== 0;
      return Boolean(item);
    });
  }
  return Boolean(value);
}

export default function GarminPage() {
  const [garminData, setGarminData] = useState<GarminMockData>(initialGarminMock);
  const [garminStatus, setGarminStatus] = useState("Vérification en cours...");
  const [stravaStatus, setStravaStatus] = useState("Vérification Strava en cours...");
  const [stravaAuthorizeUrl, setStravaAuthorizeUrl] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("Sauvegarde locale active.");
  const [hasLoadedGarminData, setHasLoadedGarminData] = useState(false);
  const [hasCheckedCloudData, setHasCheckedCloudData] = useState(false);
  const [hasEditedGarminData, setHasEditedGarminData] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("auto-coach-garmin-test");
    if (saved) {
      setGarminData({ ...initialGarminMock, ...JSON.parse(saved) });
    }
    setHasLoadedGarminData(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("auto-coach-garmin-test", JSON.stringify(garminData));
  }, [garminData]);

  useEffect(() => {
    if (!hasLoadedGarminData) return;

    fetch("/api/user-data")
      .then((response) => response.json())
      .then((result) => {
        if (result.ok && result.data?.garminData && hasMeaningfulValue(result.data.garminData)) {
          const cloudGarminData = { ...initialGarminMock, ...result.data.garminData };
          setGarminData(cloudGarminData);
          window.localStorage.setItem("auto-coach-garmin-test", JSON.stringify(cloudGarminData));
          setHasEditedGarminData(false);
          setSyncStatus("Données Garmin synchronisées avec ton compte.");
        } else {
          setSyncStatus("Données Garmin prêtes à être sauvegardées sur ton compte.");
        }
      })
      .catch(() => setSyncStatus("Mode local actif. Connecte-toi pour synchroniser."))
      .finally(() => setHasCheckedCloudData(true));
  }, [hasLoadedGarminData]);

  useEffect(() => {
    if (!hasLoadedGarminData || !hasCheckedCloudData || !hasEditedGarminData) return;

    const timeout = window.setTimeout(() => {
      fetch("/api/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garminData })
      })
        .then((response) => {
          if (response.ok) {
            setHasEditedGarminData(false);
            setSyncStatus("Données Garmin sauvegardées sur ton compte.");
          }
        })
        .catch(() => setSyncStatus("Sauvegarde locale active. La synchronisation reprendra plus tard."));
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedGarminData, hasCheckedCloudData, hasEditedGarminData, garminData]);

  useEffect(() => {
    fetch("/api/garmin/status")
      .then((response) => response.json())
      .then((data) => setGarminStatus(data.message ?? "Statut Garmin indisponible."))
      .catch(() => setGarminStatus("Statut Garmin indisponible pour le moment."));
  }, []);

  useEffect(() => {
    fetch("/api/strava/status")
      .then((response) => response.json())
      .then((data) => {
        setStravaStatus(data.message ?? "Statut Strava indisponible.");
        setStravaAuthorizeUrl(data.authorizeUrl ?? null);
      })
      .catch(() => setStravaStatus("Statut Strava indisponible pour le moment."));
  }, []);

  function updateGarminData(key: keyof GarminMockData, value: string) {
    setHasEditedGarminData(true);
    setGarminData((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Données Garmin</h1>
        </div>
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
          <ArrowLeft className="h-5 w-5 text-moss" />
        </Link>
      </header>

      <AccountStatus />

      <p className="mb-4 rounded-2xl bg-white/70 px-4 py-3 text-xs leading-5 text-mist/70 shadow-soft">{syncStatus}</p>

      <section className="mb-4 rounded-[28px] border border-ember/20 bg-ember/10 p-5 shadow-soft">
        <p className="mb-1 text-sm font-medium text-ember">Connexion officielle Garmin</p>
        <p className="text-sm leading-6 text-mist/80">
          {garminStatus} En attendant, ces données test permettent de valider le comportement du coach.
        </p>
      </section>

      <section className="mb-4 rounded-[28px] border border-moss/25 bg-white/80 p-5 shadow-soft">
        <p className="mb-1 text-sm font-medium text-moss">Connexion Strava</p>
        <p className="text-sm leading-6 text-mist/80">{stravaStatus}</p>
        {stravaAuthorizeUrl ? (
          <a href="/api/strava/connect" className="mt-4 block rounded-2xl bg-ember px-4 py-3 text-center font-semibold text-white">
            Connecter Strava
          </a>
        ) : (
          <button disabled className="mt-4 w-full rounded-2xl bg-ember px-4 py-3 font-semibold text-white opacity-50">
            Connecter Strava
          </button>
        )}
        <p className="mt-3 text-xs leading-5 text-mist/60">
          Quand Strava et Garmin seront disponibles, le coach pourra croiser les activités Strava avec les données de récupération Garmin.
        </p>
      </section>

      <section className="rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-moss">Mode test</p>
            <h2 className="text-lg font-medium text-night">Données simulées</h2>
          </div>
          <Activity className="h-5 w-5 text-ember" />
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Sommeil</span>
            <select value={garminData.sleepHours} onChange={(event) => updateGarminData("sleepHours", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {sleepHourOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Qualité sommeil</span>
            <select value={garminData.sleepQuality} onChange={(event) => updateGarminData("sleepQuality", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {sleepQualityOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Fréquence cardiaque repos</span>
            <input value={garminData.restingHeartRate} onChange={(event) => updateGarminData("restingHeartRate", event.target.value)} placeholder="Ex: 54 bpm" className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Stress</span>
            <select value={garminData.stress} onChange={(event) => updateGarminData("stress", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {garminStressOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Body Battery simulée</span>
            <select value={garminData.bodyBattery} onChange={(event) => updateGarminData("bodyBattery", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {bodyBatteryOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Charge récente</span>
            <select value={garminData.trainingLoad} onChange={(event) => updateGarminData("trainingLoad", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {trainingLoadOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Dernière activité</span>
            <select value={garminData.lastActivity} onChange={(event) => updateGarminData("lastActivity", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {activityOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Durée dernière activité</span>
            <select value={garminData.lastActivityDuration} onChange={(event) => updateGarminData("lastActivityDuration", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {activityDurationOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Intensité dernière activité</span>
            <select value={garminData.lastActivityIntensity} onChange={(event) => updateGarminData("lastActivityIntensity", event.target.value)} className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none">
              {activityIntensityOptions.map(option)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Douleurs</span>
            <textarea value={garminData.painNotes} onChange={(event) => updateGarminData("painNotes", event.target.value)} placeholder="Ex: gêne genou droit, mollet sensible..." className="min-h-24 w-full resize-none rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-sm text-night outline-none placeholder:text-mist/35" />
          </label>

          <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/72">
            Ces données seront remplacées plus tard par la connexion Garmin réelle. Pour l’instant, elles servent à tester l’interprétation du coach.
          </p>
        </div>
      </section>
    </main>
  );
}

