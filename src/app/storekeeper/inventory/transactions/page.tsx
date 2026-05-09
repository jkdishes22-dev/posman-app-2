"use client";
import React, { useState, useEffect } from "react";
import { todayEAT } from "../../../shared/eatDate";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../../shared/filterDateUtils";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Table,
    Badge,
    Button,
    Form,
    InputGroup,
    Spinner,
    Alert,
    Row,
    Col,
    Pagination,
    Modal,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";
import { useTooltips } from "../../../hooks/useTooltips";

interface InventoryTransaction {
    id: number;
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    transaction_type: string;
    quantity: number;
    reference_type: string | null;
    reference_id: number | null;
    notes: string | null;
    created_at: string;
    created_by: number | null;
    created_by_user: {
        id: number;
        firstName: string;
        lastName: string;
        username: string;
    } | null;
}

const DEFAULT_PAGE_SIZE = 10;

export default function InventoryTransactionsPage() {
    const apiCall = useApiCall();
    useTooltips();

    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [itemIdFilter, setItemIdFilter] = useState<string>("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
    const [startDate, setStartDate] = useState(() => todayEAT());
    const [endDate, setEndDate] = useState(() => todayEAT());
    const [inventoryItems, setInventoryItems] = useState<{ id: number; name: string; code: string }[]>([]);

    // Add quantity modal state
    const [showAddQuantityModal, setShowAddQuantityModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ id: number; name: string; code: string } | null>(null);
    const [addQuantity, setAddQuantity] = useState<string>("");
    const [addReason, setAddReason] = useState<string>("");
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to first page when search changes
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchTransactions();
    }, [apiCall, page, itemIdFilter, debouncedSearchTerm, startDate, endDate]);

    useEffect(() => {
        apiCall("/api/inventory/transaction-filter-items").then((result) => {
            if (result.status === 200) {
                const raw = Array.isArray(result.data?.items) ? result.data.items : [];
                const byId = new Map<number, { id: number; name: string; code: string }>();
                for (const i of raw) {
                    const id = Number(i?.id);
                    if (!Number.isFinite(id) || byId.has(id)) continue;
                    byId.set(id, { id, name: String(i?.name ?? ""), code: String(i?.code ?? "") });
                }
                setInventoryItems([...byId.values()]);
            }
        }).catch(() => {});
    }, [apiCall]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: DEFAULT_PAGE_SIZE.toString(),
            });
            if (itemIdFilter) params.append("itemId", itemIdFilter);
            if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const result = await apiCall(`/api/inventory/transactions?${params.toString()}`);
            if (result.status === 200) {
                setTransactions(result.data?.transactions || []);
                setTotal(result.data?.total || 0);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to fetch transactions");
                setErrorDetails(result.errorDetails);
                setTransactions([]);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getTransactionTypeBadge = (type: string) => {
        const badges: { [key: string]: { bg: string; label: string; tooltip: string } } = {
            "bill_sale": { bg: "danger", label: "Bill Sale", tooltip: "Inventory deducted when items are sold in a bill" },
            "production_issue": { bg: "success", label: "Production Issue", tooltip: "Inventory added when production items are issued" },
            "manual_adjustment": { bg: "warning", label: "Manual Adjustment", tooltip: "Manual inventory quantity adjustment" },
            "purchase_order": { bg: "info", label: "Purchase Order", tooltip: "Inventory added from purchase orders" },
            "disposal": { bg: "dark", label: "Disposal", tooltip: "Inventory removed due to expiration or damage" },
        };
        const badge = badges[type] || { bg: "secondary", label: type, tooltip: `Transaction type: ${type}` };
        return (
            <Badge
                bg={badge.bg}
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                title={badge.tooltip}
            >
                {badge.label}
            </Badge>
        );
    };

    const getQuantityDisplay = (quantity: number) => {
        const isPositive = quantity > 0;
        return (
            <span className={isPositive ? "text-success" : "text-danger"}>
                {isPositive ? "+" : ""}{quantity}
            </span>
        );
    };

    const formatReferenceType = (referenceType: string | null): string => {
        if (!referenceType) return "";
        // Convert snake_case to Title Case
        return referenceType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const handleAddQuantityClick = (item: { id: number; name: string; code: string }) => {
        setSelectedItem(item);
        setAddQuantity("");
        setAddReason("");
        setAddError(null);
        setShowAddQuantityModal(true);
    };

    const handleAddQuantitySubmit = async () => {
        if (!selectedItem) return;

        setAddError(null);
        const quantity = parseFloat(addQuantity);
        if (isNaN(quantity) || quantity <= 0) {
            setAddError("Please enter a valid quantity (greater than 0)");
            return;
        }

        if (!addReason.trim()) {
            setAddError("Please provide a reason for adding quantity");
            return;
        }

        setIsAdding(true);

        try {
            // First, get current inventory level
            const currentResult = await apiCall(`/api/inventory/${selectedItem.id}`);
            if (currentResult.status !== 200) {
                setAddError("Failed to fetch current inventory level");
                setIsAdding(false);
                return;
            }

            const currentQuantity = currentResult.data?.quantity || 0;
            const newQuantity = currentQuantity + quantity;

            // Adjust inventory with the new total
            const result = await apiCall(`/api/inventory/${selectedItem.id}/adjust`, {
                method: "POST",
                body: JSON.stringify({
                    new_quantity: newQuantity,
                    reason: addReason.trim(),
                }),
            });

            if (result.status >= 200 && result.status < 300) {
                setShowAddQuantityModal(false);
                await fetchTransactions();
                setAddQuantity("");
                setAddReason("");
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setAddError(result.error || "Failed to add quantity");
            }
        } catch (error: any) {
            setAddError("Network error occurred");
        } finally {
            setIsAdding(false);
        }
    };

    const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);
    const startItem = total === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1;
    const endItem = Math.min(page * DEFAULT_PAGE_SIZE, total);

    const inventoryTxnFiltersDirty =
        searchTerm.trim() !== "" ||
        itemIdFilter !== "" ||
        startDate !== todayEAT() ||
        endDate !== todayEAT();

    const clearInventoryTxnFilters = () => {
        const d = todayEAT();
        setSearchTerm("");
        setItemIdFilter("");
        setStartDate(d);
        setEndDate(d);
        setPage(1);
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold">
                        <i className="bi bi-arrow-left-right me-2" aria-hidden></i>
                        Inventory Transactions
                        <i
                            className="bi bi-question-circle ms-2"
                            style={{ cursor: "help", fontSize: "0.9rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="bottom"
                            title="View all inventory movement transactions"
                        ></i>
                    </h1>
                </PageHeaderStrip>

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
                            onSubmit={(e) => {
                                e.preventDefault();
                            }}
                        >
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Search Items</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text>
                                            <i className="bi bi-search"></i>
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by item name or code..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Filter by Item</Form.Label>
                                    <Form.Select
                                        value={itemIdFilter}
                                        onChange={(e) => {
                                            setItemIdFilter(e.target.value);
                                            setPage(1);
                                        }}
                                    >
                                        <option value="">All Items</option>
                                        {inventoryItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.code})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <FilterDatePicker
                                    label="From"
                                    value={startDate}
                                    onChange={(v) => {
                                        setStartDate(v);
                                        setPage(1);
                                    }}
                                    maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()}
                                />
                            </Col>
                            <Col md={2}>
                                <FilterDatePicker
                                    label="To"
                                    value={endDate}
                                    onChange={(v) => {
                                        setEndDate(v);
                                        setPage(1);
                                    }}
                                    minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined}
                                    maxDate={new Date()}
                                />
                            </Col>
                            <Col md={1} className="d-flex align-items-end justify-content-md-end">
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    size="sm"
                                    className="text-nowrap"
                                    disabled={!inventoryTxnFiltersDirty}
                                    onClick={clearInventoryTxnFilters}
                                >
                                    <i className="bi bi-x-lg me-1" aria-hidden />
                                    Clear filters
                                </Button>
                            </Col>
                        </Row>
                        </Form>
                </CollapsibleFilterSectionCard>

                {/* Transactions Table */}
                <Card>
                    <Card.Header className="bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">
                                Transactions ({total > 0 ? `${startItem}-${endItem} of ${total}` : "0"})
                            </h5>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        {isLoading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" />
                                <p className="mt-2">Loading transactions...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-5">
                                <p className="text-muted">No transactions found</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive">
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Item</th>
                                                <th>Type</th>
                                                <th>Quantity</th>
                                                <th>Reference</th>
                                                <th>User</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction) => (
                                                <tr key={transaction.id}>
                                                    <td>
                                                        {new Date(transaction.created_at).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <strong>{transaction.item.name}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    {transaction.item.code}
                                                                </small>
                                                            </div>
                                                            <Button
                                                                variant="outline-success"
                                                                size="sm"
                                                                onClick={() => handleAddQuantityClick({
                                                                    id: transaction.item.id,
                                                                    name: transaction.item.name,
                                                                    code: transaction.item.code
                                                                })}
                                                                title="Add quantity to this item"
                                                            >
                                                                <i className="bi bi-plus-circle"></i>
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {getTransactionTypeBadge(transaction.transaction_type)}
                                                    </td>
                                                    <td className="fw-bold">
                                                        {getQuantityDisplay(transaction.quantity)}
                                                    </td>
                                                    <td>
                                                        {transaction.reference_type ? (
                                                            <Badge bg="secondary">
                                                                {formatReferenceType(transaction.reference_type)}
                                                                {transaction.reference_id ? ` #${transaction.reference_id}` : ""}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {transaction.created_by_user ? (
                                                            <div>
                                                                <strong>{transaction.created_by_user.firstName} {transaction.created_by_user.lastName}</strong>
                                                                <br />
                                                                <small className="text-muted">@{transaction.created_by_user.username}</small>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {transaction.notes || (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {total > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <div className="text-muted">
                                            Showing {startItem} to {endItem} of {total} transactions
                                        </div>
                                        {totalPages > 1 && (
                                            <Pagination className="mb-0">
                                                <Pagination.First
                                                    onClick={() => setPage(1)}
                                                    disabled={page === 1}
                                                />
                                                <Pagination.Prev
                                                    onClick={() => setPage(Math.max(1, page - 1))}
                                                    disabled={page === 1}
                                                />
                                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                    .filter((p) => {
                                                        if (totalPages <= 7) return true;
                                                        return (
                                                            p === 1 ||
                                                            p === totalPages ||
                                                            (p >= page - 1 && p <= page + 1)
                                                        );
                                                    })
                                                    .map((p, idx, arr) => (
                                                        <React.Fragment key={p}>
                                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                                <Pagination.Ellipsis />
                                                            )}
                                                            <Pagination.Item
                                                                active={p === page}
                                                                onClick={() => setPage(p)}
                                                            >
                                                                {p}
                                                            </Pagination.Item>
                                                        </React.Fragment>
                                                    ))}
                                                <Pagination.Next
                                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                    disabled={page === totalPages}
                                                />
                                                <Pagination.Last
                                                    onClick={() => setPage(totalPages)}
                                                    disabled={page === totalPages}
                                                />
                                            </Pagination>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>

                {/* Add Quantity Modal */}
                <Modal show={showAddQuantityModal} onHide={() => setShowAddQuantityModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add Quantity</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedItem && (
                            <>
                                <p>
                                    <strong>Item:</strong> {selectedItem.name} ({selectedItem.code})
                                </p>
                                <Form.Group className="mb-3">
                                    <Form.Label>Quantity to Add <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={addQuantity}
                                        onChange={(e) => setAddQuantity(e.target.value)}
                                        placeholder="Enter quantity to add"
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Reason <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Enter reason for adding quantity..."
                                        value={addReason}
                                        onChange={(e) => setAddReason(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                {addError && (
                                    <Alert variant="danger" dismissible onClose={() => setAddError(null)}>
                                        {addError}
                                    </Alert>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddQuantityModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleAddQuantitySubmit}
                            disabled={isAdding}
                        >
                            {isAdding ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Add Quantity
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
}

