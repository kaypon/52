import { prisma } from "@/lib/server/prisma";
import type { DeckListEntry, DeckOrder, ShuffleAction, StoredDeckRecord } from "@/lib/types";

export type RecordDeckSubmissionInput = {
  hash: string;
  deck: DeckOrder;
  nickname?: string;
  actionCount: number;
  durationMs: number;
  actions: ShuffleAction[];
};

export interface DeckStorage {
  recordDeckSubmission(input: RecordDeckSubmissionInput): Promise<StoredDeckRecord>;
  listDecks(limit?: number): Promise<DeckListEntry[]>;
}

const DEFAULT_LIST_LIMIT = 100;

class PrismaDeckStorage implements DeckStorage {
  async recordDeckSubmission(input: RecordDeckSubmissionInput): Promise<StoredDeckRecord> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.deckHash.findUnique({
        where: { hash: input.hash },
      });

      if (existing) {
        const updated = await tx.deckHash.update({
          where: { hash: input.hash },
          data: {
            seenCount: {
              increment: 1,
            },
          },
        });

        await tx.deckSubmission.create({
          data: {
            hash: input.hash,
            nickname: input.nickname,
            actionCount: input.actionCount,
            durationMs: input.durationMs,
            actions: input.actions,
          },
        });

        return {
          hash: input.hash,
          isNew: false,
          firstSeenAt: existing.firstSeenAt,
          seenCount: updated.seenCount,
        };
      }

      const created = await tx.deckHash.create({
        data: {
          hash: input.hash,
          deckOrder: input.deck,
          firstNickname: input.nickname,
          submissions: {
            create: {
              nickname: input.nickname,
              actionCount: input.actionCount,
              durationMs: input.durationMs,
              actions: input.actions,
            },
          },
        },
      });

      const uniqueDeckNumber = await tx.deckHash.count();

      return {
        hash: input.hash,
        isNew: true,
        firstSeenAt: created.firstSeenAt,
        seenCount: created.seenCount,
        uniqueDeckNumber,
      };
    });
  }

  async listDecks(limit = DEFAULT_LIST_LIMIT): Promise<DeckListEntry[]> {
    const decks = await prisma.deckHash.findMany({
      orderBy: { firstSeenAt: "desc" },
      take: limit,
    });

    return decks.map((deck) => ({
      hash: deck.hash,
      nickname: deck.firstNickname ?? undefined,
      firstSeenAt: deck.firstSeenAt.toISOString(),
      seenCount: deck.seenCount,
      deckOrder: deck.deckOrder as DeckOrder,
    }));
  }
}

export class MemoryDeckStorage implements DeckStorage {
  private deckHashes = new Map<
    string,
    {
      firstSeenAt: Date;
      seenCount: number;
      deck: DeckOrder;
      firstNickname?: string;
    }
  >();

  async recordDeckSubmission(input: RecordDeckSubmissionInput): Promise<StoredDeckRecord> {
    const existing = this.deckHashes.get(input.hash);

    if (existing) {
      existing.seenCount += 1;
      return {
        hash: input.hash,
        isNew: false,
        firstSeenAt: existing.firstSeenAt,
        seenCount: existing.seenCount,
      };
    }

    const firstSeenAt = new Date();
    this.deckHashes.set(input.hash, {
      firstSeenAt,
      seenCount: 1,
      deck: input.deck,
      firstNickname: input.nickname,
    });

    return {
      hash: input.hash,
      isNew: true,
      firstSeenAt,
      seenCount: 1,
      uniqueDeckNumber: this.deckHashes.size,
    };
  }

  async listDecks(limit = DEFAULT_LIST_LIMIT): Promise<DeckListEntry[]> {
    return [...this.deckHashes.entries()]
      .sort(([, a], [, b]) => b.firstSeenAt.getTime() - a.firstSeenAt.getTime())
      .slice(0, limit)
      .map(([hash, record]) => ({
        hash,
        nickname: record.firstNickname,
        firstSeenAt: record.firstSeenAt.toISOString(),
        seenCount: record.seenCount,
        deckOrder: record.deck,
      }));
  }
}

const memoryStorage = new MemoryDeckStorage();

export function getDeckStorage(): DeckStorage {
  return process.env.DATABASE_URL ? new PrismaDeckStorage() : memoryStorage;
}
