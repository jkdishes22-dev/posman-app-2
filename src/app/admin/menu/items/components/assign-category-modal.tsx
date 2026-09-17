"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";

interface Category {
  id: number;
  name: string;
}

interface AssignCategoryModalProps {
  show: boolean;
  itemName: string;
  currentCategoryId: number | null;
  onHide: () => void;
  onConfirm: (categoryId: number | null) => void;
}

const AssignCategoryModal: React.FC<AssignCategoryModalProps> = ({
  show,
  itemName,
  currentCategoryId,
  onHide,
  onConfirm,
}) => {
  const apiCall = useApiCall();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setSelectedCategoryId(currentCategoryId ? String(currentCategoryId) : "");
    apiCall("/api/menu/categories").then((result) => {
      if (result.status >= 200 && result.status < 300) {
        setCategories(Array.isArray(result.data) ? result.data : []);
      }
    });
  }, [show, currentCategoryId]);

  const handleConfirm = async () => {
    setLoading(true);
    const categoryId = selectedCategoryId ? Number(selectedCategoryId) : null;
    await onConfirm(categoryId);
    setLoading(false);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-tag me-2"></i>
          Assign Category
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          Updating category for: <strong>{itemName}</strong>
        </p>
        <Form.Group>
          <Form.Label className="fw-semibold">Category</Form.Label>
          <Form.Select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">— No category —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            Choose a category or leave blank to remove from all categories.
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Saving…
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-1"></i>
              Save
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssignCategoryModal;
