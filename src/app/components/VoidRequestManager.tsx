"use client";
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Form, Alert, Row, Col } from "react-bootstrap";

interface VoidRequest {
  id: number;
  bill_id: number;
  initiated_by: number;
  approved_by?: number;
  status: string;
  reason: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  paper_approval_received: boolean;
  paper_approval_date?: string;
  paper_approval_notes?: string;
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
  };
}

interface VoidRequestManagerProps {
  userRole: string;
}

export default function VoidRequestManager({ userRole }: VoidRequestManagerProps) {
  const [voidRequests, setVoidRequests] = useState<VoidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<VoidRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [paperApprovalReceived, setPaperApprovalReceived] = useState(false);
  const [paperApprovalNotes, setPaperApprovalNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchVoidRequests();
  }, []);

  const fetchVoidRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bills/void-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setVoidRequests(data.voidRequests);
      } else {
        setError(data.error || "Failed to fetch void requests");
      }
    } catch (error) {
      setError("Failed to fetch void requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bills/void-requests/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          approvalNotes: approvalNotes,
          paperApprovalReceived: paperApprovalReceived,
          paperApprovalNotes: paperApprovalNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchVoidRequests();
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setApprovalNotes("");
        setPaperApprovalReceived(false);
        setPaperApprovalNotes("");
      } else {
        setError(data.error || "Failed to approve void request");
      }
    } catch (error) {
      setError("Failed to approve void request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bills/void-requests/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          rejectionNotes: rejectionNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchVoidRequests();
        setShowRejectionModal(false);
        setSelectedRequest(null);
        setRejectionNotes("");
      } else {
        setError(data.error || "Failed to reject void request");
      }
    } catch (error) {
      setError("Failed to reject void request");
    } finally {
      setActionLoading(false);
    }
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
        <p className="mt-2 text-muted">Loading void requests...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="danger" className="mb-3">
          <i className="bi bi-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
          Void Bill Requests
        </h5>
        <Button variant="outline-primary" size="sm" onClick={fetchVoidRequests}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </Button>
      </div>

      {voidRequests.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-4">
            <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
            <h6 className="mt-3 mb-1">No Pending Void Requests</h6>
            <p className="text-muted mb-0">All void requests have been processed</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="row">
          {voidRequests.map((request) => (
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
                    <small className="text-muted">Bill Total:</small>
                    <div className="fw-semibold text-primary">
                      ${request.bill.total?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">Station:</small>
                    <div>{request.bill.station?.name || 'Unknown'}</div>
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

                  {request.status === 'pending' && (
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
            Approve Void Request
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
                <strong>Amount:</strong> ${selectedRequest.bill.total?.toFixed(2) || '0.00'}
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
            Reject Void Request
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
                <strong>Amount:</strong> ${selectedRequest.bill.total?.toFixed(2) || '0.00'}
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
