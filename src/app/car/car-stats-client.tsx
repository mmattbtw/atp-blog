"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Loader2Icon } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "#/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";

interface CarDataPoint {
  createdAt: string;
  carFuelRange: number;
  carPercentFuelRemaining: string;
  amountRemaining: string;
  carTraveledDistance: number;
}

interface CarStatsClientProps {
  initialRecords: CarDataPoint[];
  initialCursor?: string;
}

type ChartType = "fuel" | "distance" | "range";

function formatFullDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Deduplicate records based on key data fields
function deduplicateRecords(records: CarDataPoint[]): CarDataPoint[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.carTraveledDistance}-${record.carPercentFuelRemaining}-${record.carFuelRange}-${record.amountRemaining}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const fuelChartConfig = {
  fuel: {
    label: "Fuel Level",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const odometerChartConfig = {
  odometer: {
    label: "Odometer",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const rangeChartConfig = {
  range: {
    label: "Est. Range",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function FuelChart({ data }: { data: CarDataPoint[] }) {
  const chartData = data.map((d) => ({
    date: d.createdAt,
    fuel: parseFloat(d.carPercentFuelRemaining),
  }));

  const latestValue = chartData[chartData.length - 1]?.fuel || 0;
  const firstValue = chartData[0]?.fuel || 0;
  const change = latestValue - firstValue;
  const changePercent = firstValue
    ? ((change / firstValue) * 100).toFixed(1)
    : "0";

  const firstDate = data[0]?.createdAt;
  const lastDate = data[data.length - 1]?.createdAt;
  const periodTooltip =
    firstDate && lastDate
      ? `Change from ${formatShortDate(firstDate)} to ${formatShortDate(lastDate)}`
      : "";

  return (
    <div className="p-4 border rounded-lg bg-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Fuel Level</p>
          <p className="text-2xl font-bold">
            {latestValue.toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              %
            </span>
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`text-sm cursor-help ${change >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)} (
              {change >= 0 ? "+" : ""}
              {changePercent}%)
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{periodTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <ChartContainer config={fuelChartConfig} className="h-48 w-full">
        <AreaChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatShortDate(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatFullDate(value)}
                formatter={(value) => [
                  `${Math.round(Number(value))}%`,
                  " Fuel Level",
                ]}
              />
            }
          />
          <Area
            dataKey="fuel"
            type="monotone"
            fill="var(--color-fuel)"
            fillOpacity={0.3}
            stroke="var(--color-fuel)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function OdometerChart({ data }: { data: CarDataPoint[] }) {
  const chartData = data.map((d) => ({
    date: d.createdAt,
    odometer: d.carTraveledDistance,
  }));

  const latestValue = chartData[chartData.length - 1]?.odometer || 0;
  const firstValue = chartData[0]?.odometer || 0;
  const change = latestValue - firstValue;
  const changePercent = firstValue
    ? ((change / firstValue) * 100).toFixed(1)
    : "0";

  const firstDate = data[0]?.createdAt;
  const lastDate = data[data.length - 1]?.createdAt;
  const periodTooltip =
    firstDate && lastDate
      ? `Change from ${formatShortDate(firstDate)} to ${formatShortDate(lastDate)}`
      : "";

  return (
    <div className="p-4 border rounded-lg bg-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Odometer</p>
          <p className="text-2xl font-bold">
            {latestValue.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              mi
            </span>
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`text-sm cursor-help ${change >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change).toLocaleString()} (
              {change >= 0 ? "+" : ""}
              {changePercent}%)
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{periodTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <ChartContainer config={odometerChartConfig} className="h-48 w-full">
        <AreaChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatShortDate(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatFullDate(value)}
                formatter={(value) => [
                  `${Number(value).toLocaleString()} mi`,
                  "Odometer",
                ]}
              />
            }
          />
          <Area
            dataKey="odometer"
            type="monotone"
            fill="var(--color-odometer)"
            fillOpacity={0.3}
            stroke="var(--color-odometer)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function RangeChart({ data }: { data: CarDataPoint[] }) {
  const chartData = data.map((d) => ({
    date: d.createdAt,
    range: d.carFuelRange,
  }));

  const latestValue = chartData[chartData.length - 1]?.range || 0;
  const firstValue = chartData[0]?.range || 0;
  const change = latestValue - firstValue;
  const changePercent = firstValue
    ? ((change / firstValue) * 100).toFixed(1)
    : "0";

  const firstDate = data[0]?.createdAt;
  const lastDate = data[data.length - 1]?.createdAt;
  const periodTooltip =
    firstDate && lastDate
      ? `Change from ${formatShortDate(firstDate)} to ${formatShortDate(lastDate)}`
      : "";

  return (
    <div className="p-4 border rounded-lg bg-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Estimated Range</p>
          <p className="text-2xl font-bold">
            {latestValue.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              mi
            </span>
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`text-sm cursor-help ${change >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change).toLocaleString()} (
              {change >= 0 ? "+" : ""}
              {changePercent}%)
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{periodTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <ChartContainer config={rangeChartConfig} className="h-48 w-full">
        <AreaChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatShortDate(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `${value}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatFullDate(value)}
                formatter={(value) => [
                  `${Number(value).toLocaleString()} mi`,
                  "Est. Range",
                ]}
              />
            }
          />
          <Area
            dataKey="range"
            type="monotone"
            fill="var(--color-range)"
            fillOpacity={0.3}
            stroke="var(--color-range)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

const columnHelper = createColumnHelper<CarDataPoint>();

const columns = [
  columnHelper.accessor("createdAt", {
    header: "Date",
    cell: (info) => formatFullDate(info.getValue()),
    sortingFn: (rowA, rowB) => {
      return (
        new Date(rowA.original.createdAt).getTime() -
        new Date(rowB.original.createdAt).getTime()
      );
    },
  }),
  columnHelper.accessor("carTraveledDistance", {
    header: "Odometer",
    cell: (info) => `${info.getValue().toLocaleString()} mi`,
  }),
  columnHelper.accessor("carPercentFuelRemaining", {
    header: "Fuel %",
    cell: (info) => `${Math.round(parseFloat(info.getValue()))}%`,
  }),
  columnHelper.accessor("carFuelRange", {
    header: "Range",
    cell: (info) => `${info.getValue()} mi`,
  }),
  columnHelper.accessor("amountRemaining", {
    header: "Gallons",
    cell: (info) => `${info.getValue()} gal`,
  }),
];

export function CarStatsClient({
  initialRecords,
  initialCursor,
}: CarStatsClientProps) {
  const [records, setRecords] = useState<CarDataPoint[]>(initialRecords);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const [selectedChart, setSelectedChart] = useState<ChartType>("fuel");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;

    startTransition(async () => {
      const response = await fetch(`/api/car-records?cursor=${cursor}`);
      const data = await response.json();

      if (data.records) {
        // Combine and sort by date (oldest first for charts)
        const combined = [...records, ...data.records].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setRecords(combined);
        setCursor(data.cursor);
      }
    });
  }, [cursor, records]);

  // Deduplicate records
  const dedupedRecords = useMemo(() => deduplicateRecords(records), [records]);

  const table = useReactTable({
    data: dedupedRecords,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const stats = useMemo(() => {
    if (dedupedRecords.length === 0) return null;

    const latest = dedupedRecords[dedupedRecords.length - 1];
    const oldest = dedupedRecords[0];

    const totalMiles = latest.carTraveledDistance - oldest.carTraveledDistance;
    const daysBetween = Math.ceil(
      (new Date(latest.createdAt).getTime() -
        new Date(oldest.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const avgMilesPerDay = daysBetween > 0 ? totalMiles / daysBetween : 0;

    const fuelPercentages = dedupedRecords.map((r) =>
      parseFloat(r.carPercentFuelRemaining),
    );
    const avgFuel =
      fuelPercentages.reduce((a, b) => a + b, 0) / fuelPercentages.length;

    return {
      totalMiles,
      daysBetween,
      avgMilesPerDay,
      avgFuel,
      latestOdometer: latest.carTraveledDistance,
      latestFuelPercent: parseFloat(latest.carPercentFuelRemaining),
      latestRange: latest.carFuelRange,
      recordCount: dedupedRecords.length,
      duplicatesRemoved: records.length - dedupedRecords.length,
    };
  }, [dedupedRecords, records.length]);

  if (dedupedRecords.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        No car records found.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-white/5">
            <p className="text-sm text-muted-foreground">Current Odometer</p>
            <p className="text-xl font-bold">
              {stats.latestOdometer.toLocaleString()} mi
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white/5">
            <p className="text-sm text-muted-foreground">Fuel Level</p>
            <p className="text-xl font-bold">
              {Math.round(stats.latestFuelPercent)}%
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white/5">
            <p className="text-sm text-muted-foreground">Est. Range</p>
            <p className="text-xl font-bold">{stats.latestRange} mi</p>
          </div>
          <div className="p-4 border rounded-lg bg-white/5">
            <p className="text-sm text-muted-foreground">Avg Miles/Day</p>
            <p className="text-xl font-bold">
              {stats.avgMilesPerDay.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>{records.length} records loaded</span>
        {stats && stats.duplicatesRemoved > 0 && (
          <span>
            • {stats.duplicatesRemoved} duplicate
            {stats.duplicatesRemoved !== 1 ? "s" : ""} removed
          </span>
        )}
        <span>
          •{" "}
          <a
            href="https://pdsls.dev/at://did:plc:tas6hj2xjrqben5653v5kohk/net.mmatt.vitals.car"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            see complete history
          </a>
        </span>
        {cursor && (
          <button
            onClick={loadMore}
            disabled={isPending}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending && <Loader2Icon className="size-4 animate-spin" />}
            Load More
          </button>
        )}
      </div>

      {/* Chart Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedChart("fuel")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedChart === "fuel"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          Fuel Level
        </button>
        <button
          onClick={() => setSelectedChart("distance")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedChart === "distance"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          Odometer
        </button>
        <button
          onClick={() => setSelectedChart("range")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedChart === "range"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          Est. Range
        </button>
      </div>

      {/* Charts */}
      <div className="grid gap-4">
        {selectedChart === "fuel" && <FuelChart data={dedupedRecords} />}
        {selectedChart === "distance" && (
          <OdometerChart data={dedupedRecords} />
        )}
        {selectedChart === "range" && <RangeChart data={dedupedRecords} />}
      </div>

      {/* TanStack Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 bg-white/5 border-b">
          <h3 className="font-semibold">Historical Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left p-3 cursor-pointer select-none hover:bg-white/5"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-white/5 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              dedupedRecords.length,
            )}{" "}
            of {dedupedRecords.length} records
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded text-sm bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded text-sm bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
