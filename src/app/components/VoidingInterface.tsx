import React, { useState } from "react";
import { Button, Modal, Form, Alert } from "react-bootstrap";
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
    item_status: string;
    void_reason?: string;
    void_requested_by?: number;
    void_requested_at?: string;
    void_approved_by?: number;
    void_approved_at?: string;
}

interface Bill {
    id: number;
    status: string;
    bill_items: BillItem[];
}

interface VoidingInterfaceProps {
    bill: Bill;
    userRole: string;
    onVoidRequested?: () => void;
    onVoidApproved?: () => void;
}

export default function VoidingInterface({
    bill,
    userRole,
    onVoidRequested,
    onVoidApproved
}: VoidingInterfaceProps) {
    const apiCall = useApiCall();
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<BillItem | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [approvalNotes, setApprovalNotes] = useState("");

    // Business rule validation (Rule 4.3)
    const canVoidItems = (bill: Bill) => {
        return (bill.status === 'submitted' || bill.status === 'reopened') && 
               bill.bill_items?.some(item => item.item_status === 'active') || false;
    };

    const hasPendingVoids = (bill: Bill) => {
        return bill.bill_items?.some(item => item.item_status === 'void_pending') || false;
    };

    const canVoidItem = (item: BillItem) => {
        return item.item_status === 'active';
    };

    const canApproveVoid = (item: BillItem) => {
        return item.item_status === 'void_pending';
    };

    // Handle void request (Rule 4.5)
    const handleVoidRequest = async (item: BillItem) => {
        if (!voidReason.trim()) {
            setError("Please provide a reason for voiding this item");
            return;
        }

        try {
            const result = await apiCall(`/api/bills/${bill.id}/items/${item.id}/void-request`, {
                method: "POST",
                body: JSON.stringify({ reason: voidReason.trim() })
            });

            if (result.status === 200) {
                setError(null);
                setErrorDetails(null);
                setShowVoidModal(false);
                setVoidReason("");
                setSelectedItem(null);
                onVoidRequested?.();
            } else {
                setError(result.error || "Failed to request item voiding");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ networkError: true, status: 0 });
        }
    };

    // Handle void approval (Rule 4.5)
    const handleVoidApproval = async (item: BillItem, approved: boolean) => {
        try {
            const result = await apiCall(`/api/bills/${bill.id}/items/${item.id}/void-approve`, {
                method: "POST",
                body: JSON.stringify({
                    approved,
                    approvalNotes: approvalNotes.trim()
                })
            });

            if (result.status === 200) {
                setError(null);
                setErrorDetails(null);
                setApprovalNotes("");
                onVoidApproved?.();
            } else {
                setError(result.error || `Failed to ${approved ? 'approve' : 'reject'} void request`);
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ networkError: true, status: 0 });
        }
    };

    const openVoidModal = (item: BillItem) => {
        setSelectedItem(item);
        setVoidReason("");
        setShowVoidModal(true);
    };

    const closeVoidModal = () => {
        setShowVoidModal(false);
        setSelectedItem(null);
        setVoidReason("");
        setError(null);
        setErrorDetails(null);
    };

    return (
        <div>
            <ErrorDisplay
                error={error}
                errorDetails={errorDetails}
                onDismiss={() => {
                    setError(null);
                    setErrorDetails(null);
                }}
            />

            {/* Sales User - Void Request Interface */}
            {userRole === 'sales' && canVoidItems(bill) && (
                <div className="mb-3">
                    <h6>Item Voiding</h6>
                    <div className="table-responsive">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
              <tbody>
                {bill.bill_items?.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>${item.subtotal.toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${item.item_status === 'active' ? 'bg-success' :
                                                    item.item_status === 'void_pending' ? 'bg-warning' :
                                                        'bg-danger'
                                                }`}>
                                                {item.item_status}
                                            </span>
                                        </td>
                                        <td>
                                            {canVoidItem(item) && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => openVoidModal(item)}
                                                >
                                                    Request Void
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cashier/Supervisor User - Void Approval Interface */}
            {userRole === 'cashier' && hasPendingVoids(bill) && (
                <div className="mb-3">
                    <h6>Pending Void Requests</h6>
                    <div className="table-responsive">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Amount</th>
                                    <th>Reason</th>
                                    <th>Requested</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
              <tbody>
                {bill.bill_items
                  ?.filter(item => item.item_status === 'void_pending')
                  .map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.item.name}</td>
                                            <td>{item.quantity}</td>
                                            <td>${item.subtotal.toFixed(2)}</td>
                                            <td>{item.void_reason}</td>
                                            <td>{item.void_requested_at ? new Date(item.void_requested_at).toLocaleString() : 'N/A'}</td>
                                            <td>
                                                <div className="btn-group" role="group">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleVoidApproval(item, true)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleVoidApproval(item, false)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Void Request Modal */}
            <Modal show={showVoidModal} onHide={closeVoidModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Request Item Void</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <div>
                            <p><strong>Item:</strong> {selectedItem.item.name}</p>
                            <p><strong>Quantity:</strong> {selectedItem.quantity}</p>
                            <p><strong>Amount:</strong> ${selectedItem.subtotal.toFixed(2)}</p>

                            <Form.Group className="mb-3">
                                <Form.Label>Reason for voiding *</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="Please provide a reason for voiding this item..."
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeVoidModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => selectedItem && handleVoidRequest(selectedItem)}
                        disabled={!voidReason.trim()}
                    >
                        Request Void
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
