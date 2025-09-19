"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useApiCall } from "../../utils/apiUtils";

interface ReopenedBill {
  id: number;
  total: number;
  status: string;
  reopenReason: string;
  reopenedBy: {
    firstName: string;
    lastName: string;
  };
  reopenedAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  station: {
    name: string;
  };
  billPayments: Array<{
    payment: {
      creditAmount: number;
      paymentType: string;
    };
  }>;
}

export default function SupervisorReopenedBillsPage() {
  const [reopenedBills, setReopenedBills] = useState<ReopenedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("reopened");
  const apiCall = useApiCall();

  useEffect(() => {
    fetchReopenedBills();
  }, [statusFilter]);

  const fetchReopenedBills = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall(`/api/bills?status=${statusFilter}&page=1&pageSize=50`);
      if (result.status === 200) {
        setReopenedBills(result.data.bills || []);
      } else {
        setError(result.error || "Failed to fetch reopened bills");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-warning",
      submitted: "bg-info",
      closed: "bg-success",
      reopened: "bg-danger",
      voided: "bg-secondary"
    };

    return (
      <span className={`badge ${statusClasses[status] || "bg-secondary"}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const calculatePaymentTotal = (bill: ReopenedBill) => {
    return bill.billPayments?.reduce((sum, billPayment) => 
      sum + billPayment.payment.creditAmount, 0
    ) || 0;
  };

  const getPaymentStatus = (bill: ReopenedBill) => {
    const totalPaid = calculatePaymentTotal(bill);
    const billTotal = bill.total;
    
    if (totalPaid === 0) return { status: "No Payment", class: "text-danger" };
    if (totalPaid < billTotal) return { status: "Partial Payment", class: "text-warning" };
    if (totalPaid > billTotal) return { status: "Overpaid", class: "text-info" };
    return { status: "Fully Paid", class: "text-success" };
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Reopened Bills Management</h1>
            <p className="text-muted">Monitor and manage reopened bills as supervisor fallback</p>
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title mb-0">Reopened Bills</h5>
                  <div className="mt-2">
                    <select
                      className="form-select d-inline-block w-auto"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="reopened">Reopened Bills</option>
                      <option value="submitted">Submitted Bills</option>
                      <option value="all">All Bills</option>
                    </select>
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  onClick={fetchReopenedBills}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </Button>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Bill ID</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Payment Status</th>
                          <th>Reopen Reason</th>
                          <th>Reopened By</th>
                          <th>Reopened At</th>
                          <th>Original User</th>
                          <th>Station</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reopenedBills.map((bill) => {
                          const paymentStatus = getPaymentStatus(bill);
                          return (
                            <tr key={bill.id}>
                              <td>
                                <a href={`/home/cashier/bills?billId=${bill.id}`} className="text-decoration-none">
                                  #{bill.id}
                                </a>
                              </td>
                              <td>${bill.total.toFixed(2)}</td>
                              <td>{getStatusBadge(bill.status)}</td>
                              <td>
                                <span className={paymentStatus.class}>
                                  {paymentStatus.status}
                                </span>
                                <br />
                                <small className="text-muted">
                                  ${calculatePaymentTotal(bill).toFixed(2)} / ${bill.total.toFixed(2)}
                                </small>
                              </td>
                              <td>{bill.reopenReason}</td>
                              <td>{bill.reopenedBy.firstName} {bill.reopenedBy.lastName}</td>
                              <td>{new Date(bill.reopenedAt).toLocaleString()}</td>
                              <td>{bill.user.firstName} {bill.user.lastName}</td>
                              <td>{bill.station.name}</td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => window.open(`/home/cashier/bills?billId=${bill.id}`, '_blank')}
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {reopenedBills.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-inbox fs-1"></i>
                        <p className="mt-2">No reopened bills found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}
