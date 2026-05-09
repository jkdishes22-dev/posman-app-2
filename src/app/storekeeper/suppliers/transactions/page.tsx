"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import Pagination from "../../../components/Pagination";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import { todayEAT } from "../../../shared/eatDate";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../../shared/filterDateUtils";

interface SupplierOption {
  id: number;
  name: string;
}

interface SupplierRow {
  id?: number;
  name?: string;
}

interface LedgerRow {
  id: number;
  supplier_id: number;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  notes: string | null;
  created_at: string;
  supplier?: SupplierRow | null;
}

const TX_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "payment", label: "Payment" },
  { value: "adjustment", label: "Partial payment" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "return", label: "Return" },
  { value: "refund", label: "Refund" },
  { value: "credit_note", label: "Credit note" },
];

function formatTxType(t: string): string {
  const opt = TX_TYPE_OPTIONS.find((o) => o.value === t);
  if (opt) return opt.label;
  return t.replace(/_/g, " ");
}

function SupplierTransactionsContent() {
  const apiCall = useApiCall();
  const searchParams = useSearchParams();

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [transactions, setTransactions] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState(() => todayEAT());
  const [endDate, setEndDate] = useState(() => todayEAT());

  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  useEffect(() => {
    const sid = searchParams.get("supplierId");
    if (sid && /^\d+$/.test(sid)) {
      setFilterSupplierId(sid);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const result = await apiCall("/api/suppliers");
        if (result.status >= 200 && result.status < 300) {
          const data = Array.isArray(result.data) ? result.data : [];
          setSuppliers(data.map((s: SupplierOption) => ({ id: s.id, name: s.name })));
        }
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadSuppliers();
  }, [apiCall]);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(pageSize),
        });
        if (filterSupplierId) params.set("supplierId", filterSupplierId);
        if (filterType) params.set("transactionType", filterType);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const result = await apiCall(`/api/suppliers/transactions?${params.toString()}`);
        if (result.status === 200) {
          setTransactions(Array.isArray(result.data?.transactions) ? result.data.transactions : []);
          setTotal(typeof result.data?.total === "number" ? result.data.total : 0);
        } else {
          setError(result.error || "Failed to load transactions");
          setErrorDetails(result.errorDetails ?? null);
          setTransactions([]);
          setTotal(0);
        }
      } catch {
        setError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        setTransactions([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [apiCall, pageSize, filterSupplierId, filterType, startDate, endDate],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const supplierTxnFiltersDirty =
    filterSupplierId !== "" ||
    filterType !== "" ||
    startDate !== todayEAT() ||
    endDate !== todayEAT();

  const clearSupplierTxnFilters = () => {
    const d = todayEAT();
    setFilterSupplierId("");
    setFilterType("");
    setStartDate(d);
    setEndDate(d);
    if (page !== 1) {
      setPage(1);
    } else {
      void load(1);
    }
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
    } else {
      void load(1);
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <Link href="/storekeeper/suppliers" className="text-decoration-none small text-muted d-inline-block mb-1">
              ← Back to suppliers
            </Link>
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-cash-coin me-2"></i>
              Supplier payments
            </h1>
            <p className="text-muted small mb-0">All supplier financial transactions with filters.</p>
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

        <CollapsibleFilterSectionCard className="mb-4 shadow-sm border-0">
            <Form
              noValidate
              onSubmit={applyFilters}
            >
              <Row className="g-3 align-items-end">
                <Col md={3}>
                  <Form.Label>Supplier</Form.Label>
                  <Form.Select
                    value={filterSupplierId}
                    onChange={(e) => setFilterSupplierId(e.target.value)}
                    disabled={loadingSuppliers}
                  >
                    <option value="">All suppliers</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    {TX_TYPE_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <FilterDatePicker
                    label="From"
                    value={startDate}
                    onChange={setStartDate}
                    maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()}
                  />
                </Col>
                <Col md={2}>
                  <FilterDatePicker
                    label="To"
                    value={endDate}
                    onChange={setEndDate}
                    minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined}
                    maxDate={new Date()}
                  />
                </Col>
                <Col md={3} className="d-flex gap-2 flex-wrap align-items-end justify-content-md-end">
                  <Button type="submit" variant="primary" size="sm" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : "Apply"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    disabled={loading || !supplierTxnFiltersDirty}
                    onClick={clearSupplierTxnFilters}
                  >
                    <i className="bi bi-x-lg me-1" aria-hidden />
                    Clear filters
                  </Button>
                </Col>
              </Row>
            </Form>
        </CollapsibleFilterSectionCard>

        <Card className="shadow-sm">
          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Transactions</h6>
            {loading && <Spinner animation="border" size="sm" />}
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Type</th>
                    <th className="text-end">Debit</th>
                    <th className="text-end">Credit</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="text-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                        <td>{tx.supplier?.name || `#${tx.supplier_id}`}</td>
                        <td>
                          <Badge bg="secondary">{formatTxType(tx.transaction_type)}</Badge>
                        </td>
                        <td className="text-end text-danger">
                          {Number(tx.debit_amount) > 0 ? `$${Number(tx.debit_amount).toFixed(2)}` : "—"}
                        </td>
                        <td className="text-end text-success">
                          {Number(tx.credit_amount) > 0 ? `$${Number(tx.credit_amount).toFixed(2)}` : "—"}
                        </td>
                        <td className="small">{tx.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          recordLabel="transactions"
          onPageChange={setPage}
        />
      </div>
    </RoleAwareLayout>
  );
}

export default function SupplierTransactionsPage() {
  return (
    <Suspense
      fallback={
        <RoleAwareLayout>
          <div className="container-fluid py-5 text-center">
            <Spinner animation="border" />
          </div>
        </RoleAwareLayout>
      }
    >
      <SupplierTransactionsContent />
    </Suspense>
  );
}
