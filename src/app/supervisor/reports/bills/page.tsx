"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";

interface BillReport {
  date: string;
  totalBills: number;
  pendingBills: number;
  submittedBills: number;
  closedBills: number;
  reopenedBills: number;
  voidedBills: number;
  totalRevenue: number;
  averageBillValue: number;
}

export default function SupervisorBillsReportsPage() {
  const [reports, setReports] = useState<BillReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
  const apiCall = useApiCall();

  useEffect(() => {
    fetchBillsReports();
  }, [dateRange]);

  const fetchBillsReports = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall(`/api/reports/bills?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (result.status === 200) {
        setReports(result.data.reports || []);
      } else {
        setError(result.error || "Failed to fetch bills reports");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totals = reports.reduce((acc, report) => ({
      totalBills: acc.totalBills + report.totalBills,
      pendingBills: acc.pendingBills + report.pendingBills,
      submittedBills: acc.submittedBills + report.submittedBills,
      closedBills: acc.closedBills + report.closedBills,
      reopenedBills: acc.reopenedBills + report.reopenedBills,
      voidedBills: acc.voidedBills + report.voidedBills,
      totalRevenue: acc.totalRevenue + report.totalRevenue,
      averageBillValue: 0
    }), {
      totalBills: 0,
      pendingBills: 0,
      submittedBills: 0,
      closedBills: 0,
      reopenedBills: 0,
      voidedBills: 0,
      totalRevenue: 0,
      averageBillValue: 0
    });

    totals.averageBillValue = totals.totalBills > 0 ? totals.totalRevenue / totals.totalBills : 0;
    return totals;
  };

  const totals = calculateTotals();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Bills Reports</h1>
            <p className="text-muted">Generate and view bills reports as supervisor fallback</p>
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

        {/* Date Range Filter */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row align-items-end">
                  <div className="col-md-3">
                    <label htmlFor="startDate" className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="startDate"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="endDate" className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="endDate"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <Button
                      variant="primary"
                      onClick={fetchBillsReports}
                      disabled={loading}
                    >
                      <i className="bi bi-search me-1"></i>
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Total Bills</h4>
                    <h2 className="mb-0">{totals.totalBills}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-receipt fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Closed Bills</h4>
                    <h2 className="mb-0">{totals.closedBills}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-check-circle fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Pending Bills</h4>
                    <h2 className="mb-0">{totals.pendingBills}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-clock fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Total Revenue</h4>
                    <h2 className="mb-0">${(Number(totals.totalRevenue) || 0).toFixed(2)}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-currency-dollar fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Bill Status Breakdown</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Submitted:</span>
                      <span className="badge bg-info">{totals.submittedBills}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Reopened:</span>
                      <span className="badge bg-danger">{totals.reopenedBills}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Voided:</span>
                      <span className="badge bg-secondary">{totals.voidedBills}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Avg Value:</span>
                      <span className="badge bg-primary">${(Number(totals.averageBillValue) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-primary"
                    onClick={() => window.open("/home/cashier/bills", "_blank")}
                  >
                    <i className="bi bi-cash-stack me-1"></i>
                    View Cashier Bills
                  </Button>
                  <Button
                    variant="outline-success"
                    onClick={() => window.open("/home/my-sales", "_blank")}
                  >
                    <i className="bi bi-receipt me-1"></i>
                    View Sales Bills
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reports */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Daily Bills Breakdown</h5>
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
                          <th>Date</th>
                          <th>Total Bills</th>
                          <th>Pending</th>
                          <th>Submitted</th>
                          <th>Closed</th>
                          <th>Reopened</th>
                          <th>Voided</th>
                          <th>Revenue</th>
                          <th>Avg Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, index) => (
                          <tr key={index}>
                            <td>{new Date(report.date).toLocaleDateString()}</td>
                            <td>{report.totalBills}</td>
                            <td>
                              <span className="badge bg-warning">{report.pendingBills}</span>
                            </td>
                            <td>
                              <span className="badge bg-info">{report.submittedBills}</span>
                            </td>
                            <td>
                              <span className="badge bg-success">{report.closedBills}</span>
                            </td>
                            <td>
                              <span className="badge bg-danger">{report.reopenedBills}</span>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{report.voidedBills}</span>
                            </td>
                            <td>${(Number(report.totalRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(report.averageBillValue) || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-graph-up fs-1"></i>
                        <p className="mt-2">No bills data found for the selected date range</p>
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
