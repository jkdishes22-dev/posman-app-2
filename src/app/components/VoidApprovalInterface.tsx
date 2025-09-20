"use client";
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Form, Alert, Table, Row, Col } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";
import { Bill, BillItem, VoidApprovalPayload, VoidRequestResponse } from "../types/types";

interface ExtendedBillItem extends BillItem {
    void_requested_by_user?: {
        firstName: string;
        lastName: string;
    };
}

interface VoidApprovalInterfaceProps {
    userRole: string;
    onVoidApproved?: () => void;
}

export default function VoidApprovalInterface({
    userRole,
    onVoidApproved
}: VoidApprovalInterfaceProps) {
    const apiCall = useApiCall();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [selectedItem, setSelectedItem] = useState<ExtendedBillItem | null>(null);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
    const [showRejectionModal, setShowRejectionModal] = useState<boolean>(false);
    const [approvalNotes, setApprovalNotes] = useState<string>("");
    const [rejectionNotes, setRejectionNotes] = useState<string>("");
    const [paperApprovalReceived, setPaperApprovalReceived] = useState<boolean>(false);
    const [paperApprovalNotes, setPaperApprovalNotes] = useState<string>("");
    const [actionLoading, setActionLoading] = useState<boolean>(false);

    useEffect(() => {
        fetchBillsWithPendingVoids();
    }, []);

    const fetchBillsWithPendingVoids = async () => {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const result = await apiCall("/api/bills");
            if (result.status === 200) {
                // Filter bills that have items with void_pending status
                const billsWithPendingVoids = result.data.bills.filter((bill: Bill) =>
                    bill.bill_items?.some((item: BillItem) => item.status === "void_pending")
                );
                setBills(billsWithPendingVoids);
            } else {
                setError(result.error || "Failed to fetch bills");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred while fetching bills");
            setErrorDetails({ message: "Network error", networkError: true, status: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedItem || !selectedBill) return;

        setActionLoading(true);
        try {
            const result = await apiCall(
                `/api/bills/${selectedBill.id}/items/${selectedItem.id}/void-approve`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action: "approve",
                        approvalNotes: approvalNotes.trim(),
                        paperApprovalReceived: paperApprovalReceived,
                        paperApprovalNotes: paperApprovalNotes.trim(),
                    }),
                }
            );

            if (result.status === 200) {
                await fetchBillsWithPendingVoids();
                setShowApprovalModal(false);
                setSelectedItem(null);
                setSelectedBill(null);
                setApprovalNotes("");
                setPaperApprovalReceived(false);
                setPaperApprovalNotes("");
                onVoidApproved?.();
            } else {
                setError(result.error || "Failed to approve void request");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred while approving void request");
            setErrorDetails({ message: "Network error", networkError: true, status: 0 });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedItem || !selectedBill) return;

        setActionLoading(true);
        try {
            const result = await apiCall(
                `/api/bills/${selectedBill.id}/items/${selectedItem.id}/void-approve`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action: "reject",
                        approvalNotes: rejectionNotes.trim(),
                    }),
                }
            );

            if (result.status === 200) {
                await fetchBillsWithPendingVoids();
                setShowRejectionModal(false);
                setSelectedItem(null);
                setSelectedBill(null);
                setRejectionNotes("");
                onVoidApproved?.();
            } else {
                setError(result.error || "Failed to reject void request");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred while rejecting void request");
            setErrorDetails({ message: "Network error", networkError: true, status: 0 });
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { variant: "success", text: "Active" },
            void_pending: { variant: "warning", text: "Void Pending" },
            voided: { variant: "danger", text: "Voided" },
        };

        const config = statusConfig[status] || { variant: "secondary", text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const openApprovalModal = (item: BillItem, bill: Bill) => {
        setSelectedItem(item);
        setSelectedBill(bill);
        setApprovalNotes("");
        setPaperApprovalReceived(false);
        setPaperApprovalNotes("");
        setShowApprovalModal(true);
    };

    const openRejectionModal = (item: BillItem, bill: Bill) => {
        setSelectedItem(item);
        setSelectedBill(bill);
        setRejectionNotes("");
        setShowRejectionModal(true);
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading void requests...</p>
            </div>
        );
    }

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

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                    <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                    Pending Void Requests
                </h5>
                <Button variant="outline-primary" size="sm" onClick={fetchBillsWithPendingVoids}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                </Button>
            </div>

            {bills.length === 0 ? (
                <Card>
                    <Card.Body className="text-center py-4">
                        <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                        <h6 className="mt-3 mb-1">No Pending Void Requests</h6>
                        <p className="text-muted mb-0">All void requests have been processed</p>
                    </Card.Body>
                </Card>
            ) : (
                <div className="row">
                    {bills.map((bill) => (
                        <div key={bill.id} className="col-12 mb-4">
                            <Card>
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className="fw-bold">Bill #{bill.id}</span>
                                        <span className="ms-3 text-muted">
                                            {bill.user.firstName} {bill.user.lastName}
                                        </span>
                                        <span className="ms-3 text-muted">- {bill.station.name}</span>
                                    </div>
                                    <div>
                                        <Badge bg="primary">${bill.total.toFixed(2)}</Badge>
                                        <Badge bg="secondary" className="ms-2">{bill.status}</Badge>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <Table responsive striped>
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                                <th>Status</th>
                                                <th>Void Reason</th>
                                                <th>Requested By</th>
                                                <th>Requested At</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bill.bill_items
                                                ?.filter((item) => item.status === 'void_pending')
                                                .map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.item.name}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>${(item.subtotal / item.quantity).toFixed(2)}</td>
                                                        <td>${item.subtotal.toFixed(2)}</td>
                                                        <td>{getStatusBadge(item.status)}</td>
                                                        <td>
                                                            <small className="text-muted">
                                                                {item.void_reason || "No reason provided"}
                                                            </small>
                                                        </td>
                                                        <td>
                                                            User ID: {item.void_requested_by || "Unknown"}
                                                        </td>
                                                        <td>
                                                            {item.void_requested_at ? formatDate(item.void_requested_at) : "N/A"}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-1">
                                                                <Button
                                                                    variant="success"
                                                                    size="sm"
                                                                    onClick={() => openApprovalModal(item, bill)}
                                                                >
                                                                    <i className="bi bi-check-circle me-1"></i>
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => openRejectionModal(item, bill)}
                                                                >
                                                                    <i className="bi bi-x-circle me-1"></i>
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Approval Modal */}
            <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-check-circle me-2 text-success"></i>
                        Approve Void Request
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && selectedBill && (
                        <div className="mb-3">
                            <h6>Item Details:</h6>
                            <p className="mb-1">
                                <strong>Bill ID:</strong> #{selectedBill.id}
                            </p>
                            <p className="mb-1">
                                <strong>Item:</strong> {selectedItem.item.name}
                            </p>
                            <p className="mb-1">
                                <strong>Quantity:</strong> {selectedItem.quantity}
                            </p>
                            <p className="mb-1">
                                <strong>Total:</strong> ${selectedItem.subtotal.toFixed(2)}
                            </p>
                            <p className="mb-1">
                                <strong>Reason:</strong> {selectedItem.void_reason || 'No reason provided'}
                            </p>
                            <p className="mb-0">
                                <strong>Requested by:</strong> {selectedItem.void_requested_by_user ?
                                    `${selectedItem.void_requested_by_user.firstName} ${selectedItem.void_requested_by_user.lastName}` :
                                    'Unknown'
                                }
                            </p>
                        </div>
                    )}

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Approval Notes (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Add any notes about this approval..."
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Paper approval received (signed by chef/order releaser)"
                                checked={paperApprovalReceived}
                                onChange={(e) => setPaperApprovalReceived(e.target.checked)}
                            />
                        </Form.Group>

                        {paperApprovalReceived && (
                            <Form.Group className="mb-3">
                                <Form.Label>Paper Approval Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={paperApprovalNotes}
                                    onChange={(e) => setPaperApprovalNotes(e.target.value)}
                                    placeholder="Notes about paper approval..."
                                />
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleApprove}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Approving...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2"></i>
                                Approve Request
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Rejection Modal */}
            <Modal show={showRejectionModal} onHide={() => setShowRejectionModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-x-circle me-2 text-danger"></i>
                        Reject Void Request
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && selectedBill && (
                        <div className="mb-3">
                            <h6>Item Details:</h6>
                            <p className="mb-1">
                                <strong>Bill ID:</strong> #{selectedBill.id}
                            </p>
                            <p className="mb-1">
                                <strong>Item:</strong> {selectedItem.item.name}
                            </p>
                            <p className="mb-1">
                                <strong>Quantity:</strong> {selectedItem.quantity}
                            </p>
                            <p className="mb-1">
                                <strong>Total:</strong> ${selectedItem.subtotal.toFixed(2)}
                            </p>
                            <p className="mb-1">
                                <strong>Reason:</strong> {selectedItem.void_reason || 'No reason provided'}
                            </p>
                            <p className="mb-0">
                                <strong>Requested by:</strong> {selectedItem.void_requested_by_user ?
                                    `${selectedItem.void_requested_by_user.firstName} ${selectedItem.void_requested_by_user.lastName}` :
                                    'Unknown'
                                }
                            </p>
                        </div>
                    )}

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Rejection Reason *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                placeholder="Please provide a reason for rejecting this void request..."
                                required
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectionModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleReject}
                        disabled={actionLoading || !rejectionNotes.trim()}
                    >
                        {actionLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Rejecting...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-x-circle me-2"></i>
                                Reject Request
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
