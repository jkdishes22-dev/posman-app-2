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
import ErrorDisplay from "../../components/ErrorDisplay";
import ReopenedBillsNotification from "../../components/ReopenedBillsNotification";
import EnhancedResubmitModal from "../../components/EnhancedResubmitModal";

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
  const apiCall = useApiCall();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billIdFilter, setBillIdFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [itemError, setItemError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [resubmitNotes, setResubmitNotes] = useState("");
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showEnhancedResubmitModal, setShowEnhancedResubmitModal] = useState(false);
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
      fetchBills(selectedDate, statusFilter);
    } else {
      const filtered = bills.filter((bill: Bill) => bill.id.toString().includes(filter));
      setFilteredBills(filtered);
      if (filtered.length === 0) {
        await fetchBillsByBillId(filter);
      }
    }
  };

  const fetchBills = async (date?: Date, status?: string) => {
    let url = "/api/bills?";
    const params = [];

    // For reopened bills, skip date and bill ID filters by default
    if (status === "reopened") {
      params.push(`status=${status}`);
      params.push(`page=${page}`);
      params.push(`pageSize=${pageSize}`);
    } else {
      // For other statuses, use today's date as default if no date is selected
      if (date && !isNaN(new Date(date).getTime())) {
        // Format date as YYYY-MM-DD without timezone conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        params.push(`date=${formattedDate}`);
      } else if (status !== "reopened") {
        // Default to today's date for non-reopened bills
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        params.push(`date=${formattedDate}`);
      }

      if (status && status !== "all") {
        params.push(`status=${status}`);
      }
      if (billIdFilter) {
        params.push(`billId=${billIdFilter}`);
      }
      params.push(`page=${page}`);
      params.push(`pageSize=${pageSize}`);
    }

    if (params.length > 0) {
      url += params.join("&");
    }
    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        setBills(result.data.bills || []);
        setFilteredBills(result.data.bills || []);
        setTotal(result.data.total || 0);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch bills");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchBillsByBillId = async (billId: number) => {
    try {
      const result = await apiCall(`/api/bills?billId=${billId}`);

      if (result.status === 200) {
        if (!result.data.bills || result.data.bills.length === 0) {
          setError("No bill found with that ID");
          setErrorDetails(null);
          setFilteredBills([]);
          return;
        }
        setBills(result.data.bills);
        setFilteredBills(result.data.bills);
        setError(null);
        setErrorDetails(null);
      } else {
        setError("No bill found with that ID");
        setErrorDetails(result.errorDetails);
        setFilteredBills([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleBillClick = (bill: number) => {
    setSelectedBill(bill);
  };

  const handleNotificationBillClick = async (billId: number) => {
    // Find the bill in the current bills list
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      setSelectedBill(bill);
      setStatusFilter("reopened");
      // Fetch reopened bills to ensure we have the latest data
      await fetchBills(undefined, "reopened");
    } else {
      // If bill not found in current list, fetch it specifically
      try {
        const result = await apiCall(`/api/bills?billId=${billId}`);
        if (result.status === 200 && result.data.bills && result.data.bills.length > 0) {
          setSelectedBill(result.data.bills[0]);
          setStatusFilter("reopened");
          await fetchBills(undefined, "reopened");
        }
      } catch (error) {
        setError("Failed to load bill details");
        setErrorDetails({ message: "Failed to load bill details", networkError: true, status: 0 });
      }
    }
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

  const handleResubmitBill = async (billId: number) => {
    try {
      const result = await apiCall(`/api/bills/${billId}/resubmit`, {
        method: "POST",
        body: JSON.stringify({
          notes: resubmitNotes
        })
      });

      if (result.status === 200) {
        // Update the bill status in the local state
        setBills((prevBills) =>
          prevBills.map((bill) =>
            bill.id === billId
              ? { ...bill, status: "submitted", reopen_reason: null, reopened_by: null, reopened_at: null }
              : bill
          )
        );

        // Refresh the filtered bills
        fetchBills(selectedDate, statusFilter);

        setShowResubmitModal(false);
        setResubmitNotes("");
        setSelectedBill(null);
        alert("Bill resubmitted successfully");
      } else {
        setError(result.error || "Failed to resubmit bill");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
    if (selectedDate) {
      fetchBills(selectedDate, statusFilter);
    }
  }, [selectedDate, statusFilter]);

  // Clear selectedBill when filters change
  useEffect(() => {
    setSelectedBill(null);
  }, [statusFilter, selectedDate, billIdFilter]);

  return (
    <RoleAwareLayout>
      <SecureRoute roleRequired="sales">
        <div className="container">
          {/* Filter row */}
          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm p-3 mb-3 bg-light border-primary filter-card">
                <h5 className="card-title text-primary mb-3">Filter My Sales</h5>
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label htmlFor="filterDate" className="form-label">Billing Date</label>
                      <div>
                        <DatePicker
                          selected={selectedDate}
                          onChange={handleDateChange}
                          dateFormat="yyyy-MM-dd"
                          className="form-control"
                          placeholderText="Select billing date"
                          maxDate={new Date()}
                          isClearable
                        />
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
                    <div className="btn-group w-100 flex-wrap" role="group" aria-label="Filter actions">
                      <button
                        className={`btn btn-outline-primary btn-sm${statusFilter === "pending" ? " active" : ""}`}
                        onClick={() => setStatusFilter("pending")}
                      >
                        Pending
                      </button>
                      <button
                        className={`btn btn-outline-primary btn-sm${statusFilter === "submitted" ? " active" : ""}`}
                        onClick={() => setStatusFilter("submitted")}
                      >
                        Submitted
                      </button>
                      <button
                        className={`btn btn-outline-primary btn-sm${statusFilter === "reopened" ? " active" : ""}`}
                        onClick={() => setStatusFilter("reopened")}
                      >
                        Reopened
                      </button>
                      <button
                        className={`btn btn-outline-primary btn-sm${statusFilter === "closed" ? " active" : ""}`}
                        onClick={() => setStatusFilter("closed")}
                      >
                        Closed
                      </button>
                      <button
                        className={`btn btn-outline-primary btn-sm${statusFilter === "voided" ? " active" : ""}`}
                        onClick={() => setStatusFilter("voided")}
                      >
                        Voided
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reopened Bills Notification */}
          <ReopenedBillsNotification onBillClick={handleNotificationBillClick} />

          {/* Bills and details row */}
          <div className="row">
            <div className="col-5">
              <div className="mb-2">
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
                <ErrorDisplay
                  error={error}
                  errorDetails={errorDetails}
                  onDismiss={() => {
                    setError(null);
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
                          <td>{bill.status}</td>
                          <td>KES {bill.total}</td>
                          <td>{bill.created_at}</td>
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
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setShowEnhancedResubmitModal(true);
                                }}
                              >
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
                    <ErrorDisplay
                      error={error}
                      errorDetails={errorDetails}
                      onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                      }}
                    />
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        {selectedBill.status === "pending" ? (
                          <Button
                            className="m-2"
                            variant="success"
                            onClick={openSubmitModal}
                          >
                            Submit Bill (KES: {selectedBill.total})
                          </Button>
                        ) : selectedBill.status === "reopened" ? (
                          <div className="d-flex flex-column">
                            <div className="alert alert-warning mb-2">
                              <strong>Bill Reopened</strong>
                              {selectedBill.reopen_reason && (
                                <div>Reason: {selectedBill.reopen_reason}</div>
                              )}
                              {selectedBill.reopened_at && (
                                <div>Reopened: {new Date(selectedBill.reopened_at).toLocaleString()}</div>
                              )}
                            </div>
                            <Button
                              className="m-2"
                              variant="warning"
                              onClick={() => setShowEnhancedResubmitModal(true)}
                            >
                              Resubmit Bill (KES: {selectedBill.total})
                            </Button>
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

          {/* Resubmit Modal */}
          {showResubmitModal && selectedBill && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Resubmit Bill #{selectedBill.id}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowResubmitModal(false);
                        setResubmitNotes("");
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Bill Information</h6>
                        <p><strong>Total:</strong> KES {selectedBill.total}</p>
                        <p><strong>Status:</strong> {selectedBill.status}</p>
                        {selectedBill.reopen_reason && (
                          <p><strong>Reopen Reason:</strong> {selectedBill.reopen_reason}</p>
                        )}
                        {selectedBill.reopened_at && (
                          <p><strong>Reopened At:</strong> {new Date(selectedBill.reopened_at).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="col-md-6">
                        <h6>Resubmit Notes</h6>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={resubmitNotes}
                          onChange={(e) => setResubmitNotes(e.target.value)}
                          placeholder="Add notes about the changes made to fix the bill..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowResubmitModal(false);
                        setResubmitNotes("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => handleResubmitBill(selectedBill.id)}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Resubmit Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Resubmit Modal */}
          <EnhancedResubmitModal
            show={showEnhancedResubmitModal}
            onHide={() => setShowEnhancedResubmitModal(false)}
            bill={selectedBill}
            onResubmitted={() => {
              setShowEnhancedResubmitModal(false);
              // Refresh the bills list
              fetchBills(selectedDate, statusFilter);
            }}
          />
        </div>
      </SecureRoute>
    </RoleAwareLayout>
  );
};

export default MySales;
