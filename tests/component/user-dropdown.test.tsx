import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDropdown from "@/components/header/UserDropdown";
import { renderWithIntl } from "../helpers/renderWithIntl";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: signOutMock } }),
}));

describe("UserDropdown", () => {
  it("shows the email's initial and display name", () => {
    renderWithIntl(<UserDropdown userEmail="admin@example.com" locale="id" />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("signs out and redirects to the locale login page", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserDropdown userEmail="admin@example.com" locale="id" />);
    await user.click(screen.getByText("admin"));
    await user.click(screen.getByRole("button", { name: /keluar/i }));
    expect(signOutMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/id/login");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("falls back to Admin when no email is available", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserDropdown userEmail={null} locale="en" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    await user.click(screen.getByText("Admin"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
