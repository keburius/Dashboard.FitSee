import React from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useState } from "react";
import { DateRange, Calendar } from "react-date-range";
import { format, parseISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const dateFilter = url.searchParams.get("dateFilter") || "30days";
  const customStart = url.searchParams.get("start");
  const customEnd = url.searchParams.get("end");

  // Date range logic
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  let dateCondition = {};
  if (dateFilter === "custom" && customStart && customEnd) {
    dateCondition = {
      createdAt: {
        gte: new Date(customStart),
        lte: new Date(customEnd),
      },
    };
  } else {
    switch (dateFilter) {
      case "today":
        dateCondition = { createdAt: { gte: today } };
        break;
      case "7days":
        dateCondition = { createdAt: { gte: sevenDaysAgo } };
        break;
      case "30days":
        dateCondition = { createdAt: { gte: thirtyDaysAgo } };
        break;
      default:
        dateCondition = {};
    }
  }

  // Key stats
  const totalGenerations = await prisma.generation.count({
    where: dateCondition,
  });
  const uniqueShops = await prisma.generation.findMany({
    where: dateCondition,
    select: { shopId: true },
    distinct: ["shopId"],
  });
  const avgPerShop = totalGenerations / (uniqueShops.length || 1);

  // For chart: group by day
  // (Replace with Prisma groupBy when available, here is a simple workaround)
  const generations = await prisma.generation.findMany({
    where: dateCondition,
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  // Group by day
  const chartData: { date: string; count: number }[] = [];
  generations.forEach((g) => {
    const date = g.createdAt.toISOString().slice(0, 10);
    const entry = chartData.find((d) => d.date === date);
    if (entry) entry.count++;
    else chartData.push({ date, count: 1 });
  });

  // Top shops by generations
  const topShops = await prisma.generation.groupBy({
    by: ["shopId"],
    _count: { shopId: true },
    where: dateCondition,
    orderBy: { _count: { shopId: "desc" } },
    take: 10,
  });

  // Fetch shop domains for top shops
  const shopIds = topShops.map((row) => row.shopId);
  const shopRecords = await prisma.shop.findMany({
    where: { id: { in: shopIds } },
    select: { id: true, domain: true },
  });
  const shopMap = Object.fromEntries(shopRecords.map((s) => [s.id, s.domain]));

  return json({
    totalGenerations,
    uniqueShops: uniqueShops.length,
    avgPerShop,
    chartData,
    topShops,
    shopMap,
    dateFilter,
    customStart,
    customEnd,
  });
};

export default function GenerationsStatsPage() {
  const {
    totalGenerations,
    uniqueShops,
    avgPerShop,
    chartData,
    topShops,
    shopMap,
    dateFilter,
    customStart,
    customEnd,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState<null | "start" | "end">(
    null
  );
  const [pendingStart, setPendingStart] = useState<string | null>(
    customStart || null
  );
  const [pendingEnd, setPendingEnd] = useState<string | null>(
    customEnd || null
  );

  // Date filter handler
  const handleDateFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("dateFilter", filter);
    if (filter !== "custom") {
      params.delete("start");
      params.delete("end");
    }
    setSearchParams(params);
    setCalendarOpen(null);
  };

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    if (calendarOpen === "start") {
      setPendingStart(formatted);
      setCalendarOpen(null);
    } else if (calendarOpen === "end") {
      setPendingEnd(formatted);
      setCalendarOpen(null);
    }
  };

  // Apply range when both dates are set
  React.useEffect(() => {
    if (dateFilter === "custom" && pendingStart && pendingEnd) {
      const params = new URLSearchParams(searchParams);
      params.set("dateFilter", "custom");
      params.set("start", pendingStart);
      params.set("end", pendingEnd);
      setSearchParams(params);
    }
    // eslint-disable-next-line
  }, [pendingStart, pendingEnd]);

  // Calendar value
  const calendarValue =
    calendarOpen === "start"
      ? pendingStart
        ? parseISO(pendingStart)
        : new Date()
      : pendingEnd
      ? parseISO(pendingEnd)
      : new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Generations Statistics
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Detailed statistics and trends for generations.
        </p>

        {/* Date Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "today", label: "Today" },
            { value: "7days", label: "Last 7 Days" },
            { value: "30days", label: "Last 30 Days" },
            { value: "all", label: "All Time" },
            { value: "custom", label: "Custom Range" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDateFilter(opt.value)}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                dateFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Custom Range Start/End Buttons */}
        {dateFilter === "custom" && (
          <div className="mb-6 flex items-center gap-2">
            <button
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setCalendarOpen("start")}
            >
              Start: {pendingStart || "Select"}
            </button>
            <span className="text-gray-500">to</span>
            <button
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setCalendarOpen("end")}
            >
              End: {pendingEnd || "Select"}
            </button>
          </div>
        )}
        {/* Calendar Modal Popup for Start/End */}
        {calendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xl"
                onClick={() => setCalendarOpen(null)}
                aria-label="Close"
              >
                ×
              </button>
              <Calendar
                date={calendarValue}
                onChange={handleCalendarSelect}
                maxDate={new Date()}
                showMonthAndYearPickers={true}
                color="#2563eb"
              />
            </div>
          </div>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Generations
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalGenerations}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Unique Shops
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {uniqueShops}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Avg. per Shop
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {avgPerShop.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded shadow p-6 mb-8">
          <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Generations Growth Over Time
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Shops Table */}
        <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
          <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Top Shops by Generations
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3">Shop</th>
                <th className="text-left py-2 px-3">Generations</th>
              </tr>
            </thead>
            <tbody>
              {topShops.map((row: any) => {
                const domain = shopMap[row.shopId];
                return (
                  <tr key={row.shopId}>
                    <td className="py-2 px-3">
                      {domain ? (
                        <a
                          href={`https://${domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {domain}
                        </a>
                      ) : (
                        row.shopId
                      )}
                    </td>
                    <td className="py-2 px-3">{row._count.shopId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
