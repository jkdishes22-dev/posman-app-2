"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import ProductionIssueForm from "../../shared/production/ProductionIssueForm";

interface IssueProductionModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export default function IssueProductionModal({ show, onHide, onSuccess }: IssueProductionModalProps) {
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (show) {
      setFormKey((k) => k + 1);
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="fw-bold">
          <i className="bi bi-arrow-up-circle me-2" />
          Issue Production
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-4">
        {show && (
          <ProductionIssueForm
            key={formKey}
            submitLabel="Issue Production"
            onIssued={() => {
              onSuccess();
              setTimeout(() => onHide(), 1500);
            }}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
