import { NextResponse } from "next/server";

import { DeckSubmissionError, processDeckSubmission } from "@/lib/server/deck-submission";
import { getDeckStorage } from "@/lib/server/storage";
import type { DeckSubmissionRequest } from "@/lib/types";

export async function GET() {
  try {
    const decks = await getDeckStorage().listDecks();
    return NextResponse.json({ decks }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to load the deck records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DeckSubmissionRequest;
    const result = await processDeckSubmission(payload, getDeckStorage());
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof DeckSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Something went wrong while evaluating this deck." },
      { status: 500 },
    );
  }
}
