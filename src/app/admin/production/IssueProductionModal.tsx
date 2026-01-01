"use client";
import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Button, Spinner, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";

interface SellableItem {
    id: number;
    name: string;
    code: string;
    category: string;
    isStock: boolean;
}

interface IssueProductionModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
}

export default function IssueProductionModal({ show, onHide, onSuccess }: IssueProductionModalProps) {
    const apiCall = useApiCall();

    // Form state
    const [selectedItem, setSelectedItem] = useState<SellableItem | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState<string>("");
    const [itemSearchResults, setItemSearchResults] = useState<SellableItem[]>([]);
    const [itemSearchLoading, setItemSearchLoading] = useState<boolean>(false);
    const [showItemDropdown, setShowItemDropdown] = useState<boolean>(false);
    const [quantity, setQuantity] = useState<string>("");
    const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState<string>("");
    const [currentInventory, setCurrentInventory] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    const itemInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (show) {
            // Reset form when modal opens
            setSelectedItem(null);
            setItemSearchQuery("");
            setQuantity("");
            setNotes("");
            setIssueDate(new Date().toISOString().split("T")[0]);
            setCurrentInventory(null);
            setFormError(null);
            setError(null);
            setErrorDetails(null);
            setSuccessMessage(null);
        }
    }, [show]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchRef.current &&
                !searchRef.current.contains(event.target as Node)
            ) {
                setShowItemDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Search items when query changes
    useEffect(() => {
        if (itemSearchQuery.trim().length > 0) {
            const timeoutId = setTimeout(() => {
                searchSellableItems(itemSearchQuery);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            if (itemSearchQuery === "") {
                setSelectedItem(null);
                setCurrentInventory(null);
            }
        }
    }, [itemSearchQuery]);

    // Fetch inventory when item is selected
    useEffect(() => {
        if (selectedItem) {
            fetchInventoryLevel(selectedItem.id);
        } else {
            setCurrentInventory(null);
        }
    }, [selectedItem]);

    const searchSellableItems = async (query: string) => {
        setItemSearchLoading(true);
        try {
            const result = await apiCall(`/api/items/sellable?q=${encodeURIComponent(query)}`);
            if (result.status >= 200 && result.status < 300) {
                setItemSearchResults(result.data.items || []);
                setShowItemDropdown(true);
            } else {
                setItemSearchResults([]);
                setShowItemDropdown(false);
            }
        } catch (error) {
            console.error("Error searching sellable items:", error);
            setItemSearchResults([]);
            setShowItemDropdown(false);
        } finally {
            setItemSearchLoading(false);
        }
    };

    const fetchInventoryLevel = async (itemId: number) => {
        try {
            const result = await apiCall(`/api/inventory/${itemId}`);
            if (result.status >= 200 && result.status < 300) {
                // Use available_quantity (quantity - reserved_quantity) if available, otherwise calculate it
                const availableQuantity = result.data.available_quantity ??
                    ((result.data.quantity || 0) - (result.data.reserved_quantity || 0));
                setCurrentInventory(availableQuantity);
            } else {
                setCurrentInventory(0);
            }
        } catch (error) {
            setCurrentInventory(0);
        }
    };

    const selectItem = (item: SellableItem) => {
        setSelectedItem(item);
        setItemSearchQuery(`${item.name} (${item.code})`);
        setShowItemDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setError(null);
        setErrorDetails(null);
        setSuccessMessage(null);

        if (!selectedItem) {
            setFormError("Please select an item to issue.");
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            setFormError("Quantity must be a positive number.");
            return;
        }

        if (!issueDate) {
            setFormError("Please select an issue date.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                item_id: selectedItem.id,
                quantity_prepared: Number(quantity),
                notes: notes.trim() || null,
                issue_date: issueDate,
            };

            const result = await apiCall("/api/production/preparations/issue-directly", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (result.status >= 200 && result.status < 300) {
                setSuccessMessage(`Successfully issued ${quantity} units of ${selectedItem.name} to inventory.`);
                // Reset form
                setSelectedItem(null);
                setItemSearchQuery("");
                setQuantity("");
                setNotes("");
                setIssueDate(new Date().toISOString().split("T")[0]);
                setCurrentInventory(null);
                // Call onSuccess to refresh history
                onSuccess();
                // Close modal after a short delay to show success message
                setTimeout(() => {
                    onHide();
                }, 1500);
            } else {
                if (result.status === 403) {
                    setError(result.error || "Access denied: Missing permissions");
                    setErrorDetails(result.errorDetails);
                    setFormError(null);
                } else {
                    setFormError(result.error || "Failed to issue production.");
                    setErrorDetails(result.errorDetails);
                    setError(null);
                }
            }
        } catch (error: any) {
            setFormError("Network error occurred.");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormError(null);
        setError(null);
        setErrorDetails(null);
        setSuccessMessage(null);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-arrow-up-circle me-2"></i>
                    Issue Production
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-4">
                <ErrorDisplay
                    error={error || formError}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                        setFormError(null);
                    }}
                />

                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    <Form.Group controlId="formItem" className="mb-3">
                        <Form.Label>Item to Issue <span className="text-danger">*</span></Form.Label>
                        <div ref={searchRef} style={{ position: "relative" }}>
                            <div
                                className="form-control"
                                style={{
                                    cursor: "text",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.375rem 0.75rem",
                                }}
                                onClick={() => {
                                    if (itemInputRef.current) {
                                        itemInputRef.current.focus();
                                    }
                                    if (itemSearchResults.length > 0 || itemSearchQuery.trim().length > 0) {
                                        setShowItemDropdown(true);
                                    }
                                }}
                            >
                                <input
                                    ref={itemInputRef}
                                    type="text"
                                    className="border-0"
                                    style={{
                                        flex: 1,
                                        outline: "none",
                                        backgroundColor: "transparent",
                                    }}
                                    placeholder="Search for sellable items (e.g., Tortilla, Coffee, Omelette)"
                                    value={itemSearchQuery}
                                    onChange={(e) => {
                                        setItemSearchQuery(e.target.value);
                                        setSelectedItem(null);
                                        setShowItemDropdown(true);
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowItemDropdown(true);
                                    }}
                                    onFocus={(e) => {
                                        e.stopPropagation();
                                        if (itemSearchResults.length > 0 || itemSearchQuery.trim().length > 0) {
                                            setShowItemDropdown(true);
                                        }
                                    }}
                                    autoComplete="off"
                                />
                                {itemSearchLoading && (
                                    <Spinner animation="border" size="sm" className="me-2" />
                                )}
                                <i className={`bi bi-chevron-${showItemDropdown ? "up" : "down"} text-muted`}></i>
                            </div>

                            {showItemDropdown && (itemSearchResults.length > 0 || itemSearchQuery.trim().length > 0) && (
                                <div
                                    ref={dropdownRef}
                                    className="position-absolute w-100 bg-white border rounded shadow-lg"
                                    style={{
                                        zIndex: 1000,
                                        maxHeight: "300px",
                                        overflowY: "auto",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    {itemSearchLoading ? (
                                        <div className="p-3 text-center">
                                            <Spinner animation="border" size="sm" />
                                            <span className="ms-2 text-muted">Searching...</span>
                                        </div>
                                    ) : itemSearchResults.length > 0 ? (
                                        itemSearchResults.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-2 border-bottom"
                                                style={{
                                                    cursor: "pointer",
                                                    backgroundColor: selectedItem?.id === item.id ? "#e7f3ff" : "white",
                                                }}
                                                onClick={() => selectItem(item)}
                                                onMouseEnter={(e) => {
                                                    if (selectedItem?.id !== item.id) {
                                                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedItem?.id !== item.id) {
                                                        e.currentTarget.style.backgroundColor = "white";
                                                    }
                                                }}
                                            >
                                                <div className="fw-semibold">{item.name}</div>
                                                <div className="text-muted small">{item.code} • {item.category}</div>
                                            </div>
                                        ))
                                    ) : itemSearchQuery.trim().length > 0 ? (
                                        <div className="p-3 text-center text-muted">
                                            No items found
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <Form.Text className="text-muted">
                            Select the item to issue to inventory. Only sellable items are listed here.
                        </Form.Text>
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group controlId="formQuantity" className="mb-3">
                                <Form.Label>Quantity to Issue <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity"
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group controlId="formIssueDate" className="mb-3">
                                <Form.Label>Issue Date <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    required
                                />
                            </Form.Group>
                        </div>
                    </div>

                    {selectedItem && currentInventory !== null && (
                        <Form.Group controlId="formCurrentInventory" className="mb-3">
                            <Form.Label>Current Inventory</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentInventory}
                                readOnly
                                className="bg-light"
                            />
                        </Form.Group>
                    )}

                    <Form.Group controlId="formNotes" className="mb-3">
                        <Form.Label>Notes (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any relevant notes about this production issue"
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedItem || !quantity || !issueDate}
                >
                    {isSubmitting ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Issuing...
                        </>
                    ) : (
                        <>
                            <i className="bi bi-check-circle me-2"></i>
                            Issue Production
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

