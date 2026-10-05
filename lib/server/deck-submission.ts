import { z } from "zod";

import {
  MIN_ACTION_COUNT,
  MIN_DURATION_MS,
  normalizeDeck,
  validateDeckOrder,
  validateNickname,
} from "@/lib/deck";
import { hashDeck } from "@/lib/server/hash";
import type { DeckSubmissionRequest, DeckSubmissionResult } from "@/lib/types";
import { SHUFFLE_ACTION_TYPES } from "@/lib/types";
import type { DeckStorage } from "@/lib/server/storage";

// The action log is stored as-is, so these caps bound what one request can
// write. Real shuffles log at most three numeric meta fields per action.
export const MAX_ACTIONS = 1_000;
const MAX_META_FIELDS = 8;

const actionSchema = z.object({
  type: z.enum(SHUFFLE_ACTION_TYPES),
  at: z.string().datetime(),
  meta: z
    .record(z.string().max(32), z.union([z.number(), z.string().max(64), z.boolean()]))
    .refine((meta) => Object.keys(meta).length <= MAX_META_FIELDS)
    .optional(),
});

const submissionSchema = z.object({
  deck: z.array(z.string().max(8)).max(52),
  nickname: z.string().trim().optional(),
  actionCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  actions: z.array(actionSchema).max(MAX_ACTIONS),
});

export class DeckSubmissionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function processDeckSubmission(
  payload: DeckSubmissionRequest,
  storage: DeckStorage,
): Promise<DeckSubmissionResult> {
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new DeckSubmissionError("Submission payload is invalid.");
  }

  const normalizedDeck = normalizeDeck(parsed.data.deck);
  const nickname = parsed.data.nickname?.trim() || undefined;

  const nicknameValidation = validateNickname(nickname);
  if (!nicknameValidation.isValid) {
    throw new DeckSubmissionError(nicknameValidation.reason ?? "Nickname is invalid.");
  }

  const deckValidation = validateDeckOrder(normalizedDeck);
  if (!deckValidation.isValid) {
    throw new DeckSubmissionError(deckValidation.reason ?? "Deck order is invalid.");
  }

  if (parsed.data.actionCount !== parsed.data.actions.length) {
    throw new DeckSubmissionError("Action count does not match the provided action log.");
  }

  if (parsed.data.actionCount < MIN_ACTION_COUNT) {
    throw new DeckSubmissionError(`At least ${MIN_ACTION_COUNT} shuffle actions are required.`);
  }

  if (parsed.data.durationMs < MIN_DURATION_MS) {
    throw new DeckSubmissionError(`Keep shuffling for at least ${MIN_DURATION_MS / 1000} seconds before locking in.`);
  }

  const hash = hashDeck(normalizedDeck);
  const stored = await storage.recordDeckSubmission({
    hash,
    deck: normalizedDeck,
    nickname,
    actionCount: parsed.data.actionCount,
    durationMs: parsed.data.durationMs,
    actions: parsed.data.actions,
  });

  return {
    isNew: stored.isNew,
    hash: stored.hash,
    firstSeenAt: stored.firstSeenAt.toISOString(),
    seenCount: stored.seenCount,
    uniqueDeckNumber: stored.uniqueDeckNumber,
  };
}
