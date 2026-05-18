"use client";
import React, { useState, useEffect, useCallback } from "react";
import { todayEAT } from "../../shared/eatDate";
import FilterDatePicker from "../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../shared/filterDateUtils";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card, Button, Spinner, Alert, Table, Badge, Row, Col,
    Accordion, Form,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { format } from "date-fns";
import IssueProductionModal from "./IssueProductionModal";
import DisposeItemModal from "./DisposeItemModal";
import NewProductionModal from "../../shared/production/NewProductionModal";
import { useTooltips } from "../../hooks/useTooltips";
import PageHeaderStrip from "../../components/PageHeaderStrip";

interface ProductionItem {
    id: number;
    item: { id: number; name: string; code: string };
    quantity_produced: number;
    status: "issued" | "cancelled";
    issued_by_user?: { id: number; firstName: string; lastName: string };
    issued_at: string | null;
    notes: string | null;
}

interface Production {
    id: number;
    name: string;
    description: string | null;
    status: "open" | "closed";
    item_count: number;
    created_at: string;
    items?: ProductionItem[];
}

export default function AdminProductionPage() {
    const apiCall = useApiCall();
    useTooltips();

    const [productions, setProductions] = useState<Production[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchErrorDetails, setFetchErrorDetails] = useState<ApiErrorResponse | null>(null);

    const [startDate, setStartDate] = useState(() => todayEAT());
    const [endDate, setEndDate] = useState(() => todayEAT());
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showNewProductionModal, setShowNewProductionModal] = useState(false);
    const [issueContext, setIssueContext] = useState<{ id: number; name: string } | null>(null);

    const [showDisposeModal, setShowDisposeModal] = useState(false);
    const [disposeItem, setDisposeItem] = useState<{ id: number; name: string; code: string } | null>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});

    const loadProductions = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setFetchErrorDetails(null);
        try {
            const params = new URLSearchParams({ limit: "100", offset: "0" });
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (startDate) params.set("start_date", startDate);
            if (endDate) params.set("end_date", endDate);
            const result = await apiCall<{ productions: Production[] }>(`/api/production/runs?${params}`);
            if (result.status === 200) {
                setProductions(result.data?.productions ?? []);
            } else {
                setFetchError((result as any).error || "Failed to load productions");
                setFetchErrorDetails((result as any).errorDetails ?? null);
            }
        } catch {
            setFetchError("Network error occurred");
        } finally {
            setIsLoading(false);
        }
    }, [apiCall, statusFilter, startDate, endDate]);

    useEffect(() => { void loadProductions(); }, [loadProductions]);

    const loadProductionItems = async (productionId: number) => {
        setLoadingItems((prev) => ({ ...prev, [productionId]: true }));
        try {
            const result = await apiCall<{ items: ProductionItem[] }>(
                `/api/production/runs/${productionId}/items`
            );
            if (result.status === 200) {
                setProductions((prev) =>
                    prev.map((p) => p.id === productionId ? { ...p, items: result.data?.items ?? [] } : p)
                );
            }
        } finally {
            setLoadingItems((prev) => ({ ...prev, [productionId]: false }));
        }
    };

    const handleToggle = (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            const prod = productions.find((p) => p.id === id);
            if (!prod?.items) void loadProductionItems(id);
        }
    };

    const handleCloseProduction = async (id: number) => {
        if (!confirm("Close this production? No more items can be issued to it.")) return;
        const result = await apiCall(`/api/production/runs/${id}`, { method: "PATCH" });
        if (result.status === 200) {
            setProductions((prev) => prev.map((p) => p.id === id ? { ...p, status: "closed" } : p));
        }
    };

    const handleProductionCreated = (production: { id: number; name: string; status: string }) => {
        loadProductions();
        setIssueContext({ id: production.id, name: production.name });
        setShowIssueModal(true);
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold text-white">Production</h1>
                    <Button variant="light" size="sm" onClick={() => setShowNewProductionModal(true)}>
                        <i className="bi bi-plus-circle me-1" />New Production
                    </Button>
                </PageHeaderStrip>

                <ErrorDisplay
                    error={fetchError}
                    errorDetails={fetchErrorDetails}
                    onDismiss={() => { setFetchError(null); setFetchErrorDetails(null); }}
                />

                <Card className="shadow-sm mb-3 border-0">
                    <Card.Body className="py-2">
                        <Row className="g-2 align-items-end">
                            <Col md={3}>
                                <Form.Label className="mb-1 small fw-semibold">Status</Form.Label>
                                <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                                    <option value="all">All</option>
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <FilterDatePicker id="prod-start" label="From" value={startDate} onChange={setStartDate}
                                    maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()} />
                            </Col>
                            <Col md={3}>
                                <FilterDatePicker id="prod-end" label="To" value={endDate} onChange={setEndDate}
                                    minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined} maxDate={new Date()} />
                            </Col>
                            <Col md={3}>
                                <Button size="sm" variant="outline-secondary" onClick={loadProductions} disabled={isLoading}>
                                    <i className="bi bi-arrow-clockwise" />
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {isLoading ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : productions.length === 0 ? (
                    <Alert variant="info">
                        No productions found.{" "}
                        <Button variant="link" className="p-0" onClick={() => setShowNewProductionModal(true)}>
                            Create one now.
                        </Button>
                    </Alert>
                ) : (
                    <Accordion activeKey={expandedId != null ? String(expandedId) : ""}>
                        {productions.map((prod) => (
                            <Accordion.Item key={prod.id} eventKey={String(prod.id)} className="mb-2 border shadow-sm">
                                <Accordion.Header onClick={() => handleToggle(prod.id)}>
                                    <div className="d-flex align-items-center gap-3 flex-wrap w-100 me-3">
                                        <span className="fw-bold">{prod.name}</span>
                                        <Badge bg={prod.status === "open" ? "success" : "secondary"} className="text-capitalize">
                                            {prod.status}
                                        </Badge>
                                        <span className="text-muted small">
                                            {prod.item_count} item{prod.item_count !== 1 ? "s" : ""} issued
                                        </span>
                                        <span className="text-muted small ms-auto">
                                            {format(new Date(prod.created_at), "MMM d, yyyy HH:mm")}
                                        </span>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="d-flex align-items-center gap-2 p-3 border-bottom bg-light flex-wrap">
                                        {prod.description && (
                                            <span className="text-muted small flex-grow-1">{prod.description}</span>
                                        )}
                                        <Button size="sm" variant="outline-primary"
                                            disabled={prod.status !== "open"}
                                            onClick={() => { setIssueContext({ id: prod.id, name: prod.name }); setShowIssueModal(true); }}>
                                            <i className="bi bi-plus me-1" />Issue Item
                                        </Button>
                                        {prod.status === "open" && (
                                            <Button size="sm" variant="outline-secondary" onClick={() => handleCloseProduction(prod.id)}>
                                                <i className="bi bi-lock me-1" />Close
                                            </Button>
                                        )}
                                    </div>

                                    {loadingItems[prod.id] ? (
                                        <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                                    ) : prod.items && prod.items.length > 0 ? (
                                        <Table striped hover responsive className="mb-0 small">
                                            <thead>
                                                <tr>
                                                    <th>Item</th><th>Qty</th><th>Issued By</th>
                                                    <th>Issued At</th><th>Notes</th><th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prod.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="fw-semibold">{item.item.name}</div>
                                                            <div className="text-muted">{item.item.code}</div>
                                                        </td>
                                                        <td>{item.quantity_produced}</td>
                                                        <td>{item.issued_by_user ? `${item.issued_by_user.firstName} ${item.issued_by_user.lastName}` : "—"}</td>
                                                        <td>{item.issued_at ? format(new Date(item.issued_at), "MMM d HH:mm") : "—"}</td>
                                                        <td className="text-muted">{item.notes || "—"}</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-danger"
                                                                onClick={() => { setDisposeItem(item.item); setShowDisposeModal(true); }}>
                                                                <i className="bi bi-trash" /> Dispose
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : prod.items ? (
                                        <div className="text-center text-muted py-3 small">No items issued yet.</div>
                                    ) : null}
                                </Accordion.Body>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                )}

                <IssueProductionModal
                    show={showIssueModal}
                    onHide={() => { setShowIssueModal(false); setIssueContext(null); }}
                    onSuccess={() => {
                        if (issueContext) void loadProductionItems(issueContext.id);
                        loadProductions();
                    }}
                    productionId={issueContext?.id}
                    productionName={issueContext?.name}
                />
                <NewProductionModal
                    show={showNewProductionModal}
                    onHide={() => setShowNewProductionModal(false)}
                    onCreated={handleProductionCreated}
                />
                <DisposeItemModal
                    show={showDisposeModal}
                    onHide={() => { setShowDisposeModal(false); setDisposeItem(null); }}
                    onSuccess={loadProductions}
                    item={disposeItem}
                />
            </div>
        </RoleAwareLayout>
    );
}
