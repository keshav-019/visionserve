import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimePoint } from "@/lib/types";

export const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--popover-foreground)",
  boxShadow: "0 4px 16px color-mix(in oklab, black 12%, transparent)",
} as const;

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
}

export function ChartCard({
  title,
  description,
  actions,
  children,
  isLoading,
  height = 260,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 px-4 py-3">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {isLoading ? (
          <div className="flex items-end gap-1.5 px-2" style={{ height }}>
            {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 52, 68].map((h, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function AreaTrend({
  data,
  series,
  height = 260,
  yFormatter,
  stacked,
}: {
  data: TimePoint[];
  series: SeriesDef[];
  height?: number;
  yFormatter?: (v: number) => string;
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? chartColors[i % chartColors.length];
            return (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="t" {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={52} tickFormatter={yFormatter as never} />
        <Tooltip contentStyle={tooltipStyle} formatter={yFormatter as never} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
        {series.map((s, i) => {
          const color = s.color ?? chartColors[i % chartColors.length];
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color}
              strokeWidth={1.8}
              fill={`url(#grad-${s.key})`}
              stackId={stacked ? "stack" : undefined}
              dot={false}
              activeDot={{ r: 3 }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({
  data,
  series,
  height = 260,
  yFormatter,
}: {
  data: TimePoint[];
  series: SeriesDef[];
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="t" {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={52} tickFormatter={yFormatter as never} />
        <Tooltip contentStyle={tooltipStyle} formatter={yFormatter as never} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? chartColors[i % chartColors.length]}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({
  data,
  series,
  xKey = "t",
  height = 260,
  yFormatter,
  layout = "horizontal",
}: {
  data: Record<string, string | number>[];
  series: SeriesDef[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  layout?: "horizontal" | "vertical";
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, bottom: 0, left: layout === "vertical" ? 8 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={layout !== "vertical"} vertical={layout === "vertical"} />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={yFormatter as never} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
            <YAxis {...axisProps} width={52} tickFormatter={yFormatter as never} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} formatter={yFormatter as never} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? chartColors[i % chartColors.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={layout === "vertical" ? 14 : 28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
