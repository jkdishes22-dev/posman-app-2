"use client";
import { todayEAT } from "../../../shared/eatDate";
import { formatReportPeriodLabel } from "../../../shared/reportPeriodLabel";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
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
    startDate: todayEAT(),
    endDate: todayEAT()
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

  const reportFiltersDirty =
    selectedItemId !== "" ||
    selectedUserId !== "" ||
    period !== "day" ||
    dateRange.startDate !== todayEAT() ||
    dateRange.endDate !== todayEAT();

  const clearReportFilters = () => {
    const d = todayEAT();
    setDateRange({ startDate: d, endDate: d });
    setPeriod("day");
    setSelectedItemId("");
    setSelectedUserId("");
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-currency-dollar me-2" aria-hidden></i>
            Sales Revenue Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">View actual and projected revenue from sales</p>
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
            <CollapsibleFilterSectionCard className="shadow-sm border-0" title="Report filters">
                <Form noValidate onSubmit={(e) => e.preventDefault()}>
                <Row className="align-items-end g-3">
                  <Col md={2}>
                    <FilterDatePicker
                      label="Start Date"
                      value={dateRange.startDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, startDate: v }))}
                      maxDate={new Date()}
                    />
                  </Col>
                  <Col md={2}>
                    <FilterDatePicker
                      label="End Date"
                      value={dateRange.endDate}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, endDate: v }))}
                      maxDate={new Date()}
                    />
                  </Col>
                  <Col md={2}>
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
                  </Col>
                  <Col md={2}>
                    <Form.Label>Item</Form.Label>
                    <Form.Select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                    >
                      <option value="">All Items</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id.toString()}>
                          {item.name} {item.code ? `(${item.code})` : ""}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
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
                  </Col>
                  <Col md={2} className="d-flex flex-wrap gap-2 justify-content-md-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={fetchSalesRevenueReport}
                      disabled={loading || loadingFilters}
                    >
                      <i className="bi bi-search me-1"></i>
                      {loading ? "Loading..." : "Generate"}
                    </Button>
                    <Button type="button" variant="outline-secondary" size="sm" disabled={!reportFiltersDirty} onClick={clearReportFilters}>
                      <i className="bi bi-x-lg me-1" aria-hidden />
                      Clear filters
                    </Button>
                  </Col>
                </Row>
                </Form>
            </CollapsibleFilterSectionCard>
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
                            <td>{formatReportPeriodLabel(report.date)}</td>
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
