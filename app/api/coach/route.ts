import { NextResponse } from "next/server";
import { runCoach, type CoachInput } from "@/lib/openai";

export async function POST(request: Request) {
  const input = (await request.json()) as CoachInput;
  const result = await runCoach(input);

  return NextResponse.json(result);
}
