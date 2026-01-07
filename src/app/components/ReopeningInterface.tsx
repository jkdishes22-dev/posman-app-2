import React, { useState, useEffect } from "react";
import { Button, Modal, Form, Alert } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";
import { Bill } from "../types/types";
import EnhancedResubmitModal from "./EnhancedResubmitModal";

interface ReopenReason {
    id: string;
    name: string;
    description?: string;
}

interface ReopeningInterfaceProps {
    bill: Bill;
    userRole: string;
    onReopened?: () => void;
    onResubmitted?: () => void;
}

export default function ReopeningInterface({
    bill,
    userRole,
    onReopened,
    onResubmitted
}: ReopeningInterfaceProps) {
    const apiCall = useApiCall();
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [reopenReasons, setReopenReasons] = useState<ReopenReason[]>([]);
    const [selectedReason, setSelectedReason] = useState("");
    const [resubmitNotes, setResubmitNotes] = useState("");
    const [isReopening, setIsReopening] = useState(false);
    const [reopenSuccess, setReopenSuccess] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [resubmitSuccess, setResubmitSuccess] = useState(false);
    const [reopenReasonsError, setReopenReasonsError] = useState<string | null>(null);


    // Business rule validation (Rule 4.4)
    const canReopenBill = (bill: Bill) => {
        // Only allow reopening if bill is submitted AND has actual issues
        if (bill.status !== "submitted") {
            return false;
        }

        // Calculate total paid amount
        const totalPaid = Array.isArray(bill.bill_payments)
            ? bill.bill_payments.reduce(
                (sum, billPayment) => sum + (billPayment.payment?.creditAmount || 0),
                0
            )
            : 0;

        // Only allow reopening if there's a payment discrepancy or other issues
        const hasPaymentDiscrepancy = totalPaid !== bill.total;
        const hasZeroPayments = totalPaid === 0;
        const hasPartialPayments = totalPaid > 0 && totalPaid < bill.total;

        // Allow reopening only if there are actual issues that need fixing
        return hasPaymentDiscrepancy || hasZeroPayments || hasPartialPayments;
    };

    const canResubmitBill = (bill: Bill) => {
        return bill.status === "reopened";
    };

    // Fetch reopen reasons on component mount
    useEffect(() => {
        const fetchReopenReasons = async () => {
            try {
                const result = await apiCall("/api/bills/reopen-reasons");
                if (result.status === 200) {
                    setReopenReasons(result.data.reasons || []);
                } else {
                    console.warn("Failed to load reopen reasons from API, using fallback");
                    // Fallback to default reasons if API fails
                    setReopenReasons([
                        { id: "mpesa_payment_unconfirmed", name: "M-Pesa Payment Unconfirmed", description: "M-Pesa payment could not be verified" },
                        { id: "cash_payment_disputed", name: "Cash Payment Disputed", description: "Customer disputes cash payment amount" },
                        { id: "payment_refund_required", name: "Payment Refund Required", description: "Refund needed for overpayment" },
                        { id: "customer_complaint", name: "Customer Complaint", description: "Customer complaint about bill accuracy" },
                        { id: "system_error", name: "System Error", description: "Technical error in bill processing" },
                        { id: "other", name: "Other", description: "Other reason not listed above" }
                    ]);
                }
            } catch (error) {
                setReopenReasonsError("Using default reasons due to connection issue");
                setReopenReasons([
                    { id: "mpesa_payment_unconfirmed", name: "M-Pesa Payment Unconfirmed", description: "M-Pesa payment could not be verified" },
                    { id: "cash_payment_disputed", name: "Cash Payment Disputed", description: "Customer disputes cash payment amount" },
                    { id: "payment_refund_required", name: "Payment Refund Required", description: "Refund needed for overpayment" },
                    { id: "customer_complaint", name: "Customer Complaint", description: "Customer complaint about bill accuracy" },
                    { id: "system_error", name: "System Error", description: "Technical error in bill processing" },
                    { id: "other", name: "Other", description: "Other reason not listed above" }
                ]);
            }
        };

        fetchReopenReasons();
    }, [apiCall]);

    // Handle bill reopening (Rule 4.5)
    const handleReopenBill = async () => {
        if (!selectedReason) {
            setError("Please select a reason for reopening the bill");
            return;
        }

        setIsReopening(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall(`/api/bills/${bill.id}/reopen`, {
                method: "POST",
                body: JSON.stringify({
                    reason: selectedReason
                })
            });

            if (result.status === 200) {
                setReopenSuccess(true);
                setIsReopening(false);
                // Don't close modal immediately - let user close it manually
            } else {
                setError(result.error || "Failed to reopen bill");
                setErrorDetails(result.errorDetails);
                setIsReopening(false);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setIsReopening(false);
        }
    };


    const openReopenModal = () => {
        setSelectedReason("");
        setShowReopenModal(true);
    };

    const closeReopenModal = () => {
        setShowReopenModal(false);
        setSelectedReason("");
        setError(null);
        setErrorDetails(null);
        setReopenReasonsError(null);
        setIsReopening(false);
        setReopenSuccess(false);

        // Reload bills page if reopening was successful
        if (reopenSuccess) {
            onReopened?.();
            // Reload the page to show today's bills
            window.location.reload();
        }
    };

    const openResubmitModal = () => {
        setResubmitNotes("");
        setShowResubmitModal(true);
    };

    const closeResubmitModal = () => {
        setShowResubmitModal(false);
        setResubmitNotes("");
        setError(null);
        setErrorDetails(null);
        setReopenReasonsError(null);
        setIsResubmitting(false);
        setResubmitSuccess(false);
    };

    return (
        <div>

            {/* Cashier/Supervisor User - Reopen Interface */}
            {userRole === "cashier" && bill.status === "submitted" && (
                <div className="mb-3">
                    {canReopenBill(bill) ? (
                        <div>
                            <Button
                                variant="warning"
                                onClick={openReopenModal}
                            >
                                Reopen Bill
                            </Button>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Sales User - Resubmit Interface */}
            {userRole === "sales" && canResubmitBill(bill) && (
                <div className="mb-3">
                    <Button
                        variant="primary"
                        onClick={openResubmitModal}
                    >
                        Resubmit Bill
                    </Button>
                </div>
            )}

            {/* Reopen Modal */}
            <Modal show={showReopenModal} onHide={closeReopenModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {reopenSuccess ? "Bill Reopened Successfully" : "Reopen Bill"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {reopenSuccess ? (
                        <div className="text-center">
                            <div className="alert alert-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                <strong>Success!</strong> Bill #{bill.id} has been reopened successfully.
                            </div>
                            <p className="mb-0">
                                The sales person will be notified and can now fix the issues and resubmit the bill.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p>This bill will be reopened for the sales person to fix. Please provide a reason:</p>

                            {error && (
                                <Alert variant="danger" className="mb-3">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                </Alert>
                            )}

                            {reopenReasonsError && (
                                <Alert variant="warning" className="mb-3">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {reopenReasonsError}
                                </Alert>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label>Reason for reopening *</Form.Label>
                                <Form.Select
                                    value={selectedReason}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    disabled={isReopening}
                                >
                                    <option value="">Select a reason...</option>
                                    {reopenReasons.map((reason) => (
                                        <option key={reason.id} value={reason.id}>
                                            {reason.name}
                                        </option>
                                    ))}
                                </Form.Select>
                                {selectedReason && (
                                    <Form.Text className="text-muted">
                                        {reopenReasons.find(r => r.id === selectedReason)?.description}
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {reopenSuccess ? (
                        <Button variant="success" onClick={closeReopenModal}>
                            <i className="bi bi-check-circle me-1"></i>
                            Close & Reload Bills
                        </Button>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={closeReopenModal} disabled={isReopening}>
                                Cancel
                            </Button>
                            <Button
                                variant="warning"
                                onClick={handleReopenBill}
                                disabled={!selectedReason || isReopening}
                            >
                                {isReopening ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Reopening...
                                    </>
                                ) : (
                                    "Reopen Bill"
                                )}
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Enhanced Resubmit Modal */}
            <EnhancedResubmitModal
                show={showResubmitModal}
                onHide={closeResubmitModal}
                bill={bill}
                onResubmitted={onResubmitted}
            />
        </div>
    );
}
