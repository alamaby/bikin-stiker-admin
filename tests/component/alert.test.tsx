import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Alert from "@/components/ui/alert/Alert";

describe("Alert", () => {
  it("exposes role=alert with title and message", () => {
    render(<Alert variant="error" title="Login gagal" message="Email tidak valid" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Login gagal")).toBeInTheDocument();
    expect(screen.getByText("Email tidak valid")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Alert variant="success" title="Berhasil" message="Tersimpan" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("omits the close button when onClose is not provided", () => {
    render(<Alert variant="warning" title="W" message="M" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
