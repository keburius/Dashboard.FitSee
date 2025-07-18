import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import type {
  Shop,
  Generation,
  BillingLog,
  Plan,
  Session,
} from "@prisma/client";

export const meta: MetaFunction = () => {
  return [
    { title: "Fitsee Dashboard - All Shops" },
    {
      name: "description",
      content: "Comprehensive dashboard for all Fitsee shops",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const shopsDateFilter = url.searchParams.get("shopsDateFilter") || "all";
  const generationsDateFilter =
    url.searchParams.get("generationsDateFilter") || "all";
  const revenueDateFilter = url.searchParams.get("revenueDateFilter") || "all";

  // Helper to get date filter condition
  const getDateCondition = (filter: string, field: string = "createdAt") => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    switch (filter) {
      case "today":
        return { [field]: { gte: today } };
      case "7days":
        return { [field]: { gte: sevenDaysAgo } };
      case "30days":
        return { [field]: { gte: thirtyDaysAgo } };
      default:
        return {};
    }
  };

  // Shops
  const shopsDateCondition = getDateCondition(shopsDateFilter);
  const shops = await prisma.shop.findMany({
    where: shopsDateCondition,
    include: {
      Generation: true,
      BillingLog: true,
      Plan: true,
      Session: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const totalShops = await prisma.shop.count({ where: shopsDateCondition });
  const activeShops = shops.filter((shop) => !shop.isUninstalled).length;
  const shopsWithPlans = shops.filter((shop) => shop.Plan).length;

  // Generations
  const generationsDateCondition = getDateCondition(generationsDateFilter);
  const totalGenerations = await prisma.generation.count({
    where: generationsDateCondition,
  });

  // Revenue
  const revenueDateCondition = getDateCondition(revenueDateFilter, "timestamp");
  const billingLogs = await prisma.billingLog.findMany({
    where: revenueDateCondition,
  });
  const totalRevenue = billingLogs.reduce((sum, log) => {
    const transactionFee = log.price * 0.029;
    return sum + (log.price - transactionFee);
  }, 0);

  return json({
    shops,
    stats: {
      totalShops,
      activeShops,
      totalGenerations,
      totalRevenue,
      shopsWithPlans,
    },
    filters: {
      shopsDateFilter,
      generationsDateFilter,
      revenueDateFilter,
    },
  });
};

export default function Index() {
  const { shops, stats, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handlers for each filter
  const handleFilterChange = (key: string, value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set(key, value);
    setSearchParams(newSearchParams);
  };

  // Filter options
  const filterOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Fitsee Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Comprehensive overview of all shops and their performance
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards with Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          {/* Total Shops */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Shops
              </p>
              <select
                className="text-xs rounded border-gray-300 dark:bg-gray-700 dark:text-gray-200"
                value={filters.shopsDateFilter}
                onChange={(e) =>
                  handleFilterChange("shopsDateFilter", e.target.value)
                }
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.totalShops}
            </p>
          </div>

          {/* Active Shops */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Shops
              </p>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.activeShops}
            </p>
          </div>

          {/* Total Generations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Generations
              </p>
              <select
                className="text-xs rounded border-gray-300 dark:bg-gray-700 dark:text-gray-200"
                value={filters.generationsDateFilter}
                onChange={(e) =>
                  handleFilterChange("generationsDateFilter", e.target.value)
                }
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.totalGenerations}
            </p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Revenue
              </p>
              <select
                className="text-xs rounded border-gray-300 dark:bg-gray-700 dark:text-gray-200"
                value={filters.revenueDateFilter}
                onChange={(e) =>
                  handleFilterChange("revenueDateFilter", e.target.value)
                }
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
              ${stats.totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Shops Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Top 20 Shops
            </h2>
          </div>

          {shops.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No shops found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Generations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {shops.map(
                    (
                      shop: Shop & {
                        Generation: Generation[];
                        BillingLog: BillingLog[];
                        Plan: Plan | null;
                        Session: Session | null;
                      }
                    ) => {
                      const shopRevenue = shop.BillingLog.reduce(
                        (sum: number, log: BillingLog) => {
                          const transactionFee = log.price * 0.029; // 2.90% transaction fee
                          return sum + (log.price - transactionFee);
                        },
                        0
                      );
                      const generationsCount = shop.Generation.length;

                      return (
                        <tr
                          key={shop.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {shop.domain.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <a
                                  href={`https://${shop.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                >
                                  {shop.domain}
                                </a>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {shop.email || "No email"}
                                </div>
                                {shop.country && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {shop.country}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                shop.isUninstalled
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              }`}
                            >
                              {shop.isUninstalled ? "Uninstalled" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {shop.Plan ? (
                              <div>
                                <div className="font-medium">
                                  {shop.Plan.name}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400">
                                  {shop.Plan.hasUnlimitedGenerations
                                    ? "Unlimited"
                                    : `${shop.Plan.availableGenerations} available`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">
                                No plan
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="font-medium">
                              {generationsCount}
                            </div>
                            {shop.Plan && (
                              <div className="text-gray-500 dark:text-gray-400">
                                {shop.Plan.totalGenerationsUsed} used
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="font-medium">
                              ${shopRevenue.toFixed(2)}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {shop.BillingLog.length} transactions
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(shop.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              to={`/shop/${shop.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Show More button */}
          <div className="flex justify-end p-4">
            <Link
              to="/shops"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Show More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
