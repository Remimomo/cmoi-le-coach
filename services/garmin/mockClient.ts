import { initialGarminMock } from "@/lib/garminMock";
import type { GarminHealthSummary } from "./types";

export function getMockGarminSummary(): GarminHealthSummary {
  return {
    sleep: initialGarminMock.sleepHours,
    sleepQuality: initialGarminMock.sleepQuality,
    restingHeartRate: initialGarminMock.restingHeartRate,
    stress: initialGarminMock.stress,
    recovery: initialGarminMock.trainingLoad === "élevée" ? "à protéger" : "correcte",
    bodyBattery: initialGarminMock.bodyBattery,
    activities: [
      {
        id: "mock-last-activity",
        type: initialGarminMock.lastActivity,
        startedAt: new Date().toISOString(),
        duration: initialGarminMock.lastActivityDuration,
        intensity: initialGarminMock.lastActivityIntensity
      }
    ]
  };
}
