"use client";
import { todayEAT } from "../../../shared/eatDate";
import { formatReportPeriodLabel } from "../../../shared/reportPeriodLabel";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface PnLReportItem {
  date: string;
  actualRevenue: number;
  projectedRevenue: number;
  totalRevenue: number;
  expenses: number;
  voids: number;
  actualPnL: number;
  projectedPnL: number;
}

export default function PnLReportPage() {
  const [reports, setReports] = useState<PnLReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: todayEAT(),
    endDate: todayEAT()
  });
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const apiCall = useApiCall();

  const fetchPnLReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: period
      });

      const result = await apiCall(`/api/reports/pnl?${params.toString()}`);
      if (result.status === 200) {
        setReports(result.data?.reports || []);
      } else {
        setError(result.error || "Failed to fetch PnL report");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnLReport();
  }, []);

  const calculateTotals = () => {
    return reports.reduce((acc, report) => ({
      actualRevenue: acc.actualRevenue + (report.actualRevenue || 0),
      projectedRevenue: acc.projectedRevenue + (report.projectedRevenue || 0),
      totalRevenue: acc.totalRevenue + (report.totalRevenue || 0),
      expenses: acc.expenses + (report.expenses || 0),
      voids: acc.voids + (report.voids || 0),
      actualPnL: acc.actualPnL + (report.actualPnL || 0),
      projectedPnL: acc.projectedPnL + (report.projectedPnL || 0)
    }), {
      actualRevenue: 0,
      projectedRevenue: 0,
      totalRevenue: 0,
      expenses: 0,
      voids: 0,
      actualPnL: 0,
      projectedPnL: 0
    });
  };

  const totals = calculateTotals();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-graph-up-arrow me-2" aria-hidden></i>
            Profit & Loss Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">View profit and loss analysis</p>
        </PageHeaderStrip>

        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <Form noValidate onSubmit={(e) => e.preventDefault()}>
                <div className="row align-items-end">
                  <div className="col-md-2">
                    <FilterDatePicker
                      label="Start Date"
                      value={dateRange.startDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, startDate: v }))}
                      maxDate={new Date()}
                    />
                  </div>
                  <div className="col-md-2">
                    <FilterDatePicker
                      label="End Date"
                      value={dateRange.endDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, endDate: v }))}
                      maxDate={new Date()}
                    />
                  </div>
                  <div className="col-md-2">
                    <Form.Label>Period</Form.Label>
                    <Form.Select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month" | "year")}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={fetchPnLReport}
                      disabled={loading}
                      className="w-100"
                    >
                      <i className="bi bi-search me-1"></i>
                      {loading ? "Loading..." : "Generate Report"}
                    </Button>
                  </div>
                </div>
                </Form>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h6 className="card-title">Actual Revenue</h6>
                <h3 className="mb-0">${(totals.actualRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-danger text-white">
              <div className="card-body">
                <h6 className="card-title">Expenses</h6>
                <h3 className="mb-0">${(totals.expenses || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className={`card text-white ${totals.actualPnL >= 0 ? "bg-success" : "bg-danger"}`}>
              <div className="card-body">
                <h6 className="card-title">Actual P&L</h6>
                <h3 className="mb-0">${(totals.actualPnL || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className={`card text-white ${totals.projectedPnL >= 0 ? "bg-success" : "bg-danger"}`}>
              <div className="card-body">
                <h6 className="card-title">Projected P&L</h6>
                <h3 className="mb-0">${(totals.projectedPnL || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">P&L Breakdown</h5>
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
                          <th>Actual Revenue</th>
                          <th>Projected Revenue</th>
                          <th>Expenses</th>
                          <th>Voids</th>
                          <th>Actual P&L</th>
                          <th>Projected P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, index) => (
                          <tr key={index}>
                            <td>{formatReportPeriodLabel(report.date)}</td>
                            <td>${(Number(report.actualRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(report.projectedRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(report.expenses) || 0).toFixed(2)}</td>
                            <td>${(Number(report.voids) || 0).toFixed(2)}</td>
                            <td className={report.actualPnL >= 0 ? "text-success" : "text-danger"}>
                              ${(Number(report.actualPnL) || 0).toFixed(2)}
                            </td>
                            <td className={report.projectedPnL >= 0 ? "text-success" : "text-danger"}>
                              ${(Number(report.projectedPnL) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-graph-up fs-1"></i>
                        <p className="mt-2">No P&L data found for the selected date range</p>
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
