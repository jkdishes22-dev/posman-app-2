"use client";

import React, { useState, useEffect, useRef } from "react";
import SecureRoute from "../../components/SecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Button, Form } from "react-bootstrap";
import SubmitBillModal from "./submit-bill";
import TimeZoneAwareDatePicker from "src/app/shared/TimezoneAwareDatePicker";
import DatePicker from "react-datepicker";
import { Bill } from "src/app/types/types";
import Pagination from "src/app/components/Pagination";
import { CaptainOrderPrint, CustomerCopyPrint } from "../../shared/ReceiptPrint";
import { printReceiptWithTimestamp, downloadReceiptAsFile } from "../../shared/printUtils";
import ReactDOM from "react-dom/client";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import BillActions from "../../components/BillActions";

// Receipt component for printing
const Receipt = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
  if (!bill) return null;
  return (
    <div ref={ref} style={{ width: 300, padding: 16, fontFamily: 'monospace', background: '#fff', color: '#000' }}>
      <h4 style={{ textAlign: 'center', marginBottom: 8 }}>POS RECEIPT</h4>
      <div>Bill ID: <b>{bill.id}</b></div>
      <div>Date: {new Date(bill.created_at).toLocaleString()}</div>
      <div>User: {bill.user?.firstName} {bill.user?.lastName}</div>
      <hr />
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subt</th>
          </tr>
        </thead>
        <tbody>
          {bill.bill_items?.map((item) => (
            <tr key={item.id}>
              <td>{item.item?.name}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right' }}>{item.item?.price}</td>
              <td style={{ textAlign: 'right' }}>{item.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL: KES {bill.total}</div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>Thank you!</div>
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
  const [billIdFilter, setBillIdFilter] = useState("");
  const [error, setError] = useState<string>("");
  const [itemError, setItemError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedBill(null);
  };

  const handleBillIdChange = async (e) => {
    const filter = e.target.value;
    setBillIdFilter(filter);
    setError("");

    if (filter === "") {
      // When clearing bill ID filter, fetch bills with current date and status
      fetchBills(selectedDate, statusFilter);
    } else {
      // When searching by bill ID, don't use date filter unless explicitly set
      fetchBills(null, statusFilter, filter);
    }
  };

  const fetchBills = async (date?: Date, status?: string, billId?: string) => {
    let url = "/api/bills?";
    const params = [];

    // Only add date filter if date is provided and not today's default
    if (date && !isNaN(new Date(date).getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      params.push(`date=${formattedDate}`);
    }

    if (status && status !== "all") {
      params.push(`status=${status}`);
    }

    if (billId && billId.trim()) {
      params.push(`billId=${billId.trim()}`);
    }

    params.push(`page=${page}`);
    params.push(`pageSize=${pageSize}`);

    if (params.length > 0) {
      url += params.join("&");
    }

    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        setBills(result.data?.bills || []);
        setFilteredBills(result.data?.bills || []);
        setTotal(result.data?.total || 0);
        setError("");
      } else {
        setError(result.error || "Failed to fetch bills");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchBillsByBillId = async (billId: number) => {
    try {
      const result = await apiCall(`/api/bills?billId=${billId}`);
      if (result.status === 200) {
        if (!result.data?.bills || result.data.bills.length === 0) {
          setError("No bill found with that ID");
          setFilteredBills([]);
          return;
        }
        setBills(result.data.bills);
        setFilteredBills(result.data.bills);
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

  const handleBillClick = (bill: number) => {
    setSelectedBill(bill);
  };

  const openSubmitModal = () => {
    if (selectedBill && selectedBill.bill_items.length === 0) {
      setError("Cannot submit bill with no items.");
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleBillSubmitted = (updatedBill: Bill) => {
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
    setSelectedBill(updatedBill);
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
    let type: 'customer' | 'captain' | 'receipt' = 'receipt';
    if (Component === CustomerCopyPrint) {
      type = 'customer';
    } else if (Component === CaptainOrderPrint) {
      type = 'captain';
    }

    return printReceiptWithTimestamp(Component, bill, title, type);
  };

  const handleDownload = async () => {
    if (!selectedBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, selectedBill, 'customer');
  };

  useEffect(() => {
    // Always fetch bills when date, status, billId, or page changes
    fetchBills(selectedDate, statusFilter, billIdFilter);
  }, [selectedDate, statusFilter, billIdFilter, page]);

  // Clear selectedBill when filters change
  useEffect(() => {
    setSelectedBill(null);
  }, [statusFilter, selectedDate, billIdFilter]);

  return (
    <RoleAwareLayout>
      <SecureRoute roleRequired="sales">
        <div className="container-fluid p-0">
          {/* Filter row */}
          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm p-1 mb-1 bg-light border-primary filter-card">
                <h5 className="card-title text-primary mb-1">Filter My Sales</h5>
                <div className="row g-1 align-items-end">
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
                            title="Clear date filter"
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
                    <div className="btn-group w-100" role="group" aria-label="Filter actions">
                      <button
                        className={`btn btn-outline-primary${statusFilter === "pending" ? " active" : ""}`}
                        onClick={() => setStatusFilter("pending")}
                      >
                        Pending
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "submitted" ? " active" : ""}`}
                        onClick={() => setStatusFilter("submitted")}
                      >
                        Submitted
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "closed" ? " active" : ""}`}
                        onClick={() => setStatusFilter("closed")}
                      >
                        Closed
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "voided" ? " active" : ""}`}
                        onClick={() => setStatusFilter("voided")}
                      >
                        Voided
                      </button>
                      <button
                        className={`btn btn-outline-primary${statusFilter === "reopened" ? " active" : ""}`}
                        onClick={() => setStatusFilter("reopened")}
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
          <div className="row">
            <div className="col-5">
              <div className="mb-1">
                <Button
                  variant="success"
                  size="sm"
                  disabled={true}
                  onClick={handleBulkSubmit}
                >
                  Submit All
                </Button>
              </div>
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => setError("")}
                      style={{ float: "right" }}
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
                <table className="table stripped">
                  <thead>
                    <tr>
                      <th>
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
                      <th>Bill ID</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Bill Date</th>
                      <th>Action</th>
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
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedBills.includes(bill.id)}
                              disabled={bill.status !== "pending"}
                              onChange={() => handleCheckboxChange(bill.id)}
                            />
                          </td>
                          <td>{bill.id}</td>
                          <td>
                            {bill.status === "reopened" ? (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {bill.status}
                              </span>
                            ) : (
                              <span className={`badge ${bill.status === "pending" ? "bg-warning" :
                                bill.status === "submitted" ? "bg-info" :
                                  bill.status === "closed" ? "bg-success" :
                                    bill.status === "voided" ? "bg-secondary" :
                                      "bg-light text-dark"
                                }`}>
                                {bill.status}
                              </span>
                            )}
                          </td>
                          <td>KES {bill.total}</td>
                          <td>{new Date(bill.created_at).toLocaleString()}</td>
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
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </div>
            <div className="col-7">
              {selectedBill ? (
                <div>
                  <div className="card">
                    {error && (
                      <p className="text-danger">{error}</p>
                    )}
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        {selectedBill.status === "pending" ? (
                          <Button
                            className="m-2"
                            variant="success"
                            onClick={openSubmitModal}
                          >
                            Submit Bill (KES: {selectedBill.total})
                          </Button>
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
                                const method = billPayment.payment?.paymentMethod?.toLowerCase() || 'unknown';

                                if (method.includes('cash')) {
                                  cashTotal += amount;
                                } else if (method.includes('mpesa') || method.includes('mobile')) {
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
                                  <span className="text-warning">
                                    Bill is reopened <strong> Total: KES {billTotal.toFixed(2)} </strong>
                                  </span>

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
                                                  {billPayment.payment?.paymentType || 'Unknown Method'}
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
                                            <span className="fw-bold text-primary">KES {totalPaid.toFixed(2)}</span>
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
                                      </div>
                                    ) : isOverpaid ? (
                                      <div className="alert alert-warning py-2 mb-0">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        <strong>Overpaid by KES {Math.abs(difference).toFixed(2)}</strong> - Review payments
                                      </div>
                                    ) : (
                                      <div className="alert alert-danger py-2 mb-0">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        <strong>Outstanding: KES {difference.toFixed(2)}</strong> - Collect remaining amount
                                      </div>
                                    )}
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
                          <>
                            <Button variant="secondary" size="sm" onClick={handlePrint} className="me-2">
                              Print Receipt
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={handleDownload}>
                              Download Receipt
                            </Button>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'none' }}>
                        <Receipt ref={receiptRef} bill={selectedBill} />
                      </div>
                      <table className="table stripped">
                        <thead>
                          <tr>
                            <th>Date Added</th>
                            <th>Item Name</th>
                            <th>Unit Price</th>
                            <th>Quantity</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.bill_items.length > 0 ? (
                            selectedBill.bill_items.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  {new Date(item.created_at).toLocaleString()}
                                </td>
                                <td>{item.item.name}</td>
                                <td>KES {item.item.price}</td>
                                <td>{item.quantity}</td>
                                <td>KES {item.subtotal}</td>
                                <td>
                                  {selectedBill.status === "pending" ? (
                                    <Button variant="danger">
                                      Void Request
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6}>No items for this bill</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                                      <div className="fw-bold">KES {billTotal}</div>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="text-center p-2 bg-white rounded">
                                      <div className="small text-muted">Total Paid</div>
                                      <div className={`fw-bold ${isFullyPaid ? "text-success" : "text-warning"}`}>
                                        KES {totalPaid}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="text-center p-2 bg-white rounded">
                                      <div className="small text-muted">Balance</div>
                                      <div className={`fw-bold ${amountDifference === 0 ? "text-success" : amountDifference > 0 ? "text-info" : "text-danger"}`}>
                                        {amountDifference === 0 ? "Fully Paid" : `KES ${amountDifference > 0 ? "+" : ""}${amountDifference}`}
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
                                                <i className={`bi ${billPayment.payment.paymentType === 'MPESA' ? 'bi-phone text-success' : 'bi-cash text-primary'} me-2`}></i>
                                                <span className="fw-semibold">{billPayment.payment.paymentType}</span>
                                              </div>
                                            </td>
                                            <td className="fw-semibold">KES {billPayment.payment.creditAmount}</td>
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

                  {/* Bill Actions - Voiding and Reopening Features */}
                  {selectedBill && (
                    <BillActions
                      bill={selectedBill}
                      userRole="sales"
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
                  )}
                </div>
              ) : (
                <p>Select a bill to see the items</p>
              )}
            </div>
          </div>
          <SubmitBillModal
            show={isModalOpen}
            onHide={closeModal}
            selectedBill={selectedBill}
            onBillSubmitted={handleBillSubmitted}
          />
        </div>
      </SecureRoute>
    </RoleAwareLayout >
  );
};

export default MySales;
