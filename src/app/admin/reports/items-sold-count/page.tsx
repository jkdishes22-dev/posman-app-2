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

interface ItemsSoldCountReportItem {
  date: string;
  itemId: number;
  itemName: string;
  quantity: number;
  userId?: number;
  userName?: string;
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

export default function ItemsSoldCountReportPage() {
  const [reports, setReports] = useState<ItemsSoldCountReportItem[]>([]);
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
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterErrorDetails, setFilterErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();

  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      setFilterError(null);
      setFilterErrorDetails(null);
      try {
        const itemsResult = await apiCall("/api/production");
        if (itemsResult.status === 200) {
          setItems(Array.isArray(itemsResult.data) ? itemsResult.data : []);
        } else {
          setFilterError(itemsResult.error || "Failed to load items for filter");
          setFilterErrorDetails(itemsResult.errorDetails || null);
        }
        const usersResult = await apiCall("/api/reports/items-sold-count-users");
        if (usersResult.status === 200) {
          const usersArray = Array.isArray(usersResult.data?.users) ? usersResult.data.users : [];
          setUsers(usersArray);
        } else {
          setFilterError(usersResult.error || "Failed to load sales users for filter");
          setFilterErrorDetails(usersResult.errorDetails || null);
        }
      } catch {
        setFilterError("Network error while loading report filters");
        setFilterErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, [apiCall]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period
      });
      if (selectedItemId) params.append("itemId", selectedItemId);
      if (selectedUserId) params.append("userId", selectedUserId);
      const result = await apiCall(`/api/reports/items-sold-count?${params.toString()}`);
      if (result.status === 200) {
        setReports(result.data?.reports || []);
      } else {
        setError(result.error || "Failed to fetch report");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const totals = reports.reduce((acc, r) => ({ quantity: acc.quantity + (r.quantity || 0), count: acc.count + 1 }), { quantity: 0, count: 0 });

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-cart me-2" aria-hidden></i>
            Items Sold Count Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Count of items sold</p>
        </PageHeaderStrip>
        <ErrorDisplay error={filterError} errorDetails={filterErrorDetails} onDismiss={() => { setFilterError(null); setFilterErrorDetails(null); }} />
        <ErrorDisplay error={error} errorDetails={errorDetails} onDismiss={() => { setError(null); setErrorDetails(null); }} />
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <Form noValidate onSubmit={(e) => e.preventDefault()}>
                <div className="row align-items-end g-3">
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
                  <div className="col-md-2"><Form.Label>Period</Form.Label><Form.Select value={period} onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month" | "year")}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></Form.Select></div>
                  <div className="col-md-2"><Form.Label>Item</Form.Label><Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}><option value="">All Items</option>{items.map((item) => <option key={item.id} value={item.id.toString()}>{item.name} {item.code ? `(${item.code})` : ""}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Form.Label>Sales User</Form.Label><Form.Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}><option value="">All Users</option>{users.map((user) => <option key={user.id} value={user.id.toString()}>{user.firstName} {user.lastName}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Button type="button" variant="primary" onClick={fetchReport} disabled={loading || loadingFilters} className="w-100"><i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate Report"}</Button></div>
                </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-6"><div className="card bg-primary text-white"><div className="card-body"><h6>Total Items Sold</h6><h3>{totals.count}</h3></div></div></div>
          <div className="col-md-6"><div className="card bg-success text-white"><div className="card-body"><h6>Total Quantity</h6><h3>{totals.quantity}</h3></div></div></div>
        </div>
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">Items Sold Details</h5></div>
              <div className="card-body">
                {loading ? <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead><tr><th>Date</th><th>Item</th><th>Quantity</th><th>Sales User</th></tr></thead>
                      <tbody>
                        {reports.map((r, i) => <tr key={i}><td>{formatReportPeriodLabel(r.date)}</td><td>{r.itemName}</td><td>{r.quantity}</td><td>{r.userName || "N/A"}</td></tr>)}
                      </tbody>
                    </table>
                    {reports.length === 0 && <div className="text-center text-muted py-4"><i className="bi bi-box fs-1"></i><p className="mt-2">No data found</p></div>}
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
