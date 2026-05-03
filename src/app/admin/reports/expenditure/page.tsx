"use client";
import { todayEAT } from "../../../shared/eatDate";
import { formatReportPeriodLabel } from "../../../shared/reportPeriodLabel";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface ExpenditureReportItem {
  date: string;
  supplierId: number;
  supplierName: string;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  totalAmount: number;
}

interface Item {
  id: number;
  name: string;
  code?: string;
}

interface Supplier {
  id: number;
  name: string;
}

export default function ExpenditureReportPage() {
  const [reports, setReports] = useState<ExpenditureReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: todayEAT(),
    endDate: todayEAT()
  });
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const apiCall = useApiCall();

  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const itemsResult = await apiCall("/api/production");
        if (itemsResult.status === 200) {
          setItems(Array.isArray(itemsResult.data) ? itemsResult.data : []);
        }
        const suppliersResult = await apiCall("/api/suppliers");
        if (suppliersResult.status >= 200 && suppliersResult.status < 300) {
          setSuppliers(Array.isArray(suppliersResult.data) ? suppliersResult.data : []);
        }
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

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
      if (selectedSupplierId) params.append("supplierId", selectedSupplierId);
      const result = await apiCall(`/api/reports/expenditure?${params.toString()}`);
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

  const totals = reports.reduce((acc, r) => ({ totalAmount: acc.totalAmount + (r.totalAmount || 0), count: acc.count + 1 }), { totalAmount: 0, count: 0 });

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="row mb-4"><div className="col-12"><h1 className="h3 mb-0">Expenditure Report</h1><p className="text-muted">Stock items supplied and per supplier</p></div></div>
        <ErrorDisplay error={error} errorDetails={errorDetails} onDismiss={() => { setError(null); setErrorDetails(null); }} />
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row align-items-end g-3">
                  <div className="col-md-2"><Form.Label>Start Date</Form.Label><Form.Control type="date" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                  <div className="col-md-2"><Form.Label>End Date</Form.Label><Form.Control type="date" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} /></div>
                  <div className="col-md-2"><Form.Label>Period</Form.Label><Form.Select value={period} onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month" | "year")}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></Form.Select></div>
                  <div className="col-md-2"><Form.Label>Item</Form.Label><Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}><option value="">All Items</option>{items.map((item) => <option key={item.id} value={item.id.toString()}>{item.name} {item.code ? `(${item.code})` : ""}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Form.Label>Supplier</Form.Label><Form.Select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}><option value="">All Suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id.toString()}>{supplier.name}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Button variant="primary" onClick={fetchReport} disabled={loading || loadingFilters} className="w-100"><i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate Report"}</Button></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-6"><div className="card bg-danger text-white"><div className="card-body"><h6>Total Expenditure</h6><h3>${(totals.totalAmount || 0).toFixed(2)}</h3></div></div></div>
          <div className="col-md-6"><div className="card bg-secondary text-white"><div className="card-body"><h6>Total Transactions</h6><h3>{totals.count}</h3></div></div></div>
        </div>
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">Expenditure Details</h5></div>
              <div className="card-body">
                {loading ? <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead><tr><th>Date</th><th>Supplier</th><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th><th>Total</th></tr></thead>
                      <tbody>
                        {reports.map((r, i) => <tr key={i}><td>{formatReportPeriodLabel(r.date)}</td><td>{r.supplierName}</td><td>{r.itemName}</td><td>{r.quantity}</td><td>${(Number(r.unitPrice) || 0).toFixed(2)}</td><td>${(Number(r.subtotal) || 0).toFixed(2)}</td><td>${(Number(r.totalAmount) || 0).toFixed(2)}</td></tr>)}
                      </tbody>
                    </table>
                    {reports.length === 0 && <div className="text-center text-muted py-4"><i className="bi bi-cash-stack fs-1"></i><p className="mt-2">No data found</p></div>}
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
