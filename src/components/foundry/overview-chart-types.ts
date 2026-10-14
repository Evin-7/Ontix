export type OverviewChartValue = {
  value: string;
  label: string;
  count: number;
  color: string;
};

export type OverviewChartSpec = {
  title: string;
  href: "/projects" | "/cases" | "/approvals";
  filterKey: "status" | "priority";
  data: OverviewChartValue[];
  kind: "donut" | "bar";
};
