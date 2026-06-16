import { NextResponse } from "next/server";
import { getGarminConnectionStatus, getMockGarminSummary } from "@/services/garmin";

export async function GET() {
  return NextResponse.json({
    status: getGarminConnectionStatus(),
    message:
      getGarminConnectionStatus() === "ready"
        ? "Les identifiants Garmin sont configurés côté serveur."
        : "La connexion Garmin officielle nécessite une validation dans le Garmin Connect Developer Program.",
    mockSummary: getMockGarminSummary()
  });
}
