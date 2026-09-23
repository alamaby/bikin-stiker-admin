import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlagButton } from "@/app/[locale]/(admin)/stickers/_components/flag-button";
import { renderWithIntl } from "../helpers/renderWithIntl";

vi.mock("@/app/[locale]/(admin)/stickers/actions", () => ({
  flagStickerWithState: vi.fn().mockResolvedValue({
    success: true,
    message: "Stiker ditandai tidak pantas",
  }),
  unflagStickerWithState: vi.fn().mockResolvedValue({
    success: true,
    message: "Tanda tidak pantas dicabut",
  }),
}));

describe("FlagButton", () => {
  it("shows unflag button when already flagged", () => {
    renderWithIntl(<FlagButton id="abc" isFlagged />);
    expect(screen.getByRole("button", { name: /batalkan/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tandai/i })).not.toBeInTheDocument();
  });

  it("shows flag button when not flagged", () => {
    renderWithIntl(<FlagButton id="abc" isFlagged={false} />);
    expect(screen.getByRole("button", { name: /tandai/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cabut/i })).not.toBeInTheDocument();
  });

  it("opens modal on flag click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FlagButton id="abc-123" isFlagged={false} />);
    await user.click(screen.getByRole("button", { name: /tandai/i }));
    expect(screen.getByText(/tandai stiker/i)).toBeInTheDocument();
    expect(screen.getByText(/abc-123/i)).toBeInTheDocument();
  });

  it("unflag button renders label Batalkan", () => {
    renderWithIntl(<FlagButton id="xyz" isFlagged />);
    expect(screen.getByRole("button", { name: "Batalkan" })).toBeInTheDocument();
  });
});
