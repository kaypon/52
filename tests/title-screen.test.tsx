import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TitleScreen } from "@/components/title-screen";

describe("TitleScreen", () => {
  it("renders the logo and links Press Start to /52", () => {
    render(<TitleScreen />);

    expect(screen.getByText("52!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /press start/i })).toHaveAttribute("href", "/52");
  });
});
