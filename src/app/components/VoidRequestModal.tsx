"use client";

import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";

interface BillItem {
    id: number;
    item: {
        name: string;
    };
    quantity: number;
    subtotal: number;
    status: string;
}

interface VoidRequestModalProps {
    show: boolean;
    onHide: () => void;
    billId: number;
    item: BillItem | null;
    onVoidRequested?: () => void;
}

const VoidRequestModal: React.FC<VoidRequestModalProps> = ({
    show,
    onHide,
    billId,
    item,
    onVoidRequested
}) => {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [success, setSuccess] = useState(false);

    const apiCall = useApiCall();

    const handleClose = () => {
        setReason("");
        setError(null);
        setErrorDetails(null);
        setSuccess(false);
        setIsSubmitting(false);
        onHide();
    };

    const handleSubmit = async () => {
        if (!item || !reason.trim()) {
            setError("Please provide a reason for voiding this item");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall(`/api/bills/${billId}/items/${item.id}/void-request`, {
                method: "POST",
                body: JSON.stringify({
                    reason: reason.trim()
                })
            });

            if (result.status === 200) {
                setSuccess(true);
                setIsSubmitting(false);
                // Don't close modal immediately - let user see success message
            } else {
                setError(result.error || "Failed to submit void request");
                setErrorDetails(result.errorDetails);
                setIsSubmitting(false);
            }
        } catch (error) {
            setError("Network error occurred while submitting void request");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setIsSubmitting(false);
        }
    };

    const handleSuccessClose = () => {
        onVoidRequested?.();
        handleClose();
    };

    if (!item) return null;

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    {success ? "Void Request Submitted" : "Request Item Void"}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {success ? (
                    <div className="text-center">
                        <div className="alert alert-success">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            <strong>Success!</strong> Void request has been submitted successfully.
                        </div>
                        <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Note:</strong> If approved, this item will be marked as voided and excluded from the bill total, but the record will remain for audit purposes.
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h6 className="mb-0">Next Steps</h6>
                            </div>
                            <div className="card-body">
                                <ol className="mb-0">
                                    <li>Print the void form for chef/order-releaser signature</li>
                                    <li>Present the signed form to cashier/supervisor</li>
                                    <li>Wait for approval or rejection</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="card mb-3">
                            <div className="card-header">
                                <h6 className="mb-0">Item Details</h6>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <strong>Item:</strong> {item.item.name}
                                    </div>
                                    <div className="col-md-3">
                                        <strong>Quantity:</strong> {item.quantity}
                                    </div>
                                    <div className="col-md-3">
                                        <strong>Amount:</strong> KES {(Number(item.subtotal) || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ErrorDisplay
                            error={error}
                            errorDetails={errorDetails}
                            onDismiss={() => {
                                setError(null);
                                setErrorDetails(null);
                            }}
                        />

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <strong>Reason for Voiding *</strong>
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please provide a detailed reason for voiding this item..."
                                disabled={isSubmitting}
                            />
                            <Form.Text className="text-muted">
                                This reason will be reviewed by the cashier/supervisor along with the physical void form.
                            </Form.Text>
                        </Form.Group>

                        <Alert variant="info">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Important:</strong> After submitting this request, you must:
                            <ul className="mb-0 mt-2">
                                <li>Print the void form for chef/order-releaser signature</li>
                                <li>Present the signed form to cashier/supervisor for approval</li>
                                <li>Without the signed form, the void request will be rejected</li>
                            </ul>
                        </Alert>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                {success ? (
                    <Button variant="success" onClick={handleSuccessClose}>
                        <i className="bi bi-check-circle me-1"></i>
                        Close & Refresh
                    </Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="warning"
                            onClick={handleSubmit}
                            disabled={!reason.trim() || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    Submit Void Request
                                </>
                            )}
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default VoidRequestModal;
