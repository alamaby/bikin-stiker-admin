import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Pagination from "@/components/tables/Pagination";

const props = {
  totalPages: 5,
  total: 51,
  pageSize: 12,
  summary: (total: number, shown: number, page: number) => `${total} total · ${shown} on page ${page}`,
  getHref: (p: number) => `/id/presets?page=${p}`,
};

describe("Pagination", () => {
  it("renders nothing on a single page", () => {
    const { container } = render(<Pagination {...props} page={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Prev on the first page and links Next with the next page", () => {
    render(<Pagination {...props} page={1} />);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getByText("Next").closest("a")).toHaveAttribute("href", "/id/presets?page=2");
    expect(screen.getByText("Prev").closest("span")).not.toBeNull();
  });

  it("links Prev and disables Next on the last page", () => {
    render(<Pagination {...props} page={5} total={51} pageSize={12} />);
    expect(screen.getByText("Prev").closest("a")).toHaveAttribute("href", "/id/presets?page=4");
    expect(screen.getByText("Next").closest("span")).not.toBeNull();
    expect(screen.getByText("51 total · 3 on page 5")).toBeInTheDocument();
  });

  it("computes the shown count for middle pages", () => {
    render(<Pagination {...props} page={2} />);
    expect(screen.getByText("51 total · 12 on page 2")).toBeInTheDocument();
  });
});
