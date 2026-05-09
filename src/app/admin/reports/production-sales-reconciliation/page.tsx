"use client";
import { todayEAT } from "../../../shared/eatDate";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import React, { useState, useEffect } from "react";
import { Button, Form, Collapse } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface ProductionSalesReconciliationReportItem {
  itemId: number;
  itemName: string;
  itemCode?: string;
  quantityIssued: number;
  quantitySold: number;
  quantityVoided: number;
  quantityStale: number;
  remainingBalance: number;
  issuedValue: number;
  soldValue: number;
  voidedValue: number;
  details?: {
    issued: Array<{
      date: string;
      quantity: number;
      referenceId: number;
      referenceType: "preparation" | "issue";
    }>;
    sold: Array<{
      date: string;
      quantity: number;
      billId: number;
      billNumber: string;
    }>;
    voided: Array<{
      date: string;
      quantity: number;
      billId: number;
      billNumber: string;
      voidReason: string;
    }>;
  };
}

interface Item {
  id: number;
  name: string;
  code?: string;
}

export default function ProductionSalesReconciliationReportPage() {
  const [reports, setReports] = useState<ProductionSalesReconciliationReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: todayEAT(),
    endDate: todayEAT(),
  });
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const apiCall = useApiCall();

  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const itemsResult = await apiCall("/api/production");
        if (itemsResult.status === 200) {
          // Handle different response structures
          const itemsData = Array.isArray(itemsResult.data)
            ? itemsResult.data
            : (itemsResult.data?.items || itemsResult.data?.data || []);
          setItems(itemsData);
        } else {
          console.error("Failed to fetch items:", itemsResult.error);
          setItems([]);
        }
      } catch (error) {
        console.error("Error fetching filters:", error);
        setItems([]);
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
        period,
      });

      if (selectedItemId) {
        params.append("itemId", selectedItemId);
      }

      const result = await apiCall(
        `/api/reports/production-sales-reconciliation?${params.toString()}`
      );
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

  const totals = reports.reduce(
    (acc, r) => ({
      quantityIssued: acc.quantityIssued + (r.quantityIssued || 0),
      quantitySold: acc.quantitySold + (r.quantitySold || 0),
      quantityVoided: acc.quantityVoided + (r.quantityVoided || 0),
      quantityStale: acc.quantityStale + (r.quantityStale || 0),
      remainingBalance: acc.remainingBalance + (r.remainingBalance || 0),
      issuedValue: acc.issuedValue + (r.issuedValue || 0),
      soldValue: acc.soldValue + (r.soldValue || 0),
      voidedValue: acc.voidedValue + (r.voidedValue || 0),
    }),
    {
      quantityIssued: 0,
      quantitySold: 0,
      quantityVoided: 0,
      quantityStale: 0,
      remainingBalance: 0,
      issuedValue: 0,
      soldValue: 0,
      voidedValue: 0,
    }
  );

  const toggleItemDetails = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Check if report is for a single day (compare date strings)
  const isSingleDay = dateRange.startDate === dateRange.endDate;

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }

      if (isSingleDay) {
        // For single day reports, show date with time if available
        const hasTime = dateString.includes("T") && dateString.includes(":");
        if (hasTime) {
          return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Format the report date range for display
  const formatReportDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-arrow-left-right me-2" aria-hidden></i>
            Production vs Sales Reconciliation
          </h1>
          <p className="mb-0 mt-2 small text-white-50">
            Track issued items against sales/bills. Voided items are cancelled bills (items returned to inventory).
          </p>
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
            <CollapsibleFilterSectionCard className="card" title="Report filters" bodyClassName="card-body">
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
                  <div className="col-md-2">
                    <Form.Label>Period</Form.Label>
                    <Form.Select
                      value={period}
                      onChange={(e) =>
                        setPeriod(e.target.value as "day" | "week" | "month" | "year")
                      }
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>Item</Form.Label>
                      {loadingFilters ? (
                        <Form.Select disabled>
                          <option>Loading items...</option>
                        </Form.Select>
                      ) : (
                        <Form.Select
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          disabled={loadingFilters}
                        >
                          <option value="">All Items</option>
                          {items.length > 0 ? (
                            items.map((item) => (
                              <option key={item.id} value={item.id.toString()}>
                                {item.name} {item.code ? `(${item.code})` : ""}
                              </option>
                            ))
                          ) : null}
                        </Form.Select>
                      )}
                    </Form.Group>
                  </div>
                  <div className="col-md-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={fetchReport}
                      disabled={loading || loadingFilters}
                      className="w-100"
                    >
                      <i className="bi bi-search me-1"></i>
                      {loading ? "Loading..." : "Generate Report"}
                    </Button>
                  </div>
                </div>
                </Form>
            </CollapsibleFilterSectionCard>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h6>Total Issued</h6>
                <h3>{totals.quantityIssued}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h6>Total Sold</h6>
                <h3>{totals.quantitySold}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <h6>Total Voided (Cancelled)</h6>
                <h3>{totals.quantityVoided}</h3>
                <small className="opacity-75">Items returned to inventory</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h6>Remaining Balance</h6>
                <h3>{totals.remainingBalance}</h3>
                <small className="opacity-75">Available for sale</small>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Item Reconciliation</h5>
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
                          <th>Issued</th>
                          <th>Sold</th>
                          <th>Voided</th>
                          <th>Stale</th>
                          <th>Balance</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <React.Fragment key={r.itemId}>
                            <tr>
                              <td>
                                <strong>{r.itemName}</strong>
                                {r.itemCode && (
                                  <span className="text-muted ms-2">({r.itemCode})</span>
                                )}
                              </td>
                              <td>{r.quantityIssued}</td>
                              <td>{r.quantitySold}</td>
                              <td>{r.quantityVoided}</td>
                              <td>{r.quantityStale}</td>
                              <td>
                                <strong
                                  className={
                                    r.remainingBalance < 0
                                      ? "text-danger"
                                      : r.remainingBalance > 0
                                        ? "text-warning"
                                        : "text-success"
                                  }
                                >
                                  {r.remainingBalance}
                                </strong>
                              </td>
                              <td>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => toggleItemDetails(r.itemId)}
                                >
                                  <i
                                    className={`bi bi-chevron-${expandedItems.has(r.itemId) ? "up" : "down"
                                      }`}
                                  ></i>
                                </Button>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={7} className="p-0 border-0">
                                <Collapse in={expandedItems.has(r.itemId)}>
                                  <div>
                                    <div className="p-3 bg-light">
                                      {isSingleDay && (
                                        <div className="mb-3 pb-2 border-bottom">
                                          <strong className="text-primary">
                                            <i className="bi bi-calendar-event me-1"></i>
                                            Report Date: {formatReportDate(dateRange.startDate)}
                                          </strong>
                                        </div>
                                      )}
                                      <div className="row">
                                        <div className="col-md-4">
                                          <h6>
                                            <i className="bi bi-box-arrow-up me-1"></i>
                                            Issued Details
                                          </h6>
                                          <ul className="list-unstyled small">
                                            {r.details?.issued.map((issue, idx) => (
                                              <li key={idx} className="mb-2">
                                                <div className="d-flex align-items-start">
                                                  <span className="badge bg-primary me-2">
                                                    {formatDate(issue.date)}
                                                  </span>
                                                  <div className="flex-grow-1">
                                                    <div>
                                                      <strong>{issue.quantity}</strong> units
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: "0.85em" }}>
                                                      Ref: {issue.referenceId}
                                                    </div>
                                                  </div>
                                                </div>
                                              </li>
                                            ))}
                                            {(!r.details?.issued || r.details.issued.length === 0) && (
                                              <li className="text-muted">No issued items</li>
                                            )}
                                          </ul>
                                        </div>
                                        <div className="col-md-4">
                                          <h6>
                                            <i className="bi bi-cart-check me-1"></i>
                                            Sold Details
                                          </h6>
                                          <ul className="list-unstyled small">
                                            {r.details?.sold.map((sale, idx) => (
                                              <li key={idx} className="mb-2">
                                                <div className="d-flex align-items-start">
                                                  <span className="badge bg-success me-2">
                                                    {formatDate(sale.date)}
                                                  </span>
                                                  <div className="flex-grow-1">
                                                    <div>
                                                      <strong>{sale.quantity}</strong> units
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: "0.85em" }}>
                                                      Bill: {sale.billNumber}
                                                    </div>
                                                  </div>
                                                </div>
                                              </li>
                                            ))}
                                            {(!r.details?.sold || r.details.sold.length === 0) && (
                                              <li className="text-muted">No sold items</li>
                                            )}
                                          </ul>
                                        </div>
                                        <div className="col-md-4">
                                          <h6>
                                            <i className="bi bi-x-circle me-1"></i>
                                            Voided Details
                                          </h6>
                                          <ul className="list-unstyled small">
                                            {r.details?.voided.map((voided, idx) => (
                                              <li key={idx} className="mb-2">
                                                <div className="d-flex align-items-start">
                                                  <span className="badge bg-warning me-2">
                                                    {formatDate(voided.date)}
                                                  </span>
                                                  <div className="flex-grow-1">
                                                    <div>
                                                      <strong>{voided.quantity}</strong> units
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: "0.85em" }}>
                                                      Bill: {voided.billNumber}
                                                    </div>
                                                    <div className="text-muted fst-italic" style={{ fontSize: "0.8em" }}>
                                                      {voided.voidReason}
                                                    </div>
                                                  </div>
                                                </div>
                                              </li>
                                            ))}
                                            {(!r.details?.voided || r.details.voided.length === 0) && (
                                              <li className="text-muted">No voided items</li>
                                            )}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Collapse>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-graph-up fs-1"></i>
                        <p className="mt-2">No data found</p>
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
