"use client";
import { todayEAT } from "../../shared/eatDate";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import FilterDatePicker from "../../shared/FilterDatePicker";
import React, { useState, useEffect, useCallback } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import SecureRoute from "../../components/SecureRoute";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { printReceiptWithTimestamp } from "../../shared/printUtils";
import { useAuth } from "../../contexts/AuthContext";
import MySalesReportThermalPrint from "./MySalesReportThermalPrint";

interface ItemSoldRow {
  date: string;
  itemId: number;
  itemName: string;
  quantity: number;
  subtotal: number;
}

interface Item {
  id: number;
  name: string;
  code?: string;
}

interface BusinessShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export default function MySalesReportPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ItemSoldRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: todayEAT(), endDate: todayEAT() });
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [businessShifts, setBusinessShifts] = useState<BusinessShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [printerName, setPrinterName] = useState<string | undefined>(undefined);
  const [orgTitle, setOrgTitle] = useState<string>("POS System");
  const [printLoading, setPrintLoading] = useState(false);
  const apiCall = useApiCall();

  useEffect(() => {
    apiCall("/api/system/receipt-printer-prefs")
      .then((res) => {
        if (res.status === 200) {
          if (res.data?.value?.printer_name) setPrinterName(res.data.value.printer_name);
          if (res.data?.receipt_display?.title) setOrgTitle(res.data.receipt_display.title);
        }
      })
      .catch(() => {});

    apiCall("/api/production")
      .then((res) => {
        if (res.status === 200) setItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});

    apiCall("/api/system/business-shifts")
      .then((res) => {
        if (res.status === 200 && Array.isArray(res.data?.shifts)) setBusinessShifts(res.data.shifts);
      })
      .catch(() => {});
  }, [apiCall]);

  const fetchReport = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period,
        userId: String(user.id),
      });
      if (selectedItemId) params.set("itemId", selectedItemId);
      if (selectedShiftId) {
        const shift = businessShifts.find((s) => s.id === selectedShiftId);
        if (shift) {
          params.set("shiftStart", shift.start_time);
          params.set("shiftEnd", shift.end_time);
        }
      }

      const result = await apiCall(`/api/reports/items-sold-count?${params.toString()}`);
      if (result.status === 200) {
        setReports(result.data?.reports || []);
      } else {
        setError(result.error || "Failed to fetch report");
        setErrorDetails(result.errorDetails || null);
      }
    } catch {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange, period, selectedItemId, selectedShiftId, businessShifts, apiCall]);

  useEffect(() => {
    if (user?.id) fetchReport();
  }, [user?.id]);

  // Aggregate rows by item for display and print
  const aggregated = React.useMemo(() => {
    const map = new Map<number, { itemName: string; quantity: number; subtotal: number }>();
    for (const r of reports) {
      const existing = map.get(r.itemId) ?? { itemName: r.itemName, quantity: 0, subtotal: 0 };
      existing.quantity += r.quantity || 0;
      existing.subtotal += r.subtotal || 0;
      map.set(r.itemId, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [reports]);

  const totalQuantity = aggregated.reduce((s, r) => s + r.quantity, 0);
  const totalRevenue = aggregated.reduce((s, r) => s + r.subtotal, 0);

  const handlePrint = async () => {
    if (aggregated.length === 0) return;
    setPrintLoading(true);
    try {
      const userName = user ? `${user.firstname} ${user.lastname}`.trim() : undefined;
      await printReceiptWithTimestamp(
        MySalesReportThermalPrint,
        {
          orgTitle,
          userName,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          rows: aggregated,
          totalQuantity,
          totalAmount: totalRevenue,
        },
        "My Sales Report",
        "receipt",
        printerName,
      );
    } finally {
      setPrintLoading(false);
    }
  };

  const filtersDirty =
    period !== "day" ||
    selectedItemId !== "" ||
    selectedShiftId !== "" ||
    dateRange.startDate !== todayEAT() ||
    dateRange.endDate !== todayEAT();

  const clearFilters = () => {
    const d = todayEAT();
    setDateRange({ startDate: d, endDate: d });
    setPeriod("day");
    setSelectedItemId("");
    setSelectedShiftId("");
  };

  return (
    <SecureRoute rolesRequired={["cashier", "sales", "supervisor"]}>
      <RoleAwareLayout>
        <div className="container-fluid">
          <PageHeaderStrip>
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-graph-up me-2" aria-hidden></i>
              My Sales
            </h1>
            <p className="mb-0 mt-2 small text-white-50">
              {user ? `${user.firstname} ${user.lastname}` : ""}
            </p>
          </PageHeaderStrip>

          <ErrorDisplay
            error={error}
            errorDetails={errorDetails}
            onDismiss={() => { setError(null); setErrorDetails(null); }}
          />

          <div className="row mb-4">
            <div className="col-12">
              <CollapsibleFilterSectionCard className="shadow-sm border-0" title="Filters">
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
                    <Col md={2}>
                      <Form.Label>Item</Form.Label>
                      <Form.Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                        <option value="">All Items</option>
                        {items.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.name}{item.code ? ` (${item.code})` : ""}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    {businessShifts.length > 0 && (
                      <Col md={2}>
                        <Form.Label>Shift</Form.Label>
                        <Form.Select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
                          <option value="">All shifts</option>
                          {businessShifts.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                          ))}
                        </Form.Select>
                      </Col>
                    )}
                    <Col md={2} className="d-flex flex-wrap gap-2">
                      <Button type="button" variant="primary" size="sm" onClick={fetchReport} disabled={loading}>
                        <i className="bi bi-search me-1"></i>
                        {loading ? "Loading..." : "Generate"}
                      </Button>
                      <Button type="button" variant="outline-secondary" size="sm" disabled={!filtersDirty} onClick={clearFilters}>
                        <i className="bi bi-x-lg me-1" aria-hidden />
                        Clear
                      </Button>
                      <Button type="button" variant="outline-secondary" size="sm" onClick={handlePrint} disabled={aggregated.length === 0 || printLoading} title="Print thermal report">
                        <i className="bi bi-printer" aria-hidden />
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
                  <h6 className="card-title">Unique Items Sold</h6>
                  <h3 className="mb-0">{aggregated.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <h6 className="card-title">Total Quantity</h6>
                  <h3 className="mb-0">{totalQuantity}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <h6 className="card-title">Total Revenue</h6>
                  <h3 className="mb-0">KES {totalRevenue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Items Sold</h5>
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
                            <th>Item</th>
                            <th className="text-end">Quantity</th>
                            <th className="text-end">Revenue (KES)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggregated.map((row, i) => (
                            <tr key={i}>
                              <td>{row.itemName}</td>
                              <td className="text-end">{row.quantity}</td>
                              <td className="text-end">{row.subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                        {aggregated.length > 0 && (
                          <tfoot>
                            <tr className="fw-bold">
                              <td>Total</td>
                              <td className="text-end">{totalQuantity}</td>
                              <td className="text-end">{totalRevenue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      {aggregated.length === 0 && (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-cart fs-1"></i>
                          <p className="mt-2">No items sold in the selected date range</p>
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
    </SecureRoute>
  );
}
