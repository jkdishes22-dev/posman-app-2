"use client";
import { todayEAT } from "../../../shared/eatDate";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface ProductionStockRevenueReportItem {
  date: string;
  productionRevenue: number;
  stockRevenue: number;
  totalRevenue: number;
}

interface Item {
  id: number;
  name: string;
  code?: string;
}

export default function ProductionStockRevenueReportPage() {
  const [reports, setReports] = useState<ProductionStockRevenueReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: todayEAT(),
    endDate: todayEAT()
  });
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
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
        endDate: dateRange.endDate
      });

      if (selectedItemId) {
        params.append("itemId", selectedItemId);
      }

      const result = await apiCall(`/api/reports/production-stock-revenue?${params.toString()}`);
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

  useEffect(() => {
    fetchReport();
  }, []);

  const totals = reports.reduce((acc, r) => ({
    productionRevenue: acc.productionRevenue + (r.productionRevenue || 0),
    stockRevenue: acc.stockRevenue + (r.stockRevenue || 0),
    totalRevenue: acc.totalRevenue + (r.totalRevenue || 0)
  }), { productionRevenue: 0, stockRevenue: 0, totalRevenue: 0 });

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Production vs Stock Revenue Report</h1>
            <p className="text-muted">Compare revenue from production items vs stock items</p>
          </div>
        </div>

        <ErrorDisplay error={error} errorDetails={errorDetails} onDismiss={() => { setError(null); setErrorDetails(null); }} />

        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row align-items-end g-3">
                  <div className="col-md-3">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control type="date" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control type="date" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <Form.Label>Item</Form.Label>
                    <Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                      <option value="">All Items</option>
                      {items.map((item) => <option key={item.id} value={item.id.toString()}>{item.name} {item.code ? `(${item.code})` : ""}</option>)}
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Button variant="primary" onClick={fetchReport} disabled={loading || loadingFilters} className="w-100">
                      <i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate Report"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h6>Production Revenue</h6>
                <h3>${(totals.productionRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h6>Stock Revenue</h6>
                <h3>${(totals.stockRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h6>Total Revenue</h6>
                <h3>${(totals.totalRevenue || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">Revenue Breakdown</h5></div>
              <div className="card-body">
                {loading ? <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead><tr><th>Date</th><th>Production Revenue</th><th>Stock Revenue</th><th>Total Revenue</th></tr></thead>
                      <tbody>
                        {reports.map((r, i) => (
                          <tr key={i}>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>${(Number(r.productionRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(r.stockRevenue) || 0).toFixed(2)}</td>
                            <td>${(Number(r.totalRevenue) || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && <div className="text-center text-muted py-4"><i className="bi bi-graph-up fs-1"></i><p className="mt-2">No data found</p></div>}
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
