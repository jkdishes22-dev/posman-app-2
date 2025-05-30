"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Bill, BillPayment, User } from "src/app/types/types";
import { Modal, Button } from "react-bootstrap";

const CashierBillsPage = () => {
  // Debug: log mount (should only see once per mount)
  useEffect(() => {
    console.log("[CashierBillsPage] mounted");
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

  // Fetch bills when filters change
  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Fetch sales persons on initial render
  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const fetchBills = async () => {
    const token = localStorage.getItem("token");
    const { status, billingDate, selectedWaitress } = filters;
    let url = `/api/bills?status=${status}`;
    if (billingDate) {
      const formattedDate = formatISO(billingDate, { representation: "date" });
      url += `&date=${formattedDate}`;
    }
    if (selectedWaitress) {
      url += `&billingUserId=${selectedWaitress}`;
    }
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch bills");
      const data = await response.json();
      setBills(data);
    } catch (error: any) {
      console.error("Error fetching bills:", error);
    }
  };

  const fetchBillById = async (billId: number) => {
    const token = localStorage.getItem("token");
    const url = `/api/bills/${billId}`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch bill by ID");
      const data = await response.json();
      setBills([data]);
    } catch (error: any) {
      console.error("Error fetching bill by ID:", error);
    }
  };

  const fetchSalesPersons = async () => {
    const token = localStorage.getItem("token");
    const url = "/api/users?role=user";
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      setWaitresses(data);
    } catch (error: any) {
      console.error("Error fetching user:", error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const handleDateChange = (date: Date) => handleFilterChange("billingDate", date);
  const handleBillIdSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const billId = event.target.value;
    if (/^\d*$/.test(billId)) {
      setSearchBillId(billId);
      if (billId === "") {
        fetchBills();
      } else {
        const existingBill = bills.find((bill) => bill.id === parseInt(billId));
        if (existingBill) {
          setBills([existingBill]);
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
    setSelectedBills((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedBills(event.target.checked ? bills.map((bill) => bill.id) : []);
  };
  const handleBulkProcess = async () => {
    const token = localStorage.getItem("token");
    try {
      const url = "/api/bills/process";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billIds: selectedBills }),
      });
      if (!response.ok) throw new Error("Failed to process bills");
      fetchBills();
      setSelectedBills([]);
    } catch (error: any) {
      console.error("Error processing bills:", error);
    }
  };
  const handleProcessClick = (bill: Bill) => {
    setCloseBillError("");
    setSelectedBill(bill);
  };
  const handleConfirmCloseBill = async () => {
    if (!selectedBill) return;
    const billAmount = selectedBill.total;
    const paidAmount = selectedBill.bill_payments.reduce(
      (sum, billPayment: BillPayment) => sum + billPayment.payment.creditAmount,
      0,
    );
    if (billAmount !== paidAmount) {
      setCloseBillError("Cannot close bill. Please confirm payments");
      return;
    }
    const token = localStorage.getItem("token");
    const url = `/api/bills/${selectedBill.id}/close`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        setCloseBillError("Failed to close bill Error, " + data.message);
        throw new Error("Failed to close bill");
      }
      await fetchBills();
      setSelectedBill(null);
    } catch (error: any) {
      console.error("Error closing bill:", error);
    } finally {
      setShowCloseBillModal(false);
    }
  };
  const showCloseBillModal = () => setShowCloseBillModal(true);
  const handleCloseModal = () => setShowCloseBillModal(false);

  return (
    <div className="container mt-3">
      {/* Filtering Section */}
      <div className="row mb-1 pb-2 border-bottom-1">
        <div className="col-md-3">
          <div className="form-group">
            <label htmlFor="billingDate" className="form-label">
              Billing Date
            </label>
            <DatePicker
              className="form-control"
              id="billingDate"
              selected={filters.billingDate}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select billing date"
              maxDate={new Date()}
              minDate={null}
            />
          </div>
        </div>
        <div className="col-md-3">
          <div className="form-group">
            <label htmlFor="billId" className="form-label">
              Bill ID
            </label>
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
        <div className="col-md-3">
          <div className="form-group">
            <label htmlFor="waitress" className="form-label">
              Select Waitress
            </label>
            <select
              id="waitress"
              className="form-control"
              value={filters.selectedWaitress}
              onChange={handleWaitressChange}
            >
              <option value="">Select waitress</option>
              {waitresses.map((waitress) => (
                <option key={waitress.id} value={waitress.id}>
                  {waitress.firstName} {waitress.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <div className="btn-group" role="group" aria-label="Filter actions">
            <button
              className="btn btn-outline-primary"
              onClick={() => handleFilterChange("status", "submitted")}
            >
              Submitted
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => handleFilterChange("status", "closed")}
            >
              Closed
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => handleFilterChange("status", "voided")}
            >
              Voided
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => handleFilterChange("status", "all")}
            >
              All
            </button>
          </div>
        </div>
      </div>
      {/* Display Section */}
      <div className="row border border-0 border-top-1">
        <div className="col-7">
          <div className="row">
            <div className="col-2 mb-2">
              <button
                className="btn btn-success btn-sm"
                onClick={handleBulkProcess}
                disabled={selectedBills.length === 0}
              >
                Bulk Close
              </button>
            </div>
          </div>
          <div className="border p-3">
            {bills.length > 0 ? (
              <table className="table table-striped">
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
                    <th>Bill ID</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Created By</th>
                    <th>Created At</th>
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
                          checked={
                            selectedBills.includes(bill.id) ||
                            bill.id === selectedBill?.id
                          }
                          onChange={() => handleCheckboxChange(bill.id)}
                        />
                      </td>
                      <td>{bill.id}</td>
                      <td>{bill.status}</td>
                      <td>{bill.total}</td>
                      <td>
                        {bill.user.firstName} {bill.user.lastName}
                      </td>
                      <td>{new Date(bill.created_at).toLocaleString()}</td>
                      <td>
                        {bill.status === "submitted" ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleProcessClick(bill)}
                          >
                            Process
                          </button>
                        ) : (
                          <span
                            className="btn btn-secondary"
                            onClick={() => handleProcessClick(bill)}
                          >
                            View
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No bills found.</p>
            )}
          </div>
        </div>
        <div className="col-5 mt-4">
          {closeBillError && <p style={{ color: "red" }}>{closeBillError}</p>}
          {selectedBill ? (
            <div className="row">
              <div className="col-6">
                <div>
                  <h5>
                    <u>Bill Details</u>
                  </h5>
                  <p>
                    <strong>Bill ID:</strong> {selectedBill.id}
                  </p>
                  <p>
                    <strong>Total Bill:</strong> {selectedBill.total}
                  </p>
                  <p>
                    <strong>Created By:</strong> {selectedBill.user.firstName} {selectedBill.user.lastName}
                  </p>
                  <p>
                    <strong>Created At:</strong> {new Date(selectedBill.created_at).toLocaleString()}
                  </p>
                  <div className="col-5">
                    {selectedBill.status === "submitted" ? (
                      selectedBill.total ===
                        selectedBill.bill_payments.reduce(
                          (sum, billPayment) => sum + billPayment.payment.creditAmount,
                          0,
                        ) ? (
                        <button
                          className="btn btn-success mb-2"
                          onClick={showCloseBillModal}
                        >
                          Close Bill
                        </button>
                      ) : (
                        <button className="btn btn-warning mb-2" disabled>
                          Bill is pending - Not closable
                        </button>
                      )
                    ) : (
                      <span className="btn btn-warning">Bill is closed</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-6">
                <strong>
                  <u>
                    Payments : (
                    {selectedBill.bill_payments.reduce(
                      (sum, billPayment) => sum + billPayment.payment.creditAmount,
                      0,
                    )}
                    )
                  </u>
                </strong>
                {selectedBill.bill_payments.length > 0 ? (
                  <ul>
                    {selectedBill.bill_payments.map((billPayment: BillPayment) => (
                      <li key={billPayment.id}>
                        <p>
                          <strong>Payment Type :</strong> {billPayment.payment.paymentType}
                        </p>
                        <p>
                          <strong>Amount Paid :</strong> {billPayment.payment.creditAmount}
                        </p>
                        <p>
                          <strong>Paid At :</strong> {new Date(billPayment.created_at).toLocaleString()}
                        </p>
                        <p>
                          <strong>Paid By :</strong> {selectedBill.user.firstName} {selectedBill.user.lastName}
                        </p>
                        <p>
                          <strong>Reference:</strong> {billPayment.payment.reference}
                        </p>
                        <hr />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Bill payment missing</p>
                )}
              </div>
            </div>
          ) : (
            <p>Select a bill to see the details</p>
          )}
        </div>
      </div>
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Close Bill</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to close bill <strong>{selectedBill?.id}</strong> ?
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
    </div>
  );
};

export default CashierBillsPage;
