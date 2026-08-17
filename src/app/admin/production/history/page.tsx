"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
    Button, Spinner, Alert, Table, Badge, Row, Col, Form,
    InputGroup, Modal,
} from "react-bootstrap";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import ErrorDisplay from "../../../components/ErrorDisplay";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../../shared/filterDateUtils";
import { EAT_TIMEZONE } from "../../../shared/eatDate";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import EditProductionItemModal from "../EditProductionItemModal";

const PAGE_SIZE = 10;

interface Production {
    id: number;
    name: string;
    status: "open" | "closed";
}

interface ProductionItem {
    id: number;
    production_id: number | null;
    production?: { id: number; name: string; status: string } | null;
    item: { id: number; name: string; code: string };
    quantity_produced: number;
    status: "issued" | "cancelled";
    issued_by_user?: { id: number; firstName: string; lastName: string };
    issued_at: string | null;
    notes: string | null;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function ProductionPicker({
    value,
    onSelect,
    onClear,
    apiCall,
}: {
    value: Production | null;
    onSelect: (p: Production) => void;
    onClear: () => void;
    apiCall: ReturnType<typeof useApiCall>;
}) {
    const [text, setText] = useState("");
    const [options, setOptions] = useState<Production[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debouncedText = useDebounce(text, 280);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!debouncedText.trim() && !open) return;
        setLoading(true);
        const params = new URLSearchParams({ limit: "20", offset: "0" });
        if (debouncedText.trim()) params.set("search", debouncedText.trim());
        apiCall<{ productions: Production[] }>(`/api/production/runs?${params}`).then((res) => {
            setOptions(res.data?.productions ?? []);
            setLoading(false);
        });
    }, [debouncedText, open, apiCall]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    if (value) {
        return (
            <div className="d-flex align-items-center gap-1">
                <Badge bg="primary" className="d-flex align-items-center gap-1 px-2 py-2" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    <i className="bi bi-box-seam me-1" />
                    {value.name}
                    <button
                        type="button"
                        className="btn-close btn-close-white ms-1"
                        style={{ fontSize: "0.6rem" }}
                        aria-label="Clear production filter"
                        onClick={onClear}
                    />
                </Badge>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ position: "relative", minWidth: 240 }}>
            <InputGroup size="sm">
                <InputGroup.Text><i className="bi bi-box-seam" /></InputGroup.Text>
                <Form.Control
                    size="sm"
                    placeholder="Filter by production…"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    autoComplete="off"
                />
                {loading && (
                    <InputGroup.Text><Spinner animation="border" size="sm" /></InputGroup.Text>
                )}
            </InputGroup>
            {open && options.length > 0 && (
                <div
                    className="border rounded shadow-sm bg-white"
                    style={{ position: "absolute", zIndex: 1050, width: "100%", maxHeight: 220, overflowY: "auto", top: "100%", left: 0 }}
                >
                    {options.map((p) => (
                        <div
                            key={p.id}
                            className="px-3 py-2 small d-flex align-items-center gap-2"
                            style={{ cursor: "pointer" }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(p);
                                setText("");
                                setOpen(false);
                            }}
                        >
                            <span className="fw-semibold flex-grow-1">{p.name}</span>
                            <Badge bg={p.status === "open" ? "success" : "secondary"} className="text-capitalize" style={{ fontSize: "0.7rem" }}>
                                {p.status}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
            {open && !loading && options.length === 0 && text.trim() && (
                <div
                    className="border rounded shadow-sm bg-white px-3 py-2 small text-muted"
                    style={{ position: "absolute", zIndex: 1050, width: "100%", top: "100%", left: 0 }}
                >
                    No productions match &ldquo;{text}&rdquo;
                </div>
            )}
        </div>
    );
}

export default function ProductionHistoryPage() {
    const apiCall = useApiCall();
    const pathname = usePathname();

    const basePath = useMemo(() => pathname.replace(/\/history$/, ""), [pathname]);

    const [items, setItems] = useState<ProductionItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchErrorDetails, setFetchErrorDetails] = useState<ApiErrorResponse | null>(null);

    const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "cancelled">("all");
    const [itemSearch, setItemSearch] = useState("");
    const [page, setPage] = useState(1);

    // Edit item state
    const [editItem, setEditItem] = useState<ProductionItem | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Cancel item state
    const [cancelTarget, setCancelTarget] = useState<ProductionItem | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const load = useCallback(async (pageNum: number) => {
        setIsLoading(true);
        setFetchError(null);
        setFetchErrorDetails(null);
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((pageNum - 1) * PAGE_SIZE) });
        if (selectedProduction) params.set("production_id", String(selectedProduction.id));
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (itemSearch.trim()) params.set("item_search", itemSearch.trim());
        const result = await apiCall<{ items: ProductionItem[]; total: number }>(`/api/production/items?${params}`);
        setIsLoading(false);
        if (result.status === 200) {
            setItems(result.data?.items ?? []);
            setTotal(result.data?.total ?? 0);
        } else {
            setFetchError((result as any).error || "Failed to load production items");
            setFetchErrorDetails((result as any).errorDetails ?? null);
        }
    }, [apiCall, selectedProduction, startDate, endDate, statusFilter, itemSearch]);

