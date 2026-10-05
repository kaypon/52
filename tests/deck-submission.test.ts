import { describe, expect, it } from "vitest";

import { applyShuffleAction, createCanonicalDeck, MIN_ACTION_COUNT } from "@/lib/deck";
import { MAX_ACTIONS, processDeckSubmission } from "@/lib/server/deck-submission";
import { MemoryDeckStorage } from "@/lib/server/storage";
import type { DeckStorage, RecordDeckSubmissionInput } from "@/lib/server/storage";
import type { DeckListEntry, DeckOrder, StoredDeckRecord } from "@/lib/types";

class TestStorage implements DeckStorage {
  private store = new Map<string, { firstSeenAt: Date; seenCount: number; deck: DeckOrder }>();

  async recordDeckSubmission(input: RecordDeckSubmissionInput): Promise<StoredDeckRecord> {
    const existing = this.store.get(input.hash);
    if (existing) {
      existing.seenCount += 1;
      return {
        hash: input.hash,
        isNew: false,
        firstSeenAt: existing.firstSeenAt,
        seenCount: existing.seenCount,
      };
    }

    const firstSeenAt = new Date("2026-04-14T12:00:00.000Z");
    this.store.set(input.hash, {
      firstSeenAt,
      seenCount: 1,
      deck: input.deck,
    });

    return {
      hash: input.hash,
      isNew: true,
      firstSeenAt,
      seenCount: 1,
      uniqueDeckNumber: this.store.size,
    };
  }

  async listDecks(): Promise<DeckListEntry[]> {
    return [...this.store.entries()].map(([hash, record]) => ({
      hash,
      firstSeenAt: record.firstSeenAt.toISOString(),
      seenCount: record.seenCount,
      deckOrder: record.deck,
    }));
  }
}

describe("deck submission service", () => {
  it("creates a first submission and then detects a duplicate", async () => {
    const storage = new TestStorage();
    const payload = {
      deck: createCanonicalDeck(),
      nickname: "entropy cowboy",
      actionCount: MIN_ACTION_COUNT,
      durationMs: 6_000,
      actions: Array.from({ length: MIN_ACTION_COUNT }, (_, index) => ({
        type: "split" as const,
        at: new Date(2026, 3, 14, 12, 0, index).toISOString(),
      })),
    };

    const first = await processDeckSubmission(payload, storage);
    const second = await processDeckSubmission(payload, storage);

    expect(first.isNew).toBe(true);
    expect(first.uniqueDeckNumber).toBe(1);
    expect(second.isNew).toBe(false);
    expect(second.seenCount).toBe(2);
  });

  it("rejects low-effort submissions", async () => {
    const storage = new TestStorage();

    await expect(
      processDeckSubmission(
        {
          deck: createCanonicalDeck(),
          actionCount: 2,
          durationMs: 1_000,
          actions: [
            {
              type: "split",
              at: new Date().toISOString(),
            },
            {
              type: "riffle",
              at: new Date().toISOString(),
            },
          ],
        },
        storage,
      ),
    ).rejects.toThrow(`At least ${MIN_ACTION_COUNT} shuffle actions are required.`);
  });

  it("lists recorded decks with their first nickname", async () => {
    const storage = new MemoryDeckStorage();

    await processDeckSubmission(
      {
        deck: createCanonicalDeck(),
        nickname: "entropy cowboy",
        actionCount: MIN_ACTION_COUNT,
        durationMs: 6_000,
        actions: Array.from({ length: MIN_ACTION_COUNT }, () => ({
          type: "split" as const,
          at: new Date().toISOString(),
        })),
      },
      storage,
    );

    const decks = await storage.listDecks();

    expect(decks).toHaveLength(1);
    expect(decks[0]?.nickname).toBe("entropy cowboy");
    expect(decks[0]?.seenCount).toBe(1);
    expect(decks[0]?.deckOrder).toHaveLength(52);
  });

  it("accepts the metadata real shuffles produce", async () => {
    const storage = new TestStorage();
    let deck = createCanonicalDeck();
    const actions = (["split", "riffle", "overhand", "randomize"] as const).flatMap((type) =>
      [1, 2].map(() => {
        const next = applyShuffleAction(deck, type);
        deck = next.deck;
        return next.action;
      }),
    );

    const result = await processDeckSubmission(
      { deck, actionCount: actions.length, durationMs: 6_000, actions },
      storage,
    );

    expect(result.isNew).toBe(true);
  });

  it("rejects action logs over the size cap", async () => {
    const storage = new TestStorage();
    const actionCount = MAX_ACTIONS + 1;

    await expect(
      processDeckSubmission(
        {
          deck: createCanonicalDeck(),
          actionCount,
          durationMs: 6_000,
          actions: Array.from({ length: actionCount }, () => ({
            type: "split" as const,
            at: new Date().toISOString(),
          })),
        },
        storage,
      ),
    ).rejects.toThrow("Submission payload is invalid.");
  });

  it("rejects oversized action metadata", async () => {
    const storage = new TestStorage();

    await expect(
      processDeckSubmission(
        {
          deck: createCanonicalDeck(),
          actionCount: MIN_ACTION_COUNT,
          durationMs: 6_000,
          actions: Array.from({ length: MIN_ACTION_COUNT }, () => ({
            type: "split" as const,
            at: new Date().toISOString(),
            meta: { note: "x".repeat(10_000) },
          })),
        },
        storage,
      ),
    ).rejects.toThrow("Submission payload is invalid.");
  });
});
