"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
const tooltip = {
  backgroundColor: "#202422",
  border: "1px solid #3a403b",
  borderRadius: 8,
  color: "#eaece6",
  fontSize: 12,
};
export function ScoringChart({
  data,
  title = "No scores. No fictional trend lines.",
}: {
  data: { label: string; score: number | null }[];
  title?: string;
}) {
  if (!data.some((d) => d.score !== null))
    return (
      <div className="chart-empty">
        <div className="chart-grid" aria-hidden="true">
          <span>PTS</span>
          <div>WEEK / SEASON</div>
        </div>
        <div className="chart-empty-content">
          <Activity size={24} />
          <h3>{title}</h3>
          <p>Your league’s scoring history will take shape here.</p>
          <span className="micro-tag">OFFICIAL SCORES ONLY</span>
        </div>
      </div>
    );
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label="Interactive weekly scoring chart. Exact scores are also available in the Season Archives tables."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 4, left: -20 }}
        >
          <defs>
            <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ed8553" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#ed8553" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#2a2f2a"
            vertical={false}
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8e998f", fontSize: 10 }}
            minTickGap={40}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#8e998f", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltip}
            formatter={(v) => [Number(v).toFixed(2), "Points"]}
          />
          <Area
            type="linear"
            dataKey="score"
            stroke="#ed8553"
            strokeWidth={2}
            fill="url(#score-fill)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function LuckChart({
  data,
}: {
  data: { manager: string; luck: number }[];
}) {
  if (!data.length)
    return <ScoringChart data={[]} title="Luck needs a full scorecard." />;
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label="Actual minus expected wins by manager; exact values are in the table below."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: -20, bottom: 20 }}
        >
          <CartesianGrid vertical={false} stroke="#2a2f2a" />
          <XAxis
            dataKey="manager"
            tick={{ fill: "#8e998f", fontSize: 10 }}
            angle={-15}
          />
          <YAxis tick={{ fill: "#8e998f", fontSize: 10 }} />
          <Tooltip
            contentStyle={tooltip}
            formatter={(v) => [Number(v).toFixed(2), "Luck differential"]}
          />
          <ReferenceLine y={0} stroke="#677367" />
          <Bar dataKey="luck" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.manager}
                fill={d.luck >= 0 ? "#b6cc92" : "#ed8553"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
