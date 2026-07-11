import { createHash } from "node:crypto";

import type { DeckOrder } from "@/lib/types";

export function hashDeck(deck: DeckOrder): string {
  return createHash("sha256").update(deck.join("-")).digest("hex");
}
