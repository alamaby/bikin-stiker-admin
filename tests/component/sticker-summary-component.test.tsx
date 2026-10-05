import React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/renderWithIntl";
import { StickerSummary } from "@/app/[locale]/(admin)/stickers/_components/sticker-summary";
import type { StickerSummaryData } from "@/lib/sticker-summary";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
}));

const mockData: StickerSummaryData = {
  total: 100,
  success: 90,
  failed: 8,
  pending: 2,
  flagged: 3,
  avgMs: 15000,
  totalCost: 100,
  up: 80,
  down: 20,
  unrated: 0,
  trend: [{ date: "2026-10-01", total: 10, success: 9 }],
  providers: [{ name: "pixazo", value: 80 }],
};

describe("StickerSummary component", () => {
  it("renders summary cards with correct metrics", () => {
    renderWithIntl(<StickerSummary data={mockData} locale="id" />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("80/20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("applies upPct (80%) to bg-success-500 and downPct (20%) to bg-error-500", () => {
    const { container } = renderWithIntl(<StickerSummary data={mockData} locale="id" />);
    const successBar = container.querySelector(".bg-success-500");
    const errorBar = container.querySelector(".bg-error-500");

    expect(successBar).toBeInTheDocument();
    expect(errorBar).toBeInTheDocument();
    // 80 up / (80+20) = 80% upPct -> green bar should have 80%
    expect(successBar).toHaveStyle({ width: "80%" });
    // 20 down / (80+20) = 20% downPct -> red bar should have 20%
    expect(errorBar).toHaveStyle({ width: "20%" });
  });

  it("renders flagged card as a Link to the flagged filter", () => {
    renderWithIntl(<StickerSummary data={mockData} locale="id" />);
    const link = screen.getByRole("link", { name: /3/i });
    expect(link).toHaveAttribute("href", "/id/stickers?flagged=flagged");
  });
});
