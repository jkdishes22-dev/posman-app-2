"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";

interface SalesReport {
  date: string;
  totalSales: number;
  billCount: number;
  averageBillValue: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export default function SupervisorSalesReportsPage() {
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const apiCall = useApiCall();

  useEffect(() => {
    fetchSalesReports();
  }, [dateRange]);

  const fetchSalesReports = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall(`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (result.status === 200) {
        setReports(result.data.reports || []);
      } else {
        setError(result.error || "Failed to fetch sales reports");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalSales = reports.reduce((sum, report) => sum + report.totalSales, 0);
    const totalBills = reports.reduce((sum, report) => sum + report.billCount, 0);
    const averageBillValue = totalBills > 0 ? totalSales / totalBills : 0;
    
    return { totalSales, totalBills, averageBillValue };
  };

  const totals = calculateTotals();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Sales Reports</h1>
            <p className="text-muted">Generate and view sales reports as supervisor fallback</p>
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
                      onClick={fetchSalesReports}
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
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Total Sales</h4>
                    <h2 className="mb-0">${totals.totalSales.toFixed(2)}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-currency-dollar fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white">
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
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">Avg Bill Value</h4>
                    <h2 className="mb-0">${totals.averageBillValue.toFixed(2)}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-graph-up fs-1"></i>
                  </div>
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
                <h5 className="card-title mb-0">Daily Sales Breakdown</h5>
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
                          <th>Total Sales</th>
                          <th>Bill Count</th>
                          <th>Average Bill Value</th>
                          <th>Top Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, index) => (
                          <tr key={index}>
                            <td>{new Date(report.date).toLocaleDateString()}</td>
                            <td>${report.totalSales.toFixed(2)}</td>
                            <td>{report.billCount}</td>
                            <td>${report.averageBillValue.toFixed(2)}</td>
                            <td>
                              {report.topItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="small">
                                  {item.name}: {item.quantity} × ${item.revenue.toFixed(2)}
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
                        <p className="mt-2">No sales data found for the selected date range</p>
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
