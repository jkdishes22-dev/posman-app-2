"use client";

import { todayEAT } from "../../../shared/eatDate";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import React, { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import type { ApiErrorResponse } from "../../../utils/errorUtils";

type PaymentTypeFilter = "" | "CASH" | "MPESA";

interface BillPaymentReportItem {
  billId: number;
  billNumber: string;
  paymentId: number;
  paymentType: "CASH" | "MPESA";
  amount: number;
  reference: string | null;
  paidAt: string;
  paymentDate: string;
  billedBy?: {
    id: number;
    name: string;
    username: string;
  };
}

interface ReportUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

export default function AdminBillPaymentsReportPage() {
  const apiCall = useApiCall();
  const [reports, setReports] = useState<BillPaymentReportItem[]>([]);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [filters, setFilters] = useState({
    paymentType: "" as PaymentTypeFilter,
    reference: "",
    paymentDate: todayEAT(),
    userId: "",
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const params = new URLSearchParams();
      if (filters.paymentType) params.append("paymentType", filters.paymentType);
      if (filters.reference.trim()) params.append("reference", filters.reference.trim());
      if (filters.paymentDate) params.append("paymentDate", filters.paymentDate);
      if (filters.userId) params.append("userId", filters.userId);

      const result = await apiCall(`/api/reports/bill-payments?${params.toString()}`);
      if (result.status === 200) {
        setReports(Array.isArray(result.data?.reports) ? result.data.reports : []);
      } else {
        setError(result.error || "Failed to fetch bill payment report");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (err) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingFilters(true);
        const result = await apiCall("/api/reports/bill-payments-users");
        if (result.status === 200) {
          const list = Array.isArray(result.data?.users) ? result.data.users : [];
          setUsers(list);
        }
      } catch (_error) {
        setUsers([]);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchUsers();
  }, [apiCall]);

  const totalAmount = reports.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-receipt-cutoff me-2" aria-hidden></i>
            Bill Payments Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Review all bill payments with payment filters</p>
        </PageHeaderStrip>

        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <CollapsibleFilterSectionCard className="mb-4" bodyClassName="p-3">
            <Form noValidate onSubmit={(e) => e.preventDefault()}>
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <Form.Label>Payment Type</Form.Label>
                <Form.Select
                  value={filters.paymentType}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, paymentType: e.target.value as PaymentTypeFilter }))
                  }
                >
                  <option value="">All</option>
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Label>Reference (M-Pesa)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. QDE123ABC"
                  value={filters.reference}
                  onChange={(e) => setFilters((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <FilterDatePicker
                  label="Payment Date"
                  value={filters.paymentDate}
                  onChange={(v) => setFilters((prev) => ({ ...prev, paymentDate: v }))}
                  maxDate={new Date()}
                />
              </div>
              <div className="col-md-3">
                <Form.Label>Sales User</Form.Label>
                <Form.Select
                  value={filters.userId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
                  disabled={loadingFilters}
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-12 d-grid d-md-flex justify-content-md-end">
                <Button type="button" variant="primary" onClick={fetchReport} disabled={loading || loadingFilters}>
                  <i className="bi bi-search me-1"></i>
                  Apply Filters
                </Button>
              </div>
            </div>
            </Form>
        </CollapsibleFilterSectionCard>

        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h6 className="mb-1">Total Payments</h6>
                <h3 className="mb-0">{reports.length}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h6 className="mb-1">Total Amount</h6>
                <h3 className="mb-0">KES {(Number(totalAmount) || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h6 className="mb-1">M-Pesa Payments</h6>
                <h3 className="mb-0">{reports.filter((row) => row.paymentType === "MPESA").length}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Payment Entries</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Payment Date</th>
                      <th>Bill</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Amount</th>
                      <th>Sales User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((row) => (
                      <tr key={`${row.billId}-${row.paymentId}`}>
                        <td>{new Date(row.paidAt).toLocaleString()}</td>
                        <td>{row.billNumber}</td>
                        <td>
                          <span className={`badge ${row.paymentType === "MPESA" ? "bg-success" : "bg-secondary"}`}>
                            {row.paymentType}
                          </span>
                        </td>
                        <td>{row.reference || "-"}</td>
                        <td>KES {(Number(row.amount) || 0).toFixed(2)}</td>
                        <td>{row.billedBy?.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-receipt fs-1"></i>
                    <p className="mt-2 mb-0">No bill payments found for the selected filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}
