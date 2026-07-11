import { describe, expect, it } from "vitest";

import {
  createCanonicalDeck,
  overhandShuffle,
  riffleShuffle,
  splitDeck,
  validateDeckOrder,
} from "@/lib/deck";
import { hashDeck } from "@/lib/server/hash";

describe("deck utilities", () => {
  it("creates a canonical 52-card deck with unique cards", () => {
    const deck = createCanonicalDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(deck[0]).toBe("AS");
    expect(deck.at(-1)).toBe("KC");
  });

  it("rejects duplicate cards", () => {
    const deck = createCanonicalDeck();
    const duplicateDeck = [...deck];
    duplicateDeck[10] = duplicateDeck[0];

    expect(validateDeckOrder(duplicateDeck).isValid).toBe(false);
  });

  it("generates the same hash for the same deck order", () => {
    const deck = createCanonicalDeck();

    expect(hashDeck(deck)).toBe(hashDeck(createCanonicalDeck()));
  });

  it("split preserves the same set of cards", () => {
    const deck = createCanonicalDeck();
    const result = splitDeck(deck, 26);

    expect(result.deck).toHaveLength(52);
    expect(new Set(result.deck)).toEqual(new Set(deck));
    expect(result.deck[0]).toBe("AD");
  });

  it("riffle and overhand preserve the same set of cards", () => {
    const deck = createCanonicalDeck();

    const riffled = riffleShuffle(deck).deck;
    const overhand = overhandShuffle(deck).deck;

    expect(new Set(riffled)).toEqual(new Set(deck));
    expect(new Set(overhand)).toEqual(new Set(deck));
  });
});
