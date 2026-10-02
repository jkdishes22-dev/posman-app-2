import React from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";

interface CategoryDeleteModalProps {
  show: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  show,
  categoryName,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal show={show} onHide={onCancel}>
      <ModalHeader closeButton>
        <ModalTitle>Confirm Deletion</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p>
          Are you sure you want to delete the category:{" "}
          <strong>{categoryName}</strong>?
        </p>
        <div className="alert alert-warning mb-0" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Items will be unlinked, not deleted.</strong> Any items in this
          category will have their category removed. They will remain accessible
          from the <strong>Menu &amp; Pricing → Items</strong> page.
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete Category
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CategoryDeleteModal;
