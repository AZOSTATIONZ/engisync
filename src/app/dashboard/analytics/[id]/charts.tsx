"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e"];
const PRIORITY_COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#ef4444"];

type NV = { name: string; value: number };

function EmptyOr({
  data,
  children,
}: {
  data: { value?: number }[];
  children: React.ReactNode;
}) {
  const empty = data.reduce((s, d) => s + (d.value ?? 1), 0) === 0;
  if (empty) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }
  return <>{children}</>;
}

export function StatusPie({ data }: { data: NV[] }) {
  return (
    <EmptyOr data={data}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </EmptyOr>
  );
}

export function PriorityPie({ data }: { data: NV[] }) {
  return (
    <EmptyOr data={data}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </EmptyOr>
  );
}

export function WorkloadBar({
  data,
}: {
  data: { name: string; openTasks: number; completed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="openTasks" name="Open" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Done" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HoursBar({ data }: { data: { name: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="hours" name="Hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BurndownArea({ data }: { data: { day: string; remaining: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -20 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="remaining"
          name="Open tasks"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ActivityLine({
  data,
}: {
  data: { day: string; created: number; completed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -20 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="created" name="Created" stroke="#f59e0b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
