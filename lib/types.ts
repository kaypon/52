export const SHUFFLE_ACTION_TYPES = ["split", "riffle", "overhand", "randomize"] as const;

export type ShuffleActionType = (typeof SHUFFLE_ACTION_TYPES)[number];
export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";
export type CardId = `${Rank}${Suit}`;
export type DeckOrder = CardId[];

export type ShuffleAction = {
  type: ShuffleActionType;
  at: string;
  meta?: Record<string, number | string | boolean>;
};

export type DeckSubmissionRequest = {
  deck: string[];
  nickname?: string;
  actionCount: number;
  durationMs: number;
  actions: ShuffleAction[];
};

export type DeckSubmissionResult = {
  isNew: boolean;
  hash: string;
  firstSeenAt: string;
  seenCount: number;
  uniqueDeckNumber?: number;
};

export type DeckListEntry = {
  hash: string;
  nickname?: string;
  firstSeenAt: string;
  seenCount: number;
  deckOrder: DeckOrder;
};

export type StoredDeckRecord = {
  hash: string;
  isNew: boolean;
  firstSeenAt: Date;
  seenCount: number;
  uniqueDeckNumber?: number;
};
