"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";

import { MIN_ACTION_COUNT, MIN_DURATION_MS } from "@/lib/deck";
import { formatActionLabel, formatCard, formatDuration, formatTimestamp } from "@/lib/format";
import { createShuffleStore, getProgressLabel } from "@/lib/store/shuffle-store";
import type { DeckSubmissionRequest, DeckSubmissionResult, ShuffleActionType } from "@/lib/types";

const ACTIONS: { type: ShuffleActionType; title: string; description: string; hotkey: string }[] = [
  {
    type: "split",
    title: "Split",
    description: "Cut the deck around the middle and swap the packets.",
    hotkey: "a",
  },
  {
    type: "riffle",
    title: "Riffle",
    description: "Interleave two halves like a classic casino riffle.",
    hotkey: "s",
  },
  {
    type: "overhand",
    title: "Overhand",
    description: "Peel packets from the top into a new stack.",
    hotkey: "d",
  },
  {
    type: "randomize",
    title: "Randomize",
    description: "Fallback chaos button for instant entropy.",
    hotkey: "f",
  },
];

const HOTKEY_ACTIONS = new Map(ACTIONS.map((action) => [action.hotkey, action.type]));

type ShuffleStageProps = {
  store: ReturnType<typeof createShuffleStore>;
  submitDeck: (payload: DeckSubmissionRequest) => Promise<DeckSubmissionResult>;
  onResult: () => void;
};

export function ShuffleStage({ store, submitDeck, onResult }: ShuffleStageProps) {
  const [now, setNow] = useState(() => Date.now());
  const deck = useStore(store, (state) => state.deck);
  const actions = useStore(store, (state) => state.actions);
  const nickname = useStore(store, (state) => state.nickname);
  const startedAt = useStore(store, (state) => state.startedAt);
  const status = useStore(store, (state) => state.status);
  const error = useStore(store, (state) => state.error);

  const actionCount = actions.length;
  const durationMs = startedAt ? now - startedAt : 0;
  const canSubmit = actionCount >= MIN_ACTION_COUNT && durationMs >= MIN_DURATION_MS && status !== "submitting";
  const progressLabel = getProgressLabel(actionCount, durationMs);

  const recentActions = useMemo(() => actions.slice(-5).reverse(), [actions]);
  const latestAction = actions.at(-1);

  useEffect(() => {
    if (!startedAt || status === "settled") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(interval);
  }, [startedAt, status]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const type = HOTKEY_ACTIONS.get(event.key.toLowerCase());
      if (!type) {
        return;
      }

      event.preventDefault();
      store.getState().begin();
      store.getState().performAction(type);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  async function handleSubmit() {
    try {
      store.getState().setSubmitting();

      const payload: DeckSubmissionRequest = {
        deck,
        nickname: nickname.trim() || undefined,
        actionCount,
        durationMs,
        actions,
      };

      const submissionResult = await submitDeck(payload);
      store.getState().setResult(submissionResult);
      onResult();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Unable to lock in this deck.";
      store.getState().setError(message);
    }
  }

  return (
    <div className="shuffle-layout" data-testid="shuffle-layout">
      <div className="shuffle-controls">
        <div className="actions-panel">
          {ACTIONS.map((action) => (
            <button
              key={action.type}
              className="action-button"
              onClick={() => {
                store.getState().begin();
                store.getState().performAction(action.type);
              }}
              type="button"
            >
              <span>
                {action.title} <kbd className="action-key">{action.hotkey.toUpperCase()}</kbd>
              </span>
              <small>{action.description}</small>
            </button>
          ))}
        </div>

        <div className="history-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Action Log</p>
              <h3>Latest shuffles</h3>
            </div>
          </div>
          {recentActions.length === 0 ? (
            <p className="empty-copy">No moves yet. Split it, riffle it, overhand it, then lock it in.</p>
          ) : (
            <ul className="history-list">
              {recentActions.map((action, index) => (
                <li key={`${action.type}-${action.at}-${index}`}>
                  <span>{formatActionLabel(action.type)}</span>
                  <small>{formatTimestamp(action.at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="deck-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Current Order</p>
            <h3>Full 52-card order</h3>
          </div>
          <span>{deck.length} cards</span>
        </div>
        <div className="deck-grid">
          {deck.map((card, index) => {
            const label = formatCard(card);
            return (
              <motion.div
                key={card}
                layout
                whileHover={{ y: -5, rotate: -4 }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 550,
                    damping: 26,
                    delay: index * 0.012,
                  },
                }}
                className={`deck-card suit-${card.slice(-1).toLowerCase()} ${label.length > 2 ? "deck-card-long" : ""}`}
              >
                <span>{label}</span>
                <small>{index + 1}</small>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="shuffle-controls">
        <div className="status-panel">
          <p className="latest-move">
            {latestAction ? `Latest move: ${formatActionLabel(latestAction.type)}` : "Latest move: Waiting for the first cut."}
          </p>
          <label className="nickname-field">
            <span>Optional nickname</span>
            <input
              placeholder="entropy-cowboy"
              value={nickname}
              onChange={(event) => store.getState().setNickname(event.target.value)}
            />
          </label>
          <div className="status-metrics">
            <div>
              <span>Actions logged</span>
              <strong>{actionCount}</strong>
            </div>
            <div>
              <span>Shuffle time</span>
              <strong>{formatDuration(durationMs)}</strong>
            </div>
          </div>
          <p className="status-copy">{progressLabel}</p>
          {error ? <p className="error-copy">{error}</p> : null}
          <button className="primary-button" disabled={!canSubmit} onClick={handleSubmit} type="button">
            {status === "submitting" ? "Locking in..." : "Lock In This Deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
