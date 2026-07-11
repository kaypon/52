"use client";

import { createStore } from "zustand/vanilla";

import { applyShuffleAction, createCanonicalDeck, MIN_ACTION_COUNT, MIN_DURATION_MS } from "@/lib/deck";
import type { DeckOrder, DeckSubmissionResult, ShuffleAction, ShuffleActionType } from "@/lib/types";

export type ShuffleStatus = "idle" | "shuffling" | "submitting" | "settled";

export type ShuffleState = {
  deck: DeckOrder;
  actions: ShuffleAction[];
  startedAt: number | null;
  nickname: string;
  result: DeckSubmissionResult | null;
  error: string | null;
  status: ShuffleStatus;
};

export type ShuffleStore = ShuffleState & {
  begin: () => void;
  performAction: (type: ShuffleActionType) => void;
  setNickname: (nickname: string) => void;
  setSubmitting: () => void;
  setResult: (result: DeckSubmissionResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: ShuffleState = {
  deck: createCanonicalDeck(),
  actions: [],
  startedAt: null,
  nickname: "",
  result: null,
  error: null,
  status: "idle",
};

export function createShuffleStore() {
  return createStore<ShuffleStore>((set) => ({
    ...initialState,
    begin: () =>
      set((state) => ({
        ...state,
        status: "shuffling",
        startedAt: state.startedAt ?? Date.now(),
        error: null,
      })),
    performAction: (type) =>
      set((state) => {
        const startedAt = state.startedAt ?? Date.now();
        const { deck, action } = applyShuffleAction(state.deck, type);
        return {
          ...state,
          deck,
          actions: [...state.actions, action],
          startedAt,
          status: "shuffling",
          error: null,
          result: null,
        };
      }),
    setNickname: (nickname) =>
      set((state) => ({
        ...state,
        nickname,
      })),
    setSubmitting: () =>
      set((state) => ({
        ...state,
        status: "submitting",
        error: null,
      })),
    setResult: (result) =>
      set((state) => ({
        ...state,
        result,
        status: "settled",
        error: null,
      })),
    setError: (error) =>
      set((state) => ({
        ...state,
        error,
        status: state.actions.length > 0 ? "shuffling" : "idle",
      })),
    reset: () =>
      set({
        ...initialState,
      }),
  }));
}

export function getProgressLabel(actionCount: number, durationMs: number) {
  const actionReady = actionCount >= MIN_ACTION_COUNT;
  const durationReady = durationMs >= MIN_DURATION_MS;

  if (actionReady && durationReady) {
    return "Your deck is eligible to lock in.";
  }
  if (!actionReady && !durationReady) {
    return `Need ${MIN_ACTION_COUNT - actionCount} more actions and ${Math.ceil((MIN_DURATION_MS - durationMs) / 1000)} more seconds.`;
  }
  if (!actionReady) {
    return `Need ${MIN_ACTION_COUNT - actionCount} more shuffle actions.`;
  }
  return `Keep shuffling for ${Math.ceil((MIN_DURATION_MS - durationMs) / 1000)} more seconds.`;
}
