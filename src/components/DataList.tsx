import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface PurchaseRecord {
  id: string;
  name: string;
  phone: string;
  medicine: string;
  purchaseDate: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
  totalPurchases: number;
  totalValue: number;
  lastPurchaseDate: string;
  purchases: {
    id: string;
    medicine: string;
    date: string;
  }[];
}

const appScriptUrl: string = "https://script.google.com/macros/s/AKfycbxsbpzFjM4Y0kelNmiCzSCaRE4h_edUTSpH7npd6MSe2R1gYtDXBdSy46sH52c244L8/exec";

export default function PurchaseHistoryDashboard() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const getAvatarColor = (name: string) => {
    const hash = name.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 80%, 85%)`;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${appScriptUrl}?action=get`);
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data: PurchaseRecord[] = await res.json();

      const customerMap = new Map<string, CustomerProfile>();

      data.forEach((record) => {
        const phone = String(record.phone || "");
        const name = record.name || "Unknown";
        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            id: `customer-${phone}`,
            name,
            phone,
            avatarColor: getAvatarColor(name),
            totalPurchases: 0,
            totalValue: 0,
            lastPurchaseDate: record.purchaseDate,
            purchases: [],
          });
        }

        const customer = customerMap.get(phone)!;
        customer.purchases.push({
          id: `purchase-${phone}-${record.purchaseDate}`,
          medicine: record.medicine || "Unknown",
          date: record.purchaseDate,
        });

        customer.totalPurchases++;
        if (new Date(record.purchaseDate) > new Date(customer.lastPurchaseDate)) {
          customer.lastPurchaseDate = record.purchaseDate;
        }
      });

      const sortedCustomers = Array.from(customerMap.values()).sort(
        (a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime()
      );

      setCustomers(sortedCustomers);
      setFilteredCustomers(sortedCustomers);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Failed to fetch data:", error.message);
      toast.error(`Failed to load purchase history: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get("phone");
    if (phone) {
      setSearchQuery(phone);
    }
  }, [location]);

  useEffect(() => {
    const results = customers.filter(
      (customer) =>
        (customer.phone && String(customer.phone).includes(searchQuery)) ||
        (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredCustomers(results);
  }, [searchQuery, customers]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupPurchasesByDate = (purchases: CustomerProfile["purchases"]) => {
    const grouped = new Map<string, { medicine: string }[]>();
    purchases.forEach((purchase) => {
      const date = formatDate(purchase.date);
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push({ medicine: purchase.medicine });
    });
    return Array.from(grouped.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customer Purchases</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Track and manage all customer transactions</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 min-w-0"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-sm"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No customers found</h3>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            {searchQuery ? "Try adjusting your search criteria" : "No purchase records available yet"}
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset search
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <AnimatePresence>
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 sm:p-6 cursor-pointer"
                  onClick={() => setSelectedCustomer(selectedCustomer?.id === customer.id ? null : customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 sm:space-x-4 min-w-0">
                      <div
                        className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold"
                        style={{ backgroundColor: customer.avatarColor }}
                      >
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{customer.name}</h3>
                        <p className="text-sm sm:text-base text-gray-500 truncate">{customer.phone}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                            {customer.totalPurchases} purchase{customer.totalPurchases !== 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800">
                            Last: {formatDate(customer.lastPurchaseDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500 flex-shrink-0">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={selectedCustomer?.id === customer.id ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"}
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedCustomer?.id === customer.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 pt-0">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                          Purchase History
                        </h4>
                        <div className="space-y-4">
                          {groupPurchasesByDate(customer.purchases).map(([date, medicines], index) => (
                            <motion.div
                              key={date}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 * index }}
                              className="p-3 sm:p-4 bg-gray-50 rounded-lg"
                            >
                              <p className="text-sm text-gray-500 mb-2">{date}</p>
                              <ul className="space-y-2">
                                {medicines.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-center">
                                    <p className="font-medium text-gray-900 text-sm sm:text-base">{item.medicine}</p>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}