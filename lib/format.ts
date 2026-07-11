import type { CardId } from "@/lib/types";

const SUIT_SYMBOL: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export function formatCard(card: CardId): string {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return `${rank}${SUIT_SYMBOL[suit]}`;
}

export function formatActionLabel(action: string): string {
  if (action === "randomize") {
    return "Randomize";
  }
  return `${action.slice(0, 1).toUpperCase()}${action.slice(1)}`;
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return `${seconds}s`;
}
