"use client";
import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";

interface VoidBillRequestProps {
  billId: number;
  billNumber?: string;
  billTotal?: number;
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export default function VoidBillRequest({
  billId,
  billNumber,
  billTotal,
  show,
  onHide,
  onSuccess,
}: VoidBillRequestProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError("Please provide a reason for voiding this bill");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bills/void-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          billId,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onHide();
        setReason("");
        setError("");
      } else {
        setError(data.error || "Failed to create void request");
      }
    } catch (error) {
      setError("Failed to create void request");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
          Request Bill Void
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="py-2">
            <i className="bi bi-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        <div className="mb-3">
          <h6>Bill Details:</h6>
          <p className="mb-1">
            <strong>Bill ID:</strong> {billId}
            {billNumber && <span> (#{billNumber})</span>}
          </p>
          {billTotal && (
            <p className="mb-0">
              <strong>Total Amount:</strong> ${billTotal.toFixed(2)}
            </p>
          )}
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Reason for Void Request *</strong>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a detailed reason for voiding this bill..."
              required
            />
            <Form.Text className="text-muted">
              This reason will be reviewed by your supervisor or cashier.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="warning" 
          onClick={handleSubmit} 
          disabled={loading || !reason.trim()}
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
    </Modal>
  );
}
