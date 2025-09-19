"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Row, Col, Card } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";

interface Bill {
    id: number;
    total: number;
    status: string;
    reopen_reason?: string;
    reopened_at?: string;
    bill_payments?: any[];
}

interface EnhancedResubmitModalProps {
    show: boolean;
    onHide: () => void;
    bill: Bill | null;
    onResubmitted?: () => void;
}

const EnhancedResubmitModal: React.FC<EnhancedResubmitModalProps> = ({
    show,
    onHide,
    bill,
    onResubmitted
}) => {
    const [resubmitNotes, setResubmitNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa">("cash");
    const [cashAmount, setCashAmount] = useState("");
    const [mpesaAmount, setMpesaAmount] = useState("");
    const [mpesaTransactionId, setMpesaTransactionId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [mpesaValidationError, setMpesaValidationError] = useState<string | null>(null);
    const apiCall = useApiCall();

    // Calculate total paid amount
    const totalPaid = bill?.bill_payments?.reduce(
        (sum, payment) => sum + (payment.payment?.creditAmount || 0),
        0
    ) || 0;

    const billTotal = bill?.total || 0;
    const remainingAmount = billTotal - totalPaid;
    const needsPayment = remainingAmount > 0;

    // Validate M-Pesa reference uniqueness
    const validateMpesaReference = async (reference: string): Promise<boolean> => {
        if (!reference || paymentMethod !== "mpesa") return true;

        try {
            // Check if this reference already exists in the current bill's payments
            const existingPayment = bill?.bill_payments?.find(
                payment => payment.payment?.paymentType === 'MPESA' &&
                    payment.payment?.reference === reference
            );

            if (existingPayment) {
                setMpesaValidationError("This M-Pesa reference has already been used for this bill");
                return false;
            }

            // Clear any previous validation error
            setMpesaValidationError(null);
            return true;
        } catch (error) {
            setMpesaValidationError("Error validating M-Pesa reference");
            return false;
        }
    };

    useEffect(() => {
        if (show && bill) {
            setResubmitNotes("");
            setPaymentMethod("cash");
            setCashAmount("");
            setMpesaAmount("");
            setMpesaTransactionId("");
            setError(null);
            setErrorDetails(null);
            setIsSubmitting(false);
            setSubmitSuccess(false);
        }
    }, [show, bill]);

    const handleResubmit = async () => {
        if (!bill) return;

        setIsSubmitting(true);
        setError(null);
        setErrorDetails(null);

        try {
            // First, add payment if needed
            if (needsPayment) {
                const paymentData = {
                    paymentType: paymentMethod,
                    creditAmount: paymentMethod === "cash" ? parseFloat(cashAmount) : parseFloat(mpesaAmount),
                    ...(paymentMethod === "mpesa" && {
                        mpesaTransactionId
                    })
                };

                const paymentResult = await apiCall(`/api/bills/${bill.id}/payments`, {
                    method: "POST",
                    body: JSON.stringify(paymentData)
                });

                if (paymentResult.status !== 200) {
                    setError(paymentResult.error || "Failed to add payment");
                    setErrorDetails(paymentResult.errorDetails);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Then resubmit the bill
            const resubmitResult = await apiCall(`/api/bills/${bill.id}/resubmit`, {
                method: "POST",
                body: JSON.stringify({
                    notes: resubmitNotes.trim()
                })
            });

            if (resubmitResult.status === 200) {
                setSubmitSuccess(true);
                setIsSubmitting(false);
            } else {
                setError(resubmitResult.error || "Failed to resubmit bill");
                setErrorDetails(resubmitResult.errorDetails);
                setIsSubmitting(false);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitSuccess) {
            onResubmitted?.();
            window.location.reload();
        }
        onHide();
    };

    if (!bill) return null;

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    {submitSuccess ? "Bill Resubmitted Successfully" : `Resubmit Bill #${bill.id}`}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {submitSuccess ? (
                    <div className="text-center">
                        <div className="alert alert-success">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            <strong>Success!</strong> Bill #{bill.id} has been resubmitted successfully.
                        </div>
                        <p className="mb-0">
                            The bill is now ready for the cashier to close.
                        </p>
                    </div>
                ) : (
                    <>
                        <ErrorDisplay
                            error={error}
                            errorDetails={errorDetails}
                            onDismiss={() => {
                                setError(null);
                                setErrorDetails(null);
                            }}
                        />

                        <Row>
                            <Col md={6}>
                                <Card className="mb-3">
                                    <Card.Header>
                                        <h6 className="mb-0">Bill Information</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <p><strong>Total:</strong> KES {bill.total}</p>
                                        <p><strong>Status:</strong> {bill.status}</p>
                                        {bill.reopen_reason && (
                                            <p><strong>Reopen Reason:</strong> {bill.reopen_reason}</p>
                                        )}
                                        {bill.reopened_at && (
                                            <p><strong>Reopened At:</strong> {new Date(bill.reopened_at).toLocaleString()}</p>
                                        )}
                                        {needsPayment && (
                                            <Alert variant="warning" className="mb-0">
                                                <strong>Payment Required:</strong> KES {remainingAmount} remaining
                                            </Alert>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <Card>
                                    <Card.Header>
                                        <h6 className="mb-0">Resubmit Notes</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group>
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                value={resubmitNotes}
                                                onChange={(e) => setResubmitNotes(e.target.value)}
                                                placeholder="Add notes about the changes made to fix the bill..."
                                                disabled={isSubmitting}
                                            />
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {needsPayment && (
                            <Card className="mt-3">
                                <Card.Header>
                                    <h6 className="mb-0">Payment Details</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Method</Form.Label>
                                        <div>
                                            <Form.Check
                                                type="radio"
                                                label="Cash"
                                                name="paymentMethod"
                                                value="cash"
                                                checked={paymentMethod === "cash"}
                                                onChange={(e) => setPaymentMethod(e.target.value as "cash")}
                                                disabled={isSubmitting}
                                            />
                                            <Form.Check
                                                type="radio"
                                                label="M-Pesa"
                                                name="paymentMethod"
                                                value="mpesa"
                                                checked={paymentMethod === "mpesa"}
                                                onChange={(e) => setPaymentMethod(e.target.value as "mpesa")}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </Form.Group>

                                    {paymentMethod === "cash" ? (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Cash Amount (KES)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={cashAmount}
                                                onChange={(e) => setCashAmount(e.target.value)}
                                                placeholder="Enter cash amount"
                                                disabled={isSubmitting}
                                                min="0"
                                                max={remainingAmount}
                                            />
                                        </Form.Group>
                                    ) : (
                                        <>
                                            <Form.Group className="mb-3">
                                                <Form.Label>M-Pesa Amount (KES)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    value={mpesaAmount}
                                                    onChange={(e) => setMpesaAmount(e.target.value)}
                                                    placeholder="Enter M-Pesa amount"
                                                    disabled={isSubmitting}
                                                    min="0"
                                                    max={remainingAmount}
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label>M-Pesa Transaction ID</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={mpesaTransactionId}
                                                    onChange={async (e) => {
                                                        setMpesaTransactionId(e.target.value);
                                                        if (e.target.value) {
                                                            await validateMpesaReference(e.target.value);
                                                        } else {
                                                            setMpesaValidationError(null);
                                                        }
                                                    }}
                                                    placeholder="Enter M-Pesa transaction ID"
                                                    disabled={isSubmitting}
                                                    isInvalid={!!mpesaValidationError}
                                                />
                                                {mpesaValidationError && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {mpesaValidationError}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </>
                                    )}
                                </Card.Body>
                            </Card>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                {submitSuccess ? (
                    <Button variant="success" onClick={handleClose}>
                        <i className="bi bi-check-circle me-1"></i>
                        Close & Reload Bills
                    </Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="warning"
                            onClick={handleResubmit}
                            disabled={
                                isSubmitting ||
                                !!mpesaValidationError ||
                                (needsPayment && (
                                    paymentMethod === "cash" ?
                                        !cashAmount || parseFloat(cashAmount) <= 0 :
                                        !mpesaAmount || parseFloat(mpesaAmount) <= 0 || !mpesaTransactionId
                                ))
                            }
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Resubmitting...
                                </>
                            ) : (
                                "Resubmit Bill"
                            )}
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default EnhancedResubmitModal;
