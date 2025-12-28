"use client";
import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Spinner, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";

interface Item {
    id: number;
    name: string;
    code: string;
}

interface DisposeItemModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    item: Item | null;
}

const DISPOSAL_REASONS = [
    "Expired",
    "Stale",
    "Damaged",
    "Spoiled",
    "Other"
];

export default function DisposeItemModal({ show, onHide, onSuccess, item }: DisposeItemModalProps) {
    const apiCall = useApiCall();

    const [quantity, setQuantity] = useState<string>("");
    const [reasonType, setReasonType] = useState<string>("Expired");
    const [customReason, setCustomReason] = useState<string>("");
    const [currentInventory, setCurrentInventory] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);

    // Reset form when modal opens/closes or item changes
    useEffect(() => {
        if (show && item) {
            setQuantity("");
            setReasonType("Expired");
            setCustomReason("");
            setFormError(null);
            setError(null);
            setErrorDetails(null);
            fetchInventoryLevel(item.id);
        } else if (!show) {
            setCurrentInventory(null);
        }
    }, [show, item]);

    const fetchInventoryLevel = async (itemId: number) => {
        setIsLoadingInventory(true);
        try {
            const result = await apiCall(`/api/inventory/${itemId}`);
            if (result.status >= 200 && result.status < 300) {
                const inventory = result.data;
                const availableQuantity = inventory?.available_quantity ??
                    ((inventory?.quantity || 0) - (inventory?.reserved_quantity || 0));
                setCurrentInventory(availableQuantity);
            } else {
                setCurrentInventory(0);
            }
        } catch (error: any) {
            setCurrentInventory(0);
        } finally {
            setIsLoadingInventory(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;

        setFormError(null);
        setError(null);
        setErrorDetails(null);

        const disposalQuantity = parseFloat(quantity);
        if (isNaN(disposalQuantity) || disposalQuantity <= 0) {
            setFormError("Please enter a valid quantity greater than 0");
            return;
        }

        if (currentInventory !== null && disposalQuantity > currentInventory) {
            setFormError(`Cannot dispose ${disposalQuantity} units. Only ${currentInventory} units available.`);
            return;
        }

        if (reasonType === "Other" && !customReason.trim()) {
            setFormError("Please provide a reason when selecting 'Other'");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await apiCall(`/api/inventory/${item.id}/dispose`, {
                method: "POST",
                body: JSON.stringify({
                    quantity: disposalQuantity,
                    reasonType: reasonType,
                    reason: reasonType === "Other" ? customReason.trim() : "",
                }),
            });

            if (result.status === 200) {
                onSuccess();
                onHide();
            } else {
                if (result.status === 403) {
                    setError("Access denied");
                    setErrorDetails(result.errorDetails);
                } else {
                    setError(result.error || "Failed to dispose inventory");
                    setErrorDetails(result.errorDetails);
                }
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onHide();
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Dispose/Expire Item</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <ErrorDisplay
                        error={error}
                        errorDetails={errorDetails}
                        onDismiss={() => {
                            setError(null);
                            setErrorDetails(null);
                        }}
                    />

                    {formError && (
                        <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
                            {formError}
                        </Alert>
                    )}

                    {item && (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Item</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={`${item.name} (${item.code})`}
                                    disabled
                                    readOnly
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Current Available Inventory</Form.Label>
                                {isLoadingInventory ? (
                                    <div>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        <span>Loading...</span>
                                    </div>
                                ) : (
                                    <Form.Control
                                        type="text"
                                        value={currentInventory !== null ? `${currentInventory} units` : "N/A"}
                                        disabled
                                        readOnly
                                        className={currentInventory !== null && currentInventory === 0 ? "text-danger" : ""}
                                    />
                                )}
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Quantity to Dispose <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity"
                                    required
                                    disabled={isSubmitting || currentInventory === 0}
                                />
                                {currentInventory !== null && currentInventory > 0 && (
                                    <Form.Text className="text-muted">
                                        Maximum: {currentInventory} units
                                    </Form.Text>
                                )}
                                {currentInventory === 0 && (
                                    <Form.Text className="text-danger">
                                        No available inventory to dispose
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Reason <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                    value={reasonType}
                                    onChange={(e) => setReasonType(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                >
                                    {DISPOSAL_REASONS.map((reason) => (
                                        <option key={reason} value={reason}>
                                            {reason}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            {reasonType === "Other" && (
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Custom Reason <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        placeholder="Enter reason for disposal"
                                        required={reasonType === "Other"}
                                        disabled={isSubmitting}
                                    />
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        type="submit"
                        disabled={isSubmitting || currentInventory === 0 || !item}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Disposing...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash me-2"></i>
                                Dispose Item
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

