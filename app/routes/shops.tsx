import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import type {
  Shop,
  Generation,
  BillingLog,
  Plan,
  Session,
} from "@prisma/client";

const PAGE_SIZE = 20;

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const skip = (page - 1) * PAGE_SIZE;

  const [shops, totalShops] = await Promise.all([
    prisma.shop.findMany({
      include: {
        Generation: true,
        BillingLog: true,
        Plan: true,
        Session: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.shop.count(),
  ]);

  return json({
    shops,
    totalShops,
    page,
    totalPages: Math.ceil(totalShops / PAGE_SIZE),
  });
};

export default function ShopsPage() {
  const { shops, totalShops, page, totalPages } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            All Shops
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Detailed list of all shops with pagination
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Shops (Page {page} of {totalPages})
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
                          const transactionFee = log.price * 0.029;
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
                            {shop.Plan ? shop.Plan.name : "-"}
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
          {/* Pagination Controls */}
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
