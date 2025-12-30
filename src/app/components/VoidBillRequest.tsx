"use client";
import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";

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
  const apiCall = useApiCall();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Please provide a reason for voiding this bill");
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);

    const result = await apiCall("/api/bills/void-requests", {
      method: "POST",
      body: JSON.stringify({
        billId,
        reason: reason.trim(),
      }),
    });

    if (result.status === 201) {
      onSuccess();
      onHide();
      setReason("");
      setError("");
    } else {
      setError(result.error || "Failed to create void request");
      setErrorDetails(result.errorDetails);
    }

    setLoading(false);
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
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError("");
            setErrorDetails(null);
          }}
        />

        <div className="mb-3">
          <h6>Bill Details:</h6>
          <p className="mb-1">
            <strong>Bill ID:</strong> {billId}
            {billNumber && <span> (#{billNumber})</span>}
          </p>
          {billTotal && (
            <p className="mb-0">
              <strong>Total Amount:</strong> ${(Number(billTotal) || 0).toFixed(2)}
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
