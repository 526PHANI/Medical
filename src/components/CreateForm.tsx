import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

interface FormData {
  name: string;
  phone: string;
  medicine: string;
  quantity: string;
  purchaseDate: string;
}

interface CustomerData {
  name: string;
  phone: string;
  medicine: string;
  quantity: string;
  purchaseDate: string;
}

const appScriptUrl: string = "https://script.google.com/macros/s/AKfycbxsbpzFjM4Y0kelNmiCzSCaRE4h_edUTSpH7npd6MSe2R1gYtDXBdSy46sH52c244L8/exec";

export default function PurchaseForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    medicine: "",
    quantity: "1",
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<CustomerData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<CustomerData | null>(null);

  // Fetch customer history
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${appScriptUrl}?action=get`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data: CustomerData[] = await res.json();
      setCustomerHistory(data);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Failed to fetch data:", error.message);
      toast.error(`Failed to load customer history: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced function to check for existing customer
  const checkExistingCustomer = useCallback(
    debounce((phone: string, history: CustomerData[]) => {
      if (phone.length === 10) {
        const customer = history.find((c) => c.phone === phone);
        if (customer) {
          setExistingCustomer(customer);
          setIsExistingCustomer(true);
          setShowConfirmation(true);
          setFormData((prev) => ({
            ...prev,
            name: customer.name,
            phone,
          }));
          toast.success(`Welcome back, ${customer.name}!`);
        } else {
          setIsExistingCustomer(false);
          setExistingCustomer(null);
          setShowConfirmation(false);
        }
      } else {
        setIsExistingCustomer(false);
        setExistingCustomer(null);
        setShowConfirmation(false);
      }
    }, 500),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === "phone") {
      if (!/^\d{0,10}$/.test(value)) return;
      setFormData((prev) => ({ ...prev, phone: value }));
      checkExistingCustomer(value, customerHistory);
      return;
    }

    if (id === "quantity") {
      if (value === "" || (/^\d*$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 200)) {
        setFormData((prev) => ({ ...prev, quantity: value }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleQuantityChange = (increment: boolean) => {
    const currentQuantity = parseInt(formData.quantity) || 1;
    let newQuantity = increment ? currentQuantity + 1 : currentQuantity - 1;
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > 200) newQuantity = 200;
    setFormData((prev) => ({ ...prev, quantity: String(newQuantity) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!formData.medicine.trim()) {
      toast.error("Please enter the medicine details");
      return;
    }
    const quantityNum = parseInt(formData.quantity);
    if (!formData.quantity || isNaN(quantityNum) || quantityNum < 1 || quantityNum > 200) {
      toast.error("Please enter a valid quantity (1-200)");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${appScriptUrl}?action=post`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...formData, quantity: String(quantityNum) }),
      });

      if (response.ok) {
        toast.success("Purchase recorded successfully!");
        setFormData({
          name: "",
          phone: "",
          medicine: "",
          quantity: "1",
          purchaseDate: new Date().toISOString().slice(0, 10),
        });
        setShowConfirmation(false);
        navigate("/list");
      } else {
        throw new Error("Submission failed");
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error(err);
      toast.error("Failed to submit purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmNewPurchase = () => {
    setShowConfirmation(false);
  };

  const handleViewHistory = () => {
    setShowConfirmation(false);
    navigate(`/list?phone=${formData.phone}`);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatMedicineDisplay = (medicine: string, quantity: string) => {
    return `${medicine}${quantity !== "1" ? ` (${quantity} ${parseInt(quantity) > 1 ? "tablets" : "tablet"})` : ""}`;
  };

  const customerPurchases = customerHistory
    .filter((c) => c.phone === formData.phone)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">New Purchase</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isExistingCustomer ? `Existing customer: ${existingCustomer?.name}` : "New customer"}
              </p>
            </div>
            <button
              onClick={() => navigate("/list")}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View All Purchases →
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isExistingCustomer}
                    className={`block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                      isExistingCustomer ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">+91</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    className="block w-full pl-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="9876543210"
                  />
                </div>
                {formData.phone.length > 0 && formData.phone.length < 10 && (
                  <p className="mt-1 text-sm text-red-600">Phone number must be 10 digits</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="medicine" className="block text-sm font-medium text-gray-700">
                    Medicine Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="medicine"
                      type="text"
                      value={formData.medicine}
                      onChange={handleChange}
                      required
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Paracetamol 500mg"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm flex items-center">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(false)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none"
                    >
                      −
                    </button>
                    <input
                      id="quantity"
                      type="text"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="block w-full px-4 py-3 border-t border-b border-gray-300 text-center focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
                  Purchase Date
                </label>
                <div className="mt-1">
                  <input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {isExistingCustomer && customerPurchases.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
                >
                  {showHistory ? "Hide" : "Show"} purchase history
                  <svg
                    className={`ml-1 h-4 w-4 transform ${showHistory ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {showHistory && isExistingCustomer && customerPurchases.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <h3 className="text-sm font-medium text-gray-700 mb-3">Previous Purchases</h3>
                <div className="space-y-3">
                  {customerPurchases.map((purchase, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-white rounded-md shadow-xs">
                      <div>
                        <p className="font-medium text-gray-800">
                          {formatMedicineDisplay(purchase.medicine, purchase.quantity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(purchase.purchaseDate)}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || showConfirmation}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting || showConfirmation ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Record Purchase"
                )}
              </button>
            </div>
          </form>

          {showConfirmation && existingCustomer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                <h3 className="text-lg font-medium text-gray-900">
                  Welcome back, {existingCustomer.name}!
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Would you like to add a new purchase or view your purchase history?
                </p>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={handleViewHistory}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    View History
                  </button>
                  <button
                    onClick={handleConfirmNewPurchase}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add New Purchase
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}