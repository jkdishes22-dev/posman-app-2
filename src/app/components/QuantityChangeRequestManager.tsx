"use client";
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Form, Alert, Row, Col } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";

interface QuantityChangeRequest {
  id: number;
  bill_id: number;
  item_id: number;
  initiated_by: number;
  approved_by?: number;
  status: string;
  current_quantity: number;
  requested_quantity: number;
  reason: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  paper_approval_received: boolean;
  paper_approval_date?: string;
  paper_approval_notes?: string;
  current_bill_total: number;
  new_bill_total: number;
  initiator: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  approver?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  bill: {
    id: number;
    total: number;
    status: string;
    created_at: string;
    user: {
      firstName: string;
      lastName: string;
    };
    station: {
      name: string;
    };
    item?: {
      id: number;
      name: string;
    };
  };
  item: {
    id: number;
    name: string;
  };
}

interface QuantityChangeRequestManagerProps {
  userRole: string;
}

export default function QuantityChangeRequestManager({ userRole }: QuantityChangeRequestManagerProps) {
  const apiCall = useApiCall();
  const [quantityChangeRequests, setQuantityChangeRequests] = useState<QuantityChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuantityChangeRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [paperApprovalReceived, setPaperApprovalReceived] = useState(false);
  const [paperApprovalNotes, setPaperApprovalNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQuantityChangeRequests();
  }, []);

  const fetchQuantityChangeRequests = async () => {
    setLoading(true);
    const result = await apiCall("/api/bills/quantity-change-requests");

    if (result.status === 200) {
      setQuantityChangeRequests(result.data.quantityChangeRequests || []);
    } else {
      setError(result.error || "Failed to fetch quantity change requests");
      setErrorDetails(result.errorDetails);
    }

    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    // Use the correct endpoint format: /api/bills/[billId]/items/[itemId]/quantity-change-approve
    const result = await apiCall(`/api/bills/${selectedRequest.bill_id}/items/${selectedRequest.item_id}/quantity-change-approve`, {
      method: "POST",
      body: JSON.stringify({
        action: "approve",
        approvalNotes: approvalNotes,
        paperApprovalReceived: paperApprovalReceived,
        paperApprovalNotes: paperApprovalNotes,
      }),
    });

    if (result.status === 200) {
      await fetchQuantityChangeRequests();
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalNotes("");
      setPaperApprovalReceived(false);
      setPaperApprovalNotes("");
    } else {
      setError(result.error || "Failed to approve quantity change request");
      setErrorDetails(result.errorDetails);
    }

    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    // Use the correct endpoint format: /api/bills/[billId]/items/[itemId]/quantity-change-approve with action=reject
    const result = await apiCall(`/api/bills/${selectedRequest.bill_id}/items/${selectedRequest.item_id}/quantity-change-approve`, {
      method: "POST",
      body: JSON.stringify({
        action: "reject",
        approvalNotes: rejectionNotes, // Rejection notes go in approvalNotes field
      }),
    });

    if (result.status === 200) {
      await fetchQuantityChangeRequests();
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionNotes("");
    } else {
      setError(result.error || "Failed to reject quantity change request");
      setErrorDetails(result.errorDetails);
    }

    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Rejected" },
      cancelled: { variant: "secondary", text: "Cancelled" },
    };

    const config = statusConfig[status] || { variant: "secondary", text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading quantity change requests...</p>
      </div>
    );
  }

  return (
    <div>
      <ErrorDisplay
        error={error}
        errorDetails={errorDetails}
        onDismiss={() => {
          setError("");
          setErrorDetails(null);
        }}
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="bi bi-arrow-left-right me-2 text-warning"></i>
          Quantity Change Requests
        </h5>
        <Button variant="outline-primary" size="sm" onClick={fetchQuantityChangeRequests}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </Button>
      </div>

      {quantityChangeRequests.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-4">
            <i className="bi bi-check-circle text-success" style={{ fontSize: "3rem" }}></i>
            <h6 className="mt-3 mb-1">No Pending Quantity Change Requests</h6>
            <p className="text-muted mb-0">All quantity change requests have been processed</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="row">
          {quantityChangeRequests.map((request) => (
            <div key={request.id} className="col-md-6 col-lg-4 mb-3">
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">Bill #{request.bill_id}</span>
                  {getStatusBadge(request.status)}
                </Card.Header>
                <Card.Body>
                  <div className="mb-2">
                    <small className="text-muted">Requested by:</small>
                    <div className="fw-semibold">
                      {request.initiator.firstName} {request.initiator.lastName}
                    </div>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">Item:</small>
                    <div className="fw-semibold">
                      {request.item?.name || "Unknown Item"}
                    </div>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">Quantity Change:</small>
                    <div className="fw-semibold text-primary">
                      {request.current_quantity} → {request.requested_quantity}
                    </div>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">Current Bill Total:</small>
                    <div className="fw-semibold text-muted">
                      KES {(Number(request.current_bill_total || request.bill.total) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">New Bill Total:</small>
                    <div className="fw-semibold text-success">
                      KES {(Number(request.new_bill_total || request.bill.total) || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">Station:</small>
                    <div>{request.bill.station?.name || "Unknown"}</div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Reason:</small>
                    <div className="text-truncate" title={request.reason}>
                      {request.reason}
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Requested:</small>
                    <div>{formatDate(request.created_at)}</div>
                  </div>

                  {request.status === "pending" && (
                    <div className="d-grid gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApprovalModal(true);
                        }}
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectionModal(true);
                        }}
                      >
                        <i className="bi bi-x-circle me-1"></i>
                        Reject
                      </Button>
                    </div>
                  )}
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
            Approve Quantity Change Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div className="mb-3">
              <h6>Bill Details:</h6>
              <p className="mb-1">
                <strong>Bill ID:</strong> #{selectedRequest.bill_id}
              </p>
              <p className="mb-1">
                <strong>Item:</strong> {selectedRequest.item?.name || "Unknown Item"}
              </p>
              <p className="mb-1">
                <strong>Quantity Change:</strong> {selectedRequest.current_quantity} → {selectedRequest.requested_quantity}
              </p>
              <p className="mb-1">
                <strong>Current Bill Total:</strong> KES {(Number(selectedRequest.current_bill_total || selectedRequest.bill.total) || 0).toFixed(2)}
              </p>
              <p className="mb-1">
                <strong>New Bill Total:</strong> <span className="text-success fw-bold">KES {(Number(selectedRequest.new_bill_total || selectedRequest.bill.total) || 0).toFixed(2)}</span>
              </p>
              <p className="mb-1">
                <strong>Requested by:</strong> {selectedRequest.initiator.firstName} {selectedRequest.initiator.lastName}
              </p>
              <p className="mb-0">
                <strong>Reason:</strong> {selectedRequest.reason}
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
                label="Paper approval received"
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
            Reject Quantity Change Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div className="mb-3">
              <h6>Bill Details:</h6>
              <p className="mb-1">
                <strong>Bill ID:</strong> #{selectedRequest.bill_id}
              </p>
              <p className="mb-1">
                <strong>Item:</strong> {selectedRequest.item?.name || "Unknown Item"}
              </p>
              <p className="mb-1">
                <strong>Quantity Change:</strong> {selectedRequest.current_quantity} → {selectedRequest.requested_quantity}
              </p>
              <p className="mb-1">
                <strong>Current Bill Total:</strong> KES {(Number(selectedRequest.current_bill_total || selectedRequest.bill.total) || 0).toFixed(2)}
              </p>
              <p className="mb-1">
                <strong>New Bill Total:</strong> <span className="text-success fw-bold">KES {(Number(selectedRequest.new_bill_total || selectedRequest.bill.total) || 0).toFixed(2)}</span>
              </p>
              <p className="mb-1">
                <strong>Requested by:</strong> {selectedRequest.initiator.firstName} {selectedRequest.initiator.lastName}
              </p>
              <p className="mb-0">
                <strong>Reason:</strong> {selectedRequest.reason}
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
                placeholder="Please provide a reason for rejecting this quantity change request..."
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

