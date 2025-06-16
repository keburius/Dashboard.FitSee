import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import type {
  Shop,
  Generation,
  BillingLog,
  Plan,
  Session,
  Log,
} from "@prisma/client";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.shop) {
    return [{ title: "Shop Not Found" }];
  }
  return [
    { title: `Shop Details - ${data.shop.domain}` },
    {
      name: "description",
      content: `Detailed information for ${data.shop.domain}`,
    },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const { shopId } = params;

  if (!shopId) {
    throw new Response("Shop ID is required", { status: 400 });
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      Generation: {
        orderBy: { createdAt: "desc" },
      },
      BillingLog: {
        orderBy: { timestamp: "desc" },
      },
      Plan: true,
      Session: true,
      Log: {
        orderBy: { createdAt: "desc" },
        take: 50, // Limit to last 50 logs
      },
    },
  });

  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  // Calculate additional statistics
  const totalRevenue = shop.BillingLog.reduce((sum, log) => {
    const transactionFee = log.price * 0.029; // 2.90% transaction fee
    return sum + (log.price - transactionFee);
  }, 0);

  const recentGenerations = shop.Generation.slice(0, 10);
  const recentBillingLogs = shop.BillingLog.slice(0, 10);

  return json({
    shop,
    totalRevenue,
    recentGenerations,
    recentBillingLogs,
  });
};

export default function ShopDetails() {
  const { shop, totalRevenue, recentGenerations, recentBillingLogs } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Shop Details
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {shop.domain}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  shop.isUninstalled
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }`}
              >
                {shop.isUninstalled ? "Uninstalled" : "Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Shop Overview Cards */}
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
                  {shop.Generation.length}
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
                  ${totalRevenue.toFixed(2)}
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Billing Transactions
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {shop.BillingLog.length}
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {new Date(shop.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Basic Shop Info */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Shop Information
              </h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Domain
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    <a
                      href={`https://${shop.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      {shop.domain}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.email || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.phone || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Country
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.country || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Shopify ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.shopifyId}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    External ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.externalId || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    API Key
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {shop.apiKey.substring(0, 20)}...
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Test Payment Allowed
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.allowTestPayment ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Plan Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Plan Information
              </h2>
            </div>
            <div className="p-6">
              {shop.Plan ? (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Plan Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {shop.Plan.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Available Generations
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {shop.Plan.hasUnlimitedGenerations
                        ? "Unlimited"
                        : shop.Plan.availableGenerations}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Generations Used
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {shop.Plan.totalGenerationsUsed}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          shop.Plan.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {shop.Plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Reset
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {shop.Plan.lastResetAt
                        ? new Date(shop.Plan.lastResetAt).toLocaleDateString()
                        : "Never"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No plan associated with this shop
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Session Information */}
        {shop.Session && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Session Information
              </h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    User ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.Session.userId || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.Session.email || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.Session.firstName && shop.Session.lastName
                      ? `${shop.Session.firstName} ${shop.Session.lastName}`
                      : "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Online Status
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        shop.Session.isOnline
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {shop.Session.isOnline ? "Online" : "Offline"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Account Owner
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.Session.accountOwner ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email Verified
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {shop.Session.emailVerified ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Recent Generations */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Generations ({shop.Generation.length} total)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Added to Cart
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentGenerations.map((generation: any) => (
                  <tr
                    key={generation.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {generation.productImage && (
                          <img
                            className="h-10 w-10 rounded-full object-cover mr-3"
                            src={generation.productImage}
                            alt={generation.productName}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {generation.productName || "Unnamed Product"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {generation.productId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {generation.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {generation.productCategory || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          generation.addedToCart
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {generation.addedToCart ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(generation.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Billing Logs */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Billing Transactions ({shop.BillingLog.length} total)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Charge ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentBillingLogs.map((log: any) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.credits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${log.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.chargeId || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent API Logs */}
        {shop.Log.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent API Logs ({shop.Log.length} total)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {shop.Log.slice(0, 20).map((log: any) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">{log.endpoint}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.method === "GET"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : log.method === "POST"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.status >= 200 && log.status < 300
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : log.status >= 400 && log.status < 500
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
