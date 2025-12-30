"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Row, Col, Card } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";
import { Bill } from "../types/types";

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
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
    const apiCall = useApiCall();

    // Calculate total paid amount
    const billPayments = bill?.bill_payments ? Object.values(bill.bill_payments) : [];
    const totalPaid = billPayments.reduce(
        (sum, payment) => sum + (payment.payment?.creditAmount || 0),
        0
    );

    const billTotal = bill?.total || 0;
    const remainingAmount = billTotal - totalPaid;
    const needsPayment = remainingAmount > 0;

    // Validate M-Pesa reference uniqueness using API
    const validateMpesaReference = async (reference: string): Promise<boolean> => {
        if (!reference || paymentMethod !== "mpesa") return true;

        try {
            const result = await apiCall(`/api/payments/check-reference`, {
                method: "POST",
                body: JSON.stringify({
                    reference: reference.trim(),
                    billId: bill?.id
                })
            });

            if (result.status === 200) {
                if (result.data.exists) {
                    setMpesaValidationError("This M-Pesa code already exists. Please use a different M-Pesa code.");
                    return false;
                } else {
                    setMpesaValidationError(null);
                    return true;
                }
            } else {
                setMpesaValidationError("This M-Pesa code already exists. Please use a different M-Pesa code.");
                return false;
            }
        } catch (error) {
            setMpesaValidationError("This M-Pesa code already exists. Please use a different M-Pesa code.");
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
            setMpesaValidationError(null);

            // Clear any existing validation timeout
            if (validationTimeout) {
                clearTimeout(validationTimeout);
                setValidationTimeout(null);
            }
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
                const paymentAmount = paymentMethod === "cash" ? parseFloat(cashAmount) : parseFloat(mpesaAmount);

                // Validate payment amount doesn't exceed remaining amount
                if (paymentAmount > remainingAmount) {
                    setError(`Amount cannot exceed outstanding balance of KES ${(Number(remainingAmount) || 0).toFixed(2)}`);
                    setIsSubmitting(false);
                    return;
                }

                // Validate M-Pesa reference if using M-Pesa
                if (paymentMethod === "mpesa") {
                    if (!mpesaTransactionId.trim()) {
                        setError("Please enter M-Pesa reference");
                        setIsSubmitting(false);
                        return;
                    }

                    const isValidReference = await validateMpesaReference(mpesaTransactionId);
                    if (!isValidReference) {
                        setIsSubmitting(false);
                        return;
                    }
                }

                const paymentData = {
                    paymentType: paymentMethod,
                    creditAmount: paymentAmount,
                    ...(paymentMethod === "mpesa" && {
                        reference: mpesaTransactionId.trim()
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
                // Show specific error message from API
                const errorMessage = resubmitResult.error || "Failed to resubmit bill";
                setError(errorMessage);
                setErrorDetails(resubmitResult.errorDetails);
                setIsSubmitting(false);
            }
        } catch (error) {
            // Show more specific error message
            const errorMessage = error instanceof Error ? error.message : "Network error occurred";
            setError(`Failed to resubmit bill: ${errorMessage}`);
            setErrorDetails({ message: errorMessage, networkError: true, status: 0 });
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
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const numValue = parseFloat(value);
                                                    if (numValue > remainingAmount) {
                                                        setError(`Amount cannot exceed outstanding balance of KES ${(Number(remainingAmount) || 0).toFixed(2)}`);
                                                    } else {
                                                        setError(null);
                                                    }
                                                    setCashAmount(value);
                                                }}
                                                placeholder="Enter cash amount"
                                                disabled={isSubmitting}
                                                min="0"
                                                max={remainingAmount}
                                                className={cashAmount && parseFloat(cashAmount) > remainingAmount ? 'is-invalid' : ''}
                                            />
                                            {cashAmount && parseFloat(cashAmount) > remainingAmount && (
                                                <div className="invalid-feedback">
                                                    Amount cannot exceed outstanding balance of KES {(Number(remainingAmount) || 0).toFixed(2)}
                                                </div>
                                            )}
                                        </Form.Group>
                                    ) : (
                                        <>
                                            <Form.Group className="mb-3">
                                                <Form.Label>M-Pesa Amount (KES)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    value={mpesaAmount}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const numValue = parseFloat(value);
                                                        if (numValue > remainingAmount) {
                                                            setError(`Amount cannot exceed outstanding balance of KES ${(Number(remainingAmount) || 0).toFixed(2)}`);
                                                        } else {
                                                            setError(null);
                                                        }
                                                        setMpesaAmount(value);
                                                    }}
                                                    placeholder="Enter M-Pesa amount"
                                                    disabled={isSubmitting}
                                                    min="0"
                                                    max={remainingAmount}
                                                    className={mpesaAmount && parseFloat(mpesaAmount) > remainingAmount ? 'is-invalid' : ''}
                                                />
                                                {mpesaAmount && parseFloat(mpesaAmount) > remainingAmount && (
                                                    <div className="invalid-feedback">
                                                        Amount cannot exceed outstanding balance of KES {(Number(remainingAmount) || 0).toFixed(2)}
                                                    </div>
                                                )}
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label>M-Pesa Transaction ID</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={mpesaTransactionId}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setMpesaTransactionId(value);

                                                        // Clear existing timeout
                                                        if (validationTimeout) {
                                                            clearTimeout(validationTimeout);
                                                        }

                                                        if (value) {
                                                            // Set new timeout for validation
                                                            const timeout = setTimeout(() => {
                                                                validateMpesaReference(value);
                                                            }, 500); // 500ms delay
                                                            setValidationTimeout(timeout);
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