    useEffect(() => {
        setPage(1);
        void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduction, startDate, endDate, statusFilter]);

    const debouncedItemSearch = useDebounce(itemSearch, 350);
    useEffect(() => {
        setPage(1);
        void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedItemSearch]);

    const handlePageChange = (p: number) => {
        setPage(p);
        void load(p);
    };

    const handleCancelItemConfirm = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        setCancelError(null);
        const result = await apiCall(
            `/api/production/runs/${cancelTarget.production_id}/items/${cancelTarget.id}`,
            { method: "DELETE" },
        );
        setIsCancelling(false);
        if (result.status === 200) {
            setCancelTarget(null);
            void load(page);
        } else {
            setCancelError((result as any).error || "Failed to cancel item");
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const formatIssuedAt = (dt: string | null) => {
        if (!dt) return "—";
        try { return formatInTimeZone(new Date(dt), EAT_TIMEZONE, "MMM d, yyyy HH:mm"); } catch { return "—"; }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid pb-4">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold text-white">Production Transactions</h1>
                </PageHeaderStrip>

                <ErrorDisplay
                    error={fetchError}
                    errorDetails={fetchErrorDetails}
                    onDismiss={() => { setFetchError(null); setFetchErrorDetails(null); }}
                />

                <CollapsibleFilterSectionCard
                    headerActions={
                        <Button size="sm" variant="outline-secondary" onClick={() => void load(page)} disabled={isLoading}>
                            <i className="bi bi-arrow-clockwise" />
                        </Button>
                    }
                >
                    <Row className="g-2 align-items-end flex-wrap">
                        <Col xs={12} md="auto">
                            <Form.Label className="mb-1 small fw-semibold d-block">Production</Form.Label>
                            <ProductionPicker
                                value={selectedProduction}
                                onSelect={(p) => setSelectedProduction(p)}
                                onClear={() => setSelectedProduction(null)}
                                apiCall={apiCall}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="mb-1 small fw-semibold">Item</Form.Label>
                            <Form.Control
                                size="sm"
                                placeholder="Search item…"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="mb-1 small fw-semibold">Status</Form.Label>
                            <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                                <option value="all">All</option>
                                <option value="issued">Issued</option>
                                <option value="cancelled">Cancelled</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <FilterDatePicker id="ph-start" label="From" value={startDate} onChange={setStartDate}
                                maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()} />
                        </Col>
                        <Col md={2}>
                            <FilterDatePicker id="ph-end" label="To" value={endDate} onChange={setEndDate}
                                minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined} maxDate={new Date()} />
                        </Col>
                    </Row>
                </CollapsibleFilterSectionCard>

