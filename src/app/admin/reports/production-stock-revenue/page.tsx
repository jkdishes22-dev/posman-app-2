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
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
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

  const reportFiltersDirty =
    selectedItemId !== "" ||
    period !== "day" ||
    dateRange.startDate !== todayEAT() ||
    dateRange.endDate !== todayEAT();

  const clearReportFilters = () => {
    const d = todayEAT();
    setDateRange({ startDate: d, endDate: d });
    setPeriod("day");
    setSelectedItemId("");
  };

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
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-box-seam me-2" aria-hidden></i>
            Production vs Stock Revenue Report
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Compare revenue from production items vs stock items</p>
        </PageHeaderStrip>

        <ErrorDisplay error={error} errorDetails={errorDetails} onDismiss={() => { setError(null); setErrorDetails(null); }} />

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
                    <Form.Select value={period} onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month" | "year")}>
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label>Item</Form.Label>
                    <Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                      <option value="">All Items</option>
                      {items.map((item) => <option key={item.id} value={item.id.toString()}>{item.name} {item.code ? `(${item.code})` : ""}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3} className="d-flex flex-wrap gap-2 align-items-end justify-content-md-end">
                    <Button type="button" variant="primary" size="sm" onClick={fetchReport} disabled={loading || loadingFilters}>
                      <i className="bi bi-search me-1"></i>{loading ? "Loading..." : "Generate"}
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
                            <td>{formatReportPeriodLabel(r.date)}</td>
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
