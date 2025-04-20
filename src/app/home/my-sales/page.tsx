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

const MySales = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billIdFilter, setBillIdFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedBill(null);
  };

  const handleBillIdChange = (e) => {
    const filter = e.target.value;
    setBillIdFilter(filter);

    if (filter === "") {
      setFilteredBills(bills);
    } else {
      const filtered = bills.filter((bill: Bill) =>
        bill.id.toString().includes(filter),
      );
      setFilteredBills(filtered);

      if (filtered.length === 0) {
        fetchBillsByBillId(filter);
      }
    }
  };

  const fetchBills = async (date?: Date, status?: string) => {
    const token = localStorage.getItem("token");
    let url = "/api/bills?";
    let formattedDate;

    if (date && !status) {
      formattedDate = formatISO(date, { representation: "date" });
      url += `date=${formattedDate}`;
    } else if (status && !date) {
      if (selectedDate) {
        formattedDate = formatISO(selectedDate, { representation: "date" });
        url += `date=${formattedDate}&status=${status}`;
      } else {
        url += `status=${status}`;
      }
    } else if (date && status) {
      formattedDate = formatISO(date, { representation: "date" });
      url += `date=${formattedDate}&status=${status}`;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bills");
      }

      const data = await response.json();
      setBills(data);
      setFilteredBills(data);
    } catch (error: any) {
      console.error("Error fetching bills:", error);
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
        throw new Error("Failed to fetch bills by Bill ID");
      }

      const data = await response.json();
      setBills(data);
      setFilteredBills(data);
    } catch (error: any) {
      console.error("Error fetching bills by Bill ID:", error);
    }
  };

  const handleBillClick = (bill: number) => {
    setSelectedBill(bill);
  };

  const openSubmitModal = () => {
    if (selectedBill && selectedBill.bill_items.length === 0) {
      setErrorMessage("Cannot submit bill with no items.");
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

  useEffect(() => {
    if (selectedDate) {
      fetchBills(selectedDate);
    }
  }, [selectedDate]);

  return (
    <HomePageLayout>
      <SecureRoute roleRequired="user">
        <div className="container">
          <div className="row">
            <div className="col-5">
              <div className="d-flex align-items-center mb-3">
                <TimeZoneAwareDatePicker
                  onDateChange={handleDateChange}
                  format="yyyy-MM-dd"
                />
                <Form.Control
                  type="text"
                  className="form-control"
                  placeholder="Search by Bill ID"
                  value={billIdFilter}
                  onChange={handleBillIdChange}
                />
              </div>
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table className="table stripped">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Bill Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.length > 0 ? (
                      filteredBills.map((bill) => (
                        <tr
                          key={bill.id}
                          onClick={() => handleBillClick(bill)}
                          className={
                            selectedBill?.id === bill.id ? "table-active" : ""
                          }
                        >
                          <td>{bill.id}</td>
                          <td>{bill.status}</td>
                          <td>KES {bill.total}</td>
                          <td>{new Date(bill.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No bills available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-7">
              <div
                className="btn-group mb-2"
                role="group"
                aria-label="Filter actions"
              >
                <button
                  className="btn btn-outline-primary"
                  onClick={() => fetchBills(undefined, "submitted")}
                >
                  Submitted
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => fetchBills(undefined, "closed")}
                >
                  Closed
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => fetchBills(undefined, "voided")}
                >
                  Voided
                </button>
              </div>
              {selectedBill ? (
                <div>
                  <div className="card">
                    {errorMessage && (
                      <p className="text-danger">{errorMessage}</p>
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
                              <td colSpan="6">No items for this bill</td>
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
        </div>

        <SubmitBillModal
          show={isModalOpen}
          onHide={closeModal}
          selectedBill={selectedBill}
          onBillSubmitted={handleBillSubmitted}
        />
      </SecureRoute>
    </HomePageLayout>
  );
};

export default MySales;
