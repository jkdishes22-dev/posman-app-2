"use client";
import { todayEAT } from "../../../shared/eatDate";
import { formatReportPeriodLabel } from "../../../shared/reportPeriodLabel";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface PurchaseOrdersReportItem {
  date: string;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  status: string;
  totalAmount: number;
  itemBreakdown?: Array<{
    itemId: number;
    itemName: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    subtotal: number;
  }>;
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

export default function PurchaseOrdersReportPage() {
  const [reports, setReports] = useState<PurchaseOrdersReportItem[]>([]);
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
      const result = await apiCall(`/api/reports/purchase-orders?${params.toString()}`);
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
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-cart-check me-2" aria-hidden></i>
            Purchase Orders Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Track purchase orders</p>
        </PageHeaderStrip>
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
                  <div className="col-md-2"><Form.Label>Supplier</Form.Label><Form.Select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}><option value="">All Suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id.toString()}>{supplier.name}</option>)}</Form.Select></div>
                  <div className="col-md-2"><Button type="button" variant="primary" onClick={fetchReport} disabled={loading || loadingFilters} className="w-100"><i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate Report"}</Button></div>
                </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-6"><div className="card bg-primary text-white"><div className="card-body"><h6>Total Orders</h6><h3>{totals.count}</h3></div></div></div>
          <div className="col-md-6"><div className="card bg-info text-white"><div className="card-body"><h6>Total Amount</h6><h3>${(totals.totalAmount || 0).toFixed(2)}</h3></div></div></div>
        </div>
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">Purchase Orders Details</h5></div>
              <div className="card-body">
                {loading ? <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead><tr><th>Date</th><th>Order Number</th><th>Supplier</th><th>Status</th><th>Total Amount</th></tr></thead>
                      <tbody>
                        {reports.map((r, i) => <tr key={i}><td>{formatReportPeriodLabel(r.date)}</td><td><Link href={`/storekeeper/purchase-orders?search=${encodeURIComponent(r.orderNumber)}`} className="text-primary">{r.orderNumber}</Link></td><td>{r.supplierName}</td><td><span className={`badge bg-${r.status === "received" ? "success" : r.status === "cancelled" ? "danger" : "warning"}`}>{r.status}</span></td><td>${(Number(r.totalAmount) || 0).toFixed(2)}</td></tr>)}
                      </tbody>
                    </table>
                    {reports.length === 0 && <div className="text-center text-muted py-4"><i className="bi bi-cart-check fs-1"></i><p className="mt-2">No data found</p></div>}
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
