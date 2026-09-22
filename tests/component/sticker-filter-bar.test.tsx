import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StickerFilterBar } from "@/app/[locale]/(admin)/stickers/_components/sticker-filter-bar";
import { renderWithIntl } from "../helpers/renderWithIntl";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("StickerFilterBar", () => {
  it("renders all 8 fields", () => {
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{
          q: "",
          status: "all",
          provider: "all",
          model: "",
          rating: "all",
          flagged: "all",
          date_from: "",
          date_to: "",
        }}
      />,
    );
    // Search input + model input present; selects present; buttons present
    expect(screen.getByPlaceholderText(/prompt/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/flux/i)).toBeInTheDocument();
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes).toHaveLength(4);
    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bersihkan/i })).toBeInTheDocument();
  });

  it("submits with page=1 and omits 'all' values", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{
          q: "cat",
          status: "all",
          provider: "all",
          model: "",
          rating: "all",
          flagged: "all",
          date_from: "",
          date_to: "",
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /filter/i }));
    const called = pushMock.mock.calls[0][0];
    expect(called).toContain("q=cat");
    expect(called).toContain("page=1");
    expect(called).not.toContain("status=all");
  });

  it("clears back to base route", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{
          q: "foo",
          status: "all",
          provider: "all",
          model: "",
          rating: "all",
          flagged: "all",
          date_from: "",
          date_to: "",
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(pushMock).toHaveBeenCalledWith("/id/stickers");
  });
});
