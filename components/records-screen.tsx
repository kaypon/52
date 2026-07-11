"use client";

import { useEffect, useState } from "react";

import { formatCard, formatTimestamp } from "@/lib/format";
import type { DeckListEntry } from "@/lib/types";

type RecordsScreenProps = {
  fetchDecks?: () => Promise<DeckListEntry[]>;
  onShuffleAgain: () => void;
};

async function defaultFetchDecks(): Promise<DeckListEntry[]> {
  const response = await fetch("/api/deck");
  const data = (await response.json()) as { decks: DeckListEntry[]; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load the deck records.");
  }

  return data.decks;
}

export function RecordsScreen({ fetchDecks = defaultFetchDecks, onShuffleAgain }: RecordsScreenProps) {
  const [decks, setDecks] = useState<DeckListEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchDecks()
      .then((entries) => {
        if (!cancelled) {
          setDecks(entries);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load the deck records.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchDecks]);

  return (
    <div className="records-panel" data-testid="records-screen">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Hall of Records</p>
          <h3>Every unique deck locked in so far</h3>
        </div>
        <button className="secondary-button" onClick={onShuffleAgain} type="button">
          Shuffle Again
        </button>
      </div>

      {error ? <p className="error-copy">{error}</p> : null}
      {!error && decks === null ? <p className="records-status">Loading records...</p> : null}
      {!error && decks !== null && decks.length === 0 ? (
        <p className="records-status">No decks locked in yet. Be the first.</p>
      ) : null}

      {decks && decks.length > 0 ? (
        <ul className="records-list">
          {decks.map((entry, index) => (
            <li key={entry.hash}>
              <span className="record-rank">#{decks.length - index}</span>
              <span className="record-nickname">{entry.nickname ?? "Anonymous"}</span>
              <span className="record-meta">
                {formatTimestamp(entry.firstSeenAt)} · seen {entry.seenCount}× · {entry.hash.slice(0, 10)}
              </span>
              <span className="record-cards">
                {entry.deckOrder.slice(0, 10).map((card, cardIndex) => (
                  <span key={`${card}-${cardIndex}`} className={`suit-${card.slice(-1).toLowerCase()}`}>
                    {formatCard(card)}{" "}
                  </span>
                ))}
                ...
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
