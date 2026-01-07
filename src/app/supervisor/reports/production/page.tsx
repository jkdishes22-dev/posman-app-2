"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";

interface ProductionReport {
  date: string;
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  pendingItems: number;
  efficiency: number;
  topProducers: Array<{
    name: string;
    itemsCompleted: number;
  }>;
}

export default function SupervisorProductionReportsPage() {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
  const apiCall = useApiCall();

  useEffect(() => {
    fetchProductionReports();
  }, [dateRange]);

  const fetchProductionReports = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall(`/api/reports/production?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (result.status === 200) {
        setReports(result.data.reports || []);
      } else {
        setError(result.error || "Failed to fetch production reports");
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
      totalItems: acc.totalItems + report.totalItems,
      completedItems: acc.completedItems + report.completedItems,
      inProgressItems: acc.inProgressItems + report.inProgressItems,
      pendingItems: acc.pendingItems + report.pendingItems,
      efficiency: 0
    }), {
      totalItems: 0,
      completedItems: 0,
      inProgressItems: 0,
      pendingItems: 0,
      efficiency: 0
    });

    totals.efficiency = totals.totalItems > 0 ? (totals.completedItems / totals.totalItems) * 100 : 0;
    return totals;
  };

  const totals = calculateTotals();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Production Reports</h1>
            <p className="text-muted">Generate and view production reports as supervisor fallback</p>
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
                      onClick={fetchProductionReports}
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
                    <h4 className="card-title">Total Items</h4>
                    <h2 className="mb-0">{totals.totalItems}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-box fs-1"></i>
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
                    <h4 className="card-title">Completed</h4>
                    <h2 className="mb-0">{totals.completedItems}</h2>
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
                    <h4 className="card-title">In Progress</h4>
                    <h2 className="mb-0">{totals.inProgressItems}</h2>
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
                    <h4 className="card-title">Efficiency</h4>
                    <h2 className="mb-0">{totals.efficiency.toFixed(1)}%</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-graph-up fs-1"></i>
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
                <h5 className="card-title mb-0">Production Status</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Completed:</span>
                      <span className="badge bg-success">{totals.completedItems}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>In Progress:</span>
                      <span className="badge bg-warning">{totals.inProgressItems}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Pending:</span>
                      <span className="badge bg-secondary">{totals.pendingItems}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Efficiency:</span>
                      <span className="badge bg-primary">{(Number(totals.efficiency) || 0).toFixed(1)}%</span>
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
                    onClick={() => window.open("/supervisor/production", "_blank")}
                  >
                    <i className="bi bi-calendar-day me-1"></i>
                    Daily Production
                  </Button>
                  <Button
                    variant="outline-success"
                    onClick={() => window.open("/supervisor/production/items", "_blank")}
                  >
                    <i className="bi bi-box me-1"></i>
                    Manage Items
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
                <h5 className="card-title mb-0">Daily Production Breakdown</h5>
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
                          <th>Total Items</th>
                          <th>Completed</th>
                          <th>In Progress</th>
                          <th>Pending</th>
                          <th>Efficiency</th>
                          <th>Top Producers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, index) => (
                          <tr key={index}>
                            <td>{new Date(report.date).toLocaleDateString()}</td>
                            <td>{report.totalItems}</td>
                            <td>
                              <span className="badge bg-success">{report.completedItems}</span>
                            </td>
                            <td>
                              <span className="badge bg-warning">{report.inProgressItems}</span>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{report.pendingItems}</span>
                            </td>
                            <td>
                              <span className="badge bg-primary">{(Number(report.efficiency) || 0).toFixed(1)}%</span>
                            </td>
                            <td>
                              {report.topProducers.slice(0, 2).map((producer, idx) => (
                                <div key={idx} className="small">
                                  {producer.name}: {producer.itemsCompleted} items
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-graph-up fs-1"></i>
                        <p className="mt-2">No production data found for the selected date range</p>
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
