"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OverviewChartSpec, OverviewChartValue } from "./overview-chart-types";

function displayCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function chartTooltipStyle() {
  return {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--foreground)",
    boxShadow: "var(--shadow-md)",
    fontSize: 12,
  };
}

function BreakdownChart({ chart }: { chart: OverviewChartSpec }) {
  const router = useRouter();
  const total = chart.data.reduce((sum, item) => sum + item.count, 0);
  function navigate(item: OverviewChartValue) {
    router.push(`${chart.href}?${chart.filterKey}=${encodeURIComponent(item.value)}`);
  }

  return <section className="foundry-chart-card" aria-label={`${chart.title} breakdown`}>
    <div className="foundry-chart-heading">
      <div><span className="eyebrow">LIVE ONTOLOGY BREAKDOWN</span><h2>{chart.title}</h2></div>
      <span>{displayCount(total)} records</span>
    </div>
    {chart.data.length === 0 ? <p className="foundry-chart-empty">No records in the visible sample.</p> : <>
      <div className={`foundry-chart-visual ${chart.kind === "donut" ? "is-donut" : "is-bar"}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === "donut" ? <PieChart accessibilityLayer>
            <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => [displayCount(Number(value)), "Records"]} />
            <Pie data={chart.data} dataKey="count" nameKey="label" innerRadius={48} outerRadius={71} paddingAngle={3} stroke="none" isAnimationActive>
              {chart.data.map((item) => <Cell key={item.value} fill={item.color} onClick={() => navigate(item)} style={{ cursor: "pointer" }} />)}
            </Pie>
          </PieChart> : <BarChart data={chart.data} layout="vertical" margin={{ top: 4, right: 16, bottom: 2, left: 2 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={96} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => [displayCount(Number(value)), "Records"]} cursor={{ fill: "var(--surface-muted)", opacity: .65 }} />
            <Bar dataKey="count" name="Records" radius={[0, 5, 5, 0]} maxBarSize={21} isAnimationActive>
              {chart.data.map((item) => <Cell key={item.value} fill={item.color} onClick={() => navigate(item)} style={{ cursor: "pointer" }} />)}
            </Bar>
          </BarChart>}
        </ResponsiveContainer>
        {chart.kind === "donut" && <div className="foundry-donut-center" aria-hidden="true"><strong>{displayCount(total)}</strong><span>records</span></div>}
      </div>
      <div className="foundry-chart-legend" aria-label={`${chart.title} categories`}>
        {chart.data.map((item) => <button key={item.value} type="button" onClick={() => navigate(item)} aria-label={`Open ${item.label} records, ${item.count}`}>
          <span className="foundry-chart-legend-label"><i style={{ backgroundColor: item.color }} />{item.label}</span><strong>{displayCount(item.count)}</strong>
        </button>)}
      </div>
    </>}
  </section>;
}

export default function OverviewChartsClient({ charts }: { charts: OverviewChartSpec[] }) {
  return <div className="foundry-overview-grid">{charts.map((chart) => <BreakdownChart key={chart.title} chart={chart} />)}</div>;
}
