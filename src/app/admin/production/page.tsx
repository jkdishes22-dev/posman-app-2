"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import FilterDatePicker from "../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../shared/filterDateUtils";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Button, Spinner, Alert, Badge, Row, Col, Form, Modal,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { format } from "date-fns";
import IssueProductionModal from "./IssueProductionModal";
import NewProductionModal from "../../shared/production/NewProductionModal";
import { useTooltips } from "../../hooks/useTooltips";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import CollapsibleFilterSectionCard from "../../components/CollapsibleFilterSectionCard";

interface Production {
    id: number;
    name: string;
    description: string | null;
    status: "open" | "closed";
    item_count: number;
    created_at: string;
}

export default function AdminProductionPage() {
    const apiCall = useApiCall();
    const router = useRouter();
    const pathname = usePathname();
    useTooltips();

    const [productions, setProductions] = useState<Production[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchErrorDetails, setFetchErrorDetails] = useState<ApiErrorResponse | null>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showNewProductionModal, setShowNewProductionModal] = useState(false);
    const [issueContext, setIssueContext] = useState<{ id: number; name: string } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<Production | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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

    const handleCloseProduction = async (id: number) => {
        if (!confirm("Close this production? No more items can be issued to it.")) return;
        const result = await apiCall(`/api/production/runs/${id}`, { method: "PATCH" });
        if (result.status === 200) {
            setProductions((prev) => prev.map((p) => p.id === id ? { ...p, status: "closed" } : p));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setDeleteError(null);
        const result = await apiCall(`/api/production/runs/${deleteTarget.id}`, { method: "DELETE" });
        setIsDeleting(false);
        if (result.status === 200) {
            setDeleteTarget(null);
            void loadProductions();
        } else {
            setDeleteError((result as any).error || "Failed to delete production");
        }
    };

    const handleProductionCreated = (production: { id: number }) => {
        void loadProductions();
        router.push(`${pathname}/${production.id}`);
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold text-white">Production</h1>
                </PageHeaderStrip>

                <ErrorDisplay
                    error={fetchError}
                    errorDetails={fetchErrorDetails}
                    onDismiss={() => { setFetchError(null); setFetchErrorDetails(null); }}
                />

                <CollapsibleFilterSectionCard
                    headerActions={
                        <>
                            <Button size="sm" variant="outline-secondary" onClick={loadProductions} disabled={isLoading}>
                                <i className="bi bi-arrow-clockwise" />
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => setShowNewProductionModal(true)}>
                                <i className="bi bi-plus-circle me-1" />New Production
                            </Button>
                        </>
                    }
                >
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
                    </Row>
                </CollapsibleFilterSectionCard>

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
                    <div>
                        {productions.map((prod) => (
                            <div key={prod.id} className="card mb-2 shadow-sm border">
                                <div className="card-body d-flex align-items-center gap-2 flex-wrap py-2">
                                    {/* Clickable info area */}
                                    <div
                                        className="d-flex align-items-center gap-2 flex-wrap flex-grow-1"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => router.push(`${pathname}/${prod.id}`)}
                                    >
                                        <span className="fw-bold">{prod.name}</span>
                                        <Badge bg={prod.status === "open" ? "success" : "secondary"} className="text-capitalize">
                                            {prod.status}
                                        </Badge>
                                        <span className="text-muted small">
                                            {prod.item_count} item{prod.item_count !== 1 ? "s" : ""} issued
                                        </span>
                                        <span className="text-muted small">
                                            {format(new Date(prod.created_at), "MMM d, yyyy HH:mm")}
                                        </span>
                                        {prod.description && (
                                            <span className="text-muted small fst-italic">{prod.description}</span>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="d-flex gap-1 flex-shrink-0">
                                        <Button size="sm" variant="outline-secondary"
                                            onClick={() => router.push(`${pathname}/${prod.id}`)}
                                            title="View items">
                                            <i className="bi bi-eye" />
                                        </Button>
                                        {prod.status === "open" && (
                                            <>
                                                <Button size="sm" variant="primary"
                                                    onClick={() => { setIssueContext({ id: prod.id, name: prod.name }); setShowIssueModal(true); }}>
                                                    <i className="bi bi-plus-circle me-1" />Issue Item
                                                </Button>
                                                <Button size="sm" variant="outline-secondary"
                                                    onClick={() => handleCloseProduction(prod.id)}>
                                                    <i className="bi bi-lock me-1" />Close
                                                </Button>
                                            </>
                                        )}
                                        <Button size="sm" variant="outline-danger"
                                            onClick={() => { setDeleteError(null); setDeleteTarget(prod); }}
                                            title="Delete production">
                                            <i className="bi bi-trash" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete confirmation modal */}
                <Modal show={!!deleteTarget} onHide={() => !isDeleting && setDeleteTarget(null)} centered>
                    <Modal.Header closeButton className={deleteTarget?.item_count ? "bg-warning text-dark" : "bg-danger text-white"}>
                        <Modal.Title className="fw-bold">
                            <i className="bi bi-trash me-2" />
                            {deleteTarget?.item_count ? "Archive Production?" : "Delete Production?"}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {deleteError && <Alert variant="danger">{deleteError}</Alert>}
                        {deleteTarget?.item_count ? (
                            <>
                                <Alert variant="warning" className="mb-3">
                                    <strong>{deleteTarget.name}</strong> has{" "}
                                    <strong>{deleteTarget.item_count} issued item{deleteTarget.item_count !== 1 ? "s" : ""}</strong>.
                                    These are recorded in inventory transactions.
                                </Alert>
                                <p>
                                    The production will be <strong>archived</strong> (hidden from the list) rather than permanently deleted,
                                    so inventory transaction records remain intact for auditing.
                                </p>
                            </>
                        ) : (
                            <p>
                                Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>?
                                This cannot be undone.
                            </p>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button
                            variant={deleteTarget?.item_count ? "warning" : "danger"}
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting
                                ? <><Spinner animation="border" size="sm" className="me-2" />Processing…</>
                                : deleteTarget?.item_count
                                    ? <><i className="bi bi-archive me-1" />Archive</>
                                    : <><i className="bi bi-trash me-1" />Delete</>
                            }
                        </Button>
                    </Modal.Footer>
                </Modal>

                <IssueProductionModal
                    show={showIssueModal}
                    onHide={() => { setShowIssueModal(false); setIssueContext(null); }}
                    onSuccess={() => { void loadProductions(); }}
                    productionId={issueContext?.id}
                    productionName={issueContext?.name}
                />
                <NewProductionModal
                    show={showNewProductionModal}
                    onHide={() => setShowNewProductionModal(false)}
                    onCreated={handleProductionCreated}
                />
            </div>
        </RoleAwareLayout>
    );
}
