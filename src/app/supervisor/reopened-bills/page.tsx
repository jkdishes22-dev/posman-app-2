"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import { useApiCall } from "../../utils/apiUtils";

interface ReopenedBill {
  id: number;
  total: number;
  status: string;
  reopenReason?: string;
  reopenedBy?: {
    firstName: string;
    lastName: string;
  };
  reopened_by?: number;
  reopenedAt?: string;
  reopened_at?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  station?: {
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
  const apiCall = useApiCall();

  useEffect(() => {
    fetchReopenedBills();
  }, []);

  const fetchReopenedBills = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/bills?status=reopened&page=1&pageSize=50");
      if (result.status === 200) {
        setReopenedBills(result.data.bills || []);
      } else {
        setError(result.error || "Failed to fetch reopened bills");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-arrow-counterclockwise me-2" aria-hidden></i>
            Reopened Bills Management
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Monitor and manage reopened bills as supervisor fallback</p>
        </PageHeaderStrip>

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
                              <td>${(Number(bill.total) || 0).toFixed(2)}</td>
                              <td>{getStatusBadge(bill.status)}</td>
                              <td>
                                <span className={paymentStatus.class}>
                                  {paymentStatus.status}
                                </span>
                                <br />
                                <small className="text-muted">
                                  ${(Number(calculatePaymentTotal(bill)) || 0).toFixed(2)} / ${(Number(bill.total) || 0).toFixed(2)}
                                </small>
                              </td>
                              <td>{bill.reopenReason || "-"}</td>
                              <td>
                                {bill.reopenedBy
                                  ? `${bill.reopenedBy.firstName} ${bill.reopenedBy.lastName}`
                                  : bill.reopened_by
                                    ? `User #${bill.reopened_by}`
                                    : "-"}
                              </td>
                              <td>
                                {bill.reopenedAt || bill.reopened_at
                                  ? new Date(bill.reopenedAt || bill.reopened_at || "").toLocaleString()
                                  : "-"}
                              </td>
                              <td>
                                {bill.user
                                  ? `${bill.user.firstName} ${bill.user.lastName}`
                                  : "-"}
                              </td>
                              <td>{bill.station?.name || "-"}</td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => {
                                    window.location.href = `/home/cashier/bills?billId=${bill.id}`;
                                  }}
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