                {isLoading ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : items.length === 0 ? (
                    <Alert variant="info">No production items found for the selected filters.</Alert>
                ) : (
                    <>
                        <div className="card shadow-sm border-0">
                            <Table hover responsive className="mb-0 small align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Production</th>
                                        <th>Item</th>
                                        <th>Code</th>
                                        <th className="text-end">Qty</th>
                                        <th>Status</th>
                                        <th>Issued By</th>
                                        <th>Issue Date</th>
                                        <th>Notes</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const canAct = item.status === "issued" && item.production?.status === "open";
                                        return (
                                            <tr key={item.id} className={item.status === "cancelled" ? "text-decoration-line-through text-muted" : ""}>
                                                <td className="text-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                                                <td>
                                                    {item.production ? (
                                                        <span className="fw-semibold">{item.production.name}</span>
                                                    ) : (
                                                        <span className="text-muted fst-italic">—</span>
                                                    )}
                                                </td>
                                                <td className="fw-semibold">{item.item.name}</td>
                                                <td className="text-muted">{item.item.code || "—"}</td>
                                                <td className="text-end">{item.quantity_produced}</td>
                                                <td>
                                                    <Badge bg={item.status === "issued" ? "success" : "secondary"} className="text-capitalize">
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {item.issued_by_user
                                                        ? `${item.issued_by_user.firstName} ${item.issued_by_user.lastName}`
                                                        : "—"}
                                                </td>
                                                <td>{formatIssuedAt(item.issued_at)}</td>
                                                <td className="text-muted" style={{ maxWidth: 160 }}>{item.notes || "—"}</td>
                                                <td>
                                                    {canAct && (
                                                        <div className="d-flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-warning"
                                                                title="Edit quantity / item"
                                                                onClick={() => { setEditItem(item); setShowEditModal(true); }}
                                                            >
                                                                <i className="bi bi-pencil" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                title="Cancel item"
                                                                onClick={() => { setCancelError(null); setCancelTarget(item); }}
                                                            >
                                                                <i className="bi bi-x-circle" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                            <span className="text-muted small">{total.toLocaleString()} total item{total !== 1 ? "s" : ""} · page {page} of {totalPages}</span>
                            <div className="d-flex gap-1">
                                <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                                    <i className="bi bi-chevron-left" />
                                </Button>
                                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                    const p = totalPages <= 7 ? i + 1
                                        : page <= 4 ? i + 1
                                        : page >= totalPages - 3 ? totalPages - 6 + i
                                        : page - 3 + i;
                                    return (
                                        <Button key={p} size="sm"
                                            variant={p === page ? "primary" : "outline-secondary"}
                                            onClick={() => handlePageChange(p)}>
                                            {p}
                                        </Button>
                                    );
                                })}
                                <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
                                    <i className="bi bi-chevron-right" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit item modal */}
            {editItem && editItem.production_id && (
                <EditProductionItemModal
                    show={showEditModal}
                    onHide={() => { setShowEditModal(false); setEditItem(null); }}
                    onSaved={() => { setShowEditModal(false); setEditItem(null); void load(page); }}
                    productionId={editItem.production_id}
                    item={editItem}
                />
            )}

            {/* Cancel item confirmation modal */}
            <Modal show={!!cancelTarget} onHide={() => { setCancelTarget(null); setCancelError(null); }} size="sm" centered>
                <Modal.Header closeButton className="bg-warning-subtle">
                    <Modal.Title className="fs-6 fw-bold">Cancel Item</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cancelError && <Alert variant="danger" className="py-2 small">{cancelError}</Alert>}
                    <p className="mb-1 small">
                        Cancel <strong>{cancelTarget?.item.name}</strong> (qty&nbsp;{cancelTarget?.quantity_produced})?
                    </p>
                    <p className="mb-0 small text-muted">This will reverse the inventory added by this item.</p>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <Button size="sm" variant="secondary" onClick={() => { setCancelTarget(null); setCancelError(null); }} disabled={isCancelling}>
                        No, keep it
                    </Button>
                    <Button size="sm" variant="danger" onClick={handleCancelItemConfirm} disabled={isCancelling}>
                        {isCancelling ? <Spinner size="sm" animation="border" /> : "Yes, cancel"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </RoleAwareLayout>
    );
}
