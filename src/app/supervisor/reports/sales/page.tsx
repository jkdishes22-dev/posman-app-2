"use client";
import { todayEAT } from "../../../shared/eatDate";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
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
    startDate: todayEAT(),
    endDate: todayEAT()
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
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-graph-up me-2" aria-hidden></i>
            Sales Reports
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Generate and view sales reports as supervisor fallback</p>
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

        {/* Date Range Filter */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row align-items-end">
                  <div className="col-md-3">
                    <FilterDatePicker
                      id="startDate"
                      label="Start Date"
                      value={dateRange.startDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, startDate: v }))}
                      maxDate={new Date()}
                    />
                  </div>
                  <div className="col-md-3">
                    <FilterDatePicker
                      id="endDate"
                      label="End Date"
                      value={dateRange.endDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, endDate: v }))}
                      maxDate={new Date()}
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
                    <h2 className="mb-0">${(Number(totals.totalSales) || 0).toFixed(2)}</h2>
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
                    <h2 className="mb-0">${(Number(totals.averageBillValue) || 0).toFixed(2)}</h2>
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
                            <td>${(Number(report.totalSales) || 0).toFixed(2)}</td>
                            <td>{report.billCount}</td>
                            <td>${(Number(report.averageBillValue) || 0).toFixed(2)}</td>
                            <td>
                              {report.topItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="small">
                                  {item.name}: {item.quantity} × ${(Number(item.revenue) || 0).toFixed(2)}
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
