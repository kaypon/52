import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShuffleExperience } from "@/components/shuffle-experience";
import { MIN_ACTION_COUNT } from "@/lib/deck";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ShuffleExperience", () => {
  it("renders the nav bar and shuffle layout", () => {
    render(<ShuffleExperience submitDeck={vi.fn()} />);

    expect(screen.getByText("52!")).toBeInTheDocument();
    expect(screen.getByTestId("shuffle-layout")).toBeInTheDocument();
    expect(screen.getByText(/full 52-card order/i)).toBeInTheDocument();
    expect(screen.getByText(/latest move: waiting for the first cut/i)).toBeInTheDocument();
  });

  it("keeps lock-in disabled until enough actions are completed", () => {
    render(<ShuffleExperience submitDeck={vi.fn()} />);

    const lockButton = screen.getByRole("button", { name: /lock in this deck/i });
    expect(lockButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^Split/i }));
    expect(lockButton).toBeDisabled();
    expect(screen.getByText(/latest move: split/i)).toBeInTheDocument();
  });

  it("triggers shuffle actions from the a/s/d/f hotkeys, except while typing", () => {
    render(<ShuffleExperience submitDeck={vi.fn()} />);

    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByText(/latest move: riffle/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "f" });
    expect(screen.getByText(/latest move: randomize/i)).toBeInTheDocument();

    const nicknameInput = screen.getByPlaceholderText("entropy-cowboy");
    fireEvent.keyDown(nicknameInput, { key: "a" });
    expect(screen.getByText(/latest move: randomize/i)).toBeInTheDocument();
    expect(screen.getByText("Actions logged").nextElementSibling).toHaveTextContent("2");
  });

  it("submits a deck, shows the result dialog, and navigates to the records screen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T12:00:00.000Z"));

    const submitDeck = vi.fn().mockResolvedValue({
      isNew: true,
      hash: "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd",
      firstSeenAt: "2026-04-14T12:00:00.000Z",
      seenCount: 1,
      uniqueDeckNumber: 42,
    });

    const fetchDecks = vi.fn().mockResolvedValue([
      {
        hash: "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd",
        nickname: "kevin",
        firstSeenAt: "2026-04-14T12:00:00.000Z",
        seenCount: 1,
        deckOrder: ["AS", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "10S"],
      },
    ]);

    render(<ShuffleExperience submitDeck={submitDeck} fetchDecks={fetchDecks} />);

    fireEvent.change(screen.getByPlaceholderText("entropy-cowboy"), {
      target: { value: "kevin" },
    });

    for (let index = 0; index < MIN_ACTION_COUNT; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /^Split/i }));
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    const lockButton = screen.getByRole("button", { name: /lock in this deck/i });
    expect(lockButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(lockButton);
      await Promise.resolve();
    });

    expect(submitDeck).toHaveBeenCalledTimes(1);
    expect(submitDeck.mock.calls[0]?.[0].nickname).toBe("kevin");
    expect(submitDeck.mock.calls[0]?.[0].deck).toHaveLength(52);
    expect(screen.getByText(/likely never existed before in human history/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /view records/i }));
      await Promise.resolve();
    });

    expect(screen.getByTestId("records-screen")).toBeInTheDocument();
    expect(fetchDecks).toHaveBeenCalledTimes(1);
    expect(screen.getByText("kevin")).toBeInTheDocument();
  });
});
