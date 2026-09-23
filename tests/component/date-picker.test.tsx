import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "@/components/form/date-picker";
import { renderWithIntl } from "../helpers/renderWithIntl";

describe("DatePicker", () => {
  it("renders placeholder and calendar button", () => {
    const onChange = vi.fn();
    renderWithIntl(<DatePicker value="" onChange={onChange} />);
    expect(screen.getByPlaceholderText("YYYY-MM-DD")).toBeInTheDocument();
    expect(screen.getByLabelText(/calendar/i)).toBeInTheDocument();
  });

  it("opens popover, selects day, calls onChange with ISO", async () => {
    const onChange = vi.fn();
    renderWithIntl(<DatePicker value="2026-09-15" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/calendar/i));
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "20" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-20");
  });

  it("clear button calls onChange with empty string", async () => {
    const onChange = vi.fn();
    renderWithIntl(<DatePicker value="2026-09-15" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/calendar/i));
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
