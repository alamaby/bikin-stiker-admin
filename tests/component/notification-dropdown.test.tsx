import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationDropdown, { type HeaderNotification } from "@/components/header/NotificationDropdown";
import { renderWithIntl } from "../helpers/renderWithIntl";

const ITEMS: HeaderNotification[] = [
  { id: "a1", title: "pixazo / flux", detail: "boom", time: "5 mnt lalu", href: null, tone: "error" },
];

describe("NotificationDropdown", () => {
  it("shows the empty state when there are no items", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NotificationDropdown items={[]} locale="id" />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/Tidak ada generasi gagal/)).toBeInTheDocument();
  });

  it("lists notifications with count and a locale-aware view-all link", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NotificationDropdown items={ITEMS} locale="id" />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/Notifikasi/)).toBeInTheDocument();
    expect(screen.getByText("pixazo / flux")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lihat Semua Log Gagal/ })).toHaveAttribute(
      "href",
      "/id/llm-logs?success=fail",
    );
  });

  it("closes on the close button", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NotificationDropdown items={ITEMS} locale="id" />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await user.click(screen.getByRole("button", { name: "Close notifications" }));
    expect(screen.queryByText("pixazo / flux")).not.toBeInTheDocument();
  });
});
