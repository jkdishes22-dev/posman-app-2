"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
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
    Modal,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { AuthError } from "../../types/types";
import { useTooltips } from "../../hooks/useTooltips";

interface InventoryItem {
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
        isStock: boolean;
        category?: {
            id: number;
            name: string;
        };
        created_at?: string;
    };
    quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    min_stock_level: number | null;
    max_stock_level: number | null;
    reorder_point: number | null;
    is_low_stock: boolean;
    created_at?: string;
}

export default function StockManagementPage() {
    const apiCall = useApiCall();
    const searchParams = useSearchParams();
    useTooltips();

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);

    // Filters
    const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "stock" | "produced">("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
    const [outOfStockOnly, setOutOfStockOnly] = useState<boolean>(false);

    // Adjustment modal
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [adjustQuantity, setAdjustQuantity] = useState<string>("");
    const [adjustReason, setAdjustReason] = useState<string>("");
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustError, setAdjustError] = useState<string | null>(null);

    useEffect(() => {
        // Read filter from URL query params
        const filterParam = searchParams?.get("filter");
        if (filterParam === "lowStock") {
            setLowStockOnly(true);
            setOutOfStockOnly(false);
        } else if (filterParam === "outOfStock") {
            setOutOfStockOnly(true);
            setLowStockOnly(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchInventory();
    }, [apiCall]);

    useEffect(() => {
        filterInventoryItems();
    }, [inventoryItems, itemTypeFilter, searchTerm, lowStockOnly, outOfStockOnly]);

    const fetchInventory = async () => {
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall("/api/inventory");
            if (result.status >= 200 && result.status < 300) {
                const items = Array.isArray(result.data) ? result.data : [];
                setInventoryItems(items);
                setFilteredItems(items);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to fetch inventory");
                setErrorDetails(result.errorDetails);
                setInventoryItems([]);
                setFilteredItems([]);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setInventoryItems([]);
            setFilteredItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterInventoryItems = () => {
        let filtered = [...inventoryItems];

        // Filter by item type
        if (itemTypeFilter === "stock") {
            filtered = filtered.filter((item) => item.item.isStock === true);
        } else if (itemTypeFilter === "produced") {
            filtered = filtered.filter((item) => item.item.isStock === false);
        }

        // Filter by search term
        if (searchTerm.trim().length > 0) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.item.name.toLowerCase().includes(searchLower) ||
                    item.item.code.toLowerCase().includes(searchLower)
            );
        }

        // Filter by low stock
        if (lowStockOnly) {
            filtered = filtered.filter((item) => item.is_low_stock);
        }

        // Filter by out of stock
        if (outOfStockOnly) {
            filtered = filtered.filter((item) => item.available_quantity <= 0);
        }

        // Sort by date created (newest first)
        // Try item.created_at first, then inventory created_at, then item ID as fallback
        filtered.sort((a, b) => {
            const dateA = a.item.created_at
                ? new Date(a.item.created_at).getTime()
                : (a.created_at ? new Date(a.created_at).getTime() : a.item.id);
            const dateB = b.item.created_at
                ? new Date(b.item.created_at).getTime()
                : (b.created_at ? new Date(b.created_at).getTime() : b.item.id);
            return dateB - dateA; // Descending order (newest first)
        });

        setFilteredItems(filtered);
    };

    const handleAdjustClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setAdjustQuantity(item.quantity.toString());
        setAdjustReason("");
        setAdjustError(null);
        setShowAdjustModal(true);
    };

    const handleAdjustSubmit = async () => {
        if (!selectedItem) return;

        setAdjustError(null);
        const newQuantity = parseFloat(adjustQuantity);
        if (isNaN(newQuantity) || newQuantity < 0) {
            setAdjustError("Please enter a valid quantity (>= 0)");
            return;
        }

        if (!adjustReason.trim()) {
            setAdjustError("Please provide a reason for the adjustment");
            return;
        }

        setIsAdjusting(true);

        try {
            const result = await apiCall(`/api/inventory/${selectedItem.item_id}/adjust`, {
                method: "POST",
                body: JSON.stringify({
                    new_quantity: newQuantity,
                    reason: adjustReason.trim(),
                }),
            });

            if (result.status >= 200 && result.status < 300) {
                setShowAdjustModal(false);
                await fetchInventory();
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setAdjustError(result.error || "Failed to adjust inventory");
            }
        } catch (error: any) {
            setAdjustError("Network error occurred");
        } finally {
            setIsAdjusting(false);
        }
    };

    const getItemTypeBadge = (isStock: boolean) => {
        return isStock ? (
            <Badge bg="primary">Stock Item</Badge>
        ) : (
            <Badge bg="info">Produced Item</Badge>
        );
    };

    const getStockStatusBadge = (item: InventoryItem) => {
        if (item.available_quantity === 0) {
            return <Badge bg="danger">Out of Stock</Badge>;
        } else if (item.is_low_stock) {
            return <Badge bg="warning">Low Stock</Badge>;
        } else {
            return <Badge bg="success">In Stock</Badge>;
        }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>
                        Stock Management
                        <i
                            className="bi bi-question-circle ms-2 text-muted"
                            style={{ cursor: "help", fontSize: "0.9rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="bottom"
                            title="View all inventory items and their current levels"
                        ></i>
                    </h2>
                </div>

                <ErrorDisplay
                    error={error}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                    }}
                />

                {authError && (
                    <Alert variant="danger" dismissible onClose={() => setAuthError(null)}>
                        {authError.message}
                    </Alert>
                )}

                <Card className="mb-4">
                    <Card.Body>
                        <Row>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Search Item</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by name or code..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Item Type</Form.Label>
                                    <Form.Select
                                        value={itemTypeFilter}
                                        onChange={(e) => setItemTypeFilter(e.target.value as any)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="stock">Stock Items</option>
                                        <option value="produced">Produced Items</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>&nbsp;</Form.Label>
                                    <div>
                                        <Form.Check
                                            type="checkbox"
                                            label="Low Stock Only"
                                            checked={lowStockOnly}
                                            onChange={(e) => setLowStockOnly(e.target.checked)}
                                        />
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => {
                                        setItemTypeFilter("all");
                                        setSearchTerm("");
                                        setLowStockOnly(false);
                                    }}
                                >
                                    Clear
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card>
                    <Card.Body>
                        {isLoading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" />
                                <p className="mt-2">Loading inventory...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-5">
                                <p className="text-muted">No inventory items found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Type</th>
                                            <th>Quantity</th>
                                            <th>Reserved</th>
                                            <th>Available</th>
                                            <th>Min Level</th>
                                            <th>Reorder Point</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item) => (
                                            <tr key={item.item_id}>
                                                <td>
                                                    <div>
                                                        <strong>{item.item.name}</strong>
                                                        <br />
                                                        <small className="text-muted">{item.item.code}</small>
                                                        {item.item.category && (
                                                            <>
                                                                <br />
                                                                <small className="text-muted">
                                                                    {item.item.category.name}
                                                                </small>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{getItemTypeBadge(item.item.isStock)}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.reserved_quantity}</td>
                                                <td>
                                                    <strong>{item.available_quantity}</strong>
                                                </td>
                                                <td>{item.min_stock_level || "N/A"}</td>
                                                <td>{item.reorder_point || "N/A"}</td>
                                                <td>{getStockStatusBadge(item)}</td>
                                                <td>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleAdjustClick(item)}
                                                    >
                                                        <i className="bi bi-pencil"></i> Adjust
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Adjustment Modal */}
                <Modal show={showAdjustModal} onHide={() => setShowAdjustModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Adjust Inventory</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedItem && (
                            <>
                                <p>
                                    <strong>Item:</strong> {selectedItem.item.name} ({selectedItem.item.code})
                                </p>
                                <p>
                                    <strong>Current Quantity:</strong> {selectedItem.quantity}
                                </p>
                                <Form.Group className="mb-3">
                                    <Form.Label>New Quantity <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={adjustQuantity}
                                        onChange={(e) => setAdjustQuantity(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Reason <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Enter reason for adjustment..."
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                {adjustError && (
                                    <Alert variant="danger" dismissible onClose={() => setAdjustError(null)}>
                                        {adjustError}
                                    </Alert>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAdjustSubmit}
                            disabled={isAdjusting}
                        >
                            {isAdjusting ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Adjusting...
                                </>
                            ) : (
                                "Adjust"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
}

