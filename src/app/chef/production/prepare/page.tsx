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
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";

interface SellableItem {
    id: number;
    name: string;
    code: string;
    category: string;
    isStock: boolean;
}

export default function ChefPreparationPage() {
    const apiCall = useApiCall();

    const [selectedItem, setSelectedItem] = useState<SellableItem | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState<string>("");
    const [itemSearchResults, setItemSearchResults] = useState<SellableItem[]>([]);
    const [itemSearchLoading, setItemSearchLoading] = useState<boolean>(false);
    const [showItemDropdown, setShowItemDropdown] = useState<boolean>(false);
    const [quantity, setQuantity] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
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
        }
    }, [itemSearchQuery]);

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
            setFormError("Please select an item to prepare.");
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            setFormError("Quantity prepared must be a positive number.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                item_id: selectedItem.id,
                quantity_prepared: Number(quantity),
                notes: notes.trim() || null,
            };

            const result = await apiCall("/api/production/preparations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (result.status >= 200 && result.status < 300) {
                setSuccessMessage(
                    `Successfully created preparation request for ${quantity} units of ${selectedItem.name}. ` +
                    "Waiting for supervisor approval."
                );
                setSelectedItem(null);
                setItemSearchQuery("");
                setQuantity("");
                setNotes("");
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                    setErrorDetails(result.errorDetails);
                } else {
                    setFormError(result.error || "Failed to create preparation request.");
                    setErrorDetails(result.errorDetails);
                }
            }
        } catch (error: any) {
            setFormError("Network error occurred.");
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
                        Prepare Production
                    </h1>
                    <p className="mb-0 small">Create a preparation request for supervisor approval</p>
                </div>

                <ErrorDisplay
                    error={error || formError}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                        setFormError(null);
                    }}
                />

                {authError && (
                    <Alert variant="danger" dismissible onClose={() => setAuthError(null)}>
                        <Alert.Heading>Access Denied</Alert.Heading>
                        <p>{authError.message}</p>
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                )}

                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">New Preparation Request</Card.Header>
                    <Card.Body>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="formItem" className="mb-3">
                                <Form.Label>Item to Prepare</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        ref={itemInputRef}
                                        type="text"
                                        placeholder="Search for sellable items (e.g., Tortilla, Coffee, Omelette)"
                                        value={itemSearchQuery}
                                        onChange={(e) => {
                                            setItemSearchQuery(e.target.value);
                                            if (e.target.value === "") {
                                                setSelectedItem(null);
                                            }
                                        }}
                                        autoComplete="off"
                                    />
                                    {itemSearchLoading && (
                                        <div className="position-absolute end-0 top-50 translate-middle-y me-2">
                                            <Spinner animation="border" size="sm" />
                                        </div>
                                    )}
                                    {showItemDropdown && itemSearchResults.length > 0 && (
                                        <div
                                            ref={dropdownRef}
                                            className="position-absolute w-100 bg-white border rounded shadow-lg"
                                            style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}
                                        >
                                            {itemSearchResults.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                    onClick={() => selectItem(item)}
                                                    style={{ cursor: "pointer" }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "white";
                                                    }}
                                                >
                                                    <div className="fw-semibold">{item.name}</div>
                                                    <div className="text-muted small">{item.code} • {item.category}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    Select the item that has been prepared. Only sellable items are listed here.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="formQuantity" className="mb-3">
                                <Form.Label>Quantity Prepared</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity prepared"
                                    required
                                />
                            </Form.Group>

                            <Form.Group controlId="formNotes" className="mb-3">
                                <Form.Label>Notes (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any relevant notes about this preparation"
                                />
                            </Form.Group>

                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Submit Preparation Request
                                    </>
                                )}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm">
                    <Card.Header className="bg-light fw-bold">How It Works</Card.Header>
                    <Card.Body>
                        <ol>
                            <li>Select the item that has been prepared</li>
                            <li>Enter the quantity that was prepared</li>
                            <li>Add any notes if needed</li>
                            <li>Submit the request - it will be sent to the supervisor for approval</li>
                            <li>Once approved, the items will be added to inventory and available for sale</li>
                        </ol>
                    </Card.Body>
                </Card>
            </div>
        </RoleAwareLayout>
    );
}

