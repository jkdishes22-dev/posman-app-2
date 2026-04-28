"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import SecureRoute from "../../components/SecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Button, Form } from "react-bootstrap";
import SubmitBillModal from "./submit-bill";
import TimeZoneAwareDatePicker from "src/app/shared/TimezoneAwareDatePicker";
import DatePicker from "react-datepicker";
import { Bill, BillItem, VoidRequestPayload, VoidRequestResponse } from "src/app/types/types";
import Pagination from "src/app/components/Pagination";
import { CaptainOrderPrint, CustomerCopyPrint } from "../../shared/ReceiptPrint";
import { printReceiptWithTimestamp, downloadReceiptAsFile } from "../../shared/printUtils";
import ReactDOM from "react-dom/client";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import QuantityChangeModal from "../../components/QuantityChangeModal";
import { useAuth } from "../../contexts/AuthContext";

// Receipt component for printing
const Receipt = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
  if (!bill) return null;
  return (
    <div ref={ref} style={{ width: 300, padding: 16, fontFamily: "monospace", background: "#fff", color: "#000" }}>
      <h4 style={{ textAlign: "center", marginBottom: 8 }}>POS RECEIPT</h4>
      <div>Bill ID: <b>{bill.id}</b></div>
      <div>Date: {new Date(bill.created_at).toLocaleString()}</div>
      <div>User: {bill.user?.firstName} {bill.user?.lastName}</div>
      <hr />
      <table style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subt</th>
          </tr>
        </thead>
        <tbody>
          {bill.bill_items?.map((item) => (
            <tr key={item.id}>
              <td>{item.item?.name}</td>
              <td style={{ textAlign: "center" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>{item.item?.price}</td>
              <td style={{ textAlign: "right" }}>{item.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div style={{ textAlign: "right", fontWeight: "bold" }}>TOTAL: KES {bill.total}</div>
      <div style={{ textAlign: "center", marginTop: 12 }}>Thank you!</div>
    </div>
  );
});
Receipt.displayName = "Receipt";

const MySales = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();
  const { user } = useAuth();
  const [billIdFilter, setBillIdFilter] = useState("");
  const [error, setError] = useState<string>("");
  const [itemError, setItemError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const receiptRef = useRef<HTMLDivElement>(null);
  const isLoadingBillsRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingBillDetails, setIsLoadingBillDetails] = useState(false);

  // Void request state
  const [showVoidModal, setShowVoidModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<BillItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voidErrorDetails, setVoidErrorDetails] = useState<ApiErrorResponse | null>(null);

  // Quantity change request state
  const [showQuantityChangeModal, setShowQuantityChangeModal] = useState<boolean>(false);
  const [selectedQuantityChangeItem, setSelectedQuantityChangeItem] = useState<BillItem | null>(null);

  // Reopen reason state
  const [reopenReasons, setReopenReasons] = useState<Array<{ id: string; name: string; description?: string }>>([]);

  // Fetch reopen reasons on component mount
  useEffect(() => {
    const fetchReopenReasons = async () => {
      try {
        const result = await apiCall("/api/bills/reopen-reasons");
        if (result.status === 200) {
          // Transform the response to match our expected format
          const reasons = result.data.reasons || [];
          setReopenReasons(reasons.map((reason: any) => ({
            id: reason.reason_key || reason.id,
            name: reason.name,
            description: reason.description
          })));
        }
      } catch (error) {
        console.error("Failed to fetch reopen reasons:", error);
      }
    };
    fetchReopenReasons();
  }, [apiCall]);

  // Helper function to get reopen reason name from reason_key
  const getReopenReasonName = (reasonKey: string | undefined): string => {
    if (!reasonKey) return "Unknown reason";
    const reason = reopenReasons.find(r => r.id === reasonKey);
    return reason ? reason.name : reasonKey;
  };

  // Helper function to get reopen reason description
  const getReopenReasonDescription = (reasonKey: string | undefined): string | null => {
    if (!reasonKey) return null;
    const reason = reopenReasons.find(r => r.id === reasonKey);
    return reason?.description || null;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedBill(null);
  };

  // Memoized fetchBills to prevent unnecessary re-renders and optimize performance
  const fetchBills = useCallback(async (date?: Date | null, status?: string, billId?: string, currentPage?: number) => {
    // Prevent multiple simultaneous calls using ref (doesn't trigger re-renders)
    if (isLoadingBillsRef.current) return;

    isLoadingBillsRef.current = true;
    setError("");

    let url = "/api/bills?";
    const params = [];

    // Only add date filter if date is provided and not today's default
    if (date && !isNaN(new Date(date).getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      params.push(`date=${formattedDate}`);
    }

    if (status && status !== "all") {
      params.push(`status=${status}`);
    }

    if (billId && billId.trim()) {
      params.push(`billId=${billId.trim()}`);
    }

    // Use currentPage parameter or fallback to state
    const pageToUse = currentPage !== undefined ? currentPage : page;
    params.push(`page=${pageToUse}`);
    params.push(`pageSize=${pageSize}`);

    // Note: billingUserId will be handled by backend based on user context

    if (params.length > 0) {
      url += params.join("&");
    }

    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        const allBills = result.data?.bills || [];
        // Filter bills to only show those belonging to the current user
        const userBills = user && user.id
          ? allBills.filter((bill: Bill) => bill.user?.id === user.id)
          : allBills;

        setBills(userBills);
        setFilteredBills(userBills);
        // Update total to reflect filtered count
        setTotal(userBills.length);
        setError("");
      } else {
        setError(result.error || "Failed to fetch bills");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      isLoadingBillsRef.current = false;
    }
  }, [apiCall, page, pageSize, user]);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setSelectedBill(null);
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Debounced bill ID change handler for better performance
  const handleBillIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const filter = e.target.value;
    setBillIdFilter(filter);
    setError("");
    setPage(1); // Reset to first page when filter changes

    // Clear existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the API call by 300ms
    fetchTimeoutRef.current = setTimeout(() => {
      if (filter === "") {
        fetchBills(selectedDate, statusFilter);
      } else {
        fetchBills(selectedDate, statusFilter, filter);
      }
    }, 300);
  }, [selectedDate, statusFilter, fetchBills]);

  const fetchBillsByBillId = async (billId: number) => {
    try {
      const result = await apiCall(`/api/bills?billId=${billId}`);
      if (result.status === 200) {
        const allBills = result.data?.bills || [];
        // Filter bills to only show those belonging to the current user
        const userBills = user && user.id
          ? allBills.filter((bill: Bill) => bill.user?.id === user.id)
          : allBills;

        if (userBills.length === 0) {
          setError("No bill found with that ID that belongs to you");
          setFilteredBills([]);
          setBills([]);
          return;
        }
        setBills(userBills);
        setFilteredBills(userBills);
        setError("");
      } else {
        setError(result.error || "No bill found with that ID");
        setErrorDetails(result.errorDetails);
        setFilteredBills([]);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setFilteredBills([]);
    }
  };

  const handleBillClick = async (bill: Bill) => {
    // Safety check: ensure bill belongs to current user (shouldn't happen if filtering works correctly)
    if (user && user.id && bill.user?.id && bill.user.id !== user.id) {
      // Silently ignore - this bill shouldn't be in the list
      return;
    }

    // Always fetch full bill details to ensure we have complete data
    setIsLoadingBillDetails(true);
    setError("");
    setErrorDetails(null);

    try {
      const result = await apiCall(`/api/bills?billId=${bill.id}`);
      if (result.status === 200) {
        const fetchedBills = result.data?.bills || [];
        if (fetchedBills.length > 0) {
          const fullBill = fetchedBills.find((b: Bill) => b.id === bill.id) || fetchedBills[0];
          // Safety check: ensure fetched bill belongs to current user
          if (user && user.id && fullBill.user?.id && fullBill.user.id !== user.id) {
            // Silently ignore - this bill shouldn't be accessible
            setSelectedBill(null);
            return;
          }
          setSelectedBill(fullBill);
          setError(""); // Clear any previous errors
        } else {
          setSelectedBill(null);
          setError("Could not load full bill details. The bill may have been deleted.");
          setErrorDetails(null);
        }
      } else {
        setSelectedBill(null);
        setError(result.error || "Failed to load bill details.");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setSelectedBill(null);
      setError("Network error occurred while loading bill details");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsLoadingBillDetails(false);
    }
  };

  const openSubmitModal = () => {
    if (selectedBill && selectedBill.bill_items.length === 0) {
      setError("Cannot submit bill with no items.");
      return;
    }
    if (selectedBill) {
      const hasPendingVoids = selectedBill.bill_items?.some(item => item.status === "void_pending");
      const hasPendingQuantityChanges = selectedBill.bill_items?.some(item => item.status === "quantity_change_request");
      if (hasPendingVoids || hasPendingQuantityChanges) {
        setError("Cannot submit bill with pending void or quantity change requests. Please wait for supervisor approval.");
        return;
      }
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleBillSubmitted = async (updatedBill: Bill) => {
    // Update bills list immediately with the updated bill
    setBills((prevBills) =>
      prevBills.map((bill) =>
        bill.id === updatedBill.id ? updatedBill : bill,
      ),
    );
    setFilteredBills((prevFilteredBills) =>
      prevFilteredBills.map((bill) =>
        bill.id === updatedBill.id ? updatedBill : bill,
      ),
    );

    // Refetch full bill details to ensure we have complete data with all relations
    try {
      const result = await apiCall(`/api/bills?billId=${updatedBill.id}`);
      if (result.status === 200) {
        const fetchedBills = result.data?.bills || [];
        if (fetchedBills.length > 0) {
          const fullBill = fetchedBills.find((b: Bill) => b.id === updatedBill.id) || fetchedBills[0];
          // Update selected bill with complete data
          setSelectedBill(fullBill);
          // Also update the bills list with complete data
          setBills((prevBills) =>
            prevBills.map((bill) =>
              bill.id === fullBill.id ? fullBill : bill,
            ),
          );
          setFilteredBills((prevFilteredBills) =>
            prevFilteredBills.map((bill) =>
              bill.id === fullBill.id ? fullBill : bill,
            ),
          );
        } else {
          // Fallback to updated bill if fetch fails
          setSelectedBill(updatedBill);
        }
      } else {
        // Fallback to updated bill if fetch fails
        setSelectedBill(updatedBill);
      }
    } catch (error) {
      // Fallback to updated bill if fetch fails
      setSelectedBill(updatedBill);
    }
  };

  // Checkbox handlers
  const handleCheckboxChange = (billId: number) => {
    setSelectedBills((prev) =>
      prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedBills(filteredBills.filter((bill) => bill.status === "pending").map((bill) => bill.id));
    } else {
      setSelectedBills([]);
    }
  };

  // Bulk submit handler (for now, open modal for first selected bill)
  const handleBulkSubmit = () => {
    const firstBill = filteredBills.find((bill) => selectedBills.includes(bill.id));
    if (firstBill) {
      setSelectedBill(firstBill);
      setIsModalOpen(true);
    }
  };

  const handlePrint = async () => {
    if (!selectedBill) return;

    // Print Captain Order first
    await printReceipt(CaptainOrderPrint, selectedBill, "Captain Order");

    // Wait a moment, then print Customer Copy
    setTimeout(async () => {
      await printReceipt(CustomerCopyPrint, selectedBill, "Customer Copy");
    }, 1000);
  };

  const printReceipt = async (Component: any, bill: any, title: string) => {
    // Determine the type based on the component
    let type: "customer" | "captain" | "receipt" = "receipt";
    if (Component === CustomerCopyPrint) {
      type = "customer";
    } else if (Component === CaptainOrderPrint) {
      type = "captain";
    }

    return printReceiptWithTimestamp(Component, bill, title, type);
  };

  const handleDownload = async () => {
    if (!selectedBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, selectedBill, "customer");
  };

  // Void request functions
  const handleVoidRequest = (item: BillItem): void => {
    setSelectedItem(item);
    setVoidReason("");
    setVoidError(null);
    setVoidErrorDetails(null);
    setShowVoidModal(true);
  };

  const handleVoidSubmit = async (): Promise<void> => {
    if (!voidReason.trim()) {
      setVoidError("Please provide a reason for voiding this item");
      return;
    }

    if (!selectedItem || !selectedBill) {
      setVoidError("Invalid item or bill selection");
      return;
    }

    try {
      const payload: VoidRequestPayload = { reason: voidReason.trim() };
      const result = await apiCall(`/api/bills/${selectedBill.id}/items/${selectedItem.id}/void-request`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (result.status === 200) {
        const response: VoidRequestResponse = result.data;
        setShowVoidModal(false);
        setVoidReason("");
        setSelectedItem(null);

        // Refresh bill data with current filters and update the selected bill with fresh data
        await fetchBills(selectedDate, statusFilter, billIdFilter);

        // Update the selected bill with fresh data to reflect the void request
        if (selectedBill) {
          const result = await apiCall(`/api/bills?billId=${selectedBill.id}`);
          if (result.status === 200 && result.data?.bills?.length > 0) {
            setSelectedBill(result.data.bills[0]);
          }
        }
      } else {
        setVoidError(result.error || "Failed to submit void request");
        setVoidErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setVoidError("Network error occurred while submitting void request");
      setVoidErrorDetails({ message: "Network error", networkError: true, status: 0 });
    }
  };

  const closeVoidModal = (): void => {
    setShowVoidModal(false);
    setVoidReason("");
    setSelectedItem(null);
    setVoidError(null);
    setVoidErrorDetails(null);
  };

  // Quantity change request handlers
  const handleQuantityChangeRequest = (item: BillItem): void => {
    setSelectedQuantityChangeItem(item);
    setShowQuantityChangeModal(true);
  };

  const handleQuantityChangeSuccess = async (): Promise<void> => {
    // Optimize: Only fetch the updated bill, not all bills
    if (selectedBill) {
      const result = await apiCall(`/api/bills?billId=${selectedBill.id}`);
      if (result.status === 200 && result.data?.bills?.length > 0) {
        const updatedBill = result.data.bills[0];
        setSelectedBill(updatedBill);

        // Update the bill in the list without refetching all bills
        setBills((prevBills) =>
          prevBills.map((bill) => bill.id === updatedBill.id ? updatedBill : bill)
        );
        setFilteredBills((prevBills) =>
          prevBills.map((bill) => bill.id === updatedBill.id ? updatedBill : bill)
        );
      }
    }
  };


  // Optimized useEffect: Only fetch when filters actually change, with proper dependencies
  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only fetch bills when user is available
    if (!user || !user.id) {
      return;
    }
    // Fetch bills when date, status, or page changes (billId is handled by debounced handler)
    // Note: fetchBills is stable (memoized with useCallback), so we can safely include it
    // But we exclude billIdFilter from dependencies since it's handled by debounced handler
    fetchBills(selectedDate, statusFilter, billIdFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, statusFilter, page, user?.id]); // Only depend on actual filter values, not fetchBills

  // Clear selectedBill when filters change
  useEffect(() => {
    setSelectedBill(null);
  }, [statusFilter, selectedDate, billIdFilter]);

  return (
    <RoleAwareLayout>
      <SecureRoute roleRequired="sales">
        <div className="container-fluid px-3 py-2">
          {/* Filter row */}
          <div className="row mb-2">
            <div className="col-12">
              <div className="card shadow-sm p-2 bg-light border-primary filter-card">
                <h6 className="card-title text-primary mb-2 fw-bold">Filter My Sales</h6>
                <div className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label htmlFor="filterDate" className="form-label">Billing Date</label>
                      <div className="d-flex">
                        <DatePicker
                          selected={selectedDate}
                          onChange={handleDateChange}
                          dateFormat="yyyy-MM-dd"
                          className="form-control"
                          placeholderText="Select billing date"
                          maxDate={new Date()}
                          isClearable
                        />
                        {selectedDate && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm ms-2"
                            onClick={() => handleDateChange(null)}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label htmlFor="billId" className="form-label">Bill ID</label>
                      <div>
                        <Form.Control
                          type="text"
                          className="form-control"
                          id="billId"
                          placeholder="Search by Bill ID"
                          value={billIdFilter}
                          onChange={handleBillIdChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <div className="btn-group btn-group-sm w-100 flex-wrap" role="group" aria-label="Filter actions">
                      <button
                        className={`btn btn-outline-primary${statusFilter === "pending" ? " active" : ""}`}
                        onClick={() => handleStatusFilterChange("pending")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Pending
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "submitted" ? " active" : ""}`}
                        onClick={() => handleStatusFilterChange("submitted")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Submitted
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "closed" ? " active" : ""}`}
                        onClick={() => handleStatusFilterChange("closed")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Closed
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "voided" ? " active" : ""}`}
                        onClick={() => handleStatusFilterChange("voided")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Voided
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "reopened" ? " active" : ""}`}
                        onClick={() => handleStatusFilterChange("reopened")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Reopened
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bills and details row */}
          <div className="row g-2">
            <div className="col-lg-5 col-md-12 mb-2">
              <div className="card shadow-sm" style={{ height: "calc(100vh - 250px)", display: "flex", flexDirection: "column" }}>
                <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 flex-shrink-0">
                  <h6 className="mb-0 fw-bold">Bills List</h6>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={
                      selectedBills.length === 0 ||
                      !filteredBills.some((bill) =>
                        selectedBills.includes(bill.id) && bill.status === "pending"
                      )
                    }
                    onClick={handleBulkSubmit}
                  >
                    Submit All
                  </Button>
                </div>
                <div className="card-body p-2 d-flex flex-column" style={{ overflow: "hidden", flex: "1 1 auto" }}>
                  {error && (
                    <div className="alert alert-danger alert-dismissible fade show mb-2" role="alert" style={{ fontSize: "0.875rem" }}>
                      {error}
                      <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={() => setError("")}
                      ></button>
                    </div>
                  )}
                  <ErrorDisplay
                    error={errorDetails?.message || null}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                      setErrorDetails(null);
                    }}
                  />
                  <div className="table-responsive flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }}>
                    <table className="table table-hover table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: "35px" }}>
                            <input
                              type="checkbox"
                              checked={
                                selectedBills.length > 0 &&
                                filteredBills.filter((bill) => bill.status === "pending").length > 0 &&
                                selectedBills.length === filteredBills.filter((bill) => bill.status === "pending").length
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ width: "70px" }}>ID</th>
                          <th style={{ width: "90px" }}>Status <small className="text-muted">(Bill)</small></th>
                          <th style={{ width: "100px" }}>Amount</th>
                          <th className="d-none d-lg-table-cell" style={{ width: "140px" }}>Date</th>
                          <th style={{ width: "80px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBills.length > 0 ? (
                          filteredBills.map((bill) => (
                            <tr
                              key={bill.id}
                              className={
                                selectedBill?.id === bill.id ? "table-active" : ""
                              }
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                // Don't trigger if clicking checkbox or button
                                if (
                                  (e.target as HTMLElement).tagName === "INPUT" ||
                                  (e.target as HTMLElement).tagName === "BUTTON" ||
                                  (e.target as HTMLElement).closest("button")
                                ) {
                                  return;
                                }
                                handleBillClick(bill);
                              }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedBills.includes(bill.id)}
                                  disabled={bill.status !== "pending"}
                                  onChange={() => handleCheckboxChange(bill.id)}
                                />
                              </td>
                              <td><strong>#{bill.id}</strong></td>
                              <td>
                                {(() => {
                                  const hasPendingVoids = bill.bill_items?.some((item: BillItem) => item.status === "void_pending");
                                  const hasPendingQuantityChanges = bill.bill_items?.some((item: BillItem) => item.status === "quantity_change_request");

                                  if (bill.status === "reopened") {
                                    return (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: "0.75rem" }}>
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        reopened
                                      </span>
                                    );
                                  } else if (hasPendingVoids || hasPendingQuantityChanges) {
                                    const pendingVoidCount = bill.bill_items?.filter((item: BillItem) => item.status === "void_pending").length || 0;
                                    const pendingQuantityChangeCount = bill.bill_items?.filter((item: BillItem) => item.status === "quantity_change_request").length || 0;
                                    const totalPending = pendingVoidCount + pendingQuantityChangeCount;

                                    return (
                                      <span
                                        className="badge bg-warning text-dark"
                                        style={{ fontSize: "0.75rem" }}
                                      >
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        {totalPending} pending
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className={`badge ${bill.status === "pending" ? "bg-warning" :
                                        bill.status === "submitted" ? "bg-info" :
                                          bill.status === "closed" ? "bg-success" :
                                            bill.status === "voided" ? "bg-secondary" :
                                              "bg-light text-dark"
                                        }`} style={{ fontSize: "0.75rem" }}>
                                        {bill.status}
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                              <td><strong style={{ fontSize: "0.875rem" }}>KES {(Number(bill.total) || 0).toFixed(2)}</strong></td>
                              <td className="d-none d-lg-table-cell" style={{ fontSize: "0.8rem" }}>{new Date(bill.created_at).toLocaleString()}</td>
                              <td>
                                {bill.status === "pending" ? (
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleBillClick(bill)}
                                  >
                                    Submit
                                  </Button>
                                ) : bill.status === "reopened" ? (
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => handleBillClick(bill)}
                                  >
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                    Resubmit
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleBillClick(bill)}
                                  >
                                    View
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6}>No bills available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-auto pt-2 border-top">
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
            <div className="col-lg-7 col-md-12 mb-2">
              {isLoadingBillDetails ? (
                <div className="card" style={{ height: "calc(100vh - 250px)" }}>
                  <div className="card-body d-flex align-items-center justify-content-center">
                    <div className="text-center">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mb-0">Loading bill details...</p>
                    </div>
                  </div>
                </div>
              ) : selectedBill ? (
                <div className="card" style={{ height: "calc(100vh - 250px)", display: "flex", flexDirection: "column" }}>
                  <div className="card-header bg-light flex-shrink-0">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-receipt me-2"></i>
                      Bill #{selectedBill.id} Details
                    </h6>
                  </div>
                  <div className="card-body flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }}>
                    {/* Void Approval Interface for Cashiers */}
                    {selectedBill && selectedBill.bill_items?.some((item: BillItem) => item.status === "void_pending") && (
                      <div className="alert alert-warning mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          <div className="flex-grow-1">
                            <strong>Pending Void Requests</strong>
                            <ul className="mb-0 small mt-2">
                              {selectedBill.bill_items
                                .filter((item: BillItem) => item.status === "void_pending")
                                .map((item: BillItem) => (
                                  <li key={item.id}>
                                    <strong>{item.item.name}</strong>
                                    {item.void_reason && ` - ${item.void_reason}`}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Quantity Change Request Warning */}
                    {selectedBill && selectedBill.bill_items?.some((item: BillItem) => item.status === "quantity_change_request") && (
                      <div className="alert alert-info mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-pencil-square me-2"></i>
                          <div className="flex-grow-1">
                            <strong>Pending Quantity Change Requests</strong>
                            <ul className="mb-0 small mt-2">
                              {selectedBill.bill_items
                                .filter((item: BillItem) => item.status === "quantity_change_request")
                                .map((item: BillItem) => (
                                  <li key={item.id}>
                                    <strong>{item.item.name}</strong>: {item.quantity} → {item.requested_quantity || item.quantity}
                                    {item.quantity_change_reason && ` (${item.quantity_change_reason})`}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
                      {selectedBill.status === "pending" ? (
                        (() => {
                          const hasPendingVoids = selectedBill.bill_items?.some(item => item.status === "void_pending");
                          const hasPendingQuantityChanges = selectedBill.bill_items?.some(item => item.status === "quantity_change_request");
                          const pendingVoidCount = selectedBill.bill_items?.filter(item => item.status === "void_pending").length || 0;
                          const pendingQuantityChangeCount = selectedBill.bill_items?.filter(item => item.status === "quantity_change_request").length || 0;
                          const hasPendingApprovals = hasPendingVoids || hasPendingQuantityChanges;
                          const totalPendingCount = pendingVoidCount + pendingQuantityChangeCount;

                          return (
                            <div className="w-100">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={openSubmitModal}
                                disabled={hasPendingApprovals}
                                className="w-100 w-md-auto"
                              >
                                <i className="bi bi-check-circle me-1"></i>
                                Submit (KES {(Number(selectedBill.total) || 0).toFixed(2)})
                              </Button>
                              {hasPendingVoids && (
                                <div className="text-warning small mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  <strong>Void requests:</strong> {selectedBill.bill_items
                                    .filter(item => item.status === "void_pending")
                                    .map(item => item.item.name)
                                    .join(", ")}
                                </div>
                              )}
                              {hasPendingQuantityChanges && (
                                <div className="text-info small mt-2">
                                  <i className="bi bi-pencil-square me-1"></i>
                                  <strong>Quantity changes:</strong> {selectedBill.bill_items
                                    .filter(item => item.status === "quantity_change_request")
                                    .map(item => `${item.item.name} (${item.quantity} → ${item.requested_quantity || item.quantity})`)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : selectedBill.status === "reopened" ? (
                        <div>
                          {(() => {
                            const billTotal = selectedBill.total;
                            const payments = selectedBill.bill_payments || [];

                            // Calculate payment breakdown
                            let cashTotal = 0;
                            let mpesaTotal = 0;
                            let otherTotal = 0;

                            payments.forEach(billPayment => {
                              const amount = billPayment.payment?.creditAmount || 0;
                              const method = billPayment.payment?.paymentMethod?.toLowerCase() || "unknown";

                              if (method.includes("cash")) {
                                cashTotal += amount;
                              } else if (method.includes("mpesa") || method.includes("mobile")) {
                                mpesaTotal += amount;
                              } else {
                                otherTotal += amount;
                              }
                            });

                            const totalPaid = cashTotal + mpesaTotal + otherTotal;
                            const difference = billTotal - totalPaid;
                            const isOverpaid = difference < 0;
                            const isFullyPaid = difference === 0;

                            return (
                              <div>
                                <div className="alert alert-warning mb-3">
                                  <div className="d-flex align-items-start">
                                    <i className="bi bi-arrow-clockwise me-2 mt-1"></i>
                                    <div className="flex-grow-1">
                                      <strong>Bill is Reopened</strong>
                                      {selectedBill.reopen_reason && (
                                        <div className="mt-2">
                                          <div className="fw-semibold">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Reason: {getReopenReasonName(selectedBill.reopen_reason)}
                                          </div>
                                          {getReopenReasonDescription(selectedBill.reopen_reason) && (
                                            <div className="small text-muted mt-1">
                                              {getReopenReasonDescription(selectedBill.reopen_reason)}
                                            </div>
                                          )}
                                          {selectedBill.reopened_at && (
                                            <div className="small text-muted mt-1">
                                              Reopened on: {new Date(selectedBill.reopened_at).toLocaleString()}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <span className="text-muted">Total: </span>
                                  <strong>KES {(Number(billTotal) || 0).toFixed(2)}</strong>
                                </div>

                                {/* Payment Details */}
                                <div className="mt-2">
                                  {payments.length > 0 ? (
                                    <div className="card">
                                      <div className="card-header py-2">
                                        <h6 className="mb-0">
                                          <i className="bi bi-credit-card me-2"></i>
                                          Payment Details
                                        </h6>
                                      </div>
                                      <div className="card-body p-2">
                                        {payments.map((billPayment, index) => (
                                          <div key={index} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                            <div>
                                              <span className="fw-medium">
                                                {billPayment.payment?.paymentType || "Unknown Method"}
                                              </span>
                                              {billPayment.payment?.reference && (
                                                <div className="small text-muted">
                                                  Ref: {billPayment.payment.reference}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-end">
                                              <span className="fw-bold text-success">
                                                KES {(billPayment.payment?.creditAmount || 0).toFixed(2)}
                                              </span>
                                              {billPayment.payment?.createdAt && (
                                                <div className="small text-muted">
                                                  {new Date(billPayment.payment.createdAt).toLocaleString()}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        <div className="d-flex justify-content-between align-items-center py-2 mt-2 bg-light rounded">
                                          <span className="fw-bold">Total Paid:</span>
                                          <span className="fw-bold text-primary">KES {(Number(totalPaid) || 0).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="alert alert-warning py-2 mb-0">
                                      <i className="bi bi-exclamation-triangle me-2"></i>
                                      <strong>No payments recorded</strong> - Collect full amount
                                    </div>
                                  )}
                                </div>

                                {/* Payment Status */}
                                <div className="mt-2">
                                  {isFullyPaid ? (
                                    <div className="alert alert-success py-2 mb-0">
                                      <i className="bi bi-check-circle me-2"></i>
                                      <strong>Payment Complete</strong> - Ready to resubmit
                                      <div className="small mt-1">
                                        <em>Resubmit condition: Bill status must be "reopened" (no payment requirement)</em>
                                      </div>
                                    </div>
                                  ) : isOverpaid ? (
                                    <div className="alert alert-warning py-2 mb-0">
                                      <i className="bi bi-exclamation-triangle me-2"></i>
                                      <strong>Overpaid by KES {Math.abs(Number(difference) || 0).toFixed(2)}</strong> - Review payments
                                    </div>
                                  ) : (
                                    <div className="alert alert-danger py-2 mb-0">
                                      <i className="bi bi-exclamation-circle me-2"></i>
                                      <strong>Outstanding: KES {(Number(difference) || 0).toFixed(2)}</strong> - Collect remaining amount
                                    </div>
                                  )}
                                </div>

                                {/* Resubmit Button for Reopened Bills */}
                                <div className="mt-3">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={openSubmitModal}
                                    className="w-100 w-md-auto"
                                  >
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                    Resubmit Bill
                                  </Button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-success">
                          Bill is {selectedBill.status} <strong> Total: {selectedBill.total} </strong>
                        </span>
                      )}
                      {(selectedBill.status === "submitted" || selectedBill.status === "closed") && (
                        <div className="d-flex gap-2 flex-wrap">
                          <Button variant="secondary" size="sm" onClick={handlePrint}>
                            <i className="bi bi-printer me-1"></i>
                            Print
                          </Button>
                          <Button variant="outline-primary" size="sm" onClick={handleDownload}>
                            <i className="bi bi-download me-1"></i>
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "none" }}>
                      <Receipt ref={receiptRef} bill={selectedBill} />
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th className="d-none d-xl-table-cell" style={{ width: "120px" }}>Date</th>
                            <th style={{ width: "150px" }}>Item</th>
                            <th style={{ width: "90px" }}>Price</th>
                            <th style={{ width: "70px" }}>Qty</th>
                            <th style={{ width: "90px" }}>Subtotal</th>
                            <th style={{ width: "80px" }}>Status <small className="text-muted">(Item)</small></th>
                            <th style={{ width: "140px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.bill_items.length > 0 ? (
                            selectedBill.bill_items.map((item) => (
                              <tr key={item.id}>
                                <td className="d-none d-xl-table-cell" style={{ fontSize: "0.8rem" }}>
                                  {new Date(item.created_at).toLocaleDateString()}
                                </td>
                                <td><strong style={{ fontSize: "0.875rem" }}>{item.item.name}</strong></td>
                                <td style={{ fontSize: "0.875rem" }}>KES {(Number(item.item.price) || 0).toFixed(2)}</td>
                                <td><span className="badge bg-primary" style={{ fontSize: "0.75rem" }}>{item.quantity}</span></td>
                                <td><strong style={{ fontSize: "0.875rem" }}>KES {(Number(item.subtotal) || 0).toFixed(2)}</strong></td>
                                <td>
                                  <span className={`badge ${item.status === "pending" ? "bg-success" :
                                    item.status === "void_pending" ? "bg-warning" :
                                      item.status === "quantity_change_request" ? "bg-info" :
                                        item.status === "submitted" ? "bg-secondary" :
                                          "bg-danger"
                                    }`} style={{ fontSize: "0.7rem" }} title={`Item status: ${item.status} (Bill status: ${selectedBill.status})`}>
                                    {item.status === "pending" ? "pending" :
                                      item.status === "void_pending" ? "void pending" :
                                        item.status === "quantity_change_request" ? "qty pending" :
                                          item.status === "submitted" ? "submitted" :
                                            item.status}
                                  </span>
                                </td>
                                <td>
                                  {(selectedBill.status === "pending" || selectedBill.status === "reopened") &&
                                    item.status === "pending" && (
                                      <div className="d-flex gap-1 flex-wrap">
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => handleVoidRequest(item)}
                                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                                        >
                                          <i className="bi bi-exclamation-triangle-fill"></i>
                                          <span className="d-none d-md-inline ms-1">Void</span>
                                        </Button>
                                        <Button
                                          variant="outline-warning"
                                          size="sm"
                                          onClick={() => handleQuantityChangeRequest(item)}
                                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                                        >
                                          <i className="bi bi-pencil-square"></i>
                                          <span className="d-none d-md-inline ms-1">Qty</span>
                                        </Button>
                                      </div>
                                    )}
                                  {item.status === "void_pending" && (
                                    <div className="small" style={{ fontSize: "0.75rem" }}>
                                      <div className="text-warning">
                                        <i className="bi bi-clock me-1"></i>
                                        Void pending
                                      </div>
                                      {item.void_reason && (
                                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                          {item.void_reason}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {item.status === "quantity_change_request" && (
                                    <div className="small" style={{ fontSize: "0.75rem" }}>
                                      <div className="text-info">
                                        <i className="bi bi-pencil-square me-1"></i>
                                        {item.quantity} → {item.requested_quantity || item.quantity}
                                      </div>
                                      {item.quantity_change_reason && (
                                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                          {item.quantity_change_reason}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center text-muted py-3">No items for this bill</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Clear Separation Line */}
                    <hr className="my-4" />

                    {/* Payment Details Section - Only show for submitted/closed bills */}
                    {(selectedBill.status === "submitted" || selectedBill.status === "closed") && selectedBill.bill_payments && selectedBill.bill_payments.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-bold text-secondary mb-3">
                          <i className="bi bi-credit-card me-2"></i>
                          Payment Details
                        </h6>
                        <div className="card bg-light">
                          <div className="card-body p-3">
                            {(() => {
                              const totalPaid = selectedBill.bill_payments.reduce(
                                (sum, billPayment) => sum + billPayment.payment.creditAmount,
                                0
                              );
                              const billTotal = selectedBill.total;
                              const amountDifference = totalPaid - billTotal;
                              const isFullyPaid = billTotal === totalPaid;

                              return (
                                <div>
                                  {/* Payment Summary - Compact */}
                                  <div className="row mb-3">
                                    <div className="col-md-4">
                                      <div className="text-center p-2 bg-white rounded">
                                        <div className="small text-muted">Bill Total</div>
                                        <div className="fw-bold">KES {(Number(billTotal) || 0).toFixed(2)}</div>
                                      </div>
                                    </div>
                                    <div className="col-md-4">
                                      <div className="text-center p-2 bg-white rounded">
                                        <div className="small text-muted">Total Paid</div>
                                        <div className={`fw-bold ${isFullyPaid ? "text-success" : "text-warning"}`}>
                                          KES {(Number(totalPaid) || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-4">
                                      <div className="text-center p-2 bg-white rounded">
                                        <div className="small text-muted">Balance</div>
                                        <div className={`fw-bold ${amountDifference === 0 ? "text-success" : amountDifference > 0 ? "text-info" : "text-danger"}`}>
                                          {amountDifference === 0 ? "Fully Paid" : `KES ${amountDifference > 0 ? "+" : ""}${(Number(amountDifference) || 0).toFixed(2)}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment History Table */}
                                  <div className="mt-3">
                                    <h6 className="small text-muted mb-2">Payment History</h6>
                                    <div className="table-responsive">
                                      <table className="table table-sm">
                                        <thead className="table-light">
                                          <tr>
                                            <th>Payment Method</th>
                                            <th>Amount</th>
                                            <th>Reference</th>
                                            <th>Date & Time</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {selectedBill.bill_payments.map((billPayment) => (
                                            <tr key={billPayment.id}>
                                              <td>
                                                <div className="d-flex align-items-center">
                                                  <i className={`bi ${billPayment.payment.paymentType === "MPESA" ? "bi-phone text-success" : "bi-cash text-primary"} me-2`}></i>
                                                  <span className="fw-semibold">{billPayment.payment.paymentType}</span>
                                                </div>
                                              </td>
                                              <td className="fw-semibold">KES {(Number(billPayment.payment.creditAmount) || 0).toFixed(2)}</td>
                                              <td>
                                                {billPayment.payment.reference ? (
                                                  <code className="small">{billPayment.payment.reference}</code>
                                                ) : (
                                                  <span className="text-muted">-</span>
                                                )}
                                              </td>
                                              <td className="text-muted small">
                                                {new Date(billPayment.created_at).toLocaleString()}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center justify-content-center">
                    <p className="text-muted mb-0">Select a bill to see the items</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <SubmitBillModal
            show={isModalOpen}
            onHide={closeModal}
            selectedBill={selectedBill}
            onBillSubmitted={handleBillSubmitted}
          />

          {/* Void Request Modal */}
          {showVoidModal && (
            <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      Request Void for Item: {selectedItem?.item?.name}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeVoidModal}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p>You are requesting to void <strong>{selectedItem?.item?.name}</strong> (Quantity: {selectedItem?.quantity}) from Bill #{selectedBill?.id}.</p>
                    <Form.Group className="mb-3">
                      <Form.Label>Reason for Voiding</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        placeholder="e.g., Customer changed mind, wrong item entered, etc."
                        isInvalid={!!voidError}
                      />
                      <Form.Control.Feedback type="invalid">
                        {voidError}
                      </Form.Control.Feedback>
                    </Form.Group>
                    <ErrorDisplay
                      error={voidError}
                      errorDetails={voidErrorDetails}
                      onDismiss={() => { setVoidError(null); setVoidErrorDetails(null); }}
                    />
                  </div>
                  <div className="modal-footer d-flex justify-content-between">
                    <Button
                      variant="outline-secondary"
                      onClick={closeVoidModal}
                      className="d-flex align-items-center gap-1"
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleVoidSubmit}
                      className="d-flex align-items-center gap-1"
                    >
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      Submit Void Request
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Change Request Modal */}
          <QuantityChangeModal
            show={showQuantityChangeModal}
            onHide={() => setShowQuantityChangeModal(false)}
            item={selectedQuantityChangeItem}
            onSuccess={handleQuantityChangeSuccess}
          />
        </div>
      </SecureRoute>
    </RoleAwareLayout>
  );
};

export default MySales;
