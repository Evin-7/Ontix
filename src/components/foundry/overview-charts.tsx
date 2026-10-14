"use client";

import dynamic from "next/dynamic";
import type { OverviewChartSpec } from "./overview-chart-types";
import { OverviewChartSkeleton } from "./overview-skeleton";

const OverviewChartsClient = dynamic(() => import("./overview-charts-client"), {
  ssr: false,
  loading: () => <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">{Array.from({ length: 4 }, (_, index) => <OverviewChartSkeleton key={index} compact />)}</div>,
});

export function OverviewCharts({ charts, isDemo = false }: { charts: OverviewChartSpec[]; isDemo?: boolean }) {
  return <OverviewChartsClient charts={charts} isDemo={isDemo} />;
}
