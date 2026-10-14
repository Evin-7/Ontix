"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { OverviewChartSpec, OverviewChartValue } from "./overview-chart-types";

function displayCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  const entry = payload[0];
  if (!active || !entry) return null;

  return <div className="min-w-[124px] rounded-[10px] border border-border bg-surface p-2.5 text-xs text-foreground shadow-[var(--shadow-md)]">
    {label != null && <p className="mb-1.5 text-[10px] font-semibold">{label}</p>}
    <div className="flex items-center gap-2"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-muted">Records</span><strong className="ml-auto font-semibold">{displayCount(Number(entry.value))}</strong></div>
  </div>;
}

function BreakdownChart({ chart, isDemo }: { chart: OverviewChartSpec; isDemo: boolean }) {
  const router = useRouter();
  const total = chart.data.reduce((sum, item) => sum + item.count, 0);
  function navigate(item: OverviewChartValue) {
    router.push(`${chart.href}?${chart.filterKey}=${encodeURIComponent(item.value)}`);
  }

  return <section className="min-w-0 rounded-xl border border-border bg-surface px-[19px] py-[18px] shadow-[var(--shadow-sm)] max-[760px]:p-4" aria-label={`${chart.title} breakdown`}>
    <div className="flex items-start justify-between gap-3">
      <div><span className="block text-[8px] font-bold tracking-[.11em] text-muted">{isDemo ? "DEMO DATA BREAKDOWN" : "LIVE ONTOLOGY BREAKDOWN"}</span><h2 className="mt-1 text-sm font-semibold tracking-[-.02em]">{chart.title}</h2></div>
      <span className="whitespace-nowrap text-[9px] text-muted">{displayCount(total)} records</span>
    </div>
    {chart.data.length === 0 ? <p className="grid min-h-[180px] place-items-center text-xs text-muted">No records in the visible sample.</p> : <>
      <div className={`relative my-[10px] h-[180px] w-full ${chart.kind === "donut" ? "mx-auto max-w-[240px]" : "h-[182px]"}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === "donut" ? <PieChart accessibilityLayer>
            <Tooltip content={ChartTooltip} />
            <Pie data={chart.data} dataKey="count" nameKey="label" innerRadius={48} outerRadius={71} paddingAngle={3} stroke="none" isAnimationActive>
              {chart.data.map((item) => <Cell className="cursor-pointer" key={item.value} fill={item.color} onClick={() => navigate(item)} />)}
            </Pie>
          </PieChart> : <BarChart data={chart.data} layout="vertical" margin={{ top: 4, right: 16, bottom: 2, left: 2 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={96} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip content={ChartTooltip} cursor={{ fill: "var(--surface-muted)", opacity: .65 }} />
            <Bar dataKey="count" name="Records" radius={[0, 5, 5, 0]} maxBarSize={21} isAnimationActive>
              {chart.data.map((item) => <Cell className="cursor-pointer" key={item.value} fill={item.color} onClick={() => navigate(item)} />)}
            </Bar>
          </BarChart>}
        </ResponsiveContainer>
        {chart.kind === "donut" && <div className="pointer-events-none absolute inset-0 grid content-center justify-items-center" aria-hidden="true"><strong className="text-[22px] font-semibold tracking-[-.05em] text-foreground">{displayCount(total)}</strong><span className="text-[9px] text-muted">records</span></div>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[5px] border-t border-border pt-2" aria-label={`${chart.title} categories`}>
        {chart.data.map((item) => <button className="flex min-w-0 items-center justify-between gap-2 rounded-[5px] border-0 bg-transparent px-0.5 py-1 text-left text-[10px] text-muted hover:bg-surface-muted hover:text-foreground focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:outline-none" key={item.value} type="button" onClick={() => navigate(item)} aria-label={`Open ${item.label} records, ${item.count}`}>
          <span className="flex min-w-0 items-center gap-[7px] overflow-hidden text-ellipsis whitespace-nowrap"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="text-[10px] font-semibold text-foreground">{displayCount(item.count)}</strong>
        </button>)}
      </div>
    </>}
  </section>;
}

export default function OverviewChartsClient({ charts, isDemo }: { charts: OverviewChartSpec[]; isDemo: boolean }) {
  return <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">{charts.map((chart) => <BreakdownChart key={chart.title} chart={chart} isDemo={isDemo} />)}</div>;
}
