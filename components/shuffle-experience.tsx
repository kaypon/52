"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "zustand";

import { RecordsScreen } from "@/components/records-screen";
import { ResultDialog } from "@/components/result-dialog";
import { ShuffleStage } from "@/components/shuffle-stage";
import { createShuffleStore } from "@/lib/store/shuffle-store";
import type { DeckListEntry, DeckSubmissionRequest, DeckSubmissionResult } from "@/lib/types";

type Stage = "shuffle" | "records";

type ShuffleExperienceProps = {
  submitDeck?: (payload: DeckSubmissionRequest) => Promise<DeckSubmissionResult>;
  fetchDecks?: () => Promise<DeckListEntry[]>;
};

async function defaultSubmitDeck(payload: DeckSubmissionRequest): Promise<DeckSubmissionResult> {
  const response = await fetch("/api/deck", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as DeckSubmissionResult & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to lock in this deck.");
  }

  return data;
}

export function ShuffleExperience({ submitDeck = defaultSubmitDeck, fetchDecks }: ShuffleExperienceProps) {
  const [store] = useState(createShuffleStore);
  const [stage, setStage] = useState<Stage>("shuffle");
  const [showResult, setShowResult] = useState(false);
  const result = useStore(store, (state) => state.result);

  function handleReset() {
    setShowResult(false);
    store.getState().reset();
    setStage("shuffle");
  }

  return (
    <div className="app-shell">
      <header className="nav-bar">
        <Link className="nav-title" href="/">
          52!
        </Link>
        <div className="nav-actions">
          {result ? (
            <button className="secondary-button" onClick={() => setShowResult(true)} type="button">
              View result
            </button>
          ) : null}
          <button
            className="secondary-button"
            onClick={() => setStage(stage === "records" ? "shuffle" : "records")}
            type="button"
          >
            {stage === "records" ? "Back to Shuffle" : "Records"}
          </button>
          <button className="secondary-button" onClick={handleReset} type="button">
            Reset deck
          </button>
        </div>
      </header>

      <main className="workspace">
        {stage === "shuffle" ? (
          <ShuffleStage store={store} submitDeck={submitDeck} onResult={() => setShowResult(true)} />
        ) : (
          <RecordsScreen fetchDecks={fetchDecks} onShuffleAgain={handleReset} />
        )}
      </main>

      {result && showResult ? (
        <ResultDialog
          result={result}
          onClose={() => setShowResult(false)}
          onViewRecords={() => {
            setShowResult(false);
            setStage("records");
          }}
        />
      ) : null}
    </div>
  );
}
