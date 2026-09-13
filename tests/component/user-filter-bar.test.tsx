import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserFilterBar } from "@/app/[locale]/(admin)/users/_components/filter-bar";
import { renderWithIntl } from "../helpers/renderWithIntl";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("UserFilterBar", () => {
  it("submits q and resets the page, omitting 'all' selects", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserFilterBar locale="id" initial={{ q: "", tier: "all", status: "all" }} />);
    await user.type(screen.getByPlaceholderText("Cari email atau ID"), "foo");
    await user.click(screen.getByRole("button", { name: /filter/i }));
    expect(pushMock).toHaveBeenCalledWith("/id/users?q=foo&page=1");
  });

  it("includes tier and status when set", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserFilterBar locale="id" initial={{ q: "", tier: "plus", status: "suspended" }} />);
    await user.click(screen.getByRole("button", { name: /filter/i }));
    expect(pushMock).toHaveBeenCalledWith("/id/users?tier=plus&status=suspended&page=1");
  });

  it("clears back to the base route", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserFilterBar locale="id" initial={{ q: "foo", tier: "plus", status: "all" }} />);
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(pushMock).toHaveBeenCalledWith("/id/users");
  });

  it("prefills from the initial values", () => {
    renderWithIntl(<UserFilterBar locale="id" initial={{ q: "a@b.com", tier: "free", status: "active" }} />);
    expect(screen.getByPlaceholderText("Cari email atau ID")).toHaveValue("a@b.com");
  });
});
