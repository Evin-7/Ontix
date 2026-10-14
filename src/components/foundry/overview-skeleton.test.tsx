// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewSkeleton } from "./overview-skeleton";

describe("Overview loading state", () => {
  it("keeps the dashboard content area busy with six KPIs, four chart cards, and attention sections", () => {
    const { container } = render(<OverviewSkeleton />);
    expect(screen.getByRole("status", { name: "Loading Foundry overview" }).getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll(".overview-loading-kpis > div")).toHaveLength(6);
    expect(container.querySelectorAll(".overview-loading-charts > .foundry-chart-card-skeleton")).toHaveLength(4);
    expect(container.querySelectorAll(".overview-loading-bottom > div")).toHaveLength(2);
  });
});
