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
  const dateFilter = url.searchParams.get("dateFilter") || "all";

  // Calculate date ranges
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  let dateFilterCondition = {};

  switch (dateFilter) {
    case "today":
      dateFilterCondition = {
        createdAt: {
          gte: today,
        },
      };
      break;
    case "7days":
      dateFilterCondition = {
        createdAt: {
          gte: sevenDaysAgo,
        },
      };
      break;
    case "30days":
      dateFilterCondition = {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      };
      break;
    default:
      dateFilterCondition = {};
  }

  const shops = await prisma.shop.findMany({
    where: dateFilterCondition,
    include: {
      Generation: true,
      BillingLog: true,
      Plan: true,
      Session: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate summary statistics
  const totalShops = shops.length;
  const activeShops = shops.filter((shop) => !shop.isUninstalled).length;
  const totalGenerations = shops.reduce(
    (sum, shop) => sum + shop.Generation.length,
    0
  );
  const totalRevenue = shops.reduce(
    (sum, shop) =>
      sum +
      shop.BillingLog.reduce((logSum, log) => {
        const transactionFee = log.price * 0.029; // 2.90% transaction fee
        return logSum + (log.price - transactionFee);
      }, 0),
    0
  );
  const shopsWithPlans = shops.filter((shop) => shop.Plan).length;

  return json({
    shops,
    stats: {
      totalShops,
      activeShops,
      totalGenerations,
      totalRevenue,
      shopsWithPlans,
    },
    dateFilter,
  });
};

export default function Index() {
  const { shops, stats, dateFilter } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleDateFilterChange = (filter: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("dateFilter", filter);
    setSearchParams(newSearchParams);
  };

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
        {/* Date Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDateFilterChange("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDateFilterChange("today")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "today"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateFilterChange("7days")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "7days"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDateFilterChange("30days")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "30days"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 mb-2 md:mb-0">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Shops
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalShops}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 mb-2 md:mb-0">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Shops
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.activeShops}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 mb-2 md:mb-0">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Generations
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalGenerations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 mb-2 md:mb-0">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Revenue
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shops Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              All Shops
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
        </div>
      </div>
    </div>
  );
}
