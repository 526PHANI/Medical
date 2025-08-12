import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

interface Medicine {
  medicine: string;
  quantity: string;
}

interface FormData {
  name: string;
  phone: string;
  medicines: Medicine[];
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
    medicines: [{ medicine: "", quantity: "1" }],
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<CustomerData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<CustomerData | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { id, value } = e.target;

    if (id === "phone") {
      if (!/^\d{0,10}$/.test(value)) return;
      setFormData((prev) => ({ ...prev, phone: value }));
      checkExistingCustomer(value, customerHistory);
      return;
    }

    if (id === "name" || id === "purchaseDate") {
      setFormData((prev) => ({ ...prev, [id]: value }));
      return;
    }

    if (index !== undefined) {
      if (id === "medicine") {
        setFormData((prev) => ({
          ...prev,
          medicines: prev.medicines.map((med, i) =>
            i === index ? { ...med, medicine: value } : med
          ),
        }));
      } else if (id === "quantity") {
        if (value === "" || (/^\d*$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 200)) {
          setFormData((prev) => ({
            ...prev,
            medicines: prev.medicines.map((med, i) =>
              i === index ? { ...med, quantity: value } : med
            ),
          }));
        }
      }
    }
  };

  const handleQuantityChange = (index: number, increment: boolean) => {
    setFormData((prev) => {
      const currentQuantity = parseInt(prev.medicines[index].quantity) || 1;
      let newQuantity = increment ? currentQuantity + 1 : currentQuantity - 1;
      if (newQuantity < 1) newQuantity = 1;
      if (newQuantity > 200) newQuantity = 200;
      return {
        ...prev,
        medicines: prev.medicines.map((med, i) =>
          i === index ? { ...med, quantity: String(newQuantity) } : med
        ),
      };
    });
  };

  const addMedicine = () => {
    setFormData((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { medicine: "", quantity: "1" }],
    }));
  };

  const removeMedicine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    for (const [index, med] of formData.medicines.entries()) {
      if (!med.medicine.trim()) {
        toast.error(`Please enter medicine details for medicine ${index + 1}`);
        return;
      }
      const quantityNum = parseInt(med.quantity);
      if (!med.quantity || isNaN(quantityNum) || quantityNum < 1 || quantityNum > 200) {
        toast.error(`Please enter a valid quantity (1-200) for medicine ${index + 1}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Send a separate POST request for each medicine
      for (const med of formData.medicines) {
        const response = await fetch(`${appScriptUrl}?action=post`, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            medicine: med.medicine,
            quantity: med.quantity,
            purchaseDate: formData.purchaseDate,
          }),
        });

        if (!response.ok) {
          throw new Error(`Submission failed for medicine: ${med.medicine}`);
        }
      }

      toast.success("Purchase recorded successfully!");
      setFormData({
        name: "",
        phone: "",
        medicines: [{ medicine: "", quantity: "1" }],
        purchaseDate: new Date().toISOString().slice(0, 10),
      });
      setShowConfirmation(false);
      navigate("/list");
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
      className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">New Purchase</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isExistingCustomer ? `Existing customer: ${existingCustomer?.name}` : "New customer"}
              </p>
            </div>
            <button
              onClick={() => navigate("/list")}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 truncate"
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
                    className={`block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
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
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="9876543210"
                  />
                </div>
                {formData.phone.length > 0 && formData.phone.length < 10 && (
                  <p className="mt-1 text-sm text-red-600">Phone number must be 10 digits</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medicines
                </label>
                {formData.medicines.map((med, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 last:mb-0">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`medicine-${index}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Medicine Name {index + 1}
                      </label>
                      <div className="mt-1">
                        <input
                          id={`medicine-${index}`}
                          type="text"
                          value={med.medicine}
                          onChange={(e) => handleChange(e, index)}
                          required
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                          placeholder="e.g., Paracetamol 500mg"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label
                          htmlFor={`quantity-${index}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Quantity
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm flex items-center">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(index, false)}
                            className="inline-flex items-center justify-center px-3 py-3 h-full border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none text-sm sm:text-base"
                          >
                            −
                          </button>
                          <input
                            id={`quantity-${index}`}
                            type="text"
                            value={med.quantity}
                            onChange={(e) => handleChange(e, index)}
                            required
                            className="block w-full px-4 py-3 border border-gray-300 text-center focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                            placeholder="1"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(index, true)}
                            className="inline-flex items-center justify-center px-3 py-3 h-full border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none text-sm sm:text-base"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {formData.medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="inline-flex items-center justify-center px-3 py-3 h-full border border-gray-300 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 focus:outline-none text-sm sm:text-base"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMedicine}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Medicine
                </button>
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
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
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
                className="bg-gray-50 p-4 rounded-lg mt-4"
              >
                <h3 className="text-sm font-medium text-gray-700 mb-3">Previous Purchases</h3>
                <div className="space-y-3">
                  {customerPurchases.map((purchase, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-white rounded-md shadow-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm sm:text-base">
                          {formatMedicineDisplay(purchase.medicine, purchase.quantity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(purchase.purchaseDate)}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:max-w-md">
                <h3 className="text-lg sm:text-xl font-medium text-gray-900">
                  Welcome back, {existingCustomer.name}!
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Would you like to add a new purchase or view your purchase history?
                </p>
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 gap-3">
                  <button
                    onClick={handleViewHistory}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm sm:text-base"
                  >
                    View History
                  </button>
                  <button
                    onClick={handleConfirmNewPurchase}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
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