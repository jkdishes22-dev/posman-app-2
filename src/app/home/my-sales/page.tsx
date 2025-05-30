"use client";

import React, { useState, useEffect } from "react";
import SecureRoute from "../../components/SecureRoute";
import HomePageLayout from "../../shared/HomePageLayout";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Button, Form } from "react-bootstrap";
import SubmitBillModal from "./submit-bill";
import TimeZoneAwareDatePicker from "src/app/shared/TimezoneAwareDatePicker";
import { Bill } from "src/app/types/types";
import Pagination from "src/app/components/Pagination";

const MySales = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billIdFilter, setBillIdFilter] = useState("");
  const [error, setError] = useState<string>("");
  const [itemError, setItemError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

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
    const token = localStorage.getItem("token");
    let url = "/api/bills?";
    const params = [];
    if (date && !isNaN(new Date(date).getTime())) {
      const formattedDate = formatISO(date, { representation: "date" });
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
    if (params.length > 0) {
      url += params.join("&");
    }
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch bills");
        return;
      }
      setBills(data.bills || []);
      setFilteredBills(data.bills || []);
      setTotal(data.total || 0);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to fetch items for the selected category");
    }
  };

  const fetchBillsByBillId = async (billId: number) => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`/api/bills?billId=${billId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError("No bill found with that ID");
        setFilteredBills([]);
        return;
      }

      const data = await response.json();
      if (!data.bills || data.bills.length === 0) {
        setError("No bill found with that ID");
        setFilteredBills([]);
        return;
      }
      setBills(data.bills);
      setFilteredBills(data.bills);
      setError("");
    } catch (error: any) {
      setError("Error fetching bills by Bill ID: " + error.message);
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
    <HomePageLayout>
      <SecureRoute roleRequired="user">
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
                        <TimeZoneAwareDatePicker
                          onDateChange={handleDateChange}
                          format="yyyy-MM-dd"
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                      {selectedBill.status === "pending" ? (
                        <Button
                          className="m-2"
                          variant="success"
                          onClick={openSubmitModal}
                        >
                          Submit Bill (KES: {selectedBill.total})
                        </Button>
                      ) : (
                        <span className="text-success">
                          Bill is {selectedBill.status}{" "}
                          <strong> Total: {selectedBill.total} </strong>
                        </span>
                      )}
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
        </div>
      </SecureRoute>
    </HomePageLayout>
  );
};

export default MySales;
