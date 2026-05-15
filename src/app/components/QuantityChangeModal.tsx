import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
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
                    body: JSON.stringify({ requestedQuantity, reason: reason.trim() }),
                }
            );

            if (result.status === 200) {
                onSuccess();
                onHide();
            } else {
                setError(result.error || "Failed to submit quantity change request");
                setErrorDetails(result.errorDetails);
            }
        } catch {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => { if (!loading) onHide(); };

    if (!item) return null;

    const unitPrice = (Number(item.subtotal) || 0) / (Number(item.quantity) || 1);
    const newSubtotal = unitPrice * (Number(requestedQuantity) || 0);
    const diff = newSubtotal - (Number(item.subtotal) || 0);
    const qtyChanged = requestedQuantity !== item.quantity;

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="py-2">
                <Modal.Title className="fs-6 fw-semibold">
                    <i className="bi bi-pencil-square me-2 text-warning"></i>
                    Qty Change — <span className="text-primary">{item.item.name}</span>
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body className="p-0">
                    <div className="row g-0" style={{ minHeight: 380 }}>

                        {/* LEFT — keyboard */}
                        <div className="col-6 border-end bg-light p-3 d-flex flex-column">
                            <div className="mb-2 d-flex gap-2">
                                <button
                                    type="button"
                                    className={`btn btn-sm flex-grow-1 ${activeKeyboard === "quantity" ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setActiveKeyboard("quantity")}
                                >
                                    <i className="bi bi-hash me-1"></i>Qty
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm flex-grow-1 ${activeKeyboard === "reason" ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setActiveKeyboard("reason")}
                                >
                                    <i className="bi bi-keyboard me-1"></i>Reason
                                </button>
                            </div>

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
                        </div>

                        {/* RIGHT — form fields */}
                        <div className="col-6 p-3 d-flex flex-column gap-3">
                            <ErrorDisplay
                                error={error}
                                errorDetails={errorDetails}
                                onDismiss={() => { setError(null); setErrorDetails(null); }}
                            />

                            {/* Item summary strip */}
                            <div className="rounded border px-3 py-2 bg-white small">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Unit price</span>
                                    <span className="fw-semibold">KES {unitPrice.toFixed(2)}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Current ({item.quantity}×)</span>
                                    <span className="fw-semibold">KES {(Number(item.subtotal) || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* New quantity */}
                            <Form.Group>
                                <Form.Label className="fw-semibold mb-1">New Quantity</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    value={requestedQuantity}
                                    onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 1)}
                                    onFocus={() => setActiveKeyboard("quantity")}
                                    disabled={loading}
                                    required
                                    className="fs-5 text-center fw-bold"
                                />
                                {qtyChanged && (
                                    <div className={`mt-1 small fw-semibold ${diff >= 0 ? "text-success" : "text-danger"}`}>
                                        New subtotal: KES {newSubtotal.toFixed(2)}
                                        <span className="ms-2">({diff >= 0 ? "+" : ""}{diff.toFixed(2)})</span>
                                    </div>
                                )}
                            </Form.Group>

                            {/* Reason */}
                            <Form.Group className="flex-grow-1 d-flex flex-column">
                                <Form.Label className="fw-semibold mb-1">Reason</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    onFocus={() => setActiveKeyboard("reason")}
                                    disabled={loading}
                                    placeholder="Why does the quantity need to change?"
                                    required
                                    style={{ resize: "none", flexGrow: 1, minHeight: 80 }}
                                />
                                <Form.Text className="text-muted" style={{ fontSize: "0.72rem" }}>
                                    Reviewed by cashier / supervisor
                                </Form.Text>
                            </Form.Group>
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer className="py-2">
                    <Button variant="outline-secondary" size="sm" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={loading || !qtyChanged || !reason.trim()}
                    >
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Submitting…</>
                        ) : (
                            <><i className="bi bi-send me-1"></i>Submit Request</>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default QuantityChangeModal;
