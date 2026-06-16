export type GarminMockData = {
  sleepHours: string;
  sleepQuality: string;
  restingHeartRate: string;
  stress: string;
  bodyBattery: string;
  trainingLoad: string;
  lastActivity: string;
  lastActivityDuration: string;
  lastActivityIntensity: string;
  painNotes: string;
};

export const initialGarminMock: GarminMockData = {
  sleepHours: "6h30",
  sleepQuality: "moyen",
  restingHeartRate: "54 bpm",
  stress: "modéré",
  bodyBattery: "55",
  trainingLoad: "normale",
  lastActivity: "footing facile",
  lastActivityDuration: "40 min",
  lastActivityIntensity: "facile",
  painNotes: "aucune douleur marquante"
};

export const sleepHourOptions = ["moins de 5h", "5h", "5h30", "6h", "6h30", "7h", "7h30", "8h", "plus de 8h"];
export const sleepQualityOptions = ["mauvais", "moyen", "bon", "excellent"];
export const garminStressOptions = ["faible", "modéré", "élevé"];
export const bodyBatteryOptions = ["20", "25", "40", "55", "70", "85", "95", "variable"];
export const trainingLoadOptions = ["faible", "normale", "élevée"];
export const activityOptions = [
  "repos",
  "footing facile",
  "sortie longue",
  "fractionné",
  "renforcement",
  "trail",
  "vélo",
  "natation",
  "marche",
  "course intense",
  "autre"
];
export const activityDurationOptions = ["repos", "15 min", "20 min", "30 min", "40 min", "50 min", "1h", "1h15", "1h30", "2h"];
export const activityIntensityOptions = ["facile", "modérée", "intense"];
