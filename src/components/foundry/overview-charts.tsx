"use client";

import dynamic from "next/dynamic";
import type { OverviewChartSpec } from "./overview-chart-types";
import { OverviewChartSkeleton } from "./overview-skeleton";

const OverviewChartsClient = dynamic(() => import("./overview-charts-client"), {
  ssr: false,
  loading: () => <div className="foundry-overview-grid">{Array.from({ length: 4 }, (_, index) => <OverviewChartSkeleton key={index} compact />)}</div>,
});

export function OverviewCharts({ charts, isDemo = false }: { charts: OverviewChartSpec[]; isDemo?: boolean }) {
  return <OverviewChartsClient charts={charts} isDemo={isDemo} />;
}
