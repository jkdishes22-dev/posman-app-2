"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Row,
    Col,
    Badge,
    Button,
    Table,
    Modal,
    Form,
    InputGroup,
    Spinner,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { AuthError } from "../../types/types";

interface PurchaseOrderItem {
    id: number;
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    quantity_ordered: number;
    quantity_received: number;
    unit_price: number;
    subtotal: number;
}

interface PurchaseOrder {
    id: number;
    order_number: string;
    supplier_id: number;
    supplier: {
        id: number;
        name: string;
    };
    order_date: string;
    expected_delivery_date: string | null;
    status: "draft" | "sent" | "partial" | "received" | "cancelled";
    total_amount: number;
    notes: string | null;
    items: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
    const apiCall = useApiCall();

    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    /** Active non-group items marked as stock (suppliable) — full list for PO line dropdowns. */
    const [suppliableCatalog, setSuppliableCatalog] = useState<{ id: number; name: string; code: string }[]>([]);
    const [suppliableCatalogLoading, setSuppliableCatalogLoading] = useState(false);

    // Supplier search states for type-ahead
    const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");
    const [showSupplierDropdown, setShowSupplierDropdown] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        supplier_id: "",
        expected_delivery_date: "",
        notes: "",
        items: [] as Array<{ item_id: string; quantity_ordered: string; unit_price: string }>,
    });
    const [receiveFormData, setReceiveFormData] = useState<Array<{ item_id: number; quantity_received: string }>>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [formErrorDetails, setFormErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const clearFormErrorState = () => {
        setFormError(null);
        setFormErrorDetails(null);
    };

    // Search and filter
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "partial" | "received" | "cancelled">("all");
    const [supplierFilter, setSupplierFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        fetchPurchaseOrders();
        fetchSuppliers();
    }, [apiCall]);

    useEffect(() => {
        filterPurchaseOrders();
    }, [purchaseOrders, searchTerm, statusFilter, supplierFilter, startDate, endDate]);

    useEffect(() => {
        if (!showCreateModal) return;
        let cancelled = false;
        (async () => {
            setSuppliableCatalogLoading(true);
            try {
                const result = await apiCall("/api/items/suppliable?limit=5000");
                if (cancelled) return;
                if (result.status >= 200 && result.status < 300) {
                    const raw = Array.isArray(result.data?.items) ? result.data.items : [];
                    const byId = new Map<number, { id: number; name: string; code: string }>();
                    for (const row of raw) {
                        const id = Number(row?.id);
                        if (!Number.isFinite(id) || byId.has(id)) continue;
                        byId.set(id, {
                            id,
                            name: String(row?.name ?? ""),
                            code: String(row?.code ?? ""),
                        });
                    }
                    setSuppliableCatalog([...byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
                } else {
                    setSuppliableCatalog([]);
                }
            } finally {
                if (!cancelled) setSuppliableCatalogLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showCreateModal, apiCall]);

    const fetchPurchaseOrders = async () => {
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall("/api/purchase-orders");
            if (result.status >= 200 && result.status < 300) {
                const data = Array.isArray(result.data) ? result.data : [];
                setPurchaseOrders(data);
                setFilteredPOs(data);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to fetch purchase orders");
                setErrorDetails(result.errorDetails);
                setPurchaseOrders([]);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setPurchaseOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const result = await apiCall("/api/suppliers");
            if (result.status >= 200 && result.status < 300) {
                setSuppliers(Array.isArray(result.data) ? result.data : []);
            }
        } catch (error: any) {
            console.error("Failed to fetch suppliers", error);
        }
    };

    const filterPurchaseOrders = () => {
        let filtered = [...purchaseOrders];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(po =>
                po.order_number.toLowerCase().includes(term) ||
                po.supplier?.name?.toLowerCase().includes(term) ||
                (po.notes || "").toLowerCase().includes(term)
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(po => po.status === statusFilter);
        }

        if (supplierFilter !== "all") {
            filtered = filtered.filter(po => po.supplier_id === Number(supplierFilter));
        }

        if (startDate) {
            const from = new Date(startDate + "T00:00:00");
            filtered = filtered.filter(po => new Date(po.order_date) >= from);
        }

        if (endDate) {
            const to = new Date(endDate + "T23:59:59");
            filtered = filtered.filter(po => new Date(po.order_date) <= to);
        }

        setFilteredPOs(filtered);
    };

    const handleCreate = () => {
        setFormData({
            supplier_id: "",
            expected_delivery_date: "",
            notes: "",
            items: [{ item_id: "", quantity_ordered: "", unit_price: "" }],
        });
        clearFormErrorState();
        setSupplierSearchQuery("");
        setShowSupplierDropdown(false);
        setShowCreateModal(true);
    };

    const handleView = async (po: PurchaseOrder) => {
        setSelectedPO(po);
        setShowViewModal(true);
    };

    const handleReceive = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setReceiveFormData(
            po.items.map(item => ({
                item_id: item.item_id,
                quantity_received: item.quantity_received.toString()
            }))
        );
        clearFormErrorState();
        setShowReceiveModal(true);
    };

    const handleCancel = (po: PurchaseOrder) => {
        setSelectedPO(po);
        clearFormErrorState();
        setShowCancelModal(true);
    };

    const addItemRow = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_id: "", quantity_ordered: "", unit_price: "" }],
        });
    };

    const removeItemRow = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const updateItemRow = (index: number, field: string, value: string) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearFormErrorState();

        if (!formData.supplier_id) {
            setFormError("Supplier is required");
            return;
        }

        if (formData.items.length === 0) {
            setFormError("At least one item is required");
            return;
        }

        // Validate all items
        for (const item of formData.items) {
            if (!item.item_id || !item.quantity_ordered || !item.unit_price) {
                setFormError("All item fields are required");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const payload = {
                supplier_id: Number(formData.supplier_id),
                expected_delivery_date: formData.expected_delivery_date || null,
                notes: formData.notes.trim() || null,
                items: formData.items.map(item => ({
                    item_id: Number(item.item_id),
                    quantity_ordered: Number(item.quantity_ordered),
                    unit_price: parseFloat(item.unit_price),
                })),
            };

            const result = await apiCall("/api/purchase-orders", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (result.status >= 200 && result.status < 300) {
                await fetchPurchaseOrders();
                setShowCreateModal(false);
                setFormData({
                    supplier_id: "",
                    expected_delivery_date: "",
                    notes: "",
                    items: [{ item_id: "", quantity_ordered: "", unit_price: "" }],
                });
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setFormError(result.error || "Failed to create purchase order");
                setFormErrorDetails(result.errorDetails ?? null);
            }
        } catch (error: any) {
            setFormError("Network error occurred");
            setFormErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPO) return;

        clearFormErrorState();
        setIsSubmitting(true);

        try {
            const payload = {
                items: receiveFormData.map(item => ({
                    item_id: item.item_id,
                    quantity_received: Number(item.quantity_received),
                })),
            };

            const result = await apiCall(`/api/purchase-orders/${selectedPO.id}/receive`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (result.status >= 200 && result.status < 300) {
                await fetchPurchaseOrders();
                setShowReceiveModal(false);
                setSelectedPO(null);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setFormError(result.error || "Failed to receive purchase order");
                setFormErrorDetails(result.errorDetails ?? null);
            }
        } catch (error: any) {
            setFormError("Network error occurred");
            setFormErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!selectedPO) return;

        setIsSubmitting(true);
        clearFormErrorState();

        try {
            const result = await apiCall(`/api/purchase-orders/${selectedPO.id}/cancel`, {
                method: "POST",
            });

            if (result.status >= 200 && result.status < 300) {
                await fetchPurchaseOrders();
                setShowCancelModal(false);
                setSelectedPO(null);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setFormError(result.error || "Failed to cancel purchase order");
                setFormErrorDetails(result.errorDetails ?? null);
            }
        } catch (error: any) {
            setFormError("Network error occurred");
            setFormErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; label: string }> = {
            draft: { bg: "secondary", label: "Draft" },
            sent: { bg: "info", label: "Sent" },
            partial: { bg: "warning", label: "Partial" },
            received: { bg: "success", label: "Received" },
            cancelled: { bg: "danger", label: "Cancelled" },
        };
        const config = statusConfig[status] || { bg: "secondary", label: status };
        return <Badge bg={config.bg}>{config.label}</Badge>;
    };

    const canReceive = (po: PurchaseOrder) => {
        // Allow receiving from draft, sent, or partial status
        // Draft POs can be received directly without sending first
        return po.status === "draft" || po.status === "sent" || po.status === "partial";
    };

    const canCancel = (po: PurchaseOrder) => {
        return po.status === "draft" || po.status === "sent";
    };

    const clearErrors = () => {
        setError(null);
        setErrorDetails(null);
        setAuthError(null);
    };

    if (isLoading) {
        return (
            <RoleAwareLayout>
                <div className="container-fluid">
                    <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                </div>
            </RoleAwareLayout>
        );
    }

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                {/* Header */}
                <div className="bg-primary text-white p-3 mb-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <h1 className="h4 mb-0 fw-bold">
                            <i className="bi bi-cart-check me-2"></i>
                            Purchase Orders
                        </h1>
                        <Button variant="light" onClick={handleCreate}>
                            <i className="bi bi-plus-circle me-1"></i>
                            Create PO
                        </Button>
                    </div>
                </div>

                <ErrorDisplay
                    error={error}
                    errorDetails={errorDetails}
                    onDismiss={clearErrors}
                />

                {/* Search and Filter */}
                <Card className="mb-4">
                    <Card.Body>
                        <Row className="g-2">
                            <Col md={3}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search PO, supplier, notes…"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={2}>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="sent">Sent</option>
                                    <option value="partial">Partial</option>
                                    <option value="received">Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Form.Select
                                    value={supplierFilter}
                                    onChange={(e) => setSupplierFilter(e.target.value)}
                                >
                                    <option value="all">All Suppliers</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id.toString()}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    max={endDate || undefined}
                                    placeholder="From"
                                    title="From date"
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    placeholder="To"
                                    title="To date"
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Col>
                            <Col md={1} className="text-end d-flex align-items-center justify-content-end gap-2">
                                <Badge bg="secondary" className="fs-6 p-2">
                                    {filteredPOs.length} PO{filteredPOs.length !== 1 ? "s" : ""}
                                </Badge>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Purchase Orders Table */}
                <Card>
                    <Card.Body>
                        {filteredPOs.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                                <p className="text-muted">
                                    {searchTerm || statusFilter !== "all" || supplierFilter !== "all"
                                        ? "No purchase orders match your search criteria"
                                        : "No purchase orders found. Click 'Create PO' to get started."}
                                </p>
                            </div>
                        ) : (
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Supplier</th>
                                        <th>Order Date</th>
                                        <th>Expected Delivery</th>
                                        <th>Total Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPOs.map((po) => (
                                        <tr key={po.id}>
                                            <td className="fw-semibold">{po.order_number}</td>
                                            <td>{po.supplier?.name || "N/A"}</td>
                                            <td>{new Date(po.order_date).toLocaleDateString()}</td>
                                            <td>
                                                {po.expected_delivery_date
                                                    ? new Date(po.expected_delivery_date).toLocaleDateString()
                                                    : "-"}
                                            </td>
                                            <td>${po?.total_amount != null ? Number(po.total_amount).toFixed(2) : "0.00"}</td>
                                            <td>{getStatusBadge(po.status)}</td>
                                            <td>
                                                <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleView(po)}
                                                    title="View Details"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                {canReceive(po) && (
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => handleReceive(po)}
                                                        title="Receive Goods"
                                                    >
                                                        <i className="bi bi-check-circle"></i>
                                                    </Button>
                                                )}
                                                {canCancel(po) && (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleCancel(po)}
                                                        title="Cancel PO"
                                                    >
                                                        <i className="bi bi-x-circle"></i>
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>

                {/* Create PO Modal */}
                <Modal
                    show={showCreateModal}
                    onHide={() => {
                        setShowCreateModal(false);
                        clearFormErrorState();
                        setSupplierSearchQuery("");
                        setShowSupplierDropdown(false);
                    }}
                    size="lg"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Create Purchase Order</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleCreateSubmit}>
                        <Modal.Body>
                            {formError && (
                                <ErrorDisplay
                                    error={formError}
                                    errorDetails={formErrorDetails ?? undefined}
                                    onDismiss={clearFormErrorState}
                                />
                            )}
                            <Form.Group className="mb-3 position-relative">
                                <Form.Label>Supplier <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search suppliers by name..."
                                    value={supplierSearchQuery || (formData.supplier_id ? suppliers.find(s => s.id.toString() === formData.supplier_id)?.name || "" : "")}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSupplierSearchQuery(value);

                                        // Filter suppliers as user types
                                        if (value.length >= 1) {
                                            setShowSupplierDropdown(true);
                                        } else {
                                            setShowSupplierDropdown(false);
                                            setFormData({ ...formData, supplier_id: "" });
                                        }
                                    }}
                                    onFocus={() => {
                                        // Always show dropdown when focused if there are suppliers
                                        if (suppliers.length > 0) {
                                            setShowSupplierDropdown(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Delay closing dropdown to allow click on dropdown items
                                        setTimeout(() => {
                                            setShowSupplierDropdown(false);
                                        }, 200);
                                    }}
                                    required
                                    autoComplete="off"
                                />
                                {showSupplierDropdown && (
                                    <div
                                        className="position-absolute w-100 bg-white border rounded shadow-lg"
                                        style={{ zIndex: 1050, maxHeight: "200px", overflowY: "auto", top: "100%" }}
                                    >
                                        {suppliers
                                            .filter(s => {
                                                if (!supplierSearchQuery) return s.status === "active";
                                                const query = supplierSearchQuery.toLowerCase();
                                                return s.status === "active" && (
                                                    s.name.toLowerCase().includes(query) ||
                                                    s.contact_person?.toLowerCase().includes(query) ||
                                                    s.email?.toLowerCase().includes(query)
                                                );
                                            })
                                            .map((supplier) => (
                                                <div
                                                    key={supplier.id}
                                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => {
                                                        setFormData({ ...formData, supplier_id: supplier.id.toString() });
                                                        setSupplierSearchQuery(supplier.name);
                                                        setShowSupplierDropdown(false);
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.classList.add("bg-light")}
                                                    onMouseLeave={(e) => e.currentTarget.classList.remove("bg-light")}
                                                >
                                                    <div className="fw-semibold">{supplier.name}</div>
                                                    {supplier.contact_person && (
                                                        <small className="text-muted">Contact: {supplier.contact_person}</small>
                                                    )}
                                                </div>
                                            ))}
                                        {suppliers.filter(s => {
                                            if (!supplierSearchQuery) return s.status === "active";
                                            const query = supplierSearchQuery.toLowerCase();
                                            return s.status === "active" && (
                                                s.name.toLowerCase().includes(query) ||
                                                s.contact_person?.toLowerCase().includes(query) ||
                                                s.email?.toLowerCase().includes(query)
                                            );
                                        }).length === 0 && (
                                                <div className="p-2 text-muted">No suppliers found</div>
                                            )}
                                    </div>
                                )}
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Expected Delivery Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={formData.expected_delivery_date}
                                            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </Form.Group>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <Form.Label className="mb-0">Items <span className="text-danger">*</span></Form.Label>
                                    <Button variant="outline-primary" size="sm" type="button" onClick={addItemRow}>
                                        <i className="bi bi-plus-circle me-1"></i>
                                        Add Item
                                    </Button>
                                </div>
                                {formData.items.map((item, index) => (
                                    <Card key={index} className="mb-2">
                                        <Card.Body>
                                            <Row>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label>
                                                            Suppliable item <span className="text-danger">*</span>
                                                        </Form.Label>
                                                        <Form.Select
                                                            value={item.item_id}
                                                            onChange={(e) => updateItemRow(index, "item_id", e.target.value)}
                                                            required
                                                            disabled={suppliableCatalogLoading}
                                                        >
                                                            <option value="">
                                                                {suppliableCatalogLoading ? "Loading items…" : "Select item…"}
                                                            </option>
                                                            {suppliableCatalog.map((opt) => (
                                                                <option key={opt.id} value={String(opt.id)}>
                                                                    {opt.name} ({opt.code})
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                        <Form.Text className="text-muted">
                                                            Only items marked as stock (suppliable) appear here. Other non-group items are received via production.
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label>Quantity</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            min="1"
                                                            placeholder="Qty"
                                                            value={item.quantity_ordered}
                                                            onChange={(e) => updateItemRow(index, "quantity_ordered", e.target.value)}
                                                            required
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label>Unit Price</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="Price"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItemRow(index, "unit_price", e.target.value)}
                                                            required
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2} className="d-flex align-items-end">
                                                    {formData.items.length > 1 && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => removeItemRow(index)}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </Button>
                                                    )}
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create PO"
                                )}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* View PO Modal */}
                <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <i className="bi bi-cart-check me-2"></i>
                            {selectedPO?.order_number}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedPO && (
                            <>
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <Card className="h-100">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0">Order Information</h6>
                                            </Card.Header>
                                            <Card.Body>
                                                <p className="mb-2">
                                                    <strong>Supplier:</strong> {selectedPO.supplier?.name || "N/A"}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Order Date:</strong> {new Date(selectedPO.order_date).toLocaleDateString()}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Expected Delivery:</strong>{" "}
                                                    {selectedPO.expected_delivery_date
                                                        ? new Date(selectedPO.expected_delivery_date).toLocaleDateString()
                                                        : "Not set"}
                                                </p>
                                                <p className="mb-0">
                                                    <strong>Status:</strong> {getStatusBadge(selectedPO.status)}
                                                </p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="h-100">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0">Financial Information</h6>
                                            </Card.Header>
                                            <Card.Body>
                                                <p className="mb-2">
                                                    <strong>Total Amount:</strong> ${selectedPO?.total_amount != null ? Number(selectedPO.total_amount).toFixed(2) : "0.00"}
                                                </p>
                                                {selectedPO.notes && (
                                                    <p className="mb-0">
                                                        <strong>Notes:</strong> {selectedPO.notes}
                                                    </p>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                <Card>
                                    <Card.Header className="bg-light">
                                        <h6 className="mb-0">Order Items</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Table responsive size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Code</th>
                                                    <th>Quantity Ordered</th>
                                                    <th>Quantity Received</th>
                                                    <th>Unit Price</th>
                                                    <th>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPO.items?.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.item?.name || "N/A"}</td>
                                                        <td><code>{item.item?.code || "N/A"}</code></td>
                                                        <td>{item.quantity_ordered}</td>
                                                        <td>
                                                            {item.quantity_received}
                                                            {item.quantity_received < item.quantity_ordered && (
                                                                <Badge bg="warning" className="ms-2">
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td>${item?.unit_price != null ? Number(item.unit_price).toFixed(2) : "0.00"}</td>
                                                        <td>${item?.subtotal != null ? Number(item.subtotal).toFixed(2) : "0.00"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={5} className="text-end fw-bold">
                                                        Total:
                                                    </td>
                                                    <td className="fw-bold">${selectedPO?.total_amount != null ? Number(selectedPO.total_amount).toFixed(2) : "0.00"}</td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                            Close
                        </Button>
                        {selectedPO && canReceive(selectedPO) && (
                            <Button variant="success" onClick={() => {
                                setShowViewModal(false);
                                handleReceive(selectedPO);
                            }}>
                                <i className="bi bi-check-circle me-1"></i>
                                Receive Goods
                            </Button>
                        )}
                    </Modal.Footer>
                </Modal>

                {/* Receive Goods Modal */}
                <Modal
                    show={showReceiveModal}
                    onHide={() => {
                        setShowReceiveModal(false);
                        clearFormErrorState();
                    }}
                    size="lg"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Receive Goods - {selectedPO?.order_number}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleReceiveSubmit}>
                        <Modal.Body>
                            {formError && (
                                <ErrorDisplay
                                    error={formError}
                                    errorDetails={formErrorDetails ?? undefined}
                                    onDismiss={clearFormErrorState}
                                />
                            )}
                            <p className="text-muted mb-3">
                                Enter the quantity received for each item. You can receive items partially.
                            </p>
                            <Table responsive>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Ordered</th>
                                        <th>Already Received</th>
                                        <th>Quantity to Receive</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPO?.items?.map((item, index) => {
                                        const remaining = item.quantity_ordered - item.quantity_received;
                                        const receiveItem = receiveFormData.find(r => r.item_id === item.item_id);
                                        return (
                                            <tr key={item.id}>
                                                <td>{item.item?.name || "N/A"}</td>
                                                <td>{item.quantity_ordered}</td>
                                                <td>{item.quantity_received}</td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        value={receiveItem?.quantity_received || "0"}
                                                        onChange={(e) => {
                                                            const newData = [...receiveFormData];
                                                            const existingIndex = newData.findIndex(r => r.item_id === item.item_id);
                                                            if (existingIndex >= 0) {
                                                                newData[existingIndex].quantity_received = e.target.value;
                                                            } else {
                                                                newData.push({
                                                                    item_id: item.item_id,
                                                                    quantity_received: e.target.value,
                                                                });
                                                            }
                                                            setReceiveFormData(newData);
                                                        }}
                                                    />
                                                    <small className="text-muted">Max: {remaining}</small>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="success" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Receiving...
                                    </>
                                ) : (
                                    "Receive Goods"
                                )}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* Cancel PO Modal */}
                <Modal
                    show={showCancelModal}
                    onHide={() => {
                        setShowCancelModal(false);
                        clearFormErrorState();
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Confirm Cancel</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {formError && (
                            <ErrorDisplay
                                error={formError}
                                errorDetails={formErrorDetails ?? undefined}
                                onDismiss={clearFormErrorState}
                            />
                        )}
                        <p>
                            Are you sure you want to cancel purchase order <strong>{selectedPO?.order_number}</strong>?
                        </p>
                        <p className="text-muted small">
                            This action cannot be undone. The purchase order will be marked as cancelled.
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                            No, Keep It
                        </Button>
                        <Button variant="danger" onClick={handleConfirmCancel} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Cancelling...
                                </>
                            ) : (
                                "Yes, Cancel PO"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
}

