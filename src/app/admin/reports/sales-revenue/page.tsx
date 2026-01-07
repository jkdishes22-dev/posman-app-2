"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface SalesRevenueReportItem {
  date: string;
  actualRevenue: number;
  projectedRevenue: number;
  totalRevenue: number;
  billCount: number;
}

interface Item {
  id: number;
  name: string;
  code?: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

export default function SalesRevenueReportPage() {
  const [reports, setReports] = useState<SalesRevenueReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const apiCall = useApiCall();

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoadingFilters(true);
    try {
      // Fetch items
      const itemsResult = await apiCall("/api/production");
      if (itemsResult.status === 200) {
        setItems(Array.isArray(itemsResult.data) ? itemsResult.data : []);
      }

      // Fetch users (sales users - typically users with sales role)
      const usersResult = await apiCall("/api/users?page=1&pageSize=1000");
      if (usersResult.status === 200) {
        const usersArray = Array.isArray(usersResult.data?.users) ? usersResult.data.users : [];
        setUsers(usersArray);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchSalesRevenueReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: period
      });

      if (selectedItemId) {
        params.append("itemId", selectedItemId);
      }

      if (selectedUserId) {
        params.append("userId", selectedUserId);
      }

      const result = await apiCall(`/api/reports/sales-revenue?${params.toString()}`);
      if (result.status === 200) {
        setReports(result.data?.reports || []);
      } else {
        setError(result.error || "Failed to fetch sales revenue report");
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
    fetchSalesRevenueReport();
  }, []);

  const calculateTotals = () => {
    const totals = reports.reduce((acc, report) => ({
      actualRevenue: acc.actualRevenue + (report.actualRevenue || 0),
      projectedRevenue: acc.projectedRevenue + (report.projectedRevenue || 0),
      totalRevenue: acc.totalRevenue + (report.totalRevenue || 0),
      billCount: acc.billCount + (report.billCount || 0)
    }), {
      actualRevenue: 0,
      projectedRevenue: 0,
      totalRevenue: 0,
      billCount: 0
    });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Sales Revenue Report</h1>
            <p className="text-muted">View actual and projected revenue from sales</p>
          </div>
        </div>

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
                <div className="row align-items-end g-3">
                  <div className="col-md-2">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-2">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
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
                  <div className="col-md-2">
                    <Form.Label>Item</Form.Label>
                    <Form.Select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                    >
                      <option value="">All Items</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id.toString()}>
                          {item.name} {item.code ? `(${item.code})` : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-md-2">
                    <Form.Label>Sales User</Form.Label>
                    <Form.Select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-md-2">
                    <Button
                      variant="primary"
                      onClick={fetchSalesRevenueReport}
                      disabled={loading || loadingFilters}
                      className="w-100"
                    >
                      <i className="bi bi-search me-1"></i>
                      {loading ? "Loading..." : "Generate Report"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h6 className="card-title">Actual Revenue</h6>
                <h3 className="mb-0">${(totals.actualRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h6 className="card-title">Projected Revenue</h6>
                <h3 className="mb-0">${(totals.projectedRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h6 className="card-title">Total Revenue</h6>
                <h3 className="mb-0">${(totals.totalRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-secondary text-white">
              <div className="card-body">
                <h6 className="card-title">Total Bills</h6>
                <h3 className="mb-0">{totals.billCount}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Revenue Breakdown</h5>
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
                          <th>Total Revenue</th>
                          <th>Bill Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, index) => (
                          <tr key={index}>
                            <td>{new Date(report.date).toLocaleDateString()}</td>
                            <td>${(Number(report.actualRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(report.projectedRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(report.totalRevenue) || 0).toFixed(2)}</td>
                            <td>{report.billCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-graph-up fs-1"></i>
                        <p className="mt-2">No revenue data found for the selected date range</p>
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

