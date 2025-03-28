import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { InventoryItem } from "src/app/types/types";

interface InventoryModalProps {
  showModal: boolean;
  handleCloseModal: () => void;
  handleAddInventoryItem: (item: InventoryItem) => Promise<void>;
}

function InventoryModal({
  showModal,
  handleCloseModal,
  handleAddInventoryItem,
}: InventoryModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isStock, setIsStock] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleAddInventoryItem({ name, code, isStock });
  };

  return (
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Inventory Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Item Code</Form.Label>
            <Form.Control
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Stock Item</Form.Label>
            <Form.Check
              type="checkbox"
              checked={isStock}
              onChange={(e) => setIsStock(e.target.checked)}
            ></Form.Check>
          </Form.Group>
          <Button variant="success" type="submit">
            Add Item
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseModal}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InventoryModal;
