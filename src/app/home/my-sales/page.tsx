"use client";
import React, { useState, useEffect } from "react";
import SecureRoute from "../../components/SecureRoute";
import HomePageLayout from "../../shared/HomePageLayout";
import DatePicker from "react-datepicker"; // Import a date picker library
import "react-datepicker/dist/react-datepicker.css"; // Date picker styles
import { formatISO } from "date-fns";
import { Button } from "react-bootstrap";

const MySales = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bills, setBills] = useState([]); // Bills state
  const [selectedBill, setSelectedBill] = useState(null); // Selected bill for displaying items
  const [billItems, setBillItems] = useState([]); // Bill items state

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBillsByDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchBillsByDate = async (date) => {
    const token = localStorage.getItem("token");
    const formattedDate = formatISO(date, { representation: "date" });
    try {
      const response = await fetch(`/api/bills?date=${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch bills");
      }
      const data = await response.json();
      setBills(data); // Populate bills data
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const fetchBillItems = async (billId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/bills/${billId}/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch bill items");
      }
      const data = await response.json();
      setBillItems(data); // Populate selected bill items
    } catch (error) {
      console.error("Error fetching bill items:", error);
    }
  };

  const handleBillClick = (bill) => {
    setSelectedBill(bill);
    fetchBillItems(bill.id);
  };

  return (
    <HomePageLayout>
      <SecureRoute roleRequired="user">
        <div className="container">
          <div className="row">
            {/* Left Column - Bills */}
            <div className="col-4">
              <DatePicker
                className="border border-1 border-primary rounded"
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select billing date"
                maxDate={new Date()}
              />
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table className="table stripped">
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#fff",
                      zIndex: 1,
                    }}
                  >
                    <tr>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Bill Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.length > 0 ? (
                      bills.map((bill) => (
                        <tr key={bill.id} onClick={() => handleBillClick(bill)}>
                          <td>{bill.status}</td>
                          <td>${bill.total}</td>
                          <td>
                            {new Date(bill.created_at)
                              .toISOString()
                              .slice(0, 19)
                              .replace("T", " ")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No bills available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Right Column - Bill Items */}
            <div className="col-8">
              {selectedBill ? (
                <div>
                  <div className="card">
                    <div className="card-body">
                      <Button className="m-2" variant="success">
                        Complete Bill (KES: {selectedBill.total})
                      </Button>
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
                          {billItems.length > 0 ? (
                            billItems.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  {new Date(item.created_at)
                                    .toISOString()
                                    .slice(0, 19)
                                    .replace("T", " ")}
                                </td>
                                <td>{item.item_name}</td>
                                <td>${item.item_price}</td>
                                <td>{item.quantity}</td>
                                <td>${item.subtotal}</td>
                                <td>
                                  <Button variant="danger">
                                    Void
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5">No items for this bill</td>
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
      </SecureRoute>
    </HomePageLayout>
  );
};

export default MySales;
