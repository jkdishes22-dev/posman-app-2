"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Bill, BillPayment, User } from "src/app/types/types";
import { Modal, Button, Form } from "react-bootstrap";
import Pagination from "../../../components/Pagination";
import { decodeJwt } from "../../../utils/tokenUtils";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import BillActions from "../../../components/BillActions";
import SubmitBillModal from "../../my-sales/submit-bill";

const CashierBillsPage = () => {
  const apiCall = useApiCall();
  const pathname = usePathname();

  // Component mounted
  useEffect(() => {
    // Component initialization
  }, []);

  // Initialize filters from URL params if present
  const getInitialFilters = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get("status");
      const validStatuses = ["submitted", "closed", "voided", "reopened", "all"];
      const status = statusParam && validStatuses.includes(statusParam) ? statusParam : "submitted";

      return {
        billingDate: null,
        selectedWaitress: "",
        status: status,
      };
    }
    return {
      billingDate: null,
      selectedWaitress: "",
      status: "submitted",
    };
  };

  const [filters, setFilters] = useState(getInitialFilters());
  const [waitresses, setWaitresses] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [closeBillError, setCloseBillError] = useState("");
  const [showModal, setShowCloseBillModal] = useState(false);
  const [showCloseBillSuccessModal, setShowCloseBillSuccessModal] = useState(false);
  const [closedBillInfo, setClosedBillInfo] = useState<{ id: number; total: number } | null>(null);
  const [searchBillId, setSearchBillId] = useState("");
  const [billIdInput, setBillIdInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [allBillIds, setAllBillIds] = useState<number[]>([]);
  const [bulkCloseResults, setBulkCloseResults] = useState<null | { billId: number, status: string, error?: string }[]>(null);
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [bulkSubmitResults, setBulkSubmitResults] = useState<null | { billId: number, status: string, error?: string }[]>(null);
  const [showBulkSubmitModal, setShowBulkSubmitModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenDescription, setReopenDescription] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [reopenReasons, setReopenReasons] = useState<{ value: string; label: string; description: string }[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showBillItems, setShowBillItems] = useState(false);

  const cleanupModalArtifacts = () => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("padding-right");
    document.body.style.removeProperty("overflow");
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
  };

  // Get user role and ID from token
  let userRole = "";
  let currentUserId: number | null = null;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded: any = decodeJwt<any>(token);
      if (decoded) {
        if (decoded.roles && decoded.roles.length > 0) {
          userRole = decoded.roles[0];
        }
        if (decoded.id) {
          currentUserId = Number(decoded.id);
        }
      }
    }
  }

  // Submit bill modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Fetch bills when filters or page change, but not when searching by specific bill ID
  useEffect(() => {
    if (!searchBillId) {
      // Only fetch bills if we're not searching by specific bill ID
      fetchBills();
    }
  }, [filters, page, searchBillId]);

  useEffect(() => {
    fetchSalesPersons();
    fetchReopenReasons();
  }, []);

  useEffect(() => {
    setShowCloseBillModal(false);
    setShowCloseBillSuccessModal(false);
    setShowBulkCloseModal(false);
    setShowBulkSubmitModal(false);
    setShowReopenModal(false);
    setShowSubmitModal(false);
    cleanupModalArtifacts();
  }, [pathname]);

  useEffect(() => {
    return () => {
      cleanupModalArtifacts();
    };
  }, []);

  // Reset bill items view when selected bill changes
  useEffect(() => {
    setShowBillItems(false);
  }, [selectedBill?.id]);

  // Handle billId from URL query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const billIdParam = urlParams.get("billId");

      if (billIdParam) {
        const billId = parseInt(billIdParam, 10);
        if (!isNaN(billId)) {
          // Set search bill ID and input
          setSearchBillId(billIdParam);
          setBillIdInput(billIdParam);
          // Fetch all bill IDs for navigation
          fetchAllBillIds();
          // Fetch the bill by ID
          fetchBillById(billId);
        }
      }
    }
  }, []); // Only run on mount

  // When bills are loaded and we have a billId in URL, select it
  useEffect(() => {
    if (typeof window !== "undefined" && bills.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const billIdParam = urlParams.get("billId");

      if (billIdParam) {
        const billId = parseInt(billIdParam, 10);
        if (!isNaN(billId)) {
          const bill = bills.find(b => b.id === billId);
          if (bill && (!selectedBill || selectedBill.id !== billId)) {
            setSelectedBill(bill);
            setSelectedBills([billId]);
          }
        }
      }
    }
  }, [bills]); // Run when bills change

  const fetchBills = async () => {
    const { status, billingDate, selectedWaitress } = filters;
    let url = "/api/bills";
    const params = [];

    if (status && status !== "all") {
      params.push(`status=${status}`);
    }
    if (billingDate) {
      const formattedDate = formatISO(billingDate, { representation: "date" });
      params.push(`date=${formattedDate}`);
    }
    if (selectedWaitress) {
      params.push(`billingUserId=${selectedWaitress}`);
    }
    params.push(`page=${page}`);
    params.push(`pageSize=${pageSize}`);
    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        setBills(result.data.bills || []);
        setTotal(result.data.total || 0);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch bills");
        setErrorDetails(result.errorDetails);
        setBills([]);
        setTotal(0);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setBills([]);
      setTotal(0);
    }
  };

  const fetchBillById = async (billId: number) => {
    const url = `/api/bills?billId=${billId}`;
    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        const fetchedBills = result.data.bills || [];
        setBills(fetchedBills);
        // Automatically select the bill if it was found
        if (fetchedBills.length > 0) {
          const bill = fetchedBills.find((b: Bill) => b.id === billId) || fetchedBills[0];
          setSelectedBill(bill);
          setSelectedBills([bill.id]);
          // Fetch all bill IDs for navigation
          fetchAllBillIds();
        }
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch bill by ID");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchAllBillIds = async () => {
    try {
      // Fetch all bills to get IDs for navigation
      const result = await apiCall("/api/bills?page=1&pageSize=1000");
      if (result.status === 200) {
        const allBills = result.data.bills || [];
        const ids = allBills.map((bill: Bill) => bill.id).sort((a: number, b: number) => a - b); // Sort ascending (oldest first, so Next = higher ID)
        setAllBillIds(ids);
      }
    } catch (error) {
      console.error("Failed to fetch all bill IDs:", error);
    }
  };

  const navigateToBill = (billId: number) => {
    setSearchBillId(billId.toString());
    fetchBillById(billId);
    // Update URL without page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("billId", billId.toString());
      window.history.pushState({}, "", url.toString());
    }
  };

  const handlePrevBill = () => {
    if (!searchBillId) return;
    const currentId = parseInt(searchBillId, 10);
    if (isNaN(currentId)) return;

    const currentIndex = allBillIds.indexOf(currentId);
    if (currentIndex > 0 && currentIndex < allBillIds.length) {
      const prevId = allBillIds[currentIndex - 1];
      navigateToBill(prevId);
    }
  };

  const handleNextBill = () => {
    if (!searchBillId) return;
    const currentId = parseInt(searchBillId, 10);
    if (isNaN(currentId)) return;

    const currentIndex = allBillIds.indexOf(currentId);
    if (currentIndex >= 0 && currentIndex < allBillIds.length - 1) {
      const nextId = allBillIds[currentIndex + 1];
      navigateToBill(nextId);
    }
  };

  const fetchSalesPersons = async () => {
    // Fetch users with roles that can create bills: 'user', 'sales', and 'waitress'
    try {
      const [userResult, salesResult, waitressResult] = await Promise.all([
        apiCall("/api/users?role=user"),
        apiCall("/api/users?role=sales"),
        apiCall("/api/users?role=waitress").catch(() => ({ status: 404, data: null, error: "Waitress role not found" }))
      ]);

      const allUsers: User[] = [];

      // Handle user role results
      if (userResult.status === 200) {
        const users = userResult.data?.users || userResult.data || [];
        if (Array.isArray(users)) {
          allUsers.push(...users);
        } else {
          console.warn("Unexpected user role response structure:", userResult.data);
        }
      } else {
        console.warn("Failed to fetch user role:", userResult.error);
      }

      // Handle sales role results
      if (salesResult.status === 200) {
        const users = salesResult.data?.users || salesResult.data || [];
        if (Array.isArray(users)) {
          allUsers.push(...users);
        } else {
          console.warn("Unexpected sales role response structure:", salesResult.data);
        }
      } else {
        console.warn("Failed to fetch sales role:", salesResult.error);
      }

      // Handle waitress role results (if it exists)
      if (waitressResult && waitressResult.status === 200) {
        const users = waitressResult.data?.users || waitressResult.data || [];
        if (Array.isArray(users)) {
          allUsers.push(...users);
        } else {
          console.warn("Unexpected waitress role response structure:", waitressResult.data);
        }
      }

      // Remove duplicates based on user ID
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex((u) => u.id === user.id)
      );

      setWaitresses(uniqueUsers);
      if (uniqueUsers.length === 0) {
        console.log("No waitresses found. User result:", userResult, "Sales result:", salesResult, "Waitress result:", waitressResult);
      }
    } catch (error: any) {
      console.error("Error fetching sales persons:", error);
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setWaitresses([]);
    }
  };

  const fetchReopenReasons = async () => {
    try {
      const result = await apiCall("/api/bills/reopen-reasons");
      if (result.status === 200) {
        setReopenReasons(result.data.reasons || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch reopen reasons:", error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Clear selected bill when filters change
    if (key === "status" || key === "billingDate" || key === "selectedWaitress") {
      setSelectedBill(null);
      setSelectedBills([]);
      setSearchBillId("");
      // Update URL parameters when filters change
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("billId");
        // Update status in URL
        if (key === "status") {
          if (value && value !== "submitted") {
            url.searchParams.set("status", value);
          } else {
            url.searchParams.delete("status");
          }
        }
        window.history.pushState({}, "", url.toString());
      }
    }
  };
  const handleDateChange = (date: Date | null) => handleFilterChange("billingDate", date);
  const handleBillIdInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Only allow numeric input
    if (/^\d*$/.test(value)) {
      setBillIdInput(value);
    }
  };

  const handleBillIdSearch = () => {
    const billId = billIdInput.trim();
    if (billId === "") {
      // Clear search
      setSearchBillId("");
      setSelectedBill(null);
      setSelectedBills([]);
      setPage(1);
      setFilters((prev) => ({ ...prev, status: "all" }));
      // Clear URL parameter
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("billId");
        window.history.pushState({}, "", url.toString());
      }
    } else {
      // Perform search
      setSearchBillId(billId);
      // Fetch all bill IDs for navigation
      fetchAllBillIds();
      fetchBillById(Number(billId));
      // Update URL parameter
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("billId", billId);
        window.history.pushState({}, "", url.toString());
      }
    }
  };
  const handleWaitressChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleFilterChange("selectedWaitress", event.target.value);
  };
  const handleCheckboxChange = (billId: number) => {
    if (selectedBills.length === bills.length) {
      setSelectedBills([billId]);
    } else if (selectedBills.includes(billId)) {
      setSelectedBills([]);
    } else {
      setSelectedBills([billId]);
    }
  };
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedBills(event.target.checked ? bills.map((bill) => bill.id) : []);
  };
  const handleBulkProcess = async () => {
    setBulkCloseResults(null);
    try {
      const result = await apiCall("/api/bills/bulk-close", {
        method: "POST",
        body: JSON.stringify({ billIds: selectedBills }),
      });
      if (result.status === 200) {
        setBulkCloseResults(result.data.results);
        setShowBulkCloseModal(true);
        fetchBills();
        setSelectedBills([]);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to bulk close bills");
        setErrorDetails(result.errorDetails);
        setBulkCloseResults([{ billId: 0, status: "failed", error: result.error }]);
        setShowBulkCloseModal(true);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setBulkCloseResults([{ billId: 0, status: "failed", error: "Network error occurred" }]);
      setShowBulkCloseModal(true);
    }
  };
  const handleProcessClick = (bill: Bill) => {
    setCloseBillError("");
    setSelectedBill(bill);
    setSelectedBills([bill.id]);
  };
  const handleConfirmCloseBill = async () => {
    if (!selectedBill) return;
    const billAmount = selectedBill.total;
    const paidAmount = selectedBill.bill_payments?.reduce(
      (sum, billPayment: BillPayment) => sum + billPayment.payment.creditAmount,
      0,
    ) || 0;
    const amountDifference = paidAmount - billAmount;

    // Only prevent closing if there's an underpayment (not fully paid)
    if (amountDifference < 0) {
      setCloseBillError(`Cannot close bill. Outstanding amount: $${(Number(Math.abs(amountDifference)) || 0).toFixed(2)}`);
      return;
    }

    // Clear any previous errors if bill can be closed
    setCloseBillError("");
    const url = `/api/bills/${selectedBill.id}/close`;
    try {
      const result = await apiCall(url, {
        method: "POST",
      });
      if (result.status === 200) {
        // Store bill info for success modal
        setClosedBillInfo({
          id: selectedBill.id,
          total: selectedBill.total || 0
        });
        await fetchBills();
        setSelectedBill(null);
        setError(null);
        setErrorDetails(null);
        setShowCloseBillModal(false);
        setShowCloseBillSuccessModal(true);
      } else {
        setCloseBillError("Failed to close bill: " + (result.error || "Unknown error"));
        setError(result.error || "Failed to close bill");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setCloseBillError("Network error occurred");
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setShowCloseBillModal(false);
    }
  };
  const showCloseBillModal = () => setShowCloseBillModal(true);
  const handleCloseModal = () => setShowCloseBillModal(false);
  const handleBulkSubmit = async () => {
    setBulkSubmitResults(null);
    setError(null);
    setErrorDetails(null);

    // Filter bills: only pending bills created by the current user
    const userBills = bills.filter(
      (bill) =>
        selectedBills.includes(bill.id) &&
        bill.status === "pending" &&
        currentUserId &&
        bill.user?.id === currentUserId
    );

    if (userBills.length === 0) {
      setError("You can only submit bills that you created. Please select bills that you created.");
      setErrorDetails({ message: "No bills available for submission" });
      return;
    }

    // Check for invalid bills (silently filter them out, no error message)
    const invalidBills = bills.filter(
      (bill) =>
        selectedBills.includes(bill.id) &&
        bill.status === "pending" &&
        currentUserId &&
        bill.user?.id !== currentUserId
    );

    // For demo, assume all selected bills use cash payment and full amount
    const billPayments = userBills.map((bill) => ({
      billId: bill.id,
      paymentMethod: "cash",
      cashAmount: bill.total,
      mpesaAmount: 0,
      mpesaCode: "",
    }));

    try {
      const result = await apiCall("/api/bills/bulk-submit", {
        method: "POST",
        body: JSON.stringify({ billPayments }),
      });
      if (result.status === 200) {
        // Filter results to only show successfully submitted bills
        const successfulSubmissions = result.data.results.filter(
          (r: any) => r.status === "submitted"
        );
        const failedSubmissions = result.data.results.filter(
          (r: any) => r.status === "failed"
        );

        // Enhance results with bill data (total, date) for display in modal
        const enhancedResults = result.data.results.map((r: any) => {
          const bill = userBills.find((b: Bill) => b.id === r.billId);
          return {
            ...r,
            billTotal: bill?.total || 0,
            billDate: bill?.created_at || null
          };
        });

        setBulkSubmitResults(enhancedResults);
        setShowBulkSubmitModal(true);
        fetchBills();
        setSelectedBills([]);

        // Only show error if there were actual submission failures
        if (failedSubmissions.length > 0) {
          setError(`Failed to submit ${failedSubmissions.length} bill(s). ${successfulSubmissions.length} bill(s) submitted successfully.`);
        }
      } else {
        setError(result.error || "Failed to bulk submit bills");
        setErrorDetails(result.errorDetails);
        setBulkSubmitResults([{ billId: 0, status: "failed", error: result.error }]);
        setShowBulkSubmitModal(true);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setBulkSubmitResults([{ billId: 0, status: "failed", error: "Network error occurred" }]);
      setShowBulkSubmitModal(true);
    }
  };

  const handleReopenBill = () => {
    if (!selectedBill) return;
    setReopenReason("");
    setReopenDescription("");
    setReopenNotes("");
    setShowReopenModal(true);
  };

  const handleConfirmReopen = async () => {
    if (!selectedBill || !reopenReason) return;

    try {
      const result = await apiCall(`/api/bills/${selectedBill.id}/reopen`, {
        method: "POST",
        body: JSON.stringify({
          reason: reopenReason,
          description: reopenDescription,
          notes: reopenNotes,
        }),
      });

      if (result.status === 200) {
        setShowReopenModal(false);
        setError(null);
        setErrorDetails(null);
        fetchBills(); // Refresh bills list
        setSelectedBill(null);
        setSelectedBills([]);
      } else {
        setError(result.error || "Failed to reopen bill");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleCloseReopenModal = () => {
    setShowReopenModal(false);
    setReopenReason("");
    setReopenDescription("");
    setReopenNotes("");
  };

  return (
    <div className="container-fluid" style={{ overflowX: "hidden" }}>
      {/* Error Display */}
      <ErrorDisplay
        error={error}
        errorDetails={errorDetails}
        onDismiss={() => {
          setError(null);
          setErrorDetails(null);
        }}
      />

      {/* Header */}
      <div className="bg-primary text-white p-3 mb-4">
        <h1 className="h4 mb-0 fw-bold">
          <i className="bi bi-receipt me-2"></i>
          Cashier Bills Management
        </h1>
      </div>

      {/* Filtering Section */}
      {!searchBillId && (
        <div className="row mb-4" style={{ margin: 0 }}>
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="form-group">
                      <label htmlFor="billingDate" className="form-label fw-semibold">
                        Billing Date
                      </label>
                      <div>
                        <DatePicker
                          className="form-control"
                          id="billingDate"
                          selected={filters.billingDate}
                          onChange={(date: Date | null) => handleDateChange(date)}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select billing date"
                          maxDate={new Date()}
                          minDate={null}
                          isClearable
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="form-group">
                      <label htmlFor="billId" className="form-label fw-semibold">
                        Bill ID
                      </label>
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control"
                          id="billId"
                          placeholder="Enter Bill ID"
                          value={billIdInput}
                          onChange={handleBillIdInputChange}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleBillIdSearch();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleBillIdSearch}
                          disabled={!billIdInput.trim()}
                        >
                          <i className="bi bi-search"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="form-group">
                      <label htmlFor="waitress" className="form-label fw-semibold">
                        Select Waitress
                      </label>
                      <div>
                        <select
                          id="waitress"
                          className="form-control"
                          value={filters.selectedWaitress}
                          onChange={handleWaitressChange}
                        >
                          <option value="">Select waitress</option>
                          {Array.isArray(waitresses) && waitresses.map((waitress) => (
                            <option key={waitress.id} value={waitress.id}>
                              {waitress.firstName} {waitress.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3 d-flex align-items-end">
                    <div className="btn-group w-100 flex-wrap" role="group" aria-label="Filter actions">
                      <button
                        className={`btn btn-sm ${filters.status === "submitted" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleFilterChange("status", "submitted")}
                      >
                        Submitted
                      </button>
                      <button
                        className={`btn btn-sm ${filters.status === "closed" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleFilterChange("status", "closed")}
                      >
                        Closed
                      </button>
                      <button
                        className={`btn btn-sm ${filters.status === "voided" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleFilterChange("status", "voided")}
                      >
                        Voided
                      </button>
                      <button
                        className={`btn btn-sm ${filters.status === "reopened" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleFilterChange("status", "reopened")}
                      >
                        Reopened
                      </button>
                      <button
                        className={`btn btn-sm ${filters.status === "all" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleFilterChange("status", "all")}
                      >
                        All
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill ID Navigation Section */}
      {searchBillId && (
        <div className="row mb-4" style={{ margin: 0 }}>
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row g-3 align-items-center">
                  <div className="col-12">
                    <label className="form-label fw-semibold mb-2">Bill Navigation</label>
                    <div className="d-flex gap-2 align-items-center justify-content-center">
                      <button
                        className="btn btn-outline-primary"
                        onClick={handlePrevBill}
                        disabled={!searchBillId || allBillIds.length === 0 || allBillIds.indexOf(parseInt(searchBillId, 10)) === 0}
                        title="Previous Bill"
                      >
                        <i className="bi bi-chevron-left me-1"></i>
                        Previous
                      </button>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold">Bill ID:</span>
                        <span className="badge bg-primary fs-6 px-3 py-2">{searchBillId}</span>
                        {allBillIds.length > 0 && (
                          <span className="text-muted small">
                            ({allBillIds.indexOf(parseInt(searchBillId, 10)) + 1} of {allBillIds.length})
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-outline-primary"
                        onClick={handleNextBill}
                        disabled={!searchBillId || allBillIds.length === 0 || allBillIds.indexOf(parseInt(searchBillId, 10)) === allBillIds.length - 1}
                        title="Next Bill"
                      >
                        Next
                        <i className="bi bi-chevron-right ms-1"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary ms-auto"
                        onClick={() => {
                          setSearchBillId("");
                          setSelectedBill(null);
                          setSelectedBills([]);
                          setPage(1); // Reset to first page
                          // Reset all filters to show all bills
                          setFilters({
                            billingDate: null,
                            selectedWaitress: "",
                            status: "all",
                          });
                          // Clear URL parameter
                          if (typeof window !== "undefined") {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("billId");
                            window.history.pushState({}, "", url.toString());
                          }
                        }}
                        title="Clear Bill ID filter and return to process bills"
                      >
                        <i className="bi bi-x me-1"></i>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Three Column Layout (Wireframe Design) */}
      <div className="row g-4" style={{ margin: 0 }}>
        {/* Bills Display - Left Column (Larger) */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    Bills Display
                  </h5>
                  {(() => {
                    const submittedBills = bills.filter(bill => bill.status === "submitted");
                    const billsWithDiscrepancies = submittedBills.filter(bill => {
                      const totalPaid = bill.bill_payments?.reduce(
                        (sum, billPayment) => sum + billPayment.payment.creditAmount,
                        0,
                      ) || 0;
                      const amountDifference = Math.abs(totalPaid - bill.total);
                      // Only flag as discrepancy if there's a meaningful difference (more than 0.01 to account for floating point precision)
                      return amountDifference > 0.01;
                    });

                    return billsWithDiscrepancies.length > 0 ? (
                      <div className="alert alert-warning alert-sm mb-0 py-1 px-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <small>
                          <strong>{billsWithDiscrepancies.length}</strong> bill(s) with payment discrepancies
                        </small>
                      </div>
                    ) : null;
                  })()}
                </div>
                {!searchBillId && (
                  <div className="d-flex gap-2">
                    {filters.status === "submitted" && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handleBulkProcess}
                        disabled={selectedBills.length === 0}
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        Bulk Close
                      </button>
                    )}
                    {bills.some((bill) => selectedBills.includes(bill.id) && bill.status === "pending") && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleBulkSubmit}
                        disabled={selectedBills.filter((id) => {
                          const bill = bills.find((b) => b.id === id);
                          return bill &&
                            bill.status === "pending" &&
                            currentUserId &&
                            bill.user?.id === currentUserId;
                        }).length === 0}
                        title={
                          selectedBills.filter((id) => {
                            const bill = bills.find((b) => b.id === id);
                            return bill &&
                              bill.status === "pending" &&
                              currentUserId &&
                              bill.user?.id === currentUserId;
                          }).length === 0
                            ? "You can only submit bills that you created"
                            : "Submit selected bills"
                        }
                      >
                        <i className="bi bi-send me-1"></i>
                        Bulk Submit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="border p-3" style={{ maxHeight: "400px", overflowY: "auto", overflowX: "auto" }}>
                {bills.length > 0 ? (
                  <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table className="table table-striped table-sm">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={
                                selectedBills.length === bills.length &&
                                bills.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>ID</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Created By</th>
                          <th>Created Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill) => (
                          <tr
                            key={bill.id}
                            style={{
                              backgroundColor:
                                bill.id === selectedBill?.id
                                  ? "#d3d3d3"
                                  : "transparent",
                              transition: "background-color 0.3s ease",
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedBills.includes(bill.id)}
                                onChange={() => handleCheckboxChange(bill.id)}
                              />
                            </td>
                            <td>{bill.id}</td>
                            <td>
                              <span className={`badge ${bill.status === "submitted" ? "bg-warning" :
                                bill.status === "closed" ? "bg-success" :
                                  bill.status === "voided" ? "bg-danger" : "bg-secondary"
                                }`}>
                                {bill.status}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span>${bill.total}</span>
                                {bill.status === "submitted" && (() => {
                                  const totalPaid = bill.bill_payments?.reduce(
                                    (sum, billPayment) => sum + billPayment.payment.creditAmount,
                                    0,
                                  ) || 0;
                                  const billTotal = bill.total;
                                  const amountDifference = totalPaid - billTotal;
                                  // Consider fully paid if difference is within 0.01 (accounting for floating point precision)
                                  const isFullyPaid = Math.abs(amountDifference) <= 0.01;

                                  return !isFullyPaid ? (
                                    <span
                                      className={`badge ms-2 ${amountDifference > 0 ? "bg-info" : "bg-danger"}`}
                                      title={`${amountDifference > 0 ? "Overpayment" : "Outstanding"}: $${(Number(Math.abs(amountDifference)) || 0).toFixed(2)}`}
                                    >
                                      <i className={`bi me-1 ${amountDifference > 0 ? "bi-info-circle" : "bi-exclamation-triangle"}`}></i>
                                      ${(Number(Math.abs(amountDifference)) || 0).toFixed(2)}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                            <td>
                              {bill.user.firstName} {bill.user.lastName}
                            </td>
                            <td>
                              {bill.created_at ? new Date(bill.created_at).toLocaleString() : "N/A"}
                            </td>
                            <td>
                              {/* Role-based actions */}
                              {userRole === "cashier" ? (
                                bill.status === "submitted" ? (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleProcessClick(bill)}
                                  >
                                    Process
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setSelectedBill(bill);
                                      setSelectedBills([bill.id]);
                                    }}
                                  >
                                    View
                                  </button>
                                )
                              ) : userRole === "user" || userRole === "waitress" ? (
                                bill.status === "pending" ? (
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => {
                                      setSelectedBill(bill);
                                      setSelectedBills([bill.id]);
                                    }}
                                  >
                                    Submit
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setSelectedBill(bill);
                                      setSelectedBills([bill.id]);
                                    }}
                                  >
                                    View
                                  </button>
                                )
                              ) : (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    setSelectedBill(bill);
                                    setSelectedBills([bill.id]);
                                  }}
                                >
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted">No bills found.</p>
                )}
              </div>
              <div className="mt-3">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bill Details - Middle Column */}
        <div className="col-12 col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-receipt me-2 text-primary"></i>
                Bill Details
              </h5>
            </div>
            <div className="card-body" style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
              {closeBillError && <div className="alert alert-danger alert-sm">{closeBillError}</div>}
              {selectedBills.length === 1 && selectedBill ? (
                <div style={{ wordWrap: "break-word" }}>
                  <h6 className="fw-bold text-primary">Bill Information</h6>
                  <div className="mb-3">
                    <p className="mb-1"><strong>Bill ID:</strong> {selectedBill.id}</p>
                    <p className="mb-1"><strong>Total:</strong> ${selectedBill.total}</p>
                    <p className="mb-1"><strong>Created By:</strong> {selectedBill.user.firstName} {selectedBill.user.lastName}</p>
                    <p className="mb-1"><strong>Created At:</strong> {new Date(selectedBill.created_at).toLocaleString()}</p>
                  </div>

                  {/* Additional Bill Details */}
                  <h6 className="fw-bold text-primary mb-3">Additional Information</h6>

                  {/* Station Information */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-geo-alt me-2 text-muted"></i>
                      <strong>Station:</strong>
                    </div>
                    <div className="ms-4">
                      <span className="badge bg-secondary">
                        {selectedBill.station?.name || "Unknown Station"}
                      </span>
                    </div>
                  </div>

                  {/* Reopen History */}
                  {selectedBill.reopen_reason && (
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-arrow-clockwise me-2 text-muted"></i>
                        <strong>Reopen History:</strong>
                      </div>
                      <div className="ms-4">
                        <div className="small text-muted">
                          <div><strong>Reason:</strong> {selectedBill.reopen_reason}</div>
                          {selectedBill.reopened_at && (
                            <div><strong>Reopened:</strong> {new Date(selectedBill.reopened_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bill Items Count with Expandable View */}
                  <div className="mb-3">
                    <div
                      className="d-flex justify-content-between align-items-center mb-2 p-2 rounded"
                      style={{
                        cursor: "pointer",
                        transition: "background-color 0.2s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      onClick={() => setShowBillItems(!showBillItems)}
                    >
                      <div className="d-flex align-items-center">
                        <i className="bi bi-list-ul me-2 text-muted"></i>
                        <strong>Items:</strong>
                        <span className="badge bg-info ms-2">
                          {selectedBill.bill_items?.length || 0} items
                        </span>
                      </div>
                      <i className={`bi ${showBillItems ? "bi-chevron-up" : "bi-chevron-down"} text-muted`}></i>
                    </div>
                    <div
                      className={`collapse ${showBillItems ? "show" : ""}`}
                      style={{
                        maxHeight: showBillItems ? "400px" : "0px",
                        overflow: "hidden",
                        transition: "max-height 0.3s ease-in-out"
                      }}
                    >
                      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {selectedBill.bill_items && selectedBill.bill_items.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-sm table-hover mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ fontSize: "0.85em" }}>Item</th>
                                  <th style={{ fontSize: "0.85em" }} className="text-end">Qty</th>
                                  <th style={{ fontSize: "0.85em" }} className="text-end">Price</th>
                                  <th style={{ fontSize: "0.85em" }} className="text-end">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedBill.bill_items.map((item: any, index: number) => {
                                  // Calculate unit price from subtotal and quantity, or use item.price if available
                                  const unitPrice = item.item?.price || (item.quantity > 0 ? (item.subtotal / item.quantity) : 0);
                                  const lineTotal = item.subtotal || 0;

                                  return (
                                    <tr key={item.id || index}>
                                      <td>
                                        <div className="small">
                                          <div className="fw-semibold">
                                            {item.menu_item?.name || item.item?.name || "Unknown Item"}
                                          </div>
                                          {(item.menu_item?.code || item.item?.code) && (
                                            <div className="text-muted" style={{ fontSize: "0.8em" }}>
                                              {item.menu_item?.code || item.item?.code}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="text-end">
                                        <span className="badge bg-secondary">
                                          {item.quantity || 0}
                                        </span>
                                      </td>
                                      <td className="text-end">
                                        <small>${(Number(unitPrice) || 0).toFixed(2)}</small>
                                      </td>
                                      <td className="text-end">
                                        <strong>${(Number(lineTotal) || 0).toFixed(2)}</strong>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="table-light">
                                <tr>
                                  <td colSpan={3} className="text-end fw-bold">
                                    <strong>Bill Total:</strong>
                                  </td>
                                  <td className="text-end fw-bold text-primary">
                                    ${(Number(selectedBill.total) || 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-muted py-3">
                            <i className="bi bi-inbox me-2"></i>
                            No items in this bill
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voided Items Count */}
                  {selectedBill.bill_items && selectedBill.bill_items.some(item => item.status === "voided") && (
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-x-circle me-2 text-muted"></i>
                        <strong>Voided Items:</strong>
                      </div>
                      <div className="ms-4">
                        <span className="badge bg-danger">
                          {selectedBill.bill_items.filter(item => item.status === "voided").length} voided
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    {selectedBill.status === "submitted" ? (
                      (() => {
                        const totalPaid = selectedBill.bill_payments?.reduce(
                          (sum, billPayment) => sum + billPayment.payment.creditAmount,
                          0,
                        ) || 0;
                        const billTotal = selectedBill.total;
                        const amountDifference = totalPaid - billTotal;
                        // Consider fully paid if difference is within 0.01 (accounting for floating point precision)
                        const isFullyPaid = Math.abs(amountDifference) <= 0.01;

                        if (isFullyPaid) {
                          return (
                            <button
                              className="btn btn-success btn-sm w-100"
                              onClick={showCloseBillModal}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Close Bill
                            </button>
                          );
                        } else if (amountDifference > 0) {
                          // Overpayment - bill can be closed with refund note
                          return (
                            <button
                              className="btn btn-warning btn-sm w-100"
                              onClick={showCloseBillModal}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Close Bill (Refund ${(Number(amountDifference) || 0).toFixed(2)})
                            </button>
                          );
                        } else {
                          // Underpayment - bill cannot be closed
                          // Only show warning if there's a meaningful outstanding amount (> 0.01)
                          const outstandingAmount = Math.abs(amountDifference);
                          if (outstandingAmount > 0.01) {
                            return (
                              <div className="alert alert-warning alert-sm">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                <strong>Payment Required:</strong> ${(Number(outstandingAmount) || 0).toFixed(2)} outstanding
                              </div>
                            );
                          }
                          // If outstanding is $0.00 or negligible, show close button
                          return (
                            <button
                              className="btn btn-success btn-sm w-100"
                              onClick={showCloseBillModal}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Close Bill
                            </button>
                          );
                        }
                      })()
                    ) : selectedBill.status === "reopened" ? (
                      <div>
                        <div className="alert alert-info alert-sm mb-2">
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          <strong>Bill has been reopened</strong>
                          <div className="small mt-1">
                            This bill was reopened for the sales person to fix payment issues.
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-primary btn-sm w-100"
                          onClick={showCloseBillModal}
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          Try Close Again
                        </button>
                      </div>
                    ) : selectedBill.status === "pending" ? (
                      <div className="alert alert-warning alert-sm">
                        <i className="bi bi-clock me-1"></i>
                        <strong>Bill is pending</strong>
                        <div className="small mt-1">
                          This bill is waiting to be submitted by the sales person.
                        </div>
                        {/* Show submit button for supervisors and sales users if this is their own bill */}
                        {(userRole === "supervisor" || userRole === "sales" || userRole === "user" || userRole === "waitress") && currentUserId && selectedBill.user?.id === currentUserId && (
                          <div className="mt-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => {
                                const hasPendingVoids = selectedBill.bill_items?.some(
                                  (item: any) => item.status === "void_pending"
                                );
                                if (hasPendingVoids) {
                                  setError("Cannot submit bill with pending void requests. Please wait for approval.");
                                  return;
                                }
                                if (selectedBill.bill_items?.length === 0) {
                                  setError("Cannot submit bill with no items.");
                                  return;
                                }
                                setShowSubmitModal(true);
                              }}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Submit Bill (KES: {selectedBill.total})
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : selectedBill.status === "closed" ? (
                      <div className="alert alert-success alert-sm">
                        <i className="bi bi-check-circle me-1"></i>
                        <strong>Bill is closed</strong>
                      </div>
                    ) : selectedBill.status === "voided" ? (
                      <div className="alert alert-danger alert-sm">
                        <i className="bi bi-x-circle me-1"></i>
                        <strong>Bill is voided</strong>
                      </div>
                    ) : (
                      <div className="alert alert-secondary alert-sm">
                        <i className="bi bi-info-circle me-1"></i>
                        <strong>Status:</strong> {selectedBill.status}
                      </div>
                    )}
                  </div>

                  {/* Bill Actions - Voiding and Reopening Features */}
                  <BillActions
                    bill={selectedBill}
                    userRole={userRole}
                    onVoidRequested={() => {
                      // Refresh bill data after void request
                      fetchBills();
                    }}
                    onVoidApproved={() => {
                      // Refresh bill data after void approval
                      fetchBills();
                    }}
                    onReopened={() => {
                      // Refresh bill data after reopening
                      fetchBills();
                    }}
                    onResubmitted={() => {
                      // Refresh bill data after resubmission
                      fetchBills();
                    }}
                  />
                </div>
              ) : selectedBills.length > 1 ? (
                <p className="text-center text-muted">Select a single bill to see details.</p>
              ) : (
                <p className="text-center text-muted">Select a bill to see the details</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Details - Right Column */}
        <div className="col-12 col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-credit-card me-2 text-primary"></i>
                Payment Details
              </h5>
            </div>
            <div className="card-body" style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
              {selectedBills.length === 1 && selectedBill ? (
                <div style={{ wordWrap: "break-word" }}>
                  {(() => {
                    const totalPaid = selectedBill.bill_payments?.reduce(
                      (sum, billPayment) => sum + billPayment.payment.creditAmount,
                      0,
                    ) || 0;
                    const billTotal = selectedBill.total;
                    const amountDifference = totalPaid - billTotal;
                    // Consider fully paid if difference is within 0.01 (accounting for floating point precision)
                    const isFullyPaid = Math.abs(amountDifference) <= 0.01;

                    // Calculate payment breakdown by type
                    const mpesaPayments = selectedBill.bill_payments?.filter(
                      billPayment => billPayment.payment.paymentType === "MPESA"
                    ) || [];
                    const cashPayments = selectedBill.bill_payments?.filter(
                      billPayment => billPayment.payment.paymentType === "CASH"
                    ) || [];

                    const mpesaTotal = mpesaPayments.reduce(
                      (sum, billPayment) => sum + billPayment.payment.creditAmount,
                      0
                    );
                    const cashTotal = cashPayments.reduce(
                      (sum, billPayment) => sum + billPayment.payment.creditAmount,
                      0
                    );

                    return (
                      <div>
                        <h6 className="fw-bold text-primary mb-3">Payment Breakdown</h6>

                        {/* Payment Summary */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span><strong>Bill Total:</strong></span>
                            <span className="fw-bold">${(Number(billTotal) || 0).toFixed(2)}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span><strong>Total Paid:</strong></span>
                            <span className="fw-bold">${(Number(totalPaid) || 0).toFixed(2)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between align-items-center">
                            <span className={isFullyPaid ? "text-success fw-bold" : amountDifference > 0 ? "text-info fw-bold" : "text-danger fw-bold"}>
                              {isFullyPaid ? "Balance:" : amountDifference > 0 ? "Overpayment:" : "Outstanding:"}
                            </span>
                            <span className={isFullyPaid ? "text-success fw-bold" : amountDifference > 0 ? "text-info fw-bold" : "text-danger fw-bold"}>
                              ${(Number(Math.abs(amountDifference)) || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="mb-3">
                          <h6 className="fw-bold text-secondary mb-2">Payment Methods</h6>

                          {/* M-Pesa Payments */}
                          {mpesaTotal > 0 && (
                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-success">
                                  <i className="bi bi-phone me-1"></i>
                                  <strong>M-Pesa:</strong>
                                </span>
                                <span className="fw-bold text-success">${(Number(mpesaTotal) || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          {/* Cash Payments */}
                          {cashTotal > 0 && (
                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-primary">
                                  <i className="bi bi-cash me-1"></i>
                                  <strong>Cash:</strong>
                                </span>
                                <span className="fw-bold text-primary">${(Number(cashTotal) || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          {/* No Payments */}
                          {totalPaid === 0 && (
                            <div className="text-center text-muted">
                              <i className="bi bi-exclamation-circle me-1"></i>
                              No payments recorded
                            </div>
                          )}
                        </div>

                        {/* Payment Details */}
                        {selectedBill.bill_payments && selectedBill.bill_payments.length > 0 && (
                          <div>
                            <div
                              className="d-flex justify-content-between align-items-center mb-2 p-2 rounded"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                            >
                              <h6 className="fw-bold text-secondary mb-0">
                                Payment History
                                <span className="badge bg-light text-dark ms-2">
                                  {selectedBill.bill_payments?.length || 0}
                                </span>
                              </h6>
                              <i className={`bi ${showPaymentHistory ? "bi-chevron-up" : "bi-chevron-down"} text-muted`}></i>
                            </div>
                            <div
                              className={`collapse ${showPaymentHistory ? "show" : ""}`}
                              style={{
                                maxHeight: showPaymentHistory ? "200px" : "0px",
                                overflow: "hidden",
                                transition: "max-height 0.3s ease-in-out"
                              }}
                            >
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {selectedBill.bill_payments.map((billPayment: BillPayment, index: number) => (
                                  <div key={billPayment.id} className="border-bottom pb-2 mb-2">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div className="small">
                                        <div className="d-flex align-items-center mb-1">
                                          <i className={`bi ${billPayment.payment.paymentType === "MPESA" ? "bi-phone text-success" : "bi-cash text-primary"} me-1`}></i>
                                          <strong>{billPayment.payment.paymentType}</strong>
                                        </div>
                                        <div><strong>Amount:</strong> ${billPayment.payment.creditAmount}</div>
                                        {billPayment.payment.reference && (
                                          <div><strong>Ref:</strong> {billPayment.payment.reference}</div>
                                        )}
                                        <div className="text-muted">
                                          {new Date(billPayment.created_at).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : selectedBills.length > 1 ? (
                <p className="text-center text-muted">Select a single bill to see payment details.</p>
              ) : (
                <p className="text-center text-muted">Select a bill to see payment details</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Close Bill</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to close bill with total amount <strong>${(Number(selectedBill?.total) || 0).toFixed(2)}</strong> ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleConfirmCloseBill}>
            Close Bill
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Close Bill Success Modal */}
      <Modal show={showCloseBillSuccessModal} onHide={() => setShowCloseBillSuccessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle-fill text-success me-2"></i>
            Bill Closed Successfully
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {closedBillInfo && (
            <div>
              <div className="alert alert-success">
                <i className="bi bi-check-circle me-2"></i>
                <strong>Bill {closedBillInfo.id} has been closed successfully.</strong>
              </div>
              <div className="mt-3">
                <p className="mb-1"><strong>Bill ID:</strong> {closedBillInfo.id}</p>
                <p className="mb-0"><strong>Total Amount:</strong> ${(Number(closedBillInfo.total) || 0).toFixed(2)}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowCloseBillSuccessModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showBulkCloseModal} onHide={() => setShowBulkCloseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Close Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkCloseResults && (
            <ul>
              {bulkCloseResults.map((result) => (
                <li key={result.billId}>
                  Bill {result.billId}: {result.status}
                  {result.error && <span style={{ color: "red" }}> ({result.error})</span>}
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkCloseModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showBulkSubmitModal} onHide={() => setShowBulkSubmitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle-fill text-success me-2"></i>
            Bills Submitted Successfully
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkSubmitResults && (() => {
            const successful = bulkSubmitResults.filter((r: any) => r.status === "submitted");
            const failed = bulkSubmitResults.filter((r: any) => r.status === "failed");

            if (successful.length > 0) {
              return (
                <div>
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>{successful.length} bill(s) submitted successfully:</strong>
                  </div>
                  <ul className="list-group">
                    {successful.map((result: any) => {
                      // Use bill data from enhanced results, fallback to bills array
                      const billTotalValue = result.billTotal || bills.find((b: Bill) => b.id === result.billId)?.total || 0;
                      const billTotal = Number(billTotalValue) || 0;
                      const billDateValue = result.billDate || bills.find((b: Bill) => b.id === result.billId)?.created_at;
                      const billDate = billDateValue
                        ? new Date(billDateValue).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })
                        : "N/A";

                      return (
                        <li key={result.billId} className="list-group-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-check-circle-fill text-success me-2"></i>
                              <div>
                                <strong>Bill {result.billId}</strong>
                                <div className="text-muted small">
                                  <span className="me-3">Value: ${(Number(billTotal) || 0).toFixed(2)}</span>
                                  <span>Date: {billDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {failed.length > 0 && (
                    <div className="mt-3">
                      <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <strong>{failed.length} bill(s) failed to submit:</strong>
                      </div>
                      <ul className="list-group">
                        {failed.map((result: any) => (
                          <li key={result.billId} className="list-group-item">
                            <i className="bi bi-x-circle-fill text-danger me-2"></i>
                            Bill {result.billId}: {result.error || "Unknown error"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div className="alert alert-danger">
                  <i className="bi bi-x-circle me-2"></i>
                  <strong>No bills were submitted successfully.</strong>
                  <ul className="mt-2 mb-0">
                    {failed.map((result: any) => (
                      <li key={result.billId}>
                        Bill {result.billId}: {result.error || "Unknown error"}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowBulkSubmitModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reopen Bill Modal */}
      <Modal show={showReopenModal} onHide={handleCloseReopenModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-arrow-clockwise me-2 text-warning"></i>
            Reopen Bill #{selectedBill?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Warning:</strong> This bill cannot be closed because it's not fully paid.
            Reopening will allow the sales person to modify the bill or add additional payments.
          </div>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Reason for Reopening *</Form.Label>
              <Form.Select
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                required
              >
                <option value="">Select a reason...</option>
                {reopenReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </Form.Select>
              {reopenReason && (
                <Form.Text className="text-muted">
                  {reopenReasons.find(r => r.value === reopenReason)?.description}
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={reopenDescription}
                onChange={(e) => setReopenDescription(e.target.value)}
                placeholder="Provide additional details about why this bill needs to be reopened..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Internal Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={reopenNotes}
                onChange={(e) => setReopenNotes(e.target.value)}
                placeholder="Internal notes for tracking purposes..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCloseReopenModal}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleConfirmReopen}
            disabled={!reopenReason}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Reopen Bill
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Submit Bill Modal for Supervisors */}
      <SubmitBillModal
        show={showSubmitModal}
        onHide={() => setShowSubmitModal(false)}
        selectedBill={selectedBill}
        onBillSubmitted={(updatedBill: Bill) => {
          setSelectedBill(updatedBill);
          setBills((prevBills) =>
            prevBills.map((bill) =>
              bill.id === updatedBill.id ? updatedBill : bill
            )
          );
          setShowSubmitModal(false);
          fetchBills(); // Refresh bills list
        }}
      />
    </div>
  );
};

export default CashierBillsPage;
