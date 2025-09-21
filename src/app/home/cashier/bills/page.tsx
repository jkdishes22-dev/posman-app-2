"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Bill, BillPayment, User } from "src/app/types/types";
import { Modal, Button, Form } from "react-bootstrap";
import Pagination from "../../../components/Pagination";
import jwt from "jsonwebtoken";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import BillActions from "../../../components/BillActions";

const CashierBillsPage = () => {
  const apiCall = useApiCall();

  // Component mounted
  useEffect(() => {
    // Component initialization
  }, []);

  const [filters, setFilters] = useState({
    billingDate: null,
    selectedWaitress: "",
    status: "submitted",
  });
  const [waitresses, setWaitresses] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [closeBillError, setCloseBillError] = useState("");
  const [showModal, setShowCloseBillModal] = useState(false);
  const [searchBillId, setSearchBillId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
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

  // Get user role from token
  let userRole = "";
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.roles && decoded.roles.length > 0) {
        userRole = decoded.roles[0];
      }
    }
  }

  useEffect(() => {
    fetchBills();
  }, [filters, page]);

  useEffect(() => {
    fetchSalesPersons();
    fetchReopenReasons();
  }, []);

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
        setBills(result.data.bills || []);
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

  const fetchSalesPersons = async () => {
    const url = "/api/users?role=user";
    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        setWaitresses(Array.isArray(result.data.users) ? result.data.users : []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch users");
        setErrorDetails(result.errorDetails);
        setWaitresses([]);
      }
    } catch (error: any) {
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
  };
  const handleDateChange = (date: Date | null) => handleFilterChange("billingDate", date);
  const handleBillIdSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const billId = event.target.value;
    if (/^\d*$/.test(billId)) {
      setSearchBillId(billId);
      if (billId === "") {
        fetchBills();
      } else {
        const filtered = bills.filter((bill) => bill.id.toString().includes(billId));
        if (filtered.length > 0) {
          setBills(filtered);
        } else {
          fetchBillById(Number(billId));
        }
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
    const paidAmount = selectedBill.bill_payments.reduce(
      (sum, billPayment: BillPayment) => sum + billPayment.payment.creditAmount,
      0,
    );
    const amountDifference = paidAmount - billAmount;

    // Only prevent closing if there's an underpayment (not fully paid)
    if (amountDifference < 0) {
      setCloseBillError(`Cannot close bill. Outstanding amount: $${Math.abs(amountDifference).toFixed(2)}`);
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
        await fetchBills();
        setSelectedBill(null);
        setError(null);
        setErrorDetails(null);
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
    // For demo, assume all selected bills use cash payment and full amount
    const billPayments = bills
      .filter((bill) => selectedBills.includes(bill.id) && bill.status === "pending")
      .map((bill) => ({
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
        setBulkSubmitResults(result.data.results);
        setShowBulkSubmitModal(true);
        fetchBills();
        setSelectedBills([]);
        setError(null);
        setErrorDetails(null);
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
    <div className="container-fluid">
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
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">

            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
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
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="billId" className="form-label fw-semibold">
                      Bill ID
                    </label>
                    <div>
                      <input
                        type="text"
                        className="form-control"
                        id="billId"
                        placeholder="Enter Bill ID"
                        value={searchBillId}
                        onChange={handleBillIdSearch}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
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
                <div className="col-md-3 d-flex align-items-end">
                  <div className="btn-group" role="group" aria-label="Filter actions">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleFilterChange("status", "submitted")}
                    >
                      Submitted
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleFilterChange("status", "closed")}
                    >
                      Closed
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleFilterChange("status", "voided")}
                    >
                      Voided
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleFilterChange("status", "reopened")}
                    >
                      Reopened
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
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

      {/* Main Content Area - Three Column Layout (Wireframe Design) */}
      <div className="row g-4">
        {/* Bills Display - Left Column (Larger) */}
        <div className="col-6">
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
                      return bill.total !== totalPaid;
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
                        return bill && bill.status === "pending";
                      }).length === 0}
                    >
                      <i className="bi bi-send me-1"></i>
                      Bulk Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                {filters.status === "submitted" && (
                  <div className="col-6 mb-2">
                    <button
                      className="btn btn-success btn-sm w-100"
                      onClick={handleBulkProcess}
                      disabled={selectedBills.length === 0}
                    >
                      Bulk Close
                    </button>
                  </div>
                )}
                {bills.some((bill) => selectedBills.includes(bill.id) && bill.status === "pending") && (
                  <div className="col-6 mb-2">
                    <button
                      className="btn btn-primary btn-sm w-100"
                      onClick={handleBulkSubmit}
                      disabled={selectedBills.filter((id) => {
                        const bill = bills.find((b) => b.id === id);
                        return bill && bill.status === "pending";
                      }).length === 0}
                    >
                      Bulk Submit
                    </button>
                  </div>
                )}
              </div>
              <div className="border p-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {bills.length > 0 ? (
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
                                const isFullyPaid = billTotal === totalPaid;
                                const amountDifference = totalPaid - billTotal;

                                return !isFullyPaid ? (
                                  <span
                                    className={`badge ms-2 ${amountDifference > 0 ? 'bg-info' : 'bg-danger'}`}
                                    title={`${amountDifference > 0 ? 'Overpayment' : 'Outstanding'}: $${Math.abs(amountDifference).toFixed(2)}`}
                                  >
                                    <i className={`bi me-1 ${amountDifference > 0 ? 'bi-info-circle' : 'bi-exclamation-triangle'}`}></i>
                                    ${Math.abs(amountDifference).toFixed(2)}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td>
                            {bill.user.firstName} {bill.user.lastName}
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
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  View
                                </button>
                              )
                            ) : userRole === "user" || userRole === "waitress" ? (
                              bill.status === "pending" ? (
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  Submit
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  View
                                </button>
                              )
                            ) : (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setSelectedBill(bill)}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
        <div className="col-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-receipt me-2 text-primary"></i>
                Bill Details
              </h5>
            </div>
            <div className="card-body">
              {closeBillError && <div className="alert alert-danger alert-sm">{closeBillError}</div>}
              {selectedBills.length === 1 && selectedBill ? (
                <div>
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

                  {/* Bill Items Count */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-list-ul me-2 text-muted"></i>
                      <strong>Items:</strong>
                    </div>
                    <div className="ms-4">
                      <span className="badge bg-info">
                        {selectedBill.bill_items?.length || 0} items
                      </span>
                    </div>
                  </div>

                  {/* Voided Items Count */}
                  {selectedBill.bill_items && selectedBill.bill_items.some(item => item.status === 'voided') && (
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-x-circle me-2 text-muted"></i>
                        <strong>Voided Items:</strong>
                      </div>
                      <div className="ms-4">
                        <span className="badge bg-danger">
                          {selectedBill.bill_items.filter(item => item.status === 'voided').length} voided
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    {selectedBill.status === "submitted" ? (
                      (() => {
                        const totalPaid = selectedBill.bill_payments.reduce(
                          (sum, billPayment) => sum + billPayment.payment.creditAmount,
                          0,
                        );
                        const billTotal = selectedBill.total;
                        const isFullyPaid = billTotal === totalPaid;
                        const amountDifference = totalPaid - billTotal;

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
                              Close Bill (Refund ${amountDifference.toFixed(2)})
                            </button>
                          );
                        } else {
                          // Underpayment - bill cannot be closed
                          return (
                            <div className="alert alert-warning alert-sm">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              <strong>Payment Required:</strong> ${Math.abs(amountDifference).toFixed(2)} outstanding
                            </div>
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
                    ) : (
                      <div className="alert alert-success alert-sm">
                        <i className="bi bi-check-circle me-1"></i>
                        <strong>Bill is closed</strong>
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
        <div className="col-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-credit-card me-2 text-primary"></i>
                Payment Details
              </h5>
            </div>
            <div className="card-body">
              {selectedBills.length === 1 && selectedBill ? (
                <div>
                  {(() => {
                    const totalPaid = selectedBill.bill_payments?.reduce(
                      (sum, billPayment) => sum + billPayment.payment.creditAmount,
                      0,
                    ) || 0;
                    const billTotal = selectedBill.total;
                    const amountDifference = totalPaid - billTotal;
                    const isFullyPaid = billTotal === totalPaid;

                    // Calculate payment breakdown by type
                    const mpesaPayments = selectedBill.bill_payments?.filter(
                      billPayment => billPayment.payment.paymentType === 'MPESA'
                    ) || [];
                    const cashPayments = selectedBill.bill_payments?.filter(
                      billPayment => billPayment.payment.paymentType === 'CASH'
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
                            <span className="fw-bold">${billTotal.toFixed(2)}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span><strong>Total Paid:</strong></span>
                            <span className="fw-bold">${totalPaid.toFixed(2)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between align-items-center">
                            <span className={isFullyPaid ? 'text-success fw-bold' : amountDifference > 0 ? 'text-info fw-bold' : 'text-danger fw-bold'}>
                              {isFullyPaid ? 'Balance:' : amountDifference > 0 ? 'Overpayment:' : 'Outstanding:'}
                            </span>
                            <span className={isFullyPaid ? 'text-success fw-bold' : amountDifference > 0 ? 'text-info fw-bold' : 'text-danger fw-bold'}>
                              ${Math.abs(amountDifference).toFixed(2)}
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
                                <span className="fw-bold text-success">${mpesaTotal.toFixed(2)}</span>
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
                                <span className="fw-bold text-primary">${cashTotal.toFixed(2)}</span>
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
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                            >
                              <h6 className="fw-bold text-secondary mb-0">
                                Payment History
                                <span className="badge bg-light text-dark ms-2">
                                  {selectedBill.bill_payments?.length || 0}
                                </span>
                              </h6>
                              <i className={`bi ${showPaymentHistory ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}></i>
                            </div>
                            <div
                              className={`collapse ${showPaymentHistory ? 'show' : ''}`}
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
                                          <i className={`bi ${billPayment.payment.paymentType === 'MPESA' ? 'bi-phone text-success' : 'bi-cash text-primary'} me-1`}></i>
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
          Are you sure you want to close bill with total amount <strong>{selectedBill?.total}</strong> ?
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
          <Modal.Title>Bulk Submit Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkSubmitResults && (
            <ul>
              {bulkSubmitResults.map((result) => (
                <li key={result.billId}>
                  Bill {result.billId}: {result.status}
                  {result.error && <span style={{ color: "red" }}> ({result.error})</span>}
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkSubmitModal(false)}>
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
    </div>
  );
};

export default CashierBillsPage;
