import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { BillItem } from "../types/types";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";
import SubmitBillVirtualKeyboard from "./SubmitBillVirtualKeyboard";

interface QuantityChangeModalProps {
    show: boolean;
    onHide: () => void;
    item: BillItem | null;
    onSuccess: () => void;
}

const QuantityChangeModal: React.FC<QuantityChangeModalProps> = ({
    show,
    onHide,
    item,
    onSuccess,
}) => {
    const apiCall = useApiCall();
    const [requestedQuantity, setRequestedQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [activeKeyboard, setActiveKeyboard] = useState<"quantity" | "reason">("quantity");

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (show && item) {
            setRequestedQuantity(item.quantity);
            setReason("");
            setError(null);
            setErrorDetails(null);
            setActiveKeyboard("quantity");
        }
    }, [show, item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!item) return;

        if (requestedQuantity === item.quantity) {
            setError("Requested quantity must be different from current quantity");
            return;
        }

        if (requestedQuantity <= 0) {
            setError("Requested quantity must be greater than 0");
            return;
        }

        if (!reason.trim()) {
            setError("Please provide a reason for the quantity change");
            return;
        }

        setLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall(
                `/api/bills/${item.bill_id}/items/${item.id}/quantity-change-request`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        requestedQuantity,
                        reason: reason.trim(),
                    }),
                }
            );

            if (result.status === 200) {
                onSuccess();
                onHide();
            } else {
                setError(result.error || "Failed to submit quantity change request");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onHide();
        }
    };

    if (!item) return null;

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-pencil-square me-2"></i>
                    Request Quantity Change
                </Modal.Title>
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

                    <div className="mb-3">
                        <h6>Item Details</h6>
                        <div className="bg-light p-3 rounded">
                            <div className="row">
                                <div className="col-6">
                                    <strong>Item:</strong> {item.item.name}
                                </div>
                                <div className="col-6">
                                    <strong>Current Quantity:</strong> {item.quantity}
                                </div>
                            </div>
                            <div className="row mt-2">
                                <div className="col-6">
                                    <strong>Unit Price:</strong> KES {item.item.price}
                                </div>
                                <div className="col-6">
                                    <strong>Current Subtotal:</strong> KES {item.subtotal}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>
                            <strong>New Quantity</strong>
                        </Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            value={requestedQuantity}
                            onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 1)}
                            onFocus={() => setActiveKeyboard("quantity")}
                            disabled={loading}
                            required
                        />
                        <Form.Text className="text-muted">
                            Enter the correct quantity for this item
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>
                            <strong>Reason for Change</strong>
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            onFocus={() => setActiveKeyboard("reason")}
                            disabled={loading}
                            placeholder="Explain why the quantity needs to be changed..."
                            required
                        />
                        <Form.Text className="text-muted">
                            This will be reviewed by the cashier/supervisor
                        </Form.Text>
                    </Form.Group>

                    {requestedQuantity !== item.quantity && (
                        <Alert variant="info" className="mb-3">
                            <strong>New Subtotal:</strong> KES {(((Number(item.subtotal) || 0) / (Number(item.quantity) || 1)) * (Number(requestedQuantity) || 0)).toFixed(2)}
                            <br />
                            <strong>Difference:</strong> KES {((((Number(item.subtotal) || 0) / (Number(item.quantity) || 1)) * (Number(requestedQuantity) || 0)) - (Number(item.subtotal) || 0)).toFixed(2)}
                        </Alert>
                    )}

                    {activeKeyboard === "quantity" ? (
                        <SubmitBillVirtualKeyboard
                            mode="numeric"
                            numericDecimal={false}
                            numericHeading="New Quantity"
                            onCharacter={(ch) => setRequestedQuantity(prev => {
                                const str = String(prev === 0 ? "" : prev) + ch;
                                return parseInt(str) || 0;
                            })}
                            onSpecialKey={(key) => {
                                if (key === "Backspace") setRequestedQuantity(prev => parseInt(String(prev).slice(0, -1)) || 0);
                                else if (key === "Clear") setRequestedQuantity(0);
                            }}
                        />
                    ) : (
                        <SubmitBillVirtualKeyboard
                            mode="alpha"
                            alphaHeading="Reason for change"
                            alphaSpacing="compact"
                            onCharacter={(ch) => setReason(prev => prev + ch)}
                            onSpecialKey={(key) => {
                                if (key === "Backspace") setReason(prev => prev.slice(0, -1));
                                else if (key === "Clear") setReason("");
                                else if (key === "Space") setReason(prev => prev + " ");
                            }}
                        />
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || requestedQuantity === item.quantity || !reason.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-send me-2"></i>
                                Submit Request
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default QuantityChangeModal;
