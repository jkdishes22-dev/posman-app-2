"use client";
import React, { useState, useEffect, useRef } from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Form,
    Button,
    InputGroup,
    Spinner,
    Alert,
    Table,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";
import { useTooltips } from "../../../hooks/useTooltips";

interface SellableItem {
    id: number;
    name: string;
    code: string;
    category: string;
    isStock: boolean;
}

interface ProductionIssue {
    id: number;
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    quantity_produced: number;
    status: string;
    issued_by: number;
    issued_by_user?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    issued_at: string;
    notes: string | null;
}

export default function ProductionIssuePage() {
    const apiCall = useApiCall();
    useTooltips();

    const [selectedItem, setSelectedItem] = useState<SellableItem | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState<string>("");
    const [itemSearchResults, setItemSearchResults] = useState<SellableItem[]>([]);
    const [itemSearchLoading, setItemSearchLoading] = useState<boolean>(false);
    const [showItemDropdown, setShowItemDropdown] = useState<boolean>(false);
    const [quantity, setQuantity] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [currentInventory, setCurrentInventory] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const itemInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                itemInputRef.current &&
                !itemInputRef.current.contains(event.target as Node)
            ) {
                setShowItemDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (itemSearchQuery.trim().length > 0) {
            const timeoutId = setTimeout(() => {
                searchSellableItems(itemSearchQuery);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            setSelectedItem(null);
            setCurrentInventory(null);
        }
    }, [itemSearchQuery]);

    useEffect(() => {
        if (selectedItem) {
            fetchInventoryLevel(selectedItem.id);
        }
    }, [selectedItem]);

    const searchSellableItems = async (query: string) => {
        if (query.trim().length === 0) {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }

        setItemSearchLoading(true);
        try {
            const result = await apiCall(`/api/items/sellable?q=${encodeURIComponent(query)}&limit=10`);
            if (result.status >= 200 && result.status < 300) {
                const items = result.data?.items || [];
                setItemSearchResults(items);
                setShowItemDropdown(items.length > 0);
            } else {
                setItemSearchResults([]);
                setShowItemDropdown(false);
            }
        } catch (error: any) {
            console.error("Error searching items:", error);
            setItemSearchResults([]);
            setShowItemDropdown(false);
        } finally {
            setItemSearchLoading(false);
        }
    };

    const selectItem = (item: SellableItem) => {
        setSelectedItem(item);
        setItemSearchQuery(item.name);
        setShowItemDropdown(false);
    };

    const fetchInventoryLevel = async (itemId: number) => {
        try {
            const result = await apiCall(`/api/inventory/${itemId}`);
            if (result.status >= 200 && result.status < 300) {
                const inventory = result.data;
                // Use available_quantity (quantity - reserved_quantity) if available, otherwise calculate it
                const availableQuantity = inventory?.available_quantity ??
                    ((inventory?.quantity || 0) - (inventory?.reserved_quantity || 0));
                setCurrentInventory(availableQuantity);
            } else {
                // Item might not have inventory yet, set to 0
                setCurrentInventory(0);
            }
        } catch (error: any) {
            // Item might not have inventory yet, set to 0
            setCurrentInventory(0);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccessMessage(null);
        setError(null);
        setErrorDetails(null);

        if (!selectedItem) {
            setFormError("Please select an item");
            return;
        }

        const quantityNum = parseInt(quantity, 10);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            setFormError("Please enter a valid quantity greater than 0");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await apiCall("/api/production/preparations/issue-directly", {
                method: "POST",
                body: JSON.stringify({
                    item_id: selectedItem.id,
                    quantity_prepared: quantityNum,
                    notes: notes.trim() || null,
                }),
            });

            if (result.status >= 200 && result.status < 300) {
                setSuccessMessage(`Successfully issued production: ${quantityNum} ${selectedItem.name}`);
                // Reset form
                setSelectedItem(null);
                setItemSearchQuery("");
                setQuantity("");
                setNotes("");
                setCurrentInventory(null);
                // Refresh inventory level if item is still selected
                if (selectedItem) {
                    await fetchInventoryLevel(selectedItem.id);
                }
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setFormError(result.error || "Failed to create production issue");
                setErrorDetails(result.errorDetails);
            }
        } catch (error: any) {
            setFormError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="bg-primary text-white p-3 mb-4">
                    <h1 className="h4 mb-0 fw-bold">
                        <i className="bi bi-plus-circle me-2"></i>
                        Issue Production Directly
                        <i
                            className="bi bi-question-circle ms-2"
                            style={{ cursor: "help", fontSize: "0.9rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="bottom"
                            title="Issue production directly (bypasses chef preparation workflow). Alternatively, review and approve chef preparation requests on the Preparations page."
                        ></i>
                    </h1>
                    <p className="mb-0 small">Issue production directly (bypasses chef preparation workflow)</p>
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

                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                )}


                <Card>
                    <Card.Body>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Item <span className="text-danger">*</span></Form.Label>
                                <div className="position-relative">
                                    <InputGroup>
                                        <Form.Control
                                            ref={itemInputRef}
                                            type="text"
                                            placeholder="Search for sellable item..."
                                            value={itemSearchQuery}
                                            onChange={(e) => {
                                                setItemSearchQuery(e.target.value);
                                                if (e.target.value.trim().length === 0) {
                                                    setSelectedItem(null);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (itemSearchResults.length > 0) {
                                                    setShowItemDropdown(true);
                                                }
                                            }}
                                        />
                                        {itemSearchLoading && (
                                            <InputGroup.Text>
                                                <Spinner animation="border" size="sm" />
                                            </InputGroup.Text>
                                        )}
                                    </InputGroup>

                                    {showItemDropdown && itemSearchResults.length > 0 && (
                                        <div
                                            ref={dropdownRef}
                                            className="position-absolute w-100 bg-white border rounded shadow-lg"
                                            style={{
                                                zIndex: 1000,
                                                maxHeight: "300px",
                                                overflowY: "auto",
                                                top: "100%",
                                                marginTop: "2px",
                                            }}
                                        >
                                            {itemSearchResults.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="p-2 cursor-pointer hover-bg-light"
                                                    style={{ cursor: "pointer" }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        selectItem(item);
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "white";
                                                    }}
                                                >
                                                    <div className="fw-semibold">{item.name}</div>
                                                    <small className="text-muted">
                                                        {item.code} • {item.category}
                                                    </small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedItem && (
                                    <div className="mt-2">
                                        <small className="text-muted">
                                            Selected: <strong>{selectedItem.name}</strong> ({selectedItem.code})
                                        </small>
                                    </div>
                                )}
                            </Form.Group>

                            {selectedItem && currentInventory !== null && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Current Inventory</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={currentInventory}
                                        readOnly
                                        className="bg-light"
                                    />
                                </Form.Group>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label>Quantity Produced <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Enter quantity"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Optional notes about this production..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </Form.Group>

                            {formError && (
                                <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
                                    {formError}
                                </Alert>
                            )}

                            <div className="d-flex gap-2">
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={isSubmitting || !selectedItem || !quantity}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Issuing...
                                        </>
                                    ) : (
                                        "Issue Production"
                                    )}
                                </Button>
                                <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={() => {
                                        setSelectedItem(null);
                                        setItemSearchQuery("");
                                        setQuantity("");
                                        setNotes("");
                                        setCurrentInventory(null);
                                        setFormError(null);
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </RoleAwareLayout>
    );
}

