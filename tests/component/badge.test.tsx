import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import TailBadge from "@/components/ui/badge/TailBadge";

describe("Badge (legacy wrapper)", () => {
  it("renders default as a solid brand badge", () => {
    render(<Badge>Active</Badge>);
    const el = screen.getByText("Active");
    expect(el).toHaveClass("bg-brand-500");
  });

  it("maps destructive to the error variant", () => {
    render(<Badge variant="destructive">Suspended</Badge>);
    expect(screen.getByText("Suspended")).toHaveClass("bg-error-500");
  });

  it("maps secondary to the light variant", () => {
    render(<Badge variant="secondary">free</Badge>);
    expect(screen.getByText("free")).toHaveClass("bg-gray-100");
  });

  it("adds a ring for outline without changing the fill", () => {
    render(<Badge variant="outline">Aktif</Badge>);
    const el = screen.getByText("Aktif");
    expect(el).toHaveClass("bg-gray-100");
    expect(el).toHaveClass("ring-1");
  });
});

describe("TailBadge", () => {
  it("renders semantic colors for status badges", () => {
    render(
      <>
        <TailBadge color="success">ok</TailBadge>
        <TailBadge variant="solid" color="error">fail</TailBadge>
        <TailBadge color="light">cached</TailBadge>
      </>,
    );
    expect(screen.getByText("ok")).toHaveClass("bg-success-50");
    expect(screen.getByText("fail")).toHaveClass("bg-error-500");
    expect(screen.getByText("cached")).toHaveClass("bg-gray-100");
  });
});
