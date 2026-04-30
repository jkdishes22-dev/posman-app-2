"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
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
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
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
        endDate: dateRange.endDate
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
        <div className="row mb-4"><div className="col-12"><h1 className="h3 mb-0">Items Sold Count Report</h1><p className="text-muted">Count of items sold</p></div></div>
        <ErrorDisplay error={filterError} errorDetails={filterErrorDetails} onDismiss={() => { setFilterError(null); setFilterErrorDetails(null); }} />
        <ErrorDisplay error={error} errorDetails={errorDetails} onDismiss={() => { setError(null); setErrorDetails(null); }} />
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row align-items-end g-3">
                  <div className="col-md-2"><Form.Label>Start Date</Form.Label><Form.Control type="date" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                  <div className="col-md-2"><Form.Label>End Date</Form.Label><Form.Control type="date" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} /></div>
                  <div className="col-md-3"><Form.Label>Item</Form.Label><Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}><option value="">All Items</option>{items.map((item) => <option key={item.id} value={item.id.toString()}>{item.name} {item.code ? `(${item.code})` : ""}</option>)}</Form.Select></div>
                  <div className="col-md-3"><Form.Label>Sales User</Form.Label><Form.Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}><option value="">All Users</option>{users.map((user) => <option key={user.id} value={user.id.toString()}>{user.firstName} {user.lastName}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Button variant="primary" onClick={fetchReport} disabled={loading || loadingFilters} className="w-100"><i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate Report"}</Button></div>
                </div>
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
                        {reports.map((r, i) => <tr key={i}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.itemName}</td><td>{r.quantity}</td><td>{r.userName || "N/A"}</td></tr>)}
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

