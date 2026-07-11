import type { CardId, DeckOrder, ShuffleAction, ShuffleActionType, Rank, Suit } from "@/lib/types";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const MIN_ACTION_COUNT = 6;
export const MIN_DURATION_MS = 5_000;
export const NICKNAME_PATTERN = /^[a-zA-Z0-9 _-]{2,24}$/;

export function createCanonicalDeck(): DeckOrder {
  return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}` as CardId));
}

export function normalizeDeck(deck: string[]): DeckOrder {
  return deck.map((card) => card.trim().toUpperCase()) as DeckOrder;
}

export function validateDeckOrder(deck: string[]): { isValid: boolean; reason?: string } {
  const canonical = new Set(createCanonicalDeck());
  if (deck.length !== 52) {
    return { isValid: false, reason: "A valid deck must contain exactly 52 cards." };
  }

  const seen = new Set<string>();
  for (const card of deck) {
    if (!canonical.has(card as CardId)) {
      return { isValid: false, reason: `Card "${card}" is not a recognized card id.` };
    }
    if (seen.has(card)) {
      return { isValid: false, reason: `Card "${card}" appears more than once.` };
    }
    seen.add(card);
  }

  return { isValid: true };
}

export function splitDeck(deck: DeckOrder, cutIndex = randomInt(20, 32)): { deck: DeckOrder; meta: ShuffleAction["meta"] } {
  const nextDeck = [...deck.slice(cutIndex), ...deck.slice(0, cutIndex)] as DeckOrder;
  return { deck: nextDeck, meta: { cutIndex } };
}

export function riffleShuffle(deck: DeckOrder): { deck: DeckOrder; meta: ShuffleAction["meta"] } {
  const cutIndex = randomInt(22, 30);
  const left = deck.slice(0, cutIndex);
  const right = deck.slice(cutIndex);
  const shuffled: CardId[] = [];
  let dropsFromLeft = 0;
  let dropsFromRight = 0;

  while (left.length > 0 || right.length > 0) {
    const chooseLeft = right.length === 0 || (left.length > 0 && Math.random() > 0.45);
    const chunkSize = randomInt(1, 3);
    const source = chooseLeft ? left : right;
    const removed = source.splice(0, chunkSize);
    shuffled.push(...removed);

    if (chooseLeft) {
      dropsFromLeft += removed.length;
    } else {
      dropsFromRight += removed.length;
    }
  }

  return {
    deck: shuffled as DeckOrder,
    meta: {
      cutIndex,
      dropsFromLeft,
      dropsFromRight,
    },
  };
}

export function overhandShuffle(deck: DeckOrder): { deck: DeckOrder; meta: ShuffleAction["meta"] } {
  const remaining = [...deck];
  const packets: CardId[][] = [];

  while (remaining.length > 0) {
    const take = Math.min(remaining.length, randomInt(2, 8));
    packets.unshift(remaining.splice(0, take) as CardId[]);
  }

  return {
    deck: packets.flat() as DeckOrder,
    meta: {
      packets: packets.length,
    },
  };
}

export function randomizeDeck(deck: DeckOrder): { deck: DeckOrder; meta: ShuffleAction["meta"] } {
  const clone = [...deck];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return {
    deck: clone as DeckOrder,
    meta: {
      swaps: clone.length - 1,
    },
  };
}

export function applyShuffleAction(deck: DeckOrder, type: ShuffleActionType): { deck: DeckOrder; action: ShuffleAction } {
  const result =
    type === "split"
      ? splitDeck(deck)
      : type === "riffle"
        ? riffleShuffle(deck)
        : type === "overhand"
          ? overhandShuffle(deck)
          : randomizeDeck(deck);

  return {
    deck: result.deck,
    action: {
      type,
      at: new Date().toISOString(),
      meta: result.meta,
    },
  };
}

export function validateNickname(nickname?: string): { isValid: boolean; reason?: string } {
  if (!nickname) {
    return { isValid: true };
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return {
      isValid: false,
      reason: "Nickname must be 2-24 characters using letters, numbers, spaces, hyphens, or underscores.",
    };
  }

  return { isValid: true };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
