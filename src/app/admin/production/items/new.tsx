import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { InventoryItem } from "src/app/types/types";
import { useTooltips } from "../../../hooks/useTooltips";

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
  useTooltips();

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
            <Form.Label>
              Stock Item (Suppliable)
              <i 
                className="bi bi-question-circle ms-1 text-muted" 
                style={{ cursor: "help" }}
                data-bs-toggle="tooltip" 
                data-bs-placement="right"
                data-bs-html="true"
                title="<strong>Stock Items (isStock: true):</strong> Items purchased/supplied (e.g., Eggs, Milk, Flour). Can be used as ingredients in recipes and are received via purchase orders.<br/><br/><strong>Sellable Items (isStock: false):</strong> Items produced and sold (e.g., Tortilla, Coffee, Omelette). Composite items (isGroup: true) can have recipes that specify how much stock items are deducted when sold.<br/><br/><strong>Note:</strong> Items can be both stock and sellable (e.g., Milk can be purchased AND produced). The system handles both inventory pools separately."
              ></i>
            </Form.Label>
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
