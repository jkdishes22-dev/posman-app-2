"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import {
    Button, Spinner, Alert, Table, Badge, Form,
    InputGroup, Modal,
} from "react-bootstrap";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { EAT_TIMEZONE } from "../../../shared/eatDate";
import IssueProductionModal from "../IssueProductionModal";
import EditProductionItemModal from "../EditProductionItemModal";

const PAGE_SIZE = 25;

interface ProductionItem {
    id: number;
    production_id: number;
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
}

export default function ProductionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productionId = Number(params.id);
    const apiCall = useApiCall();

    const [production, setProduction] = useState<Production | null>(null);
    const [items, setItems] = useState<ProductionItem[]>([]);
    const [loadingHeader, setLoadingHeader] = useState(true);
    const [loadingItems, setLoadingItems] = useState(false);
    const [headerError, setHeaderError] = useState<string | null>(null);
    const [headerErrorDetails, setHeaderErrorDetails] = useState<ApiErrorResponse | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState<ProductionItem | null>(null);

    // Cancel item
    const [cancelTarget, setCancelTarget] = useState<ProductionItem | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // Delete production
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadHeader = useCallback(async () => {
        setLoadingHeader(true);
        setHeaderError(null);
        const result = await apiCall<Production>(`/api/production/runs/${productionId}`);
        setLoadingHeader(false);
        if (result.status === 200 && result.data) {
            const { items: _items, ...header } = result.data as any;
            setProduction(header as Production);
        } else if (result.status === 404) {
            setHeaderError("Production not found.");
        } else {
            setHeaderError((result as any).error || "Failed to load production");
            setHeaderErrorDetails((result as any).errorDetails ?? null);
        }
    }, [apiCall, productionId]);

    const loadItems = useCallback(async () => {
        setLoadingItems(true);
        const result = await apiCall<{ items: ProductionItem[]; total: number }>(
            `/api/production/runs/${productionId}/items?limit=500&offset=0`
        );
        setLoadingItems(false);
        if (result.status === 200) {
            setItems(result.data?.items ?? []);
        }
    }, [apiCall, productionId]);

    useEffect(() => {
        void loadHeader();
        void loadItems();
    }, [loadHeader, loadItems]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (it) =>
                it.item.name.toLowerCase().includes(q) ||
                it.item.code?.toLowerCase().includes(q)
        );
    }, [items, search]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleCloseProduction = async () => {
        if (!confirm("Close this production? No more items can be issued to it.")) return;
        const result = await apiCall(`/api/production/runs/${productionId}`, { method: "PATCH" });
        if (result.status === 200) {
            setProduction((prev) => prev ? { ...prev, status: "closed" } : prev);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        setDeleteError(null);
        const result = await apiCall(`/api/production/runs/${productionId}`, { method: "DELETE" });
        setIsDeleting(false);
        if (result.status === 200) {
            router.back();
        } else {
            setDeleteError((result as any).error || "Failed to delete production");
        }
    };

    const handleCancelItemConfirm = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        setCancelError(null);
        const result = await apiCall(
            `/api/production/runs/${cancelTarget.production_id}/items/${cancelTarget.id}`,
            { method: "DELETE" }
        );
        setIsCancelling(false);
        if (result.status === 200) {
            setCancelTarget(null);
            void loadItems();
            void loadHeader();
        } else {
            setCancelError((result as any).error || "Failed to cancel item");
        }
    };

    const formatIssuedAt = (issued_at: string | null) => {
        if (!issued_at) return "—";
        try { return formatInTimeZone(new Date(issued_at), EAT_TIMEZONE, "MMM d, yyyy HH:mm"); } catch { return "—"; }
    };

    if (loadingHeader) {
        return (
            <RoleAwareLayout>
                <div className="text-center py-5"><Spinner animation="border" /></div>
            </RoleAwareLayout>
        );
    }

    if (headerError || !production) {
        return (
            <RoleAwareLayout>
                <div className="container-fluid">
                    {headerErrorDetails && (
                        <ErrorDisplay error={headerError} errorDetails={headerErrorDetails}
                            onDismiss={() => { setHeaderError(null); setHeaderErrorDetails(null); }} />
                    )}
                    {!headerErrorDetails && <Alert variant="danger">{headerError || "Production not found."}</Alert>}
                    <Button variant="secondary" onClick={() => router.back()}>
                        <i className="bi bi-arrow-left me-1" />Back
                    </Button>
                </div>
            </RoleAwareLayout>
        );
    }

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Button variant="outline-light" size="sm" onClick={() => router.back()}>
                            <i className="bi bi-arrow-left" />
                        </Button>
                        <h1 className="h4 mb-0 fw-bold text-white">{production.name}</h1>
                        <Badge bg={production.status === "open" ? "success" : "secondary"} className="text-capitalize">
                            {production.status}
                        </Badge>
                    </div>
                </PageHeaderStrip>

                {/* Production meta + action buttons */}
                <div className="card shadow-sm border-0 mb-3">
                    <div className="card-body py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex gap-4 flex-wrap align-items-center small text-muted">
                            <span><i className="bi bi-calendar me-1" />Created: {format(new Date(production.created_at), "MMM d, yyyy HH:mm")}</span>
                            <span><i className="bi bi-box me-1" />{production.item_count} item{production.item_count !== 1 ? "s" : ""} issued</span>
                            {production.description && <span><i className="bi bi-chat-left-text me-1" />{production.description}</span>}
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                            {production.status === "open" && (
                                <>
                                    <Button variant="outline-primary" size="sm" onClick={() => setShowIssueModal(true)}>
                                        <i className="bi bi-plus-circle me-1" />Issue Item
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={handleCloseProduction}>
                                        <i className="bi bi-lock me-1" />Close
                                    </Button>
                                </>
                            )}
                            <Button variant="outline-danger" size="sm"
                                onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}>
                                <i className="bi bi-trash me-1" />Delete
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search + refresh toolbar */}
                <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
                    <InputGroup style={{ maxWidth: 320 }}>
                        <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
                        <Form.Control
                            placeholder="Search by item name or code…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && (
                            <Button variant="outline-secondary" onClick={() => { setSearch(""); setPage(1); }}>
                                <i className="bi bi-x" />
                            </Button>
                        )}
                    </InputGroup>
                    <span className="text-muted small ms-auto">
                        {filteredItems.length} of {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    <Button size="sm" variant="outline-secondary" onClick={loadItems} disabled={loadingItems}>
                        <i className="bi bi-arrow-clockwise" />
                    </Button>
                </div>

                {/* Items table */}
                {loadingItems ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : filteredItems.length === 0 ? (
                    <Alert variant="info">
                        {search ? `No items match "${search}".` : "No items issued yet."}
                        {production.status === "open" && !search && (
                            <> <Button variant="link" className="p-0" onClick={() => setShowIssueModal(true)}>Issue the first item.</Button></>
                        )}
                    </Alert>
                ) : (
                    <>
                        <div className="card shadow-sm border-0">
                            <Table hover responsive className="mb-0 small align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Item</th>
                                        <th>Code</th>
                                        <th className="text-end">Qty</th>
                                        <th>Status</th>
                                        <th>Issued By</th>
                                        <th>Issue Date</th>
                                        <th>Notes</th>
                                        {production.status === "open" && <th style={{ width: 96 }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((item, idx) => (
                                        <tr key={item.id} className={item.status === "cancelled" ? "text-muted" : ""}>
                                            <td className="text-muted">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                                            <td className={item.status === "cancelled" ? "text-decoration-line-through" : "fw-semibold"}>
                                                {item.item.name}
                                            </td>
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
                                            <td className="text-muted" style={{ maxWidth: 180 }}>
                                                {item.notes || "—"}
                                            </td>
                                            {production.status === "open" && (
                                                <td>
                                                    {item.status === "issued" && (
                                                        <div className="d-flex gap-1">
                                                            <Button size="sm" variant="outline-warning" title="Edit quantity / item"
                                                                onClick={() => { setEditItem(item); setShowEditModal(true); }}>
                                                                <i className="bi bi-pencil" />
                                                            </Button>
                                                            <Button size="sm" variant="outline-danger" title="Cancel item"
                                                                onClick={() => { setCancelError(null); setCancelTarget(item); }}>
                                                                <i className="bi bi-x-circle" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 small text-muted">
                                <span>Page {safePage} of {totalPages}</span>
                                <div className="d-flex gap-1">
                                    <Button size="sm" variant="outline-secondary"
                                        disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                                        <i className="bi bi-chevron-left" />
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                        const p = totalPages <= 7 ? i + 1
                                            : safePage <= 4 ? i + 1
                                            : safePage >= totalPages - 3 ? totalPages - 6 + i
                                            : safePage - 3 + i;
                                        return (
                                            <Button key={p} size="sm"
                                                variant={p === safePage ? "primary" : "outline-secondary"}
                                                onClick={() => setPage(p)}>
                                                {p}
                                            </Button>
                                        );
                                    })}
                                    <Button size="sm" variant="outline-secondary"
                                        disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                                        <i className="bi bi-chevron-right" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Cancel item confirmation */}
                <Modal show={!!cancelTarget} onHide={() => !isCancelling && setCancelTarget(null)} centered size="sm">
                    <Modal.Header closeButton className="bg-warning text-dark">
                        <Modal.Title className="fw-bold fs-6">Cancel Item?</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {cancelError && <Alert variant="danger" className="mb-2 py-2 small">{cancelError}</Alert>}
                        <p className="mb-0 small">
                            Cancel <strong>{cancelTarget?.item.name}</strong> (qty {cancelTarget?.quantity_produced})?
                            The inventory entry will be reversed.
                        </p>
                    </Modal.Body>
                    <Modal.Footer className="py-2">
                        <Button size="sm" variant="secondary" onClick={() => setCancelTarget(null)} disabled={isCancelling}>No</Button>
                        <Button size="sm" variant="warning" onClick={handleCancelItemConfirm} disabled={isCancelling}>
                            {isCancelling ? <Spinner animation="border" size="sm" /> : "Cancel item"}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Delete production confirmation */}
                <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)} centered>
                    <Modal.Header closeButton className={production.item_count ? "bg-warning text-dark" : "bg-danger text-white"}>
                        <Modal.Title className="fw-bold">
                            <i className="bi bi-trash me-2" />
                            {production.item_count ? "Archive Production?" : "Delete Production?"}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {deleteError && <Alert variant="danger">{deleteError}</Alert>}
                        {production.item_count ? (
                            <>
                                <Alert variant="warning" className="mb-3">
                                    <strong>{production.name}</strong> has{" "}
                                    <strong>{production.item_count} issued item{production.item_count !== 1 ? "s" : ""}</strong>{" "}
                                    recorded in inventory transactions.
                                </Alert>
                                <p>
                                    The production will be <strong>archived</strong> (hidden from the list) rather than permanently deleted,
                                    preserving the inventory audit trail.
                                </p>
                            </>
                        ) : (
                            <p>Permanently delete <strong>{production.name}</strong>? This cannot be undone.</p>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
                        <Button variant={production.item_count ? "warning" : "danger"} onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting
                                ? <><Spinner animation="border" size="sm" className="me-2" />Processing…</>
                                : production.item_count
                                    ? <><i className="bi bi-archive me-1" />Archive</>
                                    : <><i className="bi bi-trash me-1" />Delete</>}
                        </Button>
                    </Modal.Footer>
                </Modal>

                <IssueProductionModal
                    show={showIssueModal}
                    onHide={() => setShowIssueModal(false)}
                    onSuccess={() => { void loadItems(); void loadHeader(); }}
                    productionId={production.id}
                    productionName={production.name}
                />
                <EditProductionItemModal
                    show={showEditModal}
                    onHide={() => { setShowEditModal(false); setEditItem(null); }}
                    onSaved={() => { void loadItems(); void loadHeader(); }}
                    productionId={production.id}
                    item={editItem}
                />
            </div>
        </RoleAwareLayout>
    );
}
