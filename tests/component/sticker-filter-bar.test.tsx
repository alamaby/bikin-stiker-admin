import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StickerFilterBar } from "@/app/[locale]/(admin)/stickers/_components/sticker-filter-bar";
import { renderWithIntl } from "../helpers/renderWithIntl";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const defaultModelMap: Record<string, string[]> = {};

describe("StickerFilterBar", () => {
  it("shows Filter (0) button when no active filters and closed by default", () => {
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={false}
      />,
    );
    expect(screen.getByRole("button", { name: /filter \(0\)/i })).toBeInTheDocument();
    expect(screen.queryByText(/Cari: cat/i)).not.toBeInTheDocument();
  });

  it("shows fields when defaultOpen is true", () => {
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={true}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    // Status + Provider + Model + Rating + Flagged = 5 selects; DatePickers are inputs not comboboxes
    expect(comboboxes).toHaveLength(5);
    expect(screen.getAllByPlaceholderText("YYYY-MM-DD")).toHaveLength(2);
  });

  it("toggles open/close on toggle button click", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /filter \(0\)/i }));
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes).toHaveLength(5);
    expect(screen.getAllByPlaceholderText("YYYY-MM-DD")).toHaveLength(2);
  });

  it("shows chip for active q filter and removes it on ×", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "cat", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={false}
      />,
    );
    expect(screen.getByText(/Cari: cat/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cari: cat/ }));
    const called = pushMock.mock.calls[0][0];
    expect(called).not.toContain("q=cat");
    expect(called).toContain("page=1");
  });

  it("model select shows only models for selected provider", () => {
    const modelMap = {
      pixazo: ["flux-1-schnell", "sdxl-base-1.0"],
      pollinations: ["flux", "klein"],
    };
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "", status: "all", provider: "pixazo", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={modelMap}
        defaultOpen={true}
      />,
    );
    // Use getAllByRole("combobox") + filter by options to find model select
    const allCombos = screen.getAllByRole("combobox");
    // Find the one that has flux-1-schnell option
    const modelSelect = allCombos.find((el) => {
      const opts = Array.from((el as HTMLSelectElement).options);
      return opts.some((o) => o.text === "flux-1-schnell");
    });
    expect(modelSelect).toBeInTheDocument();
    expect((modelSelect as HTMLSelectElement).value).toBe("all");
    expect(screen.getByRole("option", { name: "flux-1-schnell" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "sdxl-base-1.0" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "klein" })).not.toBeInTheDocument();
  });

  it("swapping provider updates model options", async () => {
    const modelMap = {
      pixazo: ["flux-1-schnell", "sdxl-base-1.0"],
      pollinations: ["flux", "klein"],
    };
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "", status: "all", provider: "pixazo", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={modelMap}
        defaultOpen={true}
      />,
    );
    const providerSelect = screen.getAllByRole("combobox").find((el) => {
      const opts = Array.from((el as HTMLSelectElement).options);
      return opts.some((o) => o.text === "pixazo");
    });
    await user.selectOptions(providerSelect!, "pollinations");
    expect(screen.getByRole("option", { name: "klein" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "flux-1-schnell" })).not.toBeInTheDocument();
  });

  it("submit omits 'all' values and includes page=1", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "cat", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={true}
      />,
    );
    // Submit button: use getAllByRole and pick the one with type="submit"
    const filterBtns = screen.getAllByRole("button", { name: /filter/i });
    const submitBtn = filterBtns.find((b) => b.getAttribute("type") === "submit");
    expect(submitBtn).toBeInTheDocument();
    await user.click(submitBtn!);
    // Find the call that contains page=1 (the submit push)
    const submitCall = pushMock.mock.calls.find((c) => (c[0] as string).includes("page=1") && (c[0] as string).includes("q=cat"));
    expect(submitCall).toBeDefined();
    expect(submitCall![0]).toContain("q=cat");
    expect(submitCall![0]).toContain("page=1");
    expect(submitCall![0]).not.toContain("status=all");
  });

  it("clear button resets to base route", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StickerFilterBar
        locale="id"
        initial={{ q: "foo", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" }}
        modelMap={defaultModelMap}
        defaultOpen={true}
      />,
    );
    // Use the form clear button (the last one in the form)
    const clears = screen.getAllByRole("button", { name: "Bersihkan" });
    // Find the one inside the form (not the chip area one)
    const formClear = clears.find((btn) => btn.closest("form"));
    expect(formClear).toBeInTheDocument();
    await user.click(formClear!);
    expect(pushMock).toHaveBeenCalledWith("/id/stickers");
  });
});
