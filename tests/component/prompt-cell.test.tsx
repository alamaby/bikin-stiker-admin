import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptCell } from "@/app/[locale]/(admin)/llm-logs/_components/prompt-cell";
import { renderWithIntl } from "../helpers/renderWithIntl";

describe("PromptCell", () => {
  it("renders short text with only the copy button", () => {
    renderWithIntl(<PromptCell text="short prompt" />);
    expect(screen.getByText("short prompt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lihat lengkap" })).not.toBeInTheDocument();
  });

  it("truncates long text and expands on click", async () => {
    const user = userEvent.setup();
    const long = "p".repeat(100);
    renderWithIntl(<PromptCell text={long} max={80} />);
    expect(screen.getByText(`${"p".repeat(80)}...`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lihat lengkap" }));
    expect(screen.getByText(long)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ciutkan" })).toBeInTheDocument();
  });

  it("copies the full text to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWithIntl(<PromptCell text="copy me" />);
    await user.click(screen.getByRole("button", { name: "Salin" }));
    expect(writeText).toHaveBeenCalledWith("copy me");
    expect(await screen.findByRole("button", { name: "Tersalin!" })).toBeInTheDocument();
  });

  it("renders an em dash for empty text", () => {
    renderWithIntl(<PromptCell text="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
